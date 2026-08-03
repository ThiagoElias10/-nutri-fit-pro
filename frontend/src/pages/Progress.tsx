import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { TrendingUp, Plus, Weight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Progress() {
  const [measurements, setMeasurements] = useState<any[]>([])
  const [evolution, setEvolution] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({ peso: '', cintura: '', gordura_corporal: '' })

  const load = async () => {
    setMeasurements(await api.progress.measurements())
    setEvolution(await api.progress.evolution())
  }

  useEffect(() => { load() }, [])

  const addMeasurement = async () => {
    const payload: Record<string, any> = {}
    Object.entries(form).forEach(([k, v]) => { if (v) payload[k] = Number(v) })
    await api.progress.addMeasurement(payload)
    setShowForm(false)
    setForm({ peso: '', cintura: '', gordura_corporal: '' })
    load()
  }

  const chartData = evolution?.measurements?.map((m: any) => ({
    date: new Date(m.created_at).toLocaleDateString('pt-BR'),
    peso: m.peso,
    gordura: m.gordura_corporal,
    cintura: m.cintura,
  })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Progresso</h1>
          <p className="text-gray-400 mt-1">Acompanhe sua evolução</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Nova Medida
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Peso (kg)</label>
              <input value={form.peso} onChange={e => setForm(f => ({ ...f, peso: e.target.value }))} type="number" step="0.1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Cintura (cm)</label>
              <input value={form.cintura} onChange={e => setForm(f => ({ ...f, cintura: e.target.value }))} type="number" step="0.1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">% Gordura</label>
              <input value={form.gordura_corporal} onChange={e => setForm(f => ({ ...f, gordura_corporal: e.target.value }))} type="number" step="0.1"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            </div>
          </div>
          <button onClick={addMeasurement}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors">
            Salvar
          </button>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Evolução de Peso</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="peso" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {measurements.map((m: any) => (
          <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Weight className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-400">{new Date(m.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              {m.peso && <div><p className="text-white font-medium">{m.peso}kg</p><p className="text-xs text-gray-500">Peso</p></div>}
              {m.cintura && <div><p className="text-white font-medium">{m.cintura}cm</p><p className="text-xs text-gray-500">Cintura</p></div>}
              {m.gordura_corporal && <div><p className="text-white font-medium">{m.gordura_corporal}%</p><p className="text-xs text-gray-500">Gordura</p></div>}
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
  )
}
