import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StockBadge from '../StockBadge'

const med = (current: number, min: number) => ({
  quantity_current: current,
  quantity_minimum: min,
  quantity_unit: 'pastillas',
})

describe('StockBadge', () => {
  it('shows Stock OK when above minimum', () => {
    render(<StockBadge medication={med(10, 5)} />)
    expect(screen.getByText(/Stock OK/)).toBeInTheDocument()
  })

  it('shows Stock bajo when at or below minimum', () => {
    render(<StockBadge medication={med(3, 5)} />)
    expect(screen.getByText(/Stock bajo/)).toBeInTheDocument()
  })

  it('shows Sin stock when quantity is 0', () => {
    render(<StockBadge medication={med(0, 5)} />)
    expect(screen.getByText(/Sin stock/)).toBeInTheDocument()
  })

  it('includes current quantity in label', () => {
    render(<StockBadge medication={med(12, 5)} />)
    expect(screen.getByText(/12 pastillas/)).toBeInTheDocument()
  })
})
