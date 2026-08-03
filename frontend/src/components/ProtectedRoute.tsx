import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, types }: { children: React.ReactNode; types?: string[] }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (types && !types.includes(user.tipo)) return <Navigate to="/" replace />

  return <>{children}</>
}
