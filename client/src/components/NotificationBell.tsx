import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUnreadAlertsCount } from '../hooks/useAlerts'

export default function NotificationBell() {
  const navigate = useNavigate()
  const { data: count = 0 } = useUnreadAlertsCount()

  return (
    <button
      onClick={() => navigate('/notificaciones')}
      className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 transition-colors"
      aria-label={`Notificaciones${count > 0 ? ` (${count} sin leer)` : ''}`}
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
