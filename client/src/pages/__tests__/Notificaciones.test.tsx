// client/src/pages/__tests__/Notificaciones.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Notificaciones from '../Notificaciones'

vi.mock('../../hooks/useAlerts', () => ({
  useAlerts: vi.fn(),
  useMarkAlertRead: vi.fn(),
  useMarkAllAlertsRead: vi.fn(),
}))
vi.mock('../../utils/dates', () => ({ formatDate: (d: string) => d }))

import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '../../hooks/useAlerts'

const makeAlert = (id: string, isRead: boolean) => ({
  id,
  user_id: 'u1',
  medication_id: null,
  type: 'low_stock',
  message: `Alerta ${id}`,
  is_read: isRead,
  triggered_at: '2026-03-15T10:00:00Z',
  created_at: '2026-03-15',
})

const wrap = () => render(<MemoryRouter><Notificaciones /></MemoryRouter>)

describe('Notificaciones', () => {
  beforeEach(() => {
    vi.mocked(useAlerts).mockReturnValue({ data: [], isLoading: false } as any)
    vi.mocked(useMarkAlertRead).mockReturnValue({ mutate: vi.fn() } as any)
    vi.mocked(useMarkAllAlertsRead).mockReturnValue({ mutate: vi.fn(), isPending: false } as any)
  })

  it('shows empty state when no alerts', () => {
    wrap()
    expect(screen.getByText('Sin notificaciones.')).toBeInTheDocument()
  })

  it('shows "Marcar todas como leídas" when unread alerts exist', () => {
    vi.mocked(useAlerts).mockReturnValue({
      data: [makeAlert('1', false)],
      isLoading: false,
    } as any)
    wrap()
    expect(screen.getByText('Marcar todas como leídas')).toBeInTheDocument()
  })

  it('hides "Marcar todas" button when all alerts are read', () => {
    vi.mocked(useAlerts).mockReturnValue({
      data: [makeAlert('1', true)],
      isLoading: false,
    } as any)
    wrap()
    expect(screen.queryByText('Marcar todas como leídas')).not.toBeInTheDocument()
  })

  it('shows individual "Leer" button for unread alerts', () => {
    vi.mocked(useAlerts).mockReturnValue({
      data: [makeAlert('1', false)],
      isLoading: false,
    } as any)
    wrap()
    expect(screen.getByText('Leer')).toBeInTheDocument()
  })

  it('calls markRead.mutate when "Leer" is clicked', () => {
    const mutate = vi.fn()
    vi.mocked(useMarkAlertRead).mockReturnValue({ mutate } as any)
    vi.mocked(useAlerts).mockReturnValue({
      data: [makeAlert('alert-42', false)],
      isLoading: false,
    } as any)
    wrap()
    fireEvent.click(screen.getByText('Leer'))
    expect(mutate).toHaveBeenCalledWith('alert-42')
  })
})
