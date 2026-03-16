import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchMedications, fetchMedication,
  createMedication, updateMedication,
  deactivateMedication, deleteMedication,
} from '../services/medications'
import type { MedicationFormData } from '../types'

export const MEDICATIONS_KEY = ['medications']

export function useMedications(activeOnly = true) {
  return useQuery({
    queryKey: [...MEDICATIONS_KEY, { activeOnly }],
    queryFn: () => fetchMedications(activeOnly),
  })
}

export function useMedication(id: string) {
  return useQuery({
    queryKey: [...MEDICATIONS_KEY, id],
    queryFn: () => fetchMedication(id),
    enabled: !!id,
  })
}

export function useCreateMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: MedicationFormData) => createMedication(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDICATIONS_KEY }),
  })
}

export function useUpdateMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MedicationFormData> }) =>
      updateMedication(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDICATIONS_KEY }),
  })
}

export function useDeactivateMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateMedication(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDICATIONS_KEY }),
  })
}

export function useDeleteMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMedication(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEDICATIONS_KEY }),
  })
}
