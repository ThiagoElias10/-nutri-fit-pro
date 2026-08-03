import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Shield, Users, Activity, ClipboardList, TrendingUp } from 'lucide-react'

export default function Admin() {
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    api.admin.stats().then(setStats)
    api.admin.users().then((r) => setUsers(r.dados))
  }, [])

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
            <span className="text-gray-300 capitalize">{t.tipo}</span>
            <span className="text-white font-bold">{t.total}</span>
          </div>
        ))}
        {stats?.objetivos?.map((o: any) => (
          <div key={o.objetivo} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-between items-center">
            <span className="text-gray-300 capitalize">{o.objetivo === 'cutting' ? 'Cutting' : o.objetivo === 'bulking' ? 'Bulking' : 'Manutenção'}</span>
            <span className="text-white font-bold">{o.total}</span>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Usuários</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left p-4 font-medium">Nome</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Email</th>
                <th className="text-center p-4 font-medium">Tipo</th>
                <th className="text-center p-4 font-medium hidden md:table-cell">Plano</th>
                <th className="text-center p-4 font-medium">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-4 text-white">{u.nome}</td>
                  <td className="p-4 text-gray-400 hidden md:table-cell">{u.email}</td>
                  <td className="p-4 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      u.tipo === 'admin' ? 'bg-red-500/10 text-red-400'
                      : u.tipo === 'professional' ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-blue-500/10 text-blue-400'
                    }`}>{u.tipo}</span>
                  </td>
                  <td className="p-4 text-center text-gray-400 hidden md:table-cell">{u.plano}</td>
                  <td className="p-4 text-center">{u.ativo ? <span className="text-emerald-400 text-xs">Sim</span> : <span className="text-red-400 text-xs">Não</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
