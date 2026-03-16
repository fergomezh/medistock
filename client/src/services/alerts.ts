import { supabase } from '../lib/supabase'
import type { Alert } from '../types'

export async function fetchAlerts(): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*, medication:medications(name)')
    .order('triggered_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function markAlertRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markAllAlertsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  if (error) throw new Error(error.message)
}
