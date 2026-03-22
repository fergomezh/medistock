// client/src/pages/Dashboard.tsx
import { useMemo } from 'react'
import type { ElementType } from 'react'
import { AlertTriangle, Pill, Bell, Clock } from 'lucide-react'
import { useMedications } from '../hooks/useMedications'
import { useTodayDoseLogs } from '../hooks/useDoseLogs'
import { useUnreadAlertsCount } from '../hooks/useAlerts'
import { buildTodaySchedule } from '../services/doseLogs'
import { daysUntil } from '../utils/dates'
import DoseTracker from '../components/DoseTracker'
import MedicationCard from '../components/MedicationCard'
import { SkeletonCard, SkeletonDoseRow } from '../components/ui/Skeleton'

export default function Dashboard() {
  const { data: medications = [], isLoading: medsLoading } = useMedications()
  const { data: todayLogs = [], isLoading: logsLoading } = useTodayDoseLogs()
  const { data: unreadCount = 0 } = useUnreadAlertsCount()

  const isLoading = medsLoading || logsLoading

  const schedule = useMemo(
    () => buildTodaySchedule(medications, todayLogs),
    [medications, todayLogs]
  )

  const pendingDoses = schedule.filter(d => d.logEntry === null)
  const lowStock = medications.filter(m => m.quantity_current <= m.quantity_minimum)
  const expiringSoon = medications.filter(
    m => m.expiration_date != null &&
         daysUntil(m.expiration_date) >= 0 &&
         daysUntil(m.expiration_date) <= 30
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Resumen de hoy</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Pill}  label="Medicamentos"    value={medications.length} color="green" />
        <StatCard icon={Bell}  label="Alertas"         value={unreadCount}        color={unreadCount > 0 ? 'red' : 'gray'} />
        <StatCard icon={Clock} label="Pendientes"      value={pendingDoses.length} color={pendingDoses.length > 0 ? 'yellow' : 'gray'} />
      </div>

      {/* Today's doses */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Dosis de hoy</h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonDoseRow key={i} />)}
          </div>
        ) : schedule.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No hay dosis programadas para hoy.</p>
        ) : (
          <div className="space-y-2">
            {schedule.map((dose, i) => (
              <DoseTracker key={`${dose.medication.id}-${i}`} scheduledDose={dose} />
            ))}
          </div>
        )}
      </section>

      {/* Low stock */}
      {isLoading ? null : lowStock.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-yellow-500" aria-hidden="true" />
            Stock bajo
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {lowStock.map(m => <MedicationCard key={m.id} medication={m} />)}
          </div>
        </section>
      )}

      {/* Expiring soon */}
      {isLoading ? null : expiringSoon.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" aria-hidden="true" />
            Próximos a vencer
          </h2>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {expiringSoon.map(m => <MedicationCard key={m.id} medication={m} />)}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

interface StatCardProps {
  icon: ElementType
  label: string
  value: number
  color: 'green' | 'red' | 'yellow' | 'gray'
}

const colorMap: Record<StatCardProps['color'], { icon: string; accent: string }> = {
  green:  { icon: 'bg-health-100 dark:bg-health-900/30 text-health-600 dark:text-health-400', accent: '' },
  red:    { icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',             accent: 'border-red-100 dark:border-red-900/50' },
  yellow: { icon: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400', accent: 'border-yellow-100 dark:border-yellow-900/50' },
  gray:   { icon: 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500',        accent: '' },
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const { icon: iconClass, accent } = colorMap[color]
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm p-3.5 flex flex-col gap-2.5 ${accent || 'border-slate-100 dark:border-slate-700'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={17} aria-hidden="true" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-none">{value}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  )
}
