import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DoseTracker from '../DoseTracker'
import type { ScheduledDose } from '../../types'

vi.mock('../../hooks/useDoseLogs', () => ({
  useMarkDoseTaken: vi.fn(),
  useSkipDose: vi.fn(),
}))
vi.mock('../../utils/dates', () => ({
  formatDoseTime: (t: string) => t,
}))

import { useMarkDoseTaken, useSkipDose } from '../../hooks/useDoseLogs'

const baseMed = {
  id: 'med-1',
  user_id: 'u1',
  name: 'Ibuprofeno',
  description: null,
  quantity_current: 10,
  quantity_minimum: 5,
  quantity_unit: 'pastillas',
  dose_amount: 1,
  dose_frequency: 'diaria',
  dose_times: ['08:00'],
  expiration_date: null,
  purchase_date: null,
  active: true,
  created_at: '2026-01-01',
}

const makeDose = (status: null | 'taken' | 'skipped' | 'missed'): ScheduledDose => ({
  medication: baseMed,
  scheduledTime: '08:00',
  scheduledAt: new Date('2026-03-15T08:00:00Z'),
  logEntry: status
    ? { id: 'log-1', medication_id: 'med-1', user_id: 'u1', status, scheduled_at: '2026-03-15T08:00:00Z', taken_at: null, notes: null, created_at: '2026-03-15' }
    : null,
})

describe('DoseTracker', () => {
  beforeEach(() => {
    vi.mocked(useMarkDoseTaken).mockReturnValue({ mutate: vi.fn(), isPending: false } as any)
    vi.mocked(useSkipDose).mockReturnValue({ mutate: vi.fn(), isPending: false } as any)
  })

  it('shows Tomar and Omitir buttons when pending', () => {
    render(<DoseTracker scheduledDose={makeDose(null)} />)
    expect(screen.getByLabelText('Tomar Ibuprofeno')).toBeInTheDocument()
    expect(screen.getByLabelText('Omitir Ibuprofeno')).toBeInTheDocument()
  })

  it('hides action buttons when taken', () => {
    render(<DoseTracker scheduledDose={makeDose('taken')} />)
    expect(screen.queryByLabelText('Tomar Ibuprofeno')).not.toBeInTheDocument()
  })

  it('hides action buttons when skipped', () => {
    render(<DoseTracker scheduledDose={makeDose('skipped')} />)
    expect(screen.queryByLabelText('Tomar Ibuprofeno')).not.toBeInTheDocument()
  })

  it('calls markTaken.mutate when Tomar is clicked', () => {
    const mutate = vi.fn()
    vi.mocked(useMarkDoseTaken).mockReturnValue({ mutate, isPending: false } as any)
    render(<DoseTracker scheduledDose={makeDose(null)} />)
    fireEvent.click(screen.getByLabelText('Tomar Ibuprofeno'))
    expect(mutate).toHaveBeenCalledWith({
      medicationId: 'med-1',
      scheduledAt: expect.any(String),
    })
  })
})
