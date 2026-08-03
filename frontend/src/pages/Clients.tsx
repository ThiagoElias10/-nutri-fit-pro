import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, Link, Trash2, Search } from 'lucide-react'

export default function Clients() {
  const { user } = useAuth()
  const [clients, setClients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showLink, setShowLink] = useState(false)
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => api.clients.list().then(setClients)

  useEffect(() => { load() }, [])

  const linkClient = async () => {
    try {
      await api.clients.link(email)
      setMsg('Cliente vinculado!')
      setEmail('')
      setShowLink(false)
      load()
    } catch (e: any) { setMsg(e.message) }
    setTimeout(() => setMsg(''), 3000)
  }

  const unlink = async (id: number) => {
    await api.clients.unlink(id)
    load()
  }

  const filtered = clients.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-gray-400 mt-1">{user?.tipo === 'admin' ? 'Gerenciar todos os clientes' : 'Gerenciar seus clientes'}</p>
        </div>
        <button onClick={() => setShowLink(!showLink)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <UserPlus className="w-4 h-4" /> Vincular
        </button>
      </div>

      {showLink && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <p className="text-sm text-gray-400">Digite o email do cliente para vincular:</p>
          <div className="flex gap-3">
            <input value={email} onChange={e => setEmail(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Email do cliente" />
            <button onClick={linkClient}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors">
              <Link className="w-4 h-4" />
            </button>
          </div>
          {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-600"
          placeholder="Buscar clientes..." />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-left p-4 font-medium">Nome</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Email</th>
                <th className="text-center p-4 font-medium">Avaliações</th>
                <th className="text-center p-4 font-medium hidden md:table-cell">Última</th>
                {user?.tipo === 'admin' && <th className="text-left p-4 font-medium hidden md:table-cell">Profissional</th>}
                <th className="text-right p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <p className="text-white font-medium">{c.nome}</p>
                  </td>
                  <td className="p-4 text-gray-400 hidden md:table-cell">{c.email}</td>
                  <td className="p-4 text-center text-gray-300">{c.total_avaliacoes}</td>
                  <td className="p-4 text-center text-gray-500 text-xs hidden md:table-cell">
                    {c.ultima_avaliacao ? new Date(c.ultima_avaliacao).toLocaleDateString('pt-BR') : '--'}
                  </td>
                  {user?.tipo === 'admin' && (
                    <td className="p-4 text-gray-400 hidden md:table-cell">{c.profissional_nome || '--'}</td>
                  )}
                  <td className="p-4 text-right">
                    <button onClick={() => unlink(c.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={10} className="p-8 text-center text-gray-600">Nenhum cliente encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
