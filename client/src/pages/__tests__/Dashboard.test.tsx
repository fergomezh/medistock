// client/src/pages/__tests__/Dashboard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../Dashboard'

vi.mock('../../hooks/useMedications', () => ({ useMedications: vi.fn() }))
vi.mock('../../hooks/useDoseLogs', () => ({ useTodayDoseLogs: vi.fn() }))
vi.mock('../../hooks/useAlerts', () => ({ useUnreadAlertsCount: vi.fn() }))
vi.mock('../../services/doseLogs', () => ({ buildTodaySchedule: vi.fn() }))
vi.mock('../../utils/dates', () => ({ daysUntil: vi.fn(), formatDate: (d: string) => d, formatDoseTime: (t: string) => t }))
vi.mock('../../utils/restock', () => ({ calcRestockDate: vi.fn(() => null), isRestockDue: vi.fn(() => false) }))

import { useMedications } from '../../hooks/useMedications'
import { useTodayDoseLogs } from '../../hooks/useDoseLogs'
import { useUnreadAlertsCount } from '../../hooks/useAlerts'
import { buildTodaySchedule } from '../../services/doseLogs'
import { daysUntil } from '../../utils/dates'

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(useMedications).mockReturnValue({ data: [] } as any)
    vi.mocked(useTodayDoseLogs).mockReturnValue({ data: [] } as any)
    vi.mocked(useUnreadAlertsCount).mockReturnValue({ data: 0 } as any)
    vi.mocked(buildTodaySchedule).mockReturnValue([])
    vi.mocked(daysUntil).mockReturnValue(60)
  })

  it('renders the "Dosis de hoy" section', () => {
    wrap(<Dashboard />)
    expect(screen.getByText('Dosis de hoy')).toBeInTheDocument()
  })

  it('shows empty state when no doses scheduled', () => {
    wrap(<Dashboard />)
    expect(screen.getByText('No hay dosis programadas para hoy.')).toBeInTheDocument()
  })

  it('shows stat cards', () => {
    wrap(<Dashboard />)
    expect(screen.getByText('Medicamentos')).toBeInTheDocument()
    expect(screen.getByText('Alertas')).toBeInTheDocument()
    expect(screen.getByText('Dosis pendientes')).toBeInTheDocument()
  })

  it('shows "Stock bajo" section when low-stock medications exist', () => {
    const lowMed = {
      id: 'm1', name: 'Aspirina', quantity_current: 2, quantity_minimum: 5,
      quantity_unit: 'pastillas', dose_amount: 1, dose_times: ['08:00'],
      active: true, expiration_date: null, purchase_date: null,
      description: null, dose_frequency: 'diaria', user_id: 'u1', created_at: '2026-01-01',
    }
    vi.mocked(useMedications).mockReturnValue({ data: [lowMed] } as any)
    wrap(<Dashboard />)
    expect(screen.getByText('Stock bajo')).toBeInTheDocument()
  })
})
