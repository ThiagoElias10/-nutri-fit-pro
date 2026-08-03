import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { Activity, Users, ClipboardList, Target, Flame } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [lastAssessment, setLastAssessment] = useState<any>(null)

  useEffect(() => {
    api.dashboard().then(setData)
    if (user?.tipo === 'client') {
      api.assessments.last().then(setLastAssessment)
    }
  }, [])

  const isPro = user?.tipo === 'professional'
  const isAdmin = user?.tipo === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          {isAdmin ? 'Visão geral do sistema' : isPro ? 'Visão geral dos seus clientes' : 'Seu resumo diário'}
        </p>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Clientes', value: data?.total_clientes || 0, icon: Users },
            { label: 'Profissionais', value: data?.total_profissionais || 0, icon: Activity },
            { label: 'Avaliações', value: data?.total_avaliacoes || 0, icon: Target },
            { label: 'Planos', value: data?.totalPlanos || 0, icon: ClipboardList },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">{label}</p>
                <Icon className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-white mt-2">{value}</p>
            </div>
          ))}
        </div>
      )}

      {isPro && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-sm text-gray-400">Total de Clientes</p>
            <p className="text-3xl font-bold text-white mt-1">{data?.total_clientes || 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 md:col-span-2">
            <p className="text-sm text-gray-400 mb-3">Últimas Avaliações</p>
            {data?.ultimas_avaliacoes?.slice(0, 3).map((a: any) => (
              <div key={a.id} className="flex justify-between text-sm py-1.5 border-b border-gray-800 last:border-0">
                <span className="text-gray-300">{a.client_name}</span>
                <span className="text-gray-500">{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
            {(!data?.ultimas_avaliacoes?.length) && <p className="text-gray-600 text-sm">Nenhuma avaliação recente</p>}
          </div>
        </div>
      )}

      {!isPro && !isAdmin && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <Flame className="w-5 h-5 text-orange-500 mb-2" />
              <p className="text-sm text-gray-400">Calorias Hoje</p>
              <p className="text-xl font-bold text-white">{data?.calorias_hoje || 0}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <Utensils className="w-5 h-5 text-emerald-500 mb-2" />
              <p className="text-sm text-gray-400">Refeições</p>
              <p className="text-xl font-bold text-white">{data?.total_refeicoes_hoje || 0}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <ClipboardList className="w-5 h-5 text-blue-500 mb-2" />
              <p className="text-sm text-gray-400">Planos Ativos</p>
              <p className="text-xl font-bold text-white">{data?.planos_ativos || 0}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <Target className="w-5 h-5 text-violet-500 mb-2" />
              <p className="text-sm text-gray-400">Última Avaliação</p>
              <p className="text-xl font-bold text-white">{data?.ultima_avaliacao ? 'OK' : '--'}</p>
            </div>
          </div>

          {lastAssessment && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-4">Macros do Dia</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
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
              </div>
              <div className="flex justify-center gap-8 mt-4 text-sm">
                <span className="text-gray-500">TMB: {lastAssessment.tmb} kcal</span>
                <span className="text-gray-500">TDEE: {lastAssessment.tdee} kcal</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Utensils(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
}
