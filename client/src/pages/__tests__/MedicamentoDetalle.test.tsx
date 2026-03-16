// client/src/pages/__tests__/MedicamentoDetalle.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MedicamentoDetalle from '../MedicamentoDetalle'

vi.mock('../../hooks/useMedications', () => ({
  useMedicationById: vi.fn(),
  useUpdateMedication: vi.fn(),
  useCreateMedication: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}))
vi.mock('../../hooks/useDoseLogs', () => ({
  useDoseLogsByMedicationId: vi.fn(),
}))
vi.mock('../../utils/dates', () => ({
  formatDate: (d: string) => d,
  formatDoseTime: (t: string) => t,
  daysUntil: vi.fn(() => 60),
}))
vi.mock('../../utils/restock', () => ({ calcRestockDate: vi.fn(() => null), isRestockDue: vi.fn(() => false) }))

import { useMedicationById, useUpdateMedication } from '../../hooks/useMedications'
import { useDoseLogsByMedicationId } from '../../hooks/useDoseLogs'

const baseMed = {
  id: 'med-1', name: 'Aspirina', description: 'Para el dolor',
  quantity_current: 20, quantity_minimum: 5, quantity_unit: 'pastillas',
  dose_amount: 1, dose_times: ['08:00', '20:00'], dose_frequency: 'cada 12 horas',
  expiration_date: '2027-01-01', purchase_date: null,
  active: true, user_id: 'u1', created_at: '2026-01-01',
}

const wrap = () => render(
  <MemoryRouter initialEntries={['/medicamentos/med-1']}>
    <Routes>
      <Route path="/medicamentos/:id" element={<MedicamentoDetalle />} />
    </Routes>
  </MemoryRouter>
)

describe('MedicamentoDetalle', () => {
  beforeEach(() => {
    vi.mocked(useMedicationById).mockReturnValue({ data: baseMed, isLoading: false } as any)
    vi.mocked(useUpdateMedication).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any)
    vi.mocked(useDoseLogsByMedicationId).mockReturnValue({ data: [] } as any)
  })

  it('shows the medication name', () => {
    wrap()
    expect(screen.getByText('Aspirina')).toBeInTheDocument()
  })

  it('shows the description', () => {
    wrap()
    expect(screen.getByText('Para el dolor')).toBeInTheDocument()
  })

  it('shows "Historial de tomas" section', () => {
    wrap()
    expect(screen.getByText('Historial de tomas')).toBeInTheDocument()
  })

  it('shows empty state when no dose logs', () => {
    wrap()
    expect(screen.getByText('Sin historial de tomas.')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useMedicationById).mockReturnValue({ data: undefined, isLoading: true } as any)
    wrap()
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })
})
