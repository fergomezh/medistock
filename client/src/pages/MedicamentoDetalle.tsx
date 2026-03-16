// client/src/pages/MedicamentoDetalle.tsx
import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, PowerOff } from 'lucide-react'
import { useMedicationById, useUpdateMedication } from '../hooks/useMedications'
import { useDoseLogsByMedicationId } from '../hooks/useDoseLogs'
import { formatDate, formatDoseTime } from '../utils/dates'
import StockBadge from '../components/StockBadge'
import ExpirationBadge from '../components/ExpirationBadge'
import RestockDateChip from '../components/RestockDateChip'
import MedicationForm from '../components/MedicationForm'
import Button from '../components/ui/Button'

const STATUS_LABEL: Record<string, string> = {
  taken: 'Tomada', skipped: 'Omitida', missed: 'Perdida',
}
const STATUS_COLOR: Record<string, string> = {
  taken: 'text-health-600', skipped: 'text-slate-500', missed: 'text-red-500',
}

export default function MedicamentoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const editBtnRef = useRef<HTMLButtonElement>(null)

  const { data: medication, isLoading } = useMedicationById(id!)
  const { data: doseLogs = [] } = useDoseLogsByMedicationId(id!)
  const updateMutation = useUpdateMedication()

  if (isLoading) return <p className="text-sm text-slate-500 text-center py-12">Cargando...</p>
  if (!medication) return <p className="text-sm text-red-500 text-center py-12">Medicamento no encontrado.</p>

  async function handleDeactivate() {
    if (!confirm('¿Desactivar este medicamento? No se podrán marcar dosis nuevas.')) return
    await updateMutation.mutateAsync({ id: medication!.id, payload: { active: false } })
    navigate('/inventario')
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={16} /> Volver
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{medication.name}</h1>
            {medication.description && (
              <p className="text-sm text-slate-500 mt-1">{medication.description}</p>
            )}
            {!medication.active && (
              <span className="inline-block mt-2 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                Inactivo
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button ref={editBtnRef} size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
              <Edit2 size={13} /> Editar
            </Button>
            {medication.active && (
              <Button
                size="sm"
                variant="danger"
                onClick={handleDeactivate}
                loading={updateMutation.isPending}
              >
                <PowerOff size={13} /> Desactivar
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <StockBadge medication={medication} />
          <ExpirationBadge expirationDate={medication.expiration_date} />
        </div>
        <div className="mt-3">
          <RestockDateChip medication={medication} />
        </div>

        {/* Dose schedule */}
        <div className="mt-5 pt-5 border-t border-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Horarios de toma
          </p>
          <div className="flex flex-wrap gap-2">
            {(medication.dose_times ?? []).map((t, i) => (
              <span key={i} className="px-3 py-1 bg-health-50 text-health-700 rounded-full text-sm font-medium">
                {formatDoseTime(t)}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {medication.dose_amount} {medication.quantity_unit} por toma · {medication.dose_frequency}
          </p>
        </div>
      </div>

      {/* Dose history */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Historial de tomas</h2>
        {doseLogs.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Sin historial de tomas.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Programada</th>
                  <th className="text-left px-4 py-3">Tomada</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {doseLogs.map(log => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-slate-700">{formatDate(log.scheduled_at)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDoseTime(log.scheduled_at.slice(11, 16))}</td>
                    <td className="px-4 py-3 text-slate-500">
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
      </section>

      <MedicationForm open={showEdit} onClose={() => setShowEdit(false)} medication={medication} triggerRef={editBtnRef} />
    </div>
  )
}
