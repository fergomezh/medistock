import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchDoseLogs, fetchAllDoseLogs, fetchTodayDoseLogs, markDoseTaken, skipDose } from '../services/doseLogs'

export const DOSE_LOGS_KEY = ['dose_logs']
export const TODAY_LOGS_KEY = ['dose_logs', 'today']
export const ALL_LOGS_KEY = ['dose_logs', 'all']

export function useDoseLogs(medicationId?: string) {
  return useQuery({
    queryKey: medicationId ? [...DOSE_LOGS_KEY, medicationId] : DOSE_LOGS_KEY,
    queryFn: () => fetchDoseLogs(medicationId),
  })
}

export function useAllDoseLogs() {
  return useQuery({
    queryKey: ALL_LOGS_KEY,
    queryFn: fetchAllDoseLogs,
  })
}

export function useTodayDoseLogs() {
  return useQuery({
    queryKey: TODAY_LOGS_KEY,
    queryFn: fetchTodayDoseLogs,
  })
}

export function useMarkDoseTaken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ medicationId, scheduledAt }: { medicationId: string; scheduledAt: string }) =>
      markDoseTaken(medicationId, scheduledAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODAY_LOGS_KEY })
      qc.invalidateQueries({ queryKey: DOSE_LOGS_KEY })
      qc.invalidateQueries({ queryKey: ['medications'] }) // stock actualizado
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export function useSkipDose() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ medicationId, scheduledAt }: { medicationId: string; scheduledAt: string }) =>
      skipDose(medicationId, scheduledAt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODAY_LOGS_KEY })
      qc.invalidateQueries({ queryKey: DOSE_LOGS_KEY })
    },
  })
}
