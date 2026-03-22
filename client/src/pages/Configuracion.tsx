// client/src/pages/Configuracion.tsx
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import Button from '../components/ui/Button'

export default function Configuracion() {
  const { user, resetPassword } = useAuth()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()

  const [name, setName]               = useState('')
  const [notifEmail, setNotifEmail]   = useState('')
  const [marginDays, setMarginDays]   = useState(5)
  const [dailySummary, setDailySummary] = useState(true)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [pwSent, setPwSent]           = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? '')
      setNotifEmail(profile.notification_email ?? '')
      setMarginDays(profile.restock_margin_days ?? 5)
      setDailySummary(profile.daily_summary_enabled ?? true)
    }
  }, [profile])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    try {
      await updateProfile.mutateAsync({
        full_name: name,
        notification_email: notifEmail || null,
        restock_margin_days: marginDays,
        daily_summary_enabled: dailySummary,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.')
    }
  }

  async function handleResetPassword() {
    if (!user?.email) return
    await resetPassword(user.email)
    setPwSent(true)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">Configuración</h1>

      {/* Profile form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Perfil</h2>

        {success && (
          <div className="bg-health-50 text-health-700 text-sm px-4 py-3 rounded-xl border border-health-200">
            Cambios guardados correctamente.
          </div>
        )}
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="cfg-name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nombre
          </label>
          <input
            id="cfg-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
          />
        </div>

        <div>
          <label htmlFor="cfg-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email (cuenta)
          </label>
          <input
            id="cfg-email"
            type="email"
            value={user?.email ?? ''}
            disabled
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="cfg-notif-email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email para notificaciones
          </label>
          <input
            id="cfg-notif-email"
            type="email"
            value={notifEmail}
            onChange={e => setNotifEmail(e.target.value)}
            placeholder={user?.email ?? ''}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">
            Si está vacío, se usará el email de la cuenta.
          </p>
        </div>

        <div>
          <label htmlFor="cfg-margin" className="block text-sm font-medium text-slate-700 mb-1.5">
            Días de margen para recompra
          </label>
          <input
            id="cfg-margin"
            type="number"
            min="1"
            max="30"
            value={marginDays}
            onChange={e => setMarginDays(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="cfg-summary"
            type="checkbox"
            checked={dailySummary}
            onChange={e => setDailySummary(e.target.checked)}
            className="w-4 h-4 rounded text-health-500 border-slate-300 focus:ring-health-400"
          />
          <label htmlFor="cfg-summary" className="text-sm text-slate-700">
            Recibir resumen diario por email
          </label>
        </div>

        <Button type="submit" loading={updateProfile.isPending} className="w-full">
          Guardar cambios
        </Button>
      </form>

      {/* Password change */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Seguridad</h2>
        {pwSent ? (
          <p className="text-sm text-health-600">
            Email de restablecimiento enviado. Revisá tu bandeja de entrada.
          </p>
        ) : (
          <Button variant="secondary" onClick={handleResetPassword} className="w-full">
            Cambiar contraseña
          </Button>
        )}
      </div>
    </div>
  )
}
