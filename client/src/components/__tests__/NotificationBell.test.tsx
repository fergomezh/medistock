import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import NotificationBell from '../NotificationBell'

vi.mock('../../hooks/useAlerts', () => ({
  useUnreadAlertsCount: vi.fn(),
}))

import { useUnreadAlertsCount } from '../../hooks/useAlerts'

describe('NotificationBell', () => {
  it('renders bell button', () => {
    vi.mocked(useUnreadAlertsCount).mockReturnValue({ data: 0 } as any)
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('hides badge when count is 0', () => {
    vi.mocked(useUnreadAlertsCount).mockReturnValue({ data: 0 } as any)
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows count when count > 0', () => {
    vi.mocked(useUnreadAlertsCount).mockReturnValue({ data: 5 } as any)
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows 99+ when count exceeds 99', () => {
    vi.mocked(useUnreadAlertsCount).mockReturnValue({ data: 150 } as any)
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })
})
