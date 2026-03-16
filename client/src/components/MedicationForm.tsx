import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { useCreateMedication, useUpdateMedication } from '../hooks/useMedications'
import type { Medication, MedicationFormData } from '../types'

interface MedicationFormProps {
  open: boolean
  onClose: () => void
  medication?: Medication
}

const EMPTY_FORM: MedicationFormData = {
  name: '',
  description: '',
  quantity_current: 0,
  quantity_minimum: 5,
  quantity_unit: 'pastillas',
  dose_amount: 1,
  dose_frequency: 'diaria',
  dose_times: ['08:00'],
  expiration_date: null,
  purchase_date: null,
  active: true,
}

const UNIT_OPTIONS = ['pastillas', 'cápsulas', 'ml', 'gotas', 'comprimidos', 'sobres', 'unidades']

export default function MedicationForm({ open, onClose, medication }: MedicationFormProps) {
  const [form, setForm] = useState<MedicationFormData>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const createMutation = useCreateMedication()
  const updateMutation = useUpdateMedication()
  const isEditing = !!medication
  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (medication) {
      const { id: _id, user_id: _uid, created_at: _ca, ...rest } = medication
      setForm({ ...rest, dose_times: medication.dose_times ?? ['08:00'] })
    } else {
      setForm(EMPTY_FORM)
    }
    setError(null)
  }, [medication?.id, open])

  function setField<K extends keyof MedicationFormData>(key: K, value: MedicationFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function addDoseTime() {
    setForm(prev => ({ ...prev, dose_times: [...prev.dose_times, '12:00'] }))
  }

  function updateDoseTime(index: number, value: string) {
    const updated = [...form.dose_times]
    updated[index] = value
    setField('dose_times', updated)
  }

  function removeDoseTime(index: number) {
    setField('dose_times', form.dose_times.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    if (form.dose_times.length === 0) { setError('Agregá al menos un horario de dosis.'); return }
    setError(null)

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: medication!.id, payload: form })
      } else {
        await createMutation.mutateAsync(form)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al guardar.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar medicamento' : 'Nuevo medicamento'} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
        )}

        <div>
          <label htmlFor="med-name" className="block text-sm font-medium text-slate-700 mb-1.5">Nombre *</label>
          <input id="med-name" type="text" value={form.name} onChange={e => setField('name', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
            placeholder="Ej: Ibuprofeno 400mg" />
        </div>

        <div>
          <label htmlFor="med-description" className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
          <input id="med-description" type="text" value={form.description ?? ''} onChange={e => setField('description', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
            placeholder="Opcional" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="med-qty-current" className="block text-sm font-medium text-slate-700 mb-1.5">Stock actual</label>
            <input id="med-qty-current" type="number" min="0" value={form.quantity_current}
              onChange={e => setField('quantity_current', Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
          </div>
          <div>
            <label htmlFor="med-qty-min" className="block text-sm font-medium text-slate-700 mb-1.5">Stock mínimo</label>
            <input id="med-qty-min" type="number" min="0" value={form.quantity_minimum}
              onChange={e => setField('quantity_minimum', Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
          </div>
          <div>
            <label htmlFor="med-qty-unit" className="block text-sm font-medium text-slate-700 mb-1.5">Unidad</label>
            <select id="med-qty-unit" value={form.quantity_unit} onChange={e => setField('quantity_unit', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm bg-white">
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="med-dose-amount" className="block text-sm font-medium text-slate-700 mb-1.5">Dosis por toma</label>
            <input id="med-dose-amount" type="number" min="0.1" step="0.1" value={form.dose_amount}
              onChange={e => setField('dose_amount', Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
          </div>
          <div>
            <label htmlFor="med-dose-freq" className="block text-sm font-medium text-slate-700 mb-1.5">Frecuencia</label>
            <input id="med-dose-freq" type="text" value={form.dose_frequency ?? ''} onChange={e => setField('dose_frequency', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
              placeholder="Ej: diaria, cada 8 horas" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="block text-sm font-medium text-slate-700">Horarios de toma</span>
            <button type="button" onClick={addDoseTime}
              className="text-xs text-health-600 hover:text-health-700 flex items-center gap-1 font-medium">
              <Plus size={13} /> Agregar
            </button>
          </div>
          <div className="space-y-2">
            {form.dose_times.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <label htmlFor={`med-dose-time-${i}`} className="sr-only">Horario {i + 1}</label>
                <input id={`med-dose-time-${i}`} type="time" value={t} onChange={e => updateDoseTime(i, e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
                {form.dose_times.length > 1 && (
                  <button type="button" onClick={() => removeDoseTime(i)}
                    aria-label={`Eliminar horario ${i + 1}`}
                    className="w-9 h-9 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="med-expiration" className="block text-sm font-medium text-slate-700 mb-1.5">Fecha de vencimiento</label>
            <input id="med-expiration" type="date" value={form.expiration_date ?? ''}
              onChange={e => setField('expiration_date', e.target.value || null)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
          </div>
          <div>
            <label htmlFor="med-purchase" className="block text-sm font-medium text-slate-700 mb-1.5">Fecha de compra</label>
            <input id="med-purchase" type="date" value={form.purchase_date ?? ''}
              onChange={e => setField('purchase_date', e.target.value || null)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isPending} className="flex-1">
            {isEditing ? 'Guardar cambios' : 'Crear medicamento'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
