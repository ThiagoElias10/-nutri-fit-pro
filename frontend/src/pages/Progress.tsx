import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { TrendingUp, Plus, Weight, ArrowDown, ArrowUp, Minus, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

const MEDIDAS = [
  { key: 'peso', label: 'Peso', unit: 'kg', step: '0.1' },
  { key: 'cintura', label: 'Cintura', unit: 'cm', step: '0.1' },
  { key: 'abdomen', label: 'Abdômen', unit: 'cm', step: '0.1' },
  { key: 'quadril', label: 'Quadril', unit: 'cm', step: '0.1' },
  { key: 'peitoral', label: 'Peitoral', unit: 'cm', step: '0.1' },
  { key: 'ombros', label: 'Ombros', unit: 'cm', step: '0.1' },
  { key: 'pescoco', label: 'Pescoço', unit: 'cm', step: '0.1' },
  { key: 'biceps_esq', label: 'Bíceps Esq.', unit: 'cm', step: '0.1' },
  { key: 'biceps_dir', label: 'Bíceps Dir.', unit: 'cm', step: '0.1' },
  { key: 'antebraco_esq', label: 'Antebraço Esq.', unit: 'cm', step: '0.1' },
  { key: 'antebraco_dir', label: 'Antebraço Dir.', unit: 'cm', step: '0.1' },
  { key: 'coxa_esq', label: 'Coxa Esq.', unit: 'cm', step: '0.1' },
  { key: 'coxa_dir', label: 'Coxa Dir.', unit: 'cm', step: '0.1' },
  { key: 'panturrilha_esq', label: 'Panturrilha Esq.', unit: 'cm', step: '0.1' },
  { key: 'panturrilha_dir', label: 'Panturrilha Dir.', unit: 'cm', step: '0.1' },
  { key: 'gordura_corporal', label: '% Gordura', unit: '%', step: '0.1' },
]

export default function Progress() {
  const { user } = useAuth()
  const isPro = user?.tipo === 'professional' || user?.tipo === 'admin'
  const [clients, setClients] = useState<any[]>([])
  const [clientId, setClientId] = useState<number | ''>('')
  const [measurements, setMeasurements] = useState<any[]>([])
  const [evolution, setEvolution] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [chartMetric, setChartMetric] = useState('peso')

  useEffect(() => {
    if (isPro) api.clients.list().then(setClients)
  }, [])

  useEffect(() => { load() }, [clientId])

  const load = async () => {
    const cid = clientId || undefined
    const m = await api.progress.measurements(cid as any)
    setMeasurements(m || [])
    const e = await api.progress.evolution(cid as any)
    setEvolution(e)
  }

  const addMeasurement = async () => {
    const payload: Record<string, any> = {}
    Object.entries(form).forEach(([k, v]) => { if (v) payload[k] = Number(v) })
    if (clientId) payload.client_id = clientId
    await api.progress.addMeasurement(payload)
    setShowForm(false)
    setForm({})
    load()
  }

  const deleteMeasurement = async (id: number) => {
    if (!confirm('Excluir esta medida?')) return
    await api.progress.deleteMeasurement(id)
    load()
  }

  const getChange = (current: number, previous: number | undefined) => {
    if (!previous) return null
    const diff = current - previous
    if (diff === 0) return { icon: Minus, color: 'text-gray-500', text: '0' }
    const isPositive = diff > 0
    return {
      icon: isPositive ? ArrowUp : ArrowDown,
      color: isPositive ? 'text-red-400' : 'text-emerald-400',
      text: `${isPositive ? '+' : ''}${diff.toFixed(1)}`,
    }
  }

  const chartData = evolution?.measurements?.map((m: any) => ({
    date: new Date(m.created_at).toLocaleDateString('pt-BR'),
    peso: m.peso,
    gordura: m.gordura_corporal,
    cintura: m.cintura,
    abdomen: m.abdomen,
    peitoral: m.peitoral,
    biceps: m.biceps_esq,
    coxa: m.coxa_esq,
  })) || []

  const latest = measurements[0]
  const previous = measurements[1]

  const mainMetrics = ['peso', 'cintura', 'gordura_corporal', 'abdomen']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Progresso</h1>
          <p className="text-gray-400 mt-1">Acompanhe sua evolução física</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Nova Medida
        </button>
      </div>

      {isPro && (
        <select value={clientId} onChange={e => setClientId(Number(e.target.value) || '')}
          className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Minhas medidas</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      )}

      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {MEDIDAS.slice(0, 8).map(med => (
              <div key={med.key}>
                <label className="text-xs text-gray-400 block mb-1">{med.label} ({med.unit})</label>
                <input value={form[med.key] || ''} onChange={e => setForm(f => ({ ...f, [med.key]: e.target.value }))}
                  type="number" step={med.step} placeholder="—"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            ))}
          </div>
          <details className="text-sm text-gray-400">
            <summary className="cursor-pointer hover:text-white">Mais medições</summary>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-3">
              {MEDIDAS.slice(8).map(med => (
                <div key={med.key}>
                  <label className="text-xs text-gray-400 block mb-1">{med.label} ({med.unit})</label>
                  <input value={form[med.key] || ''} onChange={e => setForm(f => ({ ...f, [med.key]: e.target.value }))}
                    type="number" step={med.step} placeholder="—"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              ))}
            </div>
          </details>
          <button onClick={addMeasurement}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors">
            Salvar Medidas
          </button>
        </div>
      )}

      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mainMetrics.map(key => {
            const med = MEDIDAS.find(m => m.key === key)
            if (!med || !latest[key]) return null
            const change = getChange(latest[key], previous?.[key])
            return (
              <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{med.label}</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-white">{latest[key]}</p>
                  <p className="text-xs text-gray-500 mb-1">{med.unit}</p>
                </div>
                {change && (
                  <div className={`flex items-center gap-1 mt-1 text-xs ${change.color}`}>
                    <change.icon className="w-3 h-3" />
                    <span>{change.text} {med.unit}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {chartData.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Evolução</h3>
            <select value={chartMetric} onChange={e => setChartMetric(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs">
              <option value="peso">Peso</option>
              <option value="cintura">Cintura</option>
              <option value="abdomen">Abdômen</option>
              <option value="gordura">% Gordura</option>
              <option value="peitoral">Peitoral</option>
              <option value="biceps">Bíceps</option>
              <option value="coxa">Coxa</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey={chartMetric} name={MEDIDAS.find(m => m.key === chartMetric)?.label || chartMetric}
                  stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {evolution?.assessments?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Evolução das Avaliações</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolution.assessments.map((a: any) => ({
                date: new Date(a.created_at).toLocaleDateString('pt-BR'),
                calorias: a.calorias_alvo,
                tdee: a.tdee,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey="calorias" name="Cal. Alvo" stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316' }} />
                <Line type="monotone" dataKey="tdee" name="TDEE" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Histórico de Medidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {measurements.map((m: any) => (
            <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Weight className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-gray-400">{new Date(m.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <button onClick={() => deleteMeasurement(m.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                {m.peso && <div><p className="text-white font-medium">{m.peso}kg</p><p className="text-xs text-gray-500">Peso</p></div>}
                {m.cintura && <div><p className="text-white font-medium">{m.cintura}cm</p><p className="text-xs text-gray-500">Cintura</p></div>}
                {m.gordura_corporal && <div><p className="text-white font-medium">{m.gordura_corporal}%</p><p className="text-xs text-gray-500">Gordura</p></div>}
                {m.abdomen && <div><p className="text-white font-medium">{m.abdomen}cm</p><p className="text-xs text-gray-500">Abdômen</p></div>}
                {m.peitoral && <div><p className="text-white font-medium">{m.peitoral}cm</p><p className="text-xs text-gray-500">Peitoral</p></div>}
                {m.ombros && <div><p className="text-white font-medium">{m.ombros}cm</p><p className="text-xs text-gray-500">Ombros</p></div>}
              </div>
            </div>
          ))}
          {!measurements.length && (
            <div className="col-span-2 text-center py-12 text-gray-600">
              <TrendingUp className="w-10 h-10 mx-auto mb-3" />
              <p>Nenhuma medida registrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
