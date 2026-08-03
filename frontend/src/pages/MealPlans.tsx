import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { ClipboardList } from 'lucide-react'

export default function MealPlans() {
  const { user } = useAuth()
  const isProOrAdmin = user?.tipo !== 'client'
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlan, setSelectedPlan] = useState<any>(null)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async (clientId?: number) => {
    const data = await api.mealPlans.list(clientId)
    setPlans(data || [])
  }

  const viewPlan = async (id: number) => {
    const p = await api.mealPlans.get(id)
    setSelectedPlan(p)
  }

  const totalPlanCalories = (plan: any) =>
    plan.refeicoes?.reduce((s: number, r: any) => s + (r.total_calorias || 0), 0) || 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Planos Alimentares</h1>
            <p className="text-gray-400 mt-1">{isProOrAdmin ? 'Planos dos clientes' : 'Seus planos'}</p>
          </div>
        </div>

        <div className="space-y-3">
          {plans.map(p => (
            <div key={p.id}
              onClick={() => viewPlan(p.id)}
              className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-emerald-500/50 ${selectedPlan?.id === p.id ? 'border-emerald-500' : 'border-gray-800'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{p.nome}</p>
                  <p className="text-xs text-gray-500 mt-1">{p.refeicoes?.length || 0} refeições</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{totalPlanCalories(p)} kcal</p>
                  <p className="text-xs text-gray-600">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>
          ))}
          {!plans.length && <p className="text-gray-600 text-center py-8">Nenhum plano</p>}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedPlan ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedPlan.nome}</h2>
                {selectedPlan.descricao && <p className="text-sm text-gray-400 mt-1">{selectedPlan.descricao}</p>}
              </div>
              {selectedPlan.calorias_diarias && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">{selectedPlan.calorias_diarias}</p>
                  <p className="text-xs text-gray-500">kcal/dia</p>
                </div>
              )}
            </div>

            {selectedPlan.proteina_diaria && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-emerald-400">{selectedPlan.proteina_diaria}g</p>
                  <p className="text-xs text-gray-500">Proteína</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-400">{selectedPlan.carboidrato_diario}g</p>
                  <p className="text-xs text-gray-500">Carboidratos</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-yellow-400">{selectedPlan.gordura_diaria}g</p>
                  <p className="text-xs text-gray-500">Gorduras</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {selectedPlan.refeicoes?.map((ref: any) => (
                <div key={ref.id} className="border border-gray-800 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-800/50 px-4 py-2.5">
                    <div>
                      <span className="font-medium text-white text-sm">{ref.nome}</span>
                      <span className="text-xs text-gray-500 ml-3">{ref.horario}</span>
                    </div>
                    <span className="text-sm font-medium text-emerald-400">{ref.total_calorias} kcal</span>
                  </div>
                  <div className="divide-y divide-gray-800/50">
                    {ref.alimentos?.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="text-gray-300">{a.nome}</span>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{a.quantidade}{a.unidade}</span>
                          <span className="text-gray-300">{a.calorias_total}kcal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-600">
            <ClipboardList className="w-12 h-12 mx-auto mb-3" />
            <p>Selecione um plano ao lado</p>
          </div>
        )}
      </div>
    </div>
  )
}
