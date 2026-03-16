import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pill } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import PasswordInput from '../components/ui/PasswordInput'

export default function ResetPassword() {
  const { updatePassword, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'request' | 'update'>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('update')
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleRequest(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) setError(error)
    else setMessage('Revisá tu email para el link de recuperación.')
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Mínimo 6 caracteres.'); return }
    setError(null)
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) setError(error)
    else { setMessage('Contraseña actualizada.'); setTimeout(() => navigate('/dashboard'), 1500) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-health-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-health-500 rounded-2xl mb-3 shadow-lg shadow-health-200">
            <Pill size={26} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MediStock</h1>
          <p className="text-slate-500 text-sm mt-1">
            {mode === 'request' ? 'Recuperar contraseña' : 'Nueva contraseña'}
          </p>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
          )}
          {message && (
            <div role="status" className="bg-health-50 text-health-700 text-sm px-4 py-3 rounded-xl border border-health-100">{message}</div>
          )}
          {mode === 'request' ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
                  placeholder="tu@email.com"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-health-500 hover:bg-health-600 text-white font-medium rounded-xl transition-colors disabled:opacity-60">
                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label htmlFor="reset-new-password" className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
                <PasswordInput
                  id="reset-new-password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  required
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-health-500 hover:bg-health-600 text-white font-medium rounded-xl transition-colors disabled:opacity-60">
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
