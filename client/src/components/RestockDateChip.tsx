import { ShoppingCart } from 'lucide-react'
import { calcRestockDate, isRestockDue } from '../utils/restock'
import { formatDate } from '../utils/dates'
import type { Medication } from '../types'

interface RestockDateChipProps {
  medication: Pick<Medication, 'quantity_current' | 'dose_amount' | 'dose_times'>
  marginDays?: number
}

export default function RestockDateChip({ medication, marginDays = 5 }: RestockDateChipProps) {
  const restockDate = calcRestockDate(
    medication.quantity_current,
    medication.dose_amount,
    medication.dose_times?.length ?? 0,
    marginDays
  )

  if (!restockDate) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <ShoppingCart size={12} />
        Sin dosis configuradas
      </span>
    )
  }

  const due = isRestockDue(restockDate)

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${due ? 'text-red-600' : 'text-slate-500'}`}>
      <ShoppingCart size={12} />
      Recomprar: {formatDate(restockDate)}
    </span>
  )
}
