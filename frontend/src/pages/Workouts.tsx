import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Dumbbell, Play, CheckCircle2, Sparkles } from 'lucide-react'
import type { Workout } from '../types'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const OBJETIVOS = [
  { valor: '', rotulo: 'Sugerido pela avaliação' },
  { valor: 'hipertrofia', rotulo: 'Hipertrofia' },
  { valor: 'emagrecimento', rotulo: 'Emagrecimento' },
  { valor: 'forca', rotulo: 'Força' },
  { valor: 'definicao', rotulo: 'Definição' },
  { valor: 'condicionamento', rotulo: 'Condicionamento' },
  { valor: 'maintenance', rotulo: 'Manter Peso' },
  { valor: 'bulking', rotulo: 'Ganhar Massa' },
  { valor: 'cutting', rotulo: 'Emagrecer' },
]

function diaLabel(dia: number | null | undefined) {
  if (dia === null || dia === undefined) return null
  return DIAS_SEMANA[dia % 7]
}

const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none'
}

export default function Workouts() {
  const { user } = useAuth()
  const isProf = user?.tipo === 'professional' || user?.tipo === 'admin'
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [logs, setLogs] = useState<any[]>([])

  const [clientes, setClientes] = useState<any[]>([])
  const [clienteId, setClienteId] = useState<number | ''>('')
  const [diasSemana, setDiasSemana] = useState(4)
  const [objetivo, setObjetivo] = useState('')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => { loadWorkouts() }, [clienteId])
  useEffect(() => {
    if (isProf) api.clients.list().then(setClientes)
  }, [])

  const loadWorkouts = async () => {
    const data = await api.workouts.list(isProf ? clienteId || undefined : undefined)
    setWorkouts(data || [])
  }

  const viewWorkout = async (id: number) => {
    const w = await api.workouts.get(id)
    setSelectedWorkout(w)
    const l = await api.workouts.logs(id)
    setLogs(l || [])
  }

  const logExercise = async (exercicioId: number) => {
    if (!selectedWorkout) return
    await api.workouts.log(selectedWorkout.id, {
      client_id: selectedWorkout.client_id,
      exercicio_id: exercicioId,
      series_feitas: 3,
      repeticoes_feitas: '12',
    })
    const l = await api.workouts.logs(selectedWorkout.id)
    setLogs(l || [])
  }

  const gerarTreino = async () => {
    setErro('')
    if (isProf && !clienteId) {
      setErro('Selecione um cliente antes de gerar.')
      return
    }
    setGerando(true)
    try {
      const res = await api.workouts.generate({
        client_id: isProf ? clienteId || undefined : undefined,
        dias_por_semana: diasSemana,
        objetivo: objetivo || undefined,
      })
      await loadWorkouts()
      setSelectedWorkout(res.treinos[0] || null)
    } catch (e: any) {
      setErro(e?.message || 'Erro ao gerar treino semanal')
    } finally {
      setGerando(false)
    }
  }

  const todayLogs = logs.filter(l =>
    new Date(l.data).toDateString() === new Date().toDateString()
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <h1 className="text-2xl font-bold text-white">Treinos</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Gerar treino semanal
          </div>
          {isProf && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cliente</label>
              <select
                value={clienteId}
                onChange={e => setClienteId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Selecione o cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dias por semana</label>
              <select
                value={diasSemana}
                onChange={e => setDiasSemana(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} dia{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Objetivo</label>
              <select
                value={objetivo}
                onChange={e => setObjetivo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                {OBJETIVOS.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={gerarTreino}
            disabled={gerando || (isProf && !clienteId)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            <Sparkles className="w-4 h-4" />
            {gerando ? 'Gerando...' : 'Gerar treinos'}
          </button>
          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>

        <div className="space-y-3">
          {workouts.map(w => (
            <div key={w.id} onClick={() => viewWorkout(w.id)}
              className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-emerald-500/50 ${selectedWorkout?.id === w.id ? 'border-emerald-500' : 'border-gray-800'}`}>
              {w.exercicios?.[0]?.imagem_url && (
                <img src={w.exercicios[0].imagem_url} alt={w.nome} onError={hideBroken}
                  className="w-full h-24 object-cover rounded-lg mb-2" />
              )}
              <p className="text-white font-medium">{w.nome}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>{w.exercicios?.length || 0} exercícios</span>
                {diaLabel(w.dia_semana) && <span className="text-emerald-400">{diaLabel(w.dia_semana)}</span>}
                <span className="capitalize">{w.tipo}</span>
              </div>
            </div>
          ))}
          {!workouts.length && <p className="text-gray-600 text-center py-8">Nenhum treino</p>}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedWorkout ? (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-2">{selectedWorkout.nome}</h2>
              {selectedWorkout.descricao && <p className="text-sm text-gray-400 mb-4">{selectedWorkout.descricao}</p>}

              <div className="space-y-3">
                {selectedWorkout.exercicios?.map((ex: any) => {
                  const done = todayLogs.some((l: any) => l.exercicio_id === ex.exercicio_id)
                  return (
                    <div key={ex.id} className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        {ex.imagem_url
                          ? <img src={ex.imagem_url} alt={ex.nome} onError={hideBroken} className="w-11 h-11 rounded-lg object-cover" />
                          : done ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Dumbbell className="w-5 h-5 text-gray-500" />}
                        <div>
                          <p className="text-white text-sm font-medium">{ex.nome}</p>
                          <p className="text-xs text-gray-500">
                            {ex.series}x{ex.repeticoes} {ex.carga > 0 ? `· ${ex.carga}kg` : ''} · {ex.grupo_muscular}
                          </p>
                        </div>
                      </div>
                      {!done && (
                        <button onClick={() => logExercise(ex.exercicio_id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors">
                          <Play className="w-3 h-3" /> Registrar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {logs.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-3">Histórico</h3>
                <div className="space-y-2">
                  {logs.slice(0, 10).map((l: any) => (
                    <div key={l.id} className="flex justify-between text-sm text-gray-400">
                      <span>{l.exercicio_nome}</span>
                      <span>{new Date(l.data).toLocaleDateString('pt-BR')} - {l.series_feitas}x{l.repeticoes_feitas}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-600">
            <Dumbbell className="w-12 h-12 mx-auto mb-3" />
            <p>Selecione um treino ao lado</p>
          </div>
        )}
      </div>
    </div>
  )
}
