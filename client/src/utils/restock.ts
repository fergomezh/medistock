import { addDays } from 'date-fns'

export function calcRestockDate(
  stockCurrent: number,
  doseAmount: number,
  doseTimesPerDay: number,
  marginDays: number = 5
): Date | null {
  const dosesPerDay = doseAmount * doseTimesPerDay
  if (!dosesPerDay || dosesPerDay <= 0) return null
  const daysRemaining = stockCurrent / dosesPerDay
  return addDays(new Date(), daysRemaining - marginDays)
}

export function isRestockDue(restockDate: Date | null): boolean {
  if (!restockDate) return false
  const now = new Date()
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const restockMs = Date.UTC(restockDate.getUTCFullYear(), restockDate.getUTCMonth(), restockDate.getUTCDate())
  return restockMs <= todayMs
}
