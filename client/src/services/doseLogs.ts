import { supabase } from '../lib/supabase'
import type { DoseLog, ScheduledDose, Medication } from '../types'
import { parseISO, setHours, setMinutes } from 'date-fns'

export async function fetchDoseLogs(medicationId?: string): Promise<DoseLog[]> {
  let query = supabase
    .from('dose_logs')
    .select('*, medication:medications(name, dose_amount, quantity_unit)')
    .order('scheduled_at', { ascending: false })

  if (medicationId) query = query.eq('medication_id', medicationId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export type DoseLogWithMedication = Omit<DoseLog, 'medication'> & {
  medication: { name: string }
}

export async function fetchAllDoseLogs(): Promise<DoseLogWithMedication[]> {
  const { data, error } = await supabase
    .from('dose_logs')
    .select('*, medication:medications(name)')
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return data as DoseLogWithMedication[]
}

export async function fetchDoseLogsByMedicationId(medicationId: string): Promise<DoseLog[]> {
  const { data, error } = await supabase
    .from('dose_logs')
    .select('*')
    .eq('medication_id', medicationId)
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchTodayDoseLogs(): Promise<DoseLog[]> {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString()
  const end   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString()

  const { data, error } = await supabase
    .from('dose_logs')
    .select('*')
    .gte('scheduled_at', start)
    .lte('scheduled_at', end)

  if (error) throw new Error(error.message)
  return data
}

/**
 * Marca una dosis como tomada usando la RPC atómica.
 * Descuenta stock y crea alerta low_stock si corresponde.
 */
export async function markDoseTaken(medicationId: string, scheduledAt: string): Promise<void> {
  const { error } = await supabase.rpc('mark_dose_taken', {
    p_medication_id: medicationId,
    p_scheduled_at: scheduledAt,
  })
  if (error) throw new Error(error.message)
}

export async function skipDose(medicationId: string, scheduledAt: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase
    .from('dose_logs')
    .insert({
      user_id: user.id,
      medication_id: medicationId,
      scheduled_at: scheduledAt,
      status: 'skipped',
    })
  if (error) throw new Error(error.message)
}

/**
 * Calcula las dosis programadas para hoy a partir de los medicamentos activos.
 * Las cruza con los dose_logs del día para saber cuáles ya fueron registradas.
 */
export function buildTodaySchedule(
  medications: Medication[],
  todayLogs: DoseLog[]
): ScheduledDose[] {
  const today = new Date()
  const schedule: ScheduledDose[] = []

  for (const med of medications) {
    if (!med.active) continue
    for (const timeStr of med.dose_times) {
      const [h, m] = timeStr.split(':').map(Number)
      const scheduledAt = setMinutes(setHours(new Date(today), h), m)
      scheduledAt.setSeconds(0, 0)

      // Ventana de 5 minutos para tolerar pequeñas diferencias de reloj o redondeo
      const logEntry = todayLogs.find(
        log => log.medication_id === med.id &&
          Math.abs(parseISO(log.scheduled_at).getTime() - scheduledAt.getTime()) < 300_000
      ) ?? null

      schedule.push({ medication: med, scheduledTime: timeStr, scheduledAt, logEntry })
    }
  }

  return schedule.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
}
