// client/src/pages/Inventario.tsx
import { useState } from 'react'
import { Plus, Search, FileText, FileSpreadsheet } from 'lucide-react'
import { useMedications } from '../hooks/useMedications'
import { daysUntil } from '../utils/dates'
import { exportInventoryPDF, exportInventoryExcel } from '../services/export'
import MedicationCard from '../components/MedicationCard'
import MedicationForm from '../components/MedicationForm'

type FilterType = 'all' | 'active' | 'lowstock' | 'expiring'

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'Todos', active: 'Activos', lowstock: 'Stock bajo', expiring: 'Por vencer',
}

export default function Inventario() {
  const { data: medications = [], isLoading } = useMedications(false)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<FilterType>('active')
  const [showForm, setShowForm] = useState(false)

  const filtered = medications.filter(m => {
    const matchesSearch  = m.name.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all'      ? true
      : filter === 'active'   ? m.active
      : filter === 'lowstock' ? m.quantity_current <= m.quantity_minimum
      : filter === 'expiring' ? (m.expiration_date != null && daysUntil(m.expiration_date) <= 30)
      : true
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Inventario</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportInventoryPDF(medications.filter(m => m.active))}
            title="Exportar PDF"
            aria-label="Exportar PDF"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <FileText size={16} />
          </button>
          <button
            onClick={() => exportInventoryExcel(medications.filter(m => m.active))}
            title="Exportar Excel"
            aria-label="Exportar Excel"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <FileSpreadsheet size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar medicamento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm bg-white"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(FILTER_LABELS) as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-health-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Medication list */}
      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-12">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">No hay medicamentos.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(m => <MedicationCard key={m.id} medication={m} />)}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        aria-label="Agregar medicamento"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-health-500 hover:bg-health-600 text-white rounded-full shadow-lg shadow-health-200 flex items-center justify-center transition-colors z-20"
      >
        <Plus size={24} />
      </button>

      <MedicationForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
