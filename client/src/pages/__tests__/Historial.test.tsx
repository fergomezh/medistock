// client/src/pages/__tests__/Historial.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Historial from '../Historial'

vi.mock('../../hooks/useDoseLogs', () => ({ useAllDoseLogs: vi.fn() }))
vi.mock('../../hooks/useMedications', () => ({ useMedications: vi.fn() }))
vi.mock('../../utils/dates', () => ({ formatDate: (d: string) => d, formatDoseTime: (t: string) => t }))

import { useAllDoseLogs } from '../../hooks/useDoseLogs'
import { useMedications } from '../../hooks/useMedications'

const makeLog = (id: string, status: string, medName = 'Aspirina') => ({
  id,
  medication_id: 'med-1',
  user_id: 'u1',
  status,
  scheduled_at: '2026-03-15T08:00:00Z',
  taken_at: status === 'taken' ? '2026-03-15T08:05:00Z' : null,
  notes: null,
  created_at: '2026-03-15',
  medication: { name: medName },
})

const wrap = () => render(<MemoryRouter><Historial /></MemoryRouter>)

describe('Historial', () => {
  beforeEach(() => {
    vi.mocked(useAllDoseLogs).mockReturnValue({ data: [], isLoading: false } as any)
    vi.mocked(useMedications).mockReturnValue({ data: [] } as any)
  })

  it('renders table headers', () => {
    wrap()
    expect(screen.getByText('Medicamento')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
  })

  it('shows empty state when no logs', () => {
    wrap()
    expect(screen.getByText('Sin registros.')).toBeInTheDocument()
  })

  it('shows all logs initially', () => {
    vi.mocked(useAllDoseLogs).mockReturnValue({
      data: [makeLog('1', 'taken'), makeLog('2', 'missed')],
      isLoading: false,
    } as any)
    wrap()
    expect(screen.getAllByRole('row').length).toBe(3) // header + 2 data rows
  })

  it('filters by status', () => {
    vi.mocked(useAllDoseLogs).mockReturnValue({
      data: [makeLog('1', 'taken'), makeLog('2', 'missed')],
      isLoading: false,
    } as any)
    wrap()
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'taken' } })
    expect(screen.getAllByRole('row').length).toBe(2) // header + 1 data row
  })
})
