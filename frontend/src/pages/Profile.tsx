import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { UserCircle } from 'lucide-react'

export default function Profile() {
  const { user } = useAuth()
  const [nome, setNome] = useState(user?.nome || '')
  const [telefone, setTelefone] = useState(user?.telefone || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setSaving(true)
    try {
      await api.auth.update({ nome, telefone })
      setMsg('Salvo!')
      setTimeout(() => setMsg(''), 2000)
    } catch (e: any) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <UserCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{user?.nome}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full capitalize">{user?.tipo}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Telefone</label>
            <input value={telefone} onChange={e => setTelefone(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Email</label>
            <input value={user?.email || ''} disabled
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-500 text-sm cursor-not-allowed" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          {msg && <span className="text-sm text-emerald-400">{msg}</span>}
        </div>
      </div>

      {user?.tipo === 'client' && user?.profissional && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-3">Profissional Vinculado</h2>
          <p className="text-gray-300">{user.profissional.nome}</p>
          <p className="text-sm text-gray-500">{user.profissional.email}</p>
        </div>
      )}
    </div>
  )
}
