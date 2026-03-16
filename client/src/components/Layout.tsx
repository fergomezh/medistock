import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ClipboardList, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

const navLinks = [
  { to: '/dashboard',      label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/inventario',     label: 'Inventario',    icon: Package },
  { to: '/historial',      label: 'Historial',     icon: ClipboardList },
  { to: '/configuracion',  label: 'Configuración', icon: Settings },
]

interface LayoutProps { children: ReactNode }

export default function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-health-500 rounded-lg flex items-center justify-center shadow-sm shadow-health-200">
              <span className="text-white text-sm">💊</span>
            </div>
            <span className="font-bold text-slate-900 text-sm hidden sm:block">MediStock</span>
          </NavLink>

          {/* Nav links — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-health-50 text-health-700'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="h-6 w-px bg-slate-200" />
            <button
              onClick={handleSignOut}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 flex" aria-label="Navegación principal">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-health-600' : 'text-slate-400'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  )
}
