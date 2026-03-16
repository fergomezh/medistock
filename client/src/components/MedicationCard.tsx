import { useNavigate } from 'react-router-dom'
import { Pill } from 'lucide-react'
import Card from './ui/Card'
import StockBadge from './StockBadge'
import ExpirationBadge from './ExpirationBadge'
import RestockDateChip from './RestockDateChip'
import type { Medication } from '../types'
import { formatDoseTime } from '../utils/dates'

interface MedicationCardProps {
  medication: Medication
  marginDays?: number
}

export default function MedicationCard({ medication, marginDays = 5 }: MedicationCardProps) {
  const navigate = useNavigate()
  const nextDoseTime = medication.dose_times?.[0] ?? null

  return (
    <Card onClick={() => navigate(`/medicamentos/${medication.id}`)} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-health-50 flex items-center justify-center shrink-0">
            <Pill size={18} className="text-health-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm truncate">{medication.name}</h3>
            {medication.description && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{medication.description}</p>
            )}
          </div>
        </div>
        {!medication.active && (
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
            Inactivo
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mt-3">
        <StockBadge medication={medication} />
        <ExpirationBadge expirationDate={medication.expiration_date} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
        <RestockDateChip medication={medication} marginDays={marginDays} />
        {nextDoseTime && (
          <span className="text-xs text-slate-400">
            Próxima: {formatDoseTime(nextDoseTime)}
          </span>
        )}
      </div>
    </Card>
  )
}
