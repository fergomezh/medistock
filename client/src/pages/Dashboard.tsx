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

export default function Dashboard() {
  const { data: medications = [] } = useMedications()
  const { data: todayLogs = [] } = useTodayDoseLogs()
  const { data: unreadCount = 0 } = useUnreadAlertsCount()

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
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Resumen de hoy</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Pill}  label="Medicamentos"    value={medications.length} color="green" />
        <StatCard icon={Bell}  label="Alertas"         value={unreadCount}        color={unreadCount > 0 ? 'red' : 'gray'} />
        <StatCard icon={Clock} label="Dosis pendientes" value={pendingDoses.length} color={pendingDoses.length > 0 ? 'yellow' : 'gray'} />
      </div>

      {/* Today's doses */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Dosis de hoy</h2>
        {schedule.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No hay dosis programadas para hoy.</p>
        ) : (
          <div className="space-y-2">
            {schedule.map((dose, i) => (
              <DoseTracker key={`${dose.medication.id}-${i}`} scheduledDose={dose} />
            ))}
          </div>
        )}
      </section>

      {/* Low stock */}
      {lowStock.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-500" />
            Stock bajo
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {lowStock.map(m => <MedicationCard key={m.id} medication={m} />)}
          </div>
        </section>
      )}

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            Próximos a vencer
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {expiringSoon.map(m => <MedicationCard key={m.id} medication={m} />)}
          </div>
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

const colorMap: Record<StatCardProps['color'], string> = {
  green:  'bg-health-50 text-health-600',
  red:    'bg-red-50 text-red-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  gray:   'bg-slate-50 text-slate-400',
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}
