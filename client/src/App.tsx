import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AuthGuard from './components/AuthGuard'
import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import MedicamentoDetalle from './pages/MedicamentoDetalle'

const Historial = lazy(() => import('./pages/Historial'))
const Notificaciones = lazy(() => import('./pages/Notificaciones'))
const Configuracion = lazy(() => import('./pages/Configuracion'))

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-7 h-7 border-4 border-health-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const { loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-health-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<AuthGuard />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/medicamentos/:id" element={<MedicamentoDetalle />} />
        <Route path="/historial" element={<Suspense fallback={<PageLoader />}><Historial /></Suspense>} />
        <Route path="/notificaciones" element={<Suspense fallback={<PageLoader />}><Notificaciones /></Suspense>} />
        <Route path="/configuracion" element={<Suspense fallback={<PageLoader />}><Configuracion /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
