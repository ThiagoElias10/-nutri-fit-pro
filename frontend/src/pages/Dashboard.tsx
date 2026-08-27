import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Activity, Users, ClipboardList, Target, Flame, RefreshCw, Dumbbell, TrendingUp, UtensilsCrossed, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

const QuickAction = ({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) => (
  <button onClick={onClick}
    className={`flex flex-col items-center gap-2 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-all`}>
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-xs text-gray-300">{label}</span>
  </button>
)

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [lastAssessment, setLastAssessment] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [diaryHistory, setDiaryHistory] = useState<any[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.dashboard()
      setData(d)
      if (user?.tipo === 'client') {
        const a = await api.assessments.last()
        setLastAssessment(a)
        const history = await api.foodDiary.metas()
        if (history) {
          const days = []
          for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            try {
              const res = await api.foodDiary.get(undefined, dateStr)
              days.push({
                date: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
                calorias: res?.summary?.total?.calorias || 0,
                proteina: res?.summary?.total?.proteina || 0,
              })
            } catch { days.push({ date: date.toLocaleDateString('pt-BR', { weekday: 'short' }), calorias: 0, proteina: 0 }) }
          }
          setDiaryHistory(days)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [user?.tipo])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  const isPro = user?.tipo === 'professional'
  const isAdmin = user?.tipo === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Olá, {user?.nome?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400 mt-1">
            {isAdmin ? 'Visão geral do sistema' : isPro ? 'Visão geral dos seus clientes' : 'Acompanhe seu progresso hoje'}
          </p>
        </div>
        <button onClick={loadData} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {isAdmin && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Clientes', value: data?.total_clientes || 0, icon: Users, color: 'text-blue-400' },
              { label: 'Profissionais', value: data?.total_profissionais || 0, icon: Activity, color: 'text-emerald-400' },
              { label: 'Avaliações', value: data?.total_avaliacoes || 0, icon: Target, color: 'text-orange-400' },
              { label: 'Planos', value: data?.totalPlanos || 0, icon: ClipboardList, color: 'text-violet-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">{label}</p>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-white mt-2">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <QuickAction icon={Users} label="Gerenciar Usuários" color="bg-blue-500/10 text-blue-400" onClick={() => navigate('/admin')} />
            <QuickAction icon={Target} label="Ver Avaliações" color="bg-orange-500/10 text-orange-400" onClick={() => navigate('/avaliacoes')} />
            <QuickAction icon={ClipboardList} label="Ver Planos" color="bg-violet-500/10 text-violet-400" onClick={() => navigate('/planos-alimentares')} />
          </div>

          {data?.atividadesDiario?.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Atividade dos Últimos 7 Dias</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.atividadesDiario.map((d: any) => ({ dia: d.dia?.split('-')[2] + '/' + d.dia?.split('-')[1], total: d.total })).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="dia" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                    <Bar dataKey="total" name="Registros" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {isPro && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Clientes', value: data?.total_clientes || 0, icon: Users, color: 'text-blue-400', sub: 'Vinculados' },
              { label: 'Avaliações', value: data?.ultimas_avaliacoes?.length || 0, icon: Target, color: 'text-orange-400', sub: 'Recentes' },
              { label: 'Notificações', value: data?.notificacoes_nao_lidas || 0, icon: Activity, color: 'text-red-400', sub: 'Não lidas' },
              { label: 'Acessos Hoje', value: '-', icon: ClipboardList, color: 'text-emerald-400', sub: 'Sistema' },
            ].map(({ label, value, icon: Icon, color, sub }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">{label}</p>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-white mt-2">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction icon={Users} label="Clientes" color="bg-blue-500/10 text-blue-400" onClick={() => navigate('/clientes')} />
            <QuickAction icon={Target} label="Avaliações" color="bg-orange-500/10 text-orange-400" onClick={() => navigate('/avaliacoes')} />
            <QuickAction icon={ClipboardList} label="Planos" color="bg-violet-500/10 text-violet-400" onClick={() => navigate('/planos-alimentares')} />
            <QuickAction icon={Dumbbell} label="Treinos" color="bg-emerald-500/10 text-emerald-400" onClick={() => navigate('/treinos')} />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-400" /> Últimas Avaliações
            </h3>
            {data?.ultimas_avaliacoes?.length > 0 ? (
              <div className="space-y-3">
                {data.ultimas_avaliacoes.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                    <div>
                      <p className="text-white text-sm font-medium">{a.client_name}</p>
                      <p className="text-xs text-gray-500">{new Date(a.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-emerald-400">{a.calorias_alvo} kcal</span>
                      <span className="text-gray-500 capitalize">{a.objetivo === 'cutting' ? 'Emagrecer' : a.objetivo === 'bulking' ? 'Ganhar Massa' : 'Manter Peso'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">Nenhuma avaliação recente</p>
            )}
          </div>
        </>
      )}

      {!isPro && !isAdmin && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <Flame className="w-5 h-5 text-orange-500 mb-2" />
              <p className="text-sm text-gray-400">Calorias Hoje</p>
              <p className="text-xl font-bold text-white">{data?.calorias_hoje || 0}</p>
              {lastAssessment && <p className="text-xs text-gray-600 mt-1">Meta: {lastAssessment.calorias_alvo}</p>}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <UtensilsCrossed className="w-5 h-5 text-emerald-500 mb-2" />
              <p className="text-sm text-gray-400">Refeições</p>
              <p className="text-xl font-bold text-white">{data?.total_refeicoes_hoje || 0}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <ClipboardList className="w-5 h-5 text-blue-500 mb-2" />
              <p className="text-sm text-gray-400">Planos Ativos</p>
              <p className="text-xl font-bold text-white">{data?.planos_ativos || 0}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <TrendingUp className="w-5 h-5 text-violet-500 mb-2" />
              <p className="text-sm text-gray-400">Última Avaliação</p>
              <p className="text-xl font-bold text-white">{data?.ultima_avaliacao ? `${data.ultima_avaliacao.peso}kg` : '--'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction icon={UtensilsCrossed} label="Diário" color="bg-emerald-500/10 text-emerald-400" onClick={() => navigate('/diario')} />
            <QuickAction icon={ClipboardList} label="Planos" color="bg-blue-500/10 text-blue-400" onClick={() => navigate('/planos-alimentares')} />
            <QuickAction icon={Dumbbell} label="Treinos" color="bg-orange-500/10 text-orange-400" onClick={() => navigate('/treinos')} />
            <QuickAction icon={TrendingUp} label="Progresso" color="bg-violet-500/10 text-violet-400" onClick={() => navigate('/progresso')} />
          </div>

          {lastAssessment && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4">Suas Metas Diárias</h2>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-2xl font-bold text-emerald-400">{lastAssessment.calorias_alvo}</p>
                  <p className="text-xs text-gray-400 mt-1">Calorias</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-2xl font-bold text-blue-400">{lastAssessment.proteina_g}g</p>
                  <p className="text-xs text-gray-400 mt-1">Proteína</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-2xl font-bold text-orange-400">{lastAssessment.carboidrato_g}g</p>
                  <p className="text-xs text-gray-400 mt-1">Carboidratos</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-2xl font-bold text-yellow-400">{lastAssessment.gordura_g}g</p>
                  <p className="text-xs text-gray-400 mt-1">Gorduras</p>
                </div>
              </div>
              <div className="flex justify-center gap-8 mt-4 text-sm">
                <span className="text-gray-500">TMB: {lastAssessment.tmb} kcal</span>
                <span className="text-gray-500">TDEE: {lastAssessment.tdee} kcal</span>
                <span className="text-gray-500 capitalize">Objetivo: {lastAssessment.objetivo === 'cutting' ? 'Emagrecer' : lastAssessment.objetivo === 'bulking' ? 'Ganhar Massa' : 'Manter Peso'}</span>
              </div>
            </div>
          )}

          {diaryHistory.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Consumo da Semana
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diaryHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="calorias" name="Calorias" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {lastAssessment && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  Meta semanal: {lastAssessment.calorias_alvo * 7} kcal ({lastAssessment.calorias_alvo}/dia)
                </p>
              )}
            </div>
          )}

          {data?.ultima_avaliacao && (
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" /> Dica do Dia
              </h3>
              <p className="text-sm text-gray-300">
                {data.ultima_avaliacao.objetivo === 'cutting'
                  ? 'Lembre-se: beba bastante água e prefira alimentos com baixa densidade calórica para se manter saciado.'
                  : data.ultima_avaliacao.objetivo === 'bulking'
                  ? 'Foque em proteínas de alta qualidade em cada refeição para maximizar a síntese proteica muscular.'
                  : 'Mantenha a consistência! Coma refeições equilibradas nos horários certos para manter seu peso.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
