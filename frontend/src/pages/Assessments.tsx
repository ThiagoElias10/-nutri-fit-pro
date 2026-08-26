import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Calculator, History, Target, Utensils } from 'lucide-react'

export default function Assessments() {
  const { user } = useAuth()
  const isProOrAdmin = user?.tipo !== 'client'
  const [clients, setClients] = useState<any[]>([])
  const [clientId, setClientId] = useState<number | ''>('')
  const [history, setHistory] = useState<any[]>([])

  const [form, setForm] = useState({ idade: '', peso: '', altura: '', sexo: 'masculino', atividade: '1.55', objetivo: 'maintenance' })
  const [result, setResult] = useState<any>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (isProOrAdmin) api.clients.list().then(setClients)
    loadHistory()
  }, [])

  const loadHistory = async (cid?: number) => {
    const id = cid || clientId || undefined
    const data = await api.assessments.history(id as any)
    setHistory(data || [])
  }

  const calculate = async () => {
    try {
      const payload = {
        ...form,
        idade: Number(form.idade),
        peso: Number(form.peso),
        altura: Number(form.altura),
        atividade: Number(form.atividade),
        client_id: clientId || user!.id,
      }
      const res = await api.assessments.calculate(payload)
      setResult(res)
      loadHistory()
    } catch (e: any) { alert(e.message) }
  }

  const generateMealPlan = async () => {
    if (!isProOrAdmin) return
    const targetClientId = clientId || user!.id
    setGenerating(true)
    try {
      const plan = await api.mealPlans.generate(targetClientId as number)
      alert(`Plano "${plan.nome}" criado com sucesso!`)
      window.location.href = '/planos-alimentares'
    } catch (e: any) {
      alert('Erro ao gerar plano: ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Avaliação Física</h1>
          <p className="text-gray-400 mt-1">Calcule TMB, TDEE e macronutrientes</p>
        </div>

        {isProOrAdmin && (
          <select value={clientId} onChange={e => { setClientId(Number(e.target.value) || ''); loadHistory(Number(e.target.value)) }}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Selecione o cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Idade</label>
              <input value={form.idade} onChange={e => setForm(f => ({ ...f, idade: e.target.value }))} type="number"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Peso (kg)</label>
              <input value={form.peso} onChange={e => setForm(f => ({ ...f, peso: e.target.value }))} type="number" step="0.1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Altura (cm)</label>
              <input value={form.altura} onChange={e => setForm(f => ({ ...f, altura: e.target.value }))} type="number"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Sexo</label>
              <select value={form.sexo} onChange={e => setForm(f => ({ ...f, sexo: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Atividade</label>
              <select value={form.atividade} onChange={e => setForm(f => ({ ...f, atividade: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="1.2">Sedentário</option>
                <option value="1.375">Leve</option>
                <option value="1.55">Moderado</option>
                <option value="1.725">Intenso</option>
                <option value="1.9">Muito intenso</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Objetivo</label>
              <select value={form.objetivo} onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="cutting">Emagrecer (déficit calórico)</option>
                <option value="maintenance">Manter Peso</option>
                <option value="bulking">Ganhar Massa (superávit calórico)</option>
              </select>
            </div>
          </div>

          <button onClick={calculate}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <Calculator className="w-4 h-4" /> Calcular
          </button>
        </div>

        {result && (
          <div className="bg-gray-900 border border-emerald-500/30 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-emerald-400 flex items-center gap-2"><Target className="w-4 h-4" /> Resultado</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-800 rounded-lg p-3"><p className="text-lg font-bold text-emerald-400">{result.tmb}</p><p className="text-xs text-gray-400">TMB</p></div>
              <div className="bg-gray-800 rounded-lg p-3"><p className="text-lg font-bold text-blue-400">{result.tdee}</p><p className="text-xs text-gray-400">TDEE</p></div>
              <div className="bg-gray-800 rounded-lg p-3"><p className="text-lg font-bold text-orange-400">{result.caloriasAlvo}</p><p className="text-xs text-gray-400">Cal. Alvo</p></div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-800 rounded-lg p-3"><p className="text-lg font-bold text-emerald-400">{result.proteinaG}g</p><p className="text-xs text-gray-400">Proteína</p></div>
              <div className="bg-gray-800 rounded-lg p-3"><p className="text-lg font-bold text-blue-400">{result.carbG}g</p><p className="text-xs text-gray-400">Carboidratos</p></div>
              <div className="bg-gray-800 rounded-lg p-3"><p className="text-lg font-bold text-orange-400">{result.gorduraG}g</p><p className="text-xs text-gray-400">Gorduras</p></div>
            </div>

            {isProOrAdmin && (
              <button onClick={generateMealPlan} disabled={generating}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                <Utensils className="w-4 h-4" /> {generating ? 'Gerando...' : 'Gerar Plano Alimentar'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2"><History className="w-4 h-4" /> Histórico</h2>
        {history.map((a: any) => (
          <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
              <span className="text-gray-500 capitalize">{a.objetivo}</span>
            </div>
            <div className="grid grid-cols-6 gap-2 text-center text-xs">
              <div><p className="text-white font-medium">{a.peso}kg</p><p className="text-gray-500">Peso</p></div>
              <div><p className="text-emerald-400 font-medium">{a.tmb}</p><p className="text-gray-500">TMB</p></div>
              <div><p className="text-blue-400 font-medium">{a.tdee}</p><p className="text-gray-500">TDEE</p></div>
              <div><p className="text-orange-400 font-medium">{a.calorias_alvo}</p><p className="text-gray-500">Cal</p></div>
              <div><p className="text-emerald-400 font-medium">{a.proteina_g}g</p><p className="text-gray-500">Prot</p></div>
              <div><p className="text-blue-400 font-medium">{a.carboidrato_g}g</p><p className="text-gray-500">Carb</p></div>
            </div>
          </div>
        ))}
        {!history.length && <p className="text-gray-600 text-center py-8">Nenhuma avaliação ainda</p>}
      </div>
    </div>
  )
}
