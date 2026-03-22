import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ClipboardList, Settings, LogOut, Pill } from 'lucide-react'
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
      {/* Skip to main content — visible on focus only */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-health-500 focus:text-white focus:rounded-xl focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Ir al contenido principal
      </a>

      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-health-400 to-health-600 rounded-xl flex items-center justify-center shadow-sm shadow-health-200">
              <Pill size={16} className="text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-slate-900 text-sm hidden sm:block tracking-tight">MediStock</span>
          </NavLink>

          {/* Nav links — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-0.5" aria-label="Navegación principal">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-health-50 text-health-700 shadow-[inset_0_0_0_1px_rgb(134,239,172,0.4)]'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right side: bell + logout, clearly separated */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            {/* Visual + spatial gap before destructive logout action */}
            <div className="h-6 w-px bg-slate-200 mx-1" aria-hidden="true" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors text-sm font-medium"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100 flex shadow-[0_-1px_8px_0_rgb(0,0,0,0.05)]" aria-label="Navegación principal">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-h-[44px] justify-center relative ${
                isActive ? 'text-health-600' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-health-500 rounded-full" aria-hidden="true" />
                )}
                <Icon size={18} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Page content */}
      <main id="main-content" className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-24 md:pb-6" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}
