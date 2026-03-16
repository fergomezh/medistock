import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAlerts, fetchUnreadCount, markAlertRead, markAllAlertsRead } from '../services/alerts'
import { useAuth } from '../context/AuthContext'

export const ALERTS_KEY = ['alerts']
export const ALERTS_UNREAD_KEY = ['alerts', 'unread']

export function useAlerts() {
  return useQuery({
    queryKey: ALERTS_KEY,
    queryFn: fetchAlerts,
  })
}

export function useUnreadAlertsCount() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ALERTS_UNREAD_KEY,
    queryFn: fetchUnreadCount,
    enabled: !!user,
  })

  // Suscripción Realtime: al insertar nueva alerta, invalidar cache
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`alerts-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts', filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ALERTS_KEY })
          qc.invalidateQueries({ queryKey: ALERTS_UNREAD_KEY })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, qc])

  return query
}

export function useMarkAlertRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markAlertRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALERTS_KEY })
      qc.invalidateQueries({ queryKey: ALERTS_UNREAD_KEY })
    },
  })
}

export function useMarkAllAlertsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllAlertsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALERTS_KEY })
      qc.invalidateQueries({ queryKey: ALERTS_UNREAD_KEY })
    },
  })
}
