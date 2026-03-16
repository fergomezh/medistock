import { supabase } from '../lib/supabase'
import type { Medication, MedicationFormData } from '../types'

/**
 * @param activeOnly - true (default): solo medicamentos activos (vistas normales).
 *                     false: todos, incluyendo desactivados (filtro "Todos" en /inventario).
 */
export async function fetchMedications(activeOnly = true): Promise<Medication[]> {
  let query = supabase.from('medications').select('*').order('name')
  if (activeOnly) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function fetchMedication(id: string): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createMedication(payload: MedicationFormData): Promise<Medication> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase
    .from('medications')
    .insert({ ...payload, user_id: user.id })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateMedication(id: string, payload: Partial<MedicationFormData>): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deactivateMedication(id: string): Promise<void> {
  const { error } = await supabase
    .from('medications')
    .update({ active: false })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteMedication(id: string): Promise<void> {
  // Solo posible si no tiene dose_logs (ON DELETE RESTRICT). Verificar antes de llamar.
  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', id)
  if (error) throw new Error('No se puede eliminar: el medicamento tiene historial de tomas. Usá Desactivar.')
}

export async function fetchMedicationById(id: string): Promise<Medication | null> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function hasDoseLogs(medicationId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('dose_logs')
    .select('id', { count: 'exact', head: true })
    .eq('medication_id', medicationId)
  if (error) throw new Error(error.message)
  return (count ?? 0) > 0
}
