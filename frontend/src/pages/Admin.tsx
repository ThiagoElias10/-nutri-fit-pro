import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Shield, Users, Activity, ClipboardList, TrendingUp, Search, Edit, Trash2, X, Save } from 'lucide-react'

const OBJETIVO_LABEL: Record<string, string> = {
  cutting: 'Emagrecer', maintenance: 'Manter Peso', bulking: 'Ganhar Massa',
  hipertrofia: 'Hipertrofia', emagrecimento: 'Emagrecimento', forca: 'Força',
  definicao: 'Definição', condicionamento: 'Condicionamento',
}

export default function Admin() {
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editForm, setEditForm] = useState({ nome: '', email: '', tipo: '', plano: '', nova_senha: '' })

  useEffect(() => { loadStats() }, [])
  useEffect(() => { loadUsers() }, [search, tipoFilter, page])

  const loadStats = async () => {
    const s = await api.admin.stats()
    setStats(s)
  }

  const loadUsers = async () => {
    const r = await api.admin.users({ busca: search || undefined, tipo: tipoFilter || undefined, pagina: page })
    setUsers(r.dados || [])
    setPagination(r.paginacao)
  }

  const startEdit = (u: any) => {
    setEditingUser(u)
    setEditForm({ nome: u.nome, email: u.email, tipo: u.tipo, plano: u.plano, nova_senha: '' })
  }

  const saveUser = async () => {
    if (!editingUser) return
    const payload: any = {}
    if (editForm.nome !== editingUser.nome) payload.nome = editForm.nome
    if (editForm.email !== editingUser.email) payload.email = editForm.email
    if (editForm.tipo !== editingUser.tipo) payload.tipo = editForm.tipo
    if (editForm.plano !== editingUser.plano) payload.plano = editForm.plano
    if (editForm.nova_senha) payload.nova_senha = editForm.nova_senha
    if (Object.keys(payload).length === 0) { setEditingUser(null); return }
    await api.admin.updateUser(editingUser.id, payload)
    setEditingUser(null)
    loadUsers()
    loadStats()
  }

  const toggleActive = async (u: any) => {
    await api.admin.updateUser(u.id, { ativo: !u.ativo } as any)
    loadUsers()
  }

  const deleteUser = async (u: any) => {
    if (!confirm(`Desativar ${u.nome}?`)) return
    await api.admin.deleteUser(u.id)
    loadUsers()
    loadStats()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-500" /> Administração
        </h1>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <Users className="w-5 h-5 text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalUsuarios}</p>
            <p className="text-sm text-gray-400">Usuários</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <Activity className="w-5 h-5 text-emerald-500 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalAvaliacoes}</p>
            <p className="text-sm text-gray-400">Avaliações</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <ClipboardList className="w-5 h-5 text-violet-500 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalPlanos}</p>
            <p className="text-sm text-gray-400">Planos</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <TrendingUp className="w-5 h-5 text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalTreinos}</p>
            <p className="text-sm text-gray-400">Treinos</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats?.byType?.map((t: any) => (
          <div key={t.tipo} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-between items-center">
            <span className="text-gray-300 capitalize">{t.tipo === 'client' ? 'Clientes' : t.tipo === 'professional' ? 'Profissionais' : 'Admins'}</span>
            <span className="text-white font-bold">{t.total}</span>
          </div>
        ))}
        {stats?.objetivos?.map((o: any) => (
          <div key={o.objetivo} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-between items-center">
            <span className="text-gray-300">{OBJETIVO_LABEL[o.objetivo] || o.objetivo}</span>
            <span className="text-white font-bold">{o.total}</span>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Usuários</h2>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Buscar por nome ou email..." />
          </div>
          <select value={tipoFilter} onChange={e => { setTipoFilter(e.target.value); setPage(1) }}
            className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Todos os tipos</option>
            <option value="client">Clientes</option>
            <option value="professional">Profissionais</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left p-4 font-medium">Nome</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Email</th>
                <th className="text-center p-4 font-medium">Tipo</th>
                <th className="text-center p-4 font-medium hidden md:table-cell">Plano</th>
                <th className="text-center p-4 font-medium">Ativo</th>
                <th className="text-center p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-4 text-white">{u.nome}</td>
                  <td className="p-4 text-gray-400 hidden md:table-cell">{u.email}</td>
                  <td className="p-4 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.tipo === 'admin' ? 'bg-red-500/10 text-red-400'
                      : u.tipo === 'professional' ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-blue-500/10 text-blue-400'
                    }`}>{u.tipo === 'client' ? 'Cliente' : u.tipo === 'professional' ? 'Profissional' : 'Admin'}</span>
                  </td>
                  <td className="p-4 text-center text-gray-400 hidden md:table-cell capitalize">{u.plano}</td>
                  <td className="p-4 text-center">{u.ativo ? <span className="text-emerald-400 text-xs">Ativo</span> : <span className="text-red-400 text-xs">Inativo</span>}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => startEdit(u)} className="text-gray-400 hover:text-blue-400 transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => toggleActive(u)} className="text-gray-400 hover:text-yellow-400 transition-colors text-xs">{u.ativo ? 'Desativar' : 'Ativar'}</button>
                      <button onClick={() => deleteUser(u)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr><td colSpan={6} className="p-8 text-center text-gray-600">Nenhum usuário encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.total_paginas > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">Página {pagination.pagina} de {pagination.total_paginas} ({pagination.total} usuários)</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm disabled:opacity-50">Anterior</button>
              <button onClick={() => setPage(p => Math.min(pagination.total_paginas, p + 1))} disabled={page >= pagination.total_paginas}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm disabled:opacity-50">Próxima</button>
            </div>
          </div>
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Editar Usuário</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nome</label>
                <input value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Email</label>
                <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Tipo</label>
                  <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
                    <option value="client">Cliente</option>
                    <option value="professional">Profissional</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Plano</label>
                  <select value={editForm.plano} onChange={e => setEditForm(f => ({ ...f, plano: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nova Senha (deixe vazio para manter)</label>
                <input type="password" value={editForm.nova_senha} onChange={e => setEditForm(f => ({ ...f, nova_senha: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancelar</button>
              <button onClick={saveUser}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                <Save className="w-4 h-4" /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
