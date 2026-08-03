import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Plus, Trash2, Search, UtensilsCrossed } from 'lucide-react'

export default function FoodDiary() {
  const { user } = useAuth()
  const isProOrAdmin = user?.tipo !== 'client'
  const [clients, setClients] = useState<any[]>([])
  const [clientId, setClientId] = useState<number | ''>('')
  const [data, setData] = useState<any>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const [foods, setFoods] = useState<any[]>([])
  const [foodSearch, setFoodSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ refeicao: 'cafe', alimento_id: '', quantidade: '100' })

  const loadDiary = async () => {
    const cid = clientId || undefined
    const d = await api.foodDiary.get(cid as any, date)
    setData(d)
  }

  useEffect(() => {
    if (isProOrAdmin) api.clients.list().then(setClients)
  }, [])

  useEffect(() => { loadDiary() }, [clientId, date])

  useEffect(() => {
    if (foodSearch.length > 1) api.foods.list(foodSearch).then((r) => setFoods(r.dados))
    else setFoods([])
  }, [foodSearch])

  const addEntry = async () => {
    if (!addForm.alimento_id) return
    await api.foodDiary.add({
      client_id: clientId || user!.id,
      data: date,
      refeicao: addForm.refeicao,
      alimento_id: Number(addForm.alimento_id),
      quantidade: Number(addForm.quantidade),
    })
    setShowAdd(false)
    setAddForm({ refeicao: 'cafe', alimento_id: '', quantidade: '100' })
    loadDiary()
  }

  const deleteEntry = async (id: number) => {
    await api.foodDiary.delete(id)
    loadDiary()
  }

  const refeicoes = ['cafe', 'almoco', 'lanche', 'jantar', 'ceia']
  const refLabels: Record<string, string> = { cafe: 'Café da Manhã', almoco: 'Almoço', lanche: 'Lanche', jantar: 'Jantar', ceia: 'Ceia' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Diário Alimentar</h1>
          <p className="text-gray-400 mt-1">Registre sua alimentação diária</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        {isProOrAdmin && (
          <select value={clientId} onChange={e => setClientId(Number(e.target.value) || '')}
            className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Meu diário</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
      </div>

      {data?.summary && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-orange-400">{Math.round(data.summary.total.calorias)}</p>
            <p className="text-xs text-gray-500">Calorias</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{Math.round(data.summary.total.proteina)}g</p>
            <p className="text-xs text-gray-500">Proteína</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-blue-400">{Math.round(data.summary.total.carboidrato)}g</p>
            <p className="text-xs text-gray-500">Carboidratos</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-yellow-400">{Math.round(data.summary.total.gordura)}g</p>
            <p className="text-xs text-gray-500">Gorduras</p>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <select value={addForm.refeicao} onChange={e => setAddForm(f => ({ ...f, refeicao: e.target.value }))}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
            {refeicoes.map(r => <option key={r} value={r}>{refLabels[r]}</option>)}
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={foodSearch} onChange={e => setFoodSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Buscar alimento..." />
          </div>

          {foods.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {foods.map(f => (
                <button key={f.id} onClick={() => setAddForm(fo => ({ ...fo, alimento_id: String(f.id) }))}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${addForm.alimento_id === String(f.id) ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-gray-800 text-gray-300'}`}>
                  {f.nome} - {f.calorias}kcal/{f.porcao}{f.unidade}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-400 block mb-1">Quantidade ({foods.find(f => f.id === Number(addForm.alimento_id))?.unidade || 'g'})</label>
              <input type="number" value={addForm.quantidade} onChange={e => setAddForm(f => ({ ...f, quantidade: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            </div>
            <button onClick={addEntry} disabled={!addForm.alimento_id}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">Adicionar</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {refeicoes.map(ref => {
          const entries = data?.entries?.filter((e: any) => e.refeicao === ref) || []
          if (!entries.length && !showAdd) return null
          return (
            <div key={ref} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between">
                <span className="font-medium text-white text-sm">{refLabels[ref]}</span>
                {entries.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {Math.round(entries.reduce((s: number, e: any) => s + e.calorias, 0))} kcal
                  </span>
                )}
              </div>
              {entries.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-800/50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm text-white">{e.alimento_nome}</p>
                    <p className="text-xs text-gray-500">{e.quantidade}{e.unidade}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{Math.round(e.calorias)}kcal</span>
                    <span>{e.proteina}g</span>
                    <span>{e.carboidrato}g</span>
                    <span>{e.gordura}g</span>
                    <button onClick={() => deleteEntry(e.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
        {(!data?.entries?.length) && !showAdd && (
          <div className="text-center py-12 text-gray-600">
            <UtensilsCrossed className="w-10 h-10 mx-auto mb-3" />
            <p>Nenhum registro hoje</p>
          </div>
        )}
      </div>
    </div>
  )
}
