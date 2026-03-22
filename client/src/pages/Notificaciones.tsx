// client/src/pages/Notificaciones.tsx
import type { ElementType } from 'react'
import { Bell, Package, Clock, ShoppingCart, AlertTriangle, Check } from 'lucide-react'
import { useAlerts, useMarkAlertRead, useMarkAllAlertsRead } from '../hooks/useAlerts'
import { formatDate } from '../utils/dates'
import Button from '../components/ui/Button'

const TYPE_ICON: Record<string, ElementType> = {
  low_stock:     Package,
  expiration:    AlertTriangle,
  dose_reminder: Clock,
  restock_date:  ShoppingCart,
}
const TYPE_COLOR: Record<string, string> = {
  low_stock:     'text-yellow-500',
  expiration:    'text-red-500',
  dose_reminder: 'text-blue-500',
  restock_date:  'text-health-500',
}

export default function Notificaciones() {
  const { data: alerts = [], isLoading } = useAlerts()
  const markRead = useMarkAlertRead()
  const markAll  = useMarkAllAlertsRead()

  const unread = alerts.filter(a => !a.is_read)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Notificaciones</h1>
        {unread.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => markAll.mutate()} loading={markAll.isPending}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 text-center py-12">Cargando...</p>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={32} className="mx-auto text-slate-200 mb-3" aria-hidden="true" />
          <p className="text-sm text-slate-500">Sin notificaciones.</p>
        </div>
      ) : (
        // aria-live so screen readers announce changes when alerts are marked read
        <div className="space-y-2" aria-live="polite" aria-atomic="false">
          {alerts.map(alert => {
            const Icon  = TYPE_ICON[alert.type]  ?? Bell
            const color = TYPE_COLOR[alert.type] ?? 'text-slate-500'
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3 transition-opacity ${
                  alert.is_read ? 'border-slate-100 opacity-60' : 'border-health-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 ${color}`}>
                  <Icon size={16} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(alert.triggered_at)}</p>
                  {/* Read state as text, not opacity-only — satisfies color-not-only */}
                  {alert.is_read && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-slate-400">
                      <Check size={11} aria-hidden="true" />
                      Leída
                    </span>
                  )}
                </div>
                {!alert.is_read && (
                  <button
                    onClick={() => markRead.mutate(alert.id)}
                    aria-label="Marcar como leída"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center px-2 text-xs text-health-600 hover:text-health-700 font-medium shrink-0 rounded-lg hover:bg-health-50 transition-colors"
                  >
                    Leer
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
