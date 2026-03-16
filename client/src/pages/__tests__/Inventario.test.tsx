// client/src/pages/__tests__/Inventario.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Inventario from '../Inventario'

vi.mock('../../hooks/useMedications', () => ({
  useMedications: vi.fn(),
  useCreateMedication: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateMedication: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}))
vi.mock('../../utils/dates', () => ({ daysUntil: vi.fn(() => 60), formatDate: (d: string) => d, formatDoseTime: (t: string) => t }))
vi.mock('../../utils/restock', () => ({ calcRestockDate: vi.fn(() => null), isRestockDue: vi.fn(() => false) }))

import { useMedications } from '../../hooks/useMedications'

const makeMed = (id: string, name: string, active = true, current = 10, min = 5) => ({
  id, name, active, quantity_current: current, quantity_minimum: min,
  quantity_unit: 'pastillas', dose_amount: 1, dose_times: ['08:00'],
  expiration_date: null, purchase_date: null, description: null,
  dose_frequency: 'diaria', user_id: 'u1', created_at: '2026-01-01',
})

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Inventario', () => {
  beforeEach(() => {
    vi.mocked(useMedications).mockReturnValue({ data: [], isLoading: false } as any)
  })

  it('shows empty state when no medications', () => {
    wrap(<Inventario />)
    expect(screen.getByText('No hay medicamentos.')).toBeInTheDocument()
  })

  it('filters medications by search term', () => {
    vi.mocked(useMedications).mockReturnValue({
      data: [makeMed('1', 'Aspirina'), makeMed('2', 'Ibuprofeno')],
      isLoading: false,
    } as any)
    wrap(<Inventario />)
    fireEvent.change(screen.getByPlaceholderText('Buscar medicamento...'), { target: { value: 'Asp' } })
    expect(screen.getByText('Aspirina')).toBeInTheDocument()
    expect(screen.queryByText('Ibuprofeno')).not.toBeInTheDocument()
  })

  it('shows only active medications on initial filter', () => {
    vi.mocked(useMedications).mockReturnValue({
      data: [makeMed('1', 'Aspirina', true), makeMed('2', 'Ibuprofeno', false)],
      isLoading: false,
    } as any)
    wrap(<Inventario />)
    // Default filter is 'active'
    expect(screen.getByText('Aspirina')).toBeInTheDocument()
    expect(screen.queryByText('Ibuprofeno')).not.toBeInTheDocument()
  })

  it('shows FAB button to add medication', () => {
    wrap(<Inventario />)
    expect(screen.getByLabelText('Agregar medicamento')).toBeInTheDocument()
  })
})
