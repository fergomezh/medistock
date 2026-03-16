import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export async function fetchProfile(): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateProfile(payload: Partial<Omit<Profile, 'id' | 'created_at'>>): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}
