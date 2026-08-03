import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, ClipboardList, UtensilsCrossed,
  Dumbbell, TrendingUp, UserCircle, LogOut, Menu, X, Shield,
  Activity,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const clientNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/avaliacoes', icon: Activity, label: 'Avaliações' },
  { to: /^\/planos-alimentares/.test(window.location.pathname) || window.location.pathname === '/diario' ? undefined : '/planos-alimentares', icon: ClipboardList, label: 'Planos' },
  { to: '/diario', icon: UtensilsCrossed, label: 'Diário Alimentar' },
  { to: '/treinos', icon: Dumbbell, label: 'Treinos' },
  { to: '/progresso', icon: TrendingUp, label: 'Progresso' },
]

const professionalNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/avaliacoes', icon: Activity, label: 'Avaliações' },
  { to: '/planos-alimentares', icon: ClipboardList, label: 'Planos' },
  { to: '/treinos', icon: Dumbbell, label: 'Treinos' },
]

const adminNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin', icon: Shield, label: 'Admin' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = user?.tipo === 'admin' ? adminNav
    : user?.tipo === 'professional' ? professionalNav
    : clientNav.filter(Boolean)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-800">
          <Link to="/" className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            <span className="font-bold text-lg text-white">NutriFit</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={label}
              to={to!}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
              {user?.nome.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.nome}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.tipo === 'professional' ? 'Profissional' : user?.tipo}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <Link to="/perfil" className="text-sm text-gray-400 hover:text-white transition-colors">
              <UserCircle className="w-6 h-6" />
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
