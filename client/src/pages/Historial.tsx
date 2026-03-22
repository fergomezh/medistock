// client/src/pages/Historial.tsx
import { useState, useMemo } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { useAllDoseLogs } from '../hooks/useDoseLogs'
import { useMedications } from '../hooks/useMedications'
import { formatDate, formatDoseTime } from '../utils/dates'
import { exportHistorialExcel } from '../services/export'
import type { DoseLogWithMedication } from '../services/doseLogs'

type StatusFilter = 'all' | 'taken' | 'skipped' | 'missed'

const STATUS_LABEL: Record<string, string> = {
  taken: 'Tomada', skipped: 'Omitida', missed: 'Perdida',
}
const STATUS_COLOR: Record<string, string> = {
  taken: 'text-health-600', skipped: 'text-slate-400', missed: 'text-red-500',
}

export default function Historial() {
  const { data: logs = [], isLoading } = useAllDoseLogs()
  const { data: medications = [] } = useMedications(false)

  const [medFilter, setMedFilter]       = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')

  const filtered = useMemo(() => logs.filter(log => {
    if (medFilter !== 'all'    && log.medication_id !== medFilter) return false
    if (statusFilter !== 'all' && log.status        !== statusFilter) return false
    if (dateFrom && log.scheduled_at < dateFrom)              return false
    if (dateTo   && log.scheduled_at > dateTo + 'T23:59:59') return false
    return true
  }), [logs, medFilter, statusFilter, dateFrom, dateTo])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Historial de tomas</h1>
        <button
          onClick={() => exportHistorialExcel(medications, logs as DoseLogWithMedication[])}
          title="Exportar Excel"
          aria-label="Exportar Excel"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <FileSpreadsheet size={16} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label htmlFor="hist-med" className="block text-xs font-medium text-slate-500 mb-1">
            Medicamento
          </label>
          <select
            id="hist-med"
            value={medFilter}
            onChange={e => setMedFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-health-400"
          >
            <option value="all">Todos</option>
            {medications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="hist-status" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Estado
          </label>
          <select
            id="hist-status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-health-400"
          >
            <option value="all">Todos</option>
            <option value="taken">Tomada</option>
            <option value="skipped">Omitida</option>
            <option value="missed">Perdida</option>
          </select>
        </div>
        <div>
          <label htmlFor="hist-from" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Desde
          </label>
          <input
            id="hist-from"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-health-400"
          />
        </div>
        <div>
          <label htmlFor="hist-to" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Hasta
          </label>
          <input
            id="hist-to"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-health-400"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-12">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">Sin registros.</p>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Medicamento</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Programada</th>
                <th className="text-left px-4 py-3">Tomada</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map(log => (
                <tr key={log.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{(log as any).medication?.name ?? ''}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatDate(log.scheduled_at)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDoseTime(log.scheduled_at.slice(11, 16))}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {log.taken_at ? formatDoseTime(log.taken_at.slice(11, 16)) : '—'}
                  </td>
                  <td className={`px-4 py-3 font-medium ${STATUS_COLOR[log.status] ?? ''}`}>
                    {STATUS_LABEL[log.status] ?? log.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
