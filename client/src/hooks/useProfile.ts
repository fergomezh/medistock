import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchProfile, updateProfile } from '../services/profile'
import { useAuth } from '../context/AuthContext'
import type { Profile } from '../types'

export const PROFILE_KEY = ['profile']

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: fetchProfile,
    enabled: !!user,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Omit<Profile, 'id' | 'created_at'>>) => updateProfile(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  })
}
