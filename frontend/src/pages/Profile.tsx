import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { UserCircle, Lock, Download, Eye, EyeOff } from 'lucide-react'

export default function Profile() {
  const { user } = useAuth()
  const [nome, setNome] = useState(user?.nome || '')
  const [telefone, setTelefone] = useState(user?.telefone || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [changingSenha, setChangingSenha] = useState(false)
  const [senhaMsg, setSenhaMsg] = useState('')

  const [exporting, setExporting] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await api.auth.update({ nome, telefone })
      setMsg('Salvo!')
      setTimeout(() => setMsg(''), 2000)
    } catch (e: any) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  const changePassword = async () => {
    if (!senhaAtual || !novaSenha) return
    if (novaSenha.length < 8) { setSenhaMsg('Mínimo 8 caracteres'); return }
    setChangingSenha(true)
    try {
      await api.auth.changePassword(senhaAtual, novaSenha)
      setSenhaMsg('Senha alterada com sucesso!')
      setSenhaAtual('')
      setNovaSenha('')
      setTimeout(() => setSenhaMsg(''), 3000)
    } catch (e: any) { setSenhaMsg(e.message) }
    finally { setChangingSenha(false) }
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const data = await api.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nutrifit-dados-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { alert('Erro ao exportar: ' + e.message) }
    finally { setExporting(false) }
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
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full capitalize">
              {user?.tipo === 'professional' ? 'Profissional' : user?.tipo === 'client' ? 'Cliente' : 'Admin'}
            </span>
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

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2"><Lock className="w-4 h-4" /> Alterar Senha</h2>
        <div className="space-y-3">
          <div className="relative">
            <label className="text-sm text-gray-400 mb-1 block">Senha Atual</label>
            <input type={showSenha ? 'text' : 'password'} value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10" />
          </div>
          <div className="relative">
            <label className="text-sm text-gray-400 mb-1 block">Nova Senha</label>
            <input type={showSenha ? 'text' : 'password'} value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10" />
            <button type="button" onClick={() => setShowSenha(!showSenha)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-300">
              {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={changePassword} disabled={changingSenha || !senhaAtual || !novaSenha}
              className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
              {changingSenha ? 'Alterando...' : 'Alterar Senha'}
            </button>
            {senhaMsg && <span className={`text-sm ${senhaMsg.includes('sucesso') ? 'text-emerald-400' : 'text-red-400'}`}>{senhaMsg}</span>}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2"><Download className="w-4 h-4" /> Exportar Dados</h2>
        <p className="text-sm text-gray-400">Baixe uma cópia de todos os seus dados em formato JSON.</p>
        <button onClick={exportData} disabled={exporting}
          className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2">
          <Download className="w-4 h-4" /> {exporting ? 'Exportando...' : 'Exportar Todos os Dados'}
        </button>
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
