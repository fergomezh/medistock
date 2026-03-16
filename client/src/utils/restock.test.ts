import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calcRestockDate, isRestockDue } from './restock'

describe('calcRestockDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('calcula la fecha correctamente con margen default de 5 días', () => {
    // 30 pastillas, 1/toma, 2 tomas/día = 15 días stock → recompra en 10 días
    const result = calcRestockDate(30, 1, 2)
    expect(result).not.toBeNull()
    expect(result!.toDateString()).toBe(new Date('2026-03-25T12:00:00Z').toDateString())
  })

  it('retorna null si doseTimesPerDay es 0', () => {
    expect(calcRestockDate(30, 1, 0)).toBeNull()
  })

  it('retorna null si doseAmount es 0', () => {
    expect(calcRestockDate(30, 0, 2)).toBeNull()
  })

  it('respeta margen personalizado', () => {
    // 20 pastillas, 1/toma, 1/día = 20 días, margen 10 → recompra en 10 días
    const result = calcRestockDate(20, 1, 1, 10)
    expect(result).not.toBeNull()
    expect(result!.toDateString()).toBe(new Date('2026-03-25T12:00:00Z').toDateString())
  })
})

describe('isRestockDue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('retorna true si la fecha ya pasó', () => {
    expect(isRestockDue(new Date('2026-03-14'))).toBe(true)
  })
  it('retorna true si la fecha es hoy', () => {
    expect(isRestockDue(new Date('2026-03-15'))).toBe(true)
  })
  it('retorna false si la fecha es mañana', () => {
    expect(isRestockDue(new Date('2026-03-16'))).toBe(false)
  })
  it('retorna false si es null', () => {
    expect(isRestockDue(null)).toBe(false)
  })
})
