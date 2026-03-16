import { CheckCircle2, Circle, SkipForward, Clock } from 'lucide-react'
import { useMarkDoseTaken, useSkipDose } from '../hooks/useDoseLogs'
import { formatDoseTime } from '../utils/dates'
import type { ScheduledDose } from '../types'

interface DoseTrackerProps {
  scheduledDose: ScheduledDose
}

export default function DoseTracker({ scheduledDose }: DoseTrackerProps) {
  const { medication, scheduledTime, scheduledAt, logEntry } = scheduledDose
  const markTaken = useMarkDoseTaken()
  const skipDose = useSkipDose()

  const scheduledAtISO = scheduledAt.toISOString()
  const isPending = logEntry === null
  const isTaken = logEntry?.status === 'taken'
  const isSkipped = logEntry?.status === 'skipped'
  const isMissed = logEntry?.status === 'missed'

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
      isTaken   ? 'bg-health-50 border border-health-100'
      : isMissed  ? 'bg-red-50 border border-red-100'
      : isSkipped ? 'bg-slate-50 border border-slate-100'
      : 'bg-white border border-slate-100 hover:border-slate-200'
    }`}>
      {/* Status icon */}
      <div className="shrink-0">
        {isTaken   && <CheckCircle2 size={22} className="text-health-500" />}
        {isSkipped && <SkipForward  size={22} className="text-slate-400" />}
        {isMissed  && <Circle       size={22} className="text-red-400" />}
        {isPending && <Clock        size={22} className="text-slate-300" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{medication.name}</p>
        <p className="text-xs text-slate-500">
          {formatDoseTime(scheduledTime)} · {medication.dose_amount} {medication.quantity_unit}
        </p>
      </div>

      {/* Actions — only if pending */}
      {isPending && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => markTaken.mutate({ medicationId: medication.id, scheduledAt: scheduledAtISO })}
            disabled={markTaken.isPending}
            aria-label={`Tomar ${medication.name}`}
            className="px-3 py-1.5 bg-health-500 hover:bg-health-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            Tomar
          </button>
          <button
            onClick={() => skipDose.mutate({ medicationId: medication.id, scheduledAt: scheduledAtISO })}
            disabled={skipDose.isPending}
            aria-label={`Omitir ${medication.name}`}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            Omitir
          </button>
        </div>
      )}
    </div>
  )
}
