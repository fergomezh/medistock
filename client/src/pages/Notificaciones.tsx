// client/src/pages/Notificaciones.tsx
import type { ElementType } from 'react'
import { Bell, Package, Clock, ShoppingCart, AlertTriangle } from 'lucide-react'
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
        <h1 className="text-xl font-bold text-slate-900">Notificaciones</h1>
        {unread.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => markAll.mutate()} loading={markAll.isPending}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-12">Cargando...</p>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-400">Sin notificaciones.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const Icon  = TYPE_ICON[alert.type]  ?? Bell
            const color = TYPE_COLOR[alert.type] ?? 'text-slate-400'
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3 transition-opacity ${
                  alert.is_read ? 'border-slate-100 opacity-60' : 'border-health-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 ${color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{alert.message}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(alert.triggered_at)}</p>
                </div>
                {!alert.is_read && (
                  <button
                    onClick={() => markRead.mutate(alert.id)}
                    className="text-xs text-health-600 hover:text-health-700 font-medium shrink-0 mt-0.5"
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
