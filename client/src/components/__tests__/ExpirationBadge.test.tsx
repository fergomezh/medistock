import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ExpirationBadge from '../ExpirationBadge'

vi.mock('../../utils/dates', () => ({
  daysUntil: vi.fn(),
  formatDate: (d: string) => d,
}))

import { daysUntil } from '../../utils/dates'

describe('ExpirationBadge', () => {
  it('shows "Sin vencimiento" when no date', () => {
    render(<ExpirationBadge expirationDate={null} />)
    expect(screen.getByText('Sin vencimiento')).toBeInTheDocument()
  })

  it('shows "Vencido" when days < 0', () => {
    vi.mocked(daysUntil).mockReturnValue(-3)
    render(<ExpirationBadge expirationDate="2020-01-01" />)
    expect(screen.getByText(/Vencido/)).toBeInTheDocument()
  })

  it('shows "Vence hoy" when days === 0', () => {
    vi.mocked(daysUntil).mockReturnValue(0)
    render(<ExpirationBadge expirationDate="2026-03-15" />)
    expect(screen.getByText('Vence hoy')).toBeInTheDocument()
  })

  it('shows "Vence en Nd" when days <= 30', () => {
    vi.mocked(daysUntil).mockReturnValue(7)
    render(<ExpirationBadge expirationDate="2026-03-22" />)
    expect(screen.getByText('Vence en 7d')).toBeInTheDocument()
  })

  it('shows formatted date when days > 30', () => {
    vi.mocked(daysUntil).mockReturnValue(60)
    render(<ExpirationBadge expirationDate="2026-05-14" />)
    expect(screen.getByText(/Vence 2026-05-14/)).toBeInTheDocument()
  })
})
