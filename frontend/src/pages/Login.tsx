import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Activity } from 'lucide-react'

export default function Login() {
  const { login, register } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('client')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await register({ nome, email, senha, tipo })
      } else {
        await login(email, senha)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (t: string) => {
    if (t === 'admin') { setEmail('admin@nutrifit.com'); setSenha('admin123') }
    else if (t === 'pro') { setEmail('carla@nutrifit.com'); setSenha('123456') }
    else { setEmail('joao@email.com'); setSenha('123456') }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Activity className="w-8 h-8 text-emerald-500" />
          <span className="text-2xl font-bold text-white">NutriFit Pro</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isRegister ? 'Criar Conta' : 'Entrar'}
          </h2>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <input type="text" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500" required />
            )}
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500" required />
            <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500" required />

            {isRegister && (
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="client">Cliente</option>
                <option value="professional">Profissional (Nutricionista/Personal)</option>
              </select>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
              {loading ? 'Carregando...' : isRegister ? 'Criar Conta' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => { setIsRegister(!isRegister); setError('') }}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              {isRegister ? 'Já tem conta? Entre' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-3 text-center">Acesso rápido (demo):</p>
            <div className="flex gap-2 justify-center text-xs">
              <button onClick={() => fillDemo('admin')} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors">Admin</button>
              <button onClick={() => fillDemo('pro')} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors">Profissional</button>
              <button onClick={() => fillDemo('client')} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors">Cliente</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
