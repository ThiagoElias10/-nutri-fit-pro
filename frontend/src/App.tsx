import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Assessments from './pages/Assessments'
import MealPlans from './pages/MealPlans'
import FoodDiary from './pages/FoodDiary'
import Workouts from './pages/Workouts'
import Progress from './pages/Progress'
import Admin from './pages/Admin'
import Profile from './pages/Profile'

function App() {
  const { user, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/avaliacoes" element={<Assessments />} />
        <Route path="/planos-alimentares" element={<MealPlans />} />
        <Route path="/diario" element={<FoodDiary />} />
        <Route path="/treinos" element={<Workouts />} />
        <Route path="/progresso" element={<Progress />} />
        {(user?.tipo === 'professional' || user?.tipo === 'admin') && (
          <Route path="/clientes" element={<Clients />} />
        )}
        {user?.tipo === 'admin' && (
          <Route path="/admin" element={<Admin />} />
        )}
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
