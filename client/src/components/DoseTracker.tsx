import { CheckCircle2, Circle, SkipForward, Clock } from 'lucide-react'
import { useMarkDoseTaken, useSkipDose } from '../hooks/useDoseLogs'
import { formatDoseTime } from '../utils/dates'
import { useToast } from './ui/Toast'
import type { ScheduledDose } from '../types'

interface DoseTrackerProps {
  scheduledDose: ScheduledDose
}

export default function DoseTracker({ scheduledDose }: DoseTrackerProps) {
  const { medication, scheduledTime, scheduledAt, logEntry } = scheduledDose
  const markTaken = useMarkDoseTaken()
  const skipDose = useSkipDose()
  const { toast } = useToast()

  const scheduledAtISO = scheduledAt.toISOString()
  const isPending = logEntry === null
  const isTaken = logEntry?.status === 'taken'
  const isSkipped = logEntry?.status === 'skipped'
  const isMissed = logEntry?.status === 'missed'

  async function handleTake() {
    try {
      await markTaken.mutateAsync({ medicationId: medication.id, scheduledAt: scheduledAtISO })
      toast(`Dosis de ${medication.name} registrada`)
    } catch {
      toast('No se pudo registrar la dosis', 'error')
    }
  }

  async function handleSkip() {
    try {
      await skipDose.mutateAsync({ medicationId: medication.id, scheduledAt: scheduledAtISO })
      toast(`Dosis de ${medication.name} omitida`)
    } catch {
      toast('No se pudo omitir la dosis', 'error')
    }
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
      isTaken   ? 'bg-health-50 dark:bg-health-900/20 border border-health-100 dark:border-health-800'
      : isMissed  ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'
      : isSkipped ? 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800'
      : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
    }`}>
      {/* Status icon */}
      <div className="shrink-0" aria-hidden="true">
        {isTaken   && <CheckCircle2 size={22} className="text-health-500" />}
        {isSkipped && <SkipForward  size={22} className="text-slate-500" />}
        {isMissed  && <Circle       size={22} className="text-red-400" />}
        {isPending && <Clock        size={22} className="text-slate-300" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{medication.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatDoseTime(scheduledTime)} · {medication.dose_amount} {medication.quantity_unit}
        </p>
      </div>

      {/* Actions — only if pending */}
      {isPending && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleTake}
            disabled={markTaken.isPending}
            aria-label={`Tomar ${medication.name}`}
            className="px-3 py-1.5 bg-health-500 hover:bg-health-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60 min-h-[36px]"
          >
            Tomar
          </button>
          <button
            onClick={handleSkip}
            disabled={skipDose.isPending}
            aria-label={`Omitir ${medication.name}`}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-60 min-h-[36px]"
          >
            Omitir
          </button>
        </div>
      )}
    </div>
  )
}
