import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Activity, Eye, EyeOff, ArrowLeft, Check, X } from 'lucide-react'

export default function Login() {
  const { login, register } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('client')
  const [isRegister, setIsRegister] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetStep, setResetStep] = useState<'email' | 'token'>('email')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const passwordChecks = {
    length: senha.length >= 8,
    upper: /[A-Z]/.test(senha),
    number: /[0-9]/.test(senha),
  }
  const isPasswordValid = Object.values(passwordChecks).every(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        if (!isPasswordValid) { setError('A senha não atende os requisitos'); setLoading(false); return }
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

  const handleForgotPassword = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro)
      setSuccess('Token gerado! Verifique o console do servidor.')
      if (data.token) setResetToken(data.token)
      setResetStep('token')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/recuperar/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, nova_senha: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro)
      setSuccess('Senha redefinida com sucesso!')
      setTimeout(() => { setIsForgotPassword(false); setResetStep('email'); setSuccess('') }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Activity className="w-8 h-8 text-emerald-500" />
            <span className="text-2xl font-bold text-white">NutriFit Pro</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <button onClick={() => { setIsForgotPassword(false); setError(''); setSuccess('') }}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar ao login
            </button>
            <h2 className="text-xl font-semibold text-white mb-6">Recuperar Senha</h2>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}
            {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-sm mb-4">{success}</div>}
            {resetStep === 'email' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">Digite seu email para receber um token de recuperação.</p>
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="Seu email"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <button onClick={handleForgotPassword} disabled={loading || !resetEmail}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
                  {loading ? 'Enviando...' : 'Enviar Token'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400"> Cole o token recebido e defina sua nova senha.</p>
                <input value={resetToken} onChange={e => setResetToken(e.target.value)} placeholder="Token de recuperação"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nova senha (mín. 8 caracteres)"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <button onClick={handleResetPassword} disabled={loading || !resetToken || newPassword.length < 8}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
                  {loading ? 'Redefinindo...' : 'Redefinir Senha'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
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
            {isRegister ? 'Criar sua conta' : 'Bem-vindo de volta'}
          </h2>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <input type="text" placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500" required />
            )}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500" required />
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-500 pr-10" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {isRegister && (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: '8+ caracteres', valid: passwordChecks.length },
                    { label: 'Letra maiúscula', valid: passwordChecks.upper },
                    { label: 'Número', valid: passwordChecks.number },
                  ].map(check => (
                    <div key={check.label} className={`flex items-center gap-1.5 ${check.valid ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {check.valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {check.label}
                    </div>
                  ))}
                </div>
                <select value={tipo} onChange={e => setTipo(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="client">Cliente</option>
                  <option value="professional">Profissional (Nutricionista/Personal)</option>
                </select>
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50">
              {loading ? 'Carregando...' : isRegister ? 'Criar Conta' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            {!isRegister && (
              <button onClick={() => setIsForgotPassword(true)}
                className="text-sm text-gray-500 hover:text-emerald-400 transition-colors">
                Esqueceu a senha?
              </button>
            )}
            <button onClick={() => { setIsRegister(!isRegister); setError('') }}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors block w-full">
              {isRegister ? 'Já tem conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
