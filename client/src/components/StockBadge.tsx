import Badge from './ui/Badge'
import type { Medication } from '../types'

interface StockBadgeProps {
  medication: Pick<Medication, 'quantity_current' | 'quantity_minimum' | 'quantity_unit'>
}

export default function StockBadge({ medication }: StockBadgeProps) {
  const { quantity_current: current, quantity_minimum: min, quantity_unit: unit } = medication

  const variant =
    current <= 0         ? 'red'
    : current <= min     ? 'yellow'
    : 'green'

  const label =
    current <= 0     ? 'Sin stock'
    : current <= min ? 'Stock bajo'
    : 'Stock OK'

  return (
    <Badge variant={variant}>
      {label} · {current} {unit}
    </Badge>
  )
}
