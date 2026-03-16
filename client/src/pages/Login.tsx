import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError('Credenciales incorrectas. Verificá tu email y contraseña.')
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-health-50 to-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-health-500 rounded-2xl mb-3 shadow-lg shadow-health-200">
            <span className="text-white text-2xl">💊</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MediStock</h1>
          <p className="text-slate-500 text-sm mt-1">Iniciá sesión en tu cuenta</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
              placeholder="tu@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
              placeholder="••••••••" />
          </div>
          <div className="text-right">
            <Link to="/reset-password" className="text-xs text-health-600 hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-health-500 hover:bg-health-600 text-white font-medium rounded-xl transition-colors disabled:opacity-60">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-health-600 font-medium hover:underline">Registrate</Link>
        </p>
      </div>
    </div>
  )
}
