import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Pill } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/ui/PasswordInput'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setError(null)
    setLoading(true)
    const { error, session } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) {
      setError(error)
    } else if (session) {
      navigate('/dashboard')
    } else {
      setError(null)
      setMessage('¡Cuenta creada! Revisá tu email para confirmar tu cuenta antes de iniciar sesión.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-health-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-health-400 to-health-600 rounded-2xl mb-4 shadow-lg shadow-health-200/60">
            <Pill size={26} className="text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MediStock</h1>
          <p className="text-slate-500 text-sm mt-1">Creá tu cuenta gratis</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-md shadow-slate-100 border border-slate-100 p-6 space-y-4">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
          )}
          {message && (
            <div role="status" className="bg-health-50 text-health-700 text-sm px-4 py-3 rounded-xl border border-health-100">{message}</div>
          )}
          <div>
            <label htmlFor="reg-fullname" className="block text-sm font-medium text-slate-700 mb-1.5">Nombre completo</label>
            <input
              id="reg-fullname"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
            <PasswordInput
              id="reg-password"
              value={password}
              onChange={setPassword}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-health-500 hover:bg-health-600 text-white font-medium rounded-xl transition-colors disabled:opacity-60">
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-health-600 font-medium hover:underline">Iniciá sesión</Link>
        </p>
      </div>
    </div>
  )
}
