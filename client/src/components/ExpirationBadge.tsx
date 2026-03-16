import Badge from './ui/Badge'
import { daysUntil, formatDate } from '../utils/dates'

interface ExpirationBadgeProps {
  expirationDate: string | null
}

export default function ExpirationBadge({ expirationDate }: ExpirationBadgeProps) {
  if (!expirationDate) {
    return <Badge variant="gray">Sin vencimiento</Badge>
  }

  const days = daysUntil(expirationDate)

  const variant =
    days < 0     ? 'red'
    : days <= 7  ? 'red'
    : days <= 30 ? 'yellow'
    : 'green'

  const label =
    days < 0    ? `Vencido hace ${Math.abs(days)}d`
    : days === 0 ? 'Vence hoy'
    : days <= 30 ? `Vence en ${days}d`
    : `Vence ${formatDate(expirationDate)}`

  return <Badge variant={variant}>{label}</Badge>
}
