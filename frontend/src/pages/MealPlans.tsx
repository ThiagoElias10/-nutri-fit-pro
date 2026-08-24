import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { ClipboardList, Plus, Trash2, Search, Save, X, Edit } from 'lucide-react'

interface MealFood {
  alimento_id: number; quantidade: number; nome?: string; unidade?: string
  calorias?: number; proteina?: number; carboidrato?: number; gordura?: number
}

interface Meal {
  nome: string; horario: string; ordem: number; alimentos: MealFood[]
}

interface PlanForm {
  nome: string; descricao: string; client_id: number | ''; calorias_diarias: string
  proteina_diaria: string; carboidrato_diario: string; gordura_diaria: string
  data_inicio: string; data_fim: string; refeicoes: Meal[]
}

const emptyForm: PlanForm = {
  nome: '', descricao: '', client_id: '', calorias_diarias: '', proteina_diaria: '',
  carboidrato_diario: '', gordura_diaria: '', data_inicio: '', data_fim: '',
  refeicoes: [{ nome: 'Café da Manhã', horario: '07:00', ordem: 0, alimentos: [] }],
}

export default function MealPlans() {
  const { user } = useAuth()
  const isProOrAdmin = user?.tipo !== 'client'
  const [plans, setPlans] = useState<any[]>([])
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState<PlanForm>(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [foodSearch, setFoodSearch] = useState('')
  const [foods, setFoods] = useState<any[]>([])
  const [searchMealIdx, setSearchMealIdx] = useState<number | null>(null)

  useEffect(() => {
    loadPlans()
    if (isProOrAdmin) api.clients.list().then(setClients)
  }, [])

  const loadPlans = async (clientId?: number) => {
    const data = await api.mealPlans.list(clientId)
    setPlans(data || [])
  }

  const viewPlan = async (id: number) => {
    const p = await api.mealPlans.get(id)
    setSelectedPlan(p)
    setShowForm(false)
  }

  const totalPlanCalories = (plan: any) =>
    plan.refeicoes?.reduce((s: number, r: any) => s + (r.total_calorias || 0), 0) || 0

  const startCreate = () => {
    setForm({ ...emptyForm, client_id: clientId || '' })
    setEditingId(null)
    setShowForm(true)
    setSelectedPlan(null)
  }

  const startEdit = (plan: any) => {
    setForm({
      nome: plan.nome, descricao: plan.descricao || '', client_id: plan.client_id,
      calorias_diarias: plan.calorias_diarias || '', proteina_diaria: plan.proteina_diaria || '',
      carboidrato_diario: plan.carboidrato_diario || '', gordura_diaria: plan.gordura_diaria || '',
      data_inicio: plan.data_inicio || '', data_fim: plan.data_fim || '',
      refeicoes: plan.refeicoes?.map((r: any) => ({
        nome: r.nome, horario: r.horario || '', ordem: r.ordem || 0,
        alimentos: r.alimentos?.map((a: any) => ({ alimento_id: a.alimento_id, quantidade: a.quantidade, nome: a.nome })) || [],
      })) || [],
    })
    setEditingId(plan.id)
    setShowForm(true)
    setSelectedPlan(plan)
  }

  const savePlan = async () => {
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || undefined,
        client_id: Number(form.client_id),
        calorias_diarias: form.calorias_diarias ? Number(form.calorias_diarias) : undefined,
        proteina_diaria: form.proteina_diaria ? Number(form.proteina_diaria) : undefined,
        carboidrato_diario: form.carboidrato_diario ? Number(form.carboidrato_diario) : undefined,
        gordura_diaria: form.gordura_diaria ? Number(form.gordura_diaria) : undefined,
        data_inicio: form.data_inicio || undefined,
        data_fim: form.data_fim || undefined,
        refeicoes: form.refeicoes.map((r, i) => ({
          ...r, ordem: i,
          alimentos: r.alimentos.map(a => ({ alimento_id: a.alimento_id, quantidade: a.quantidade })),
        })),
      }
      if (editingId) {
        await api.mealPlans.update(editingId, payload)
      } else {
        await api.mealPlans.create(payload as any)
      }
      setShowForm(false)
      loadPlans()
    } catch (e: any) { alert(e.message) }
  }

  const deletePlan = async (id: number) => {
    if (!confirm('Excluir este plano?')) return
    await api.mealPlans.delete(id)
    setSelectedPlan(null)
    loadPlans()
  }

  const addMeal = () => {
    setForm(f => ({
      ...f,
      refeicoes: [...f.refeicoes, { nome: '', horario: '', ordem: f.refeicoes.length, alimentos: [] }],
    }))
  }

  const removeMeal = (idx: number) => {
    setForm(f => ({ ...f, refeicoes: f.refeicoes.filter((_, i) => i !== idx) }))
  }

  const updateMeal = (idx: number, field: string, value: string) => {
    setForm(f => ({
      ...f,
      refeicoes: f.refeicoes.map((r, i) => i === idx ? { ...r, [field]: value } : r),
    }))
  }

  const searchFoods = async (search: string, mealIdx: number) => {
    setFoodSearch(search)
    setSearchMealIdx(mealIdx)
    if (search.length > 1) {
      const r = await api.foods.list(search)
      setFoods(r.dados)
    } else {
      setFoods([])
    }
  }

  const addFoodToMeal = (mealIdx: number, food: any) => {
    setForm(f => ({
      ...f,
      refeicoes: f.refeicoes.map((r, i) => i === mealIdx ? {
        ...r,
        alimentos: [...r.alimentos, { alimento_id: food.id, quantidade: food.porcao || 100, nome: food.nome, unidade: food.unidade }],
      } : r),
    }))
    setFoodSearch('')
    setFoods([])
    setSearchMealIdx(null)
  }

  const removeFoodFromMeal = (mealIdx: number, foodIdx: number) => {
    setForm(f => ({
      ...f,
      refeicoes: f.refeicoes.map((r, i) => i === mealIdx ? {
        ...r,
        alimentos: r.alimentos.filter((_, fi) => fi !== foodIdx),
      } : r),
    }))
  }

  const updateFoodQty = (mealIdx: number, foodIdx: number, qty: string) => {
    setForm(f => ({
      ...f,
      refeicoes: f.refeicoes.map((r, i) => i === mealIdx ? {
        ...r,
        alimentos: r.alimentos.map((a, fi) => fi === foodIdx ? { ...a, quantidade: Number(qty) || 0 } : a),
      } : r),
    }))
  }

  const [clientId, setClientId] = useState<number | ''>('')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Planos Alimentares</h1>
            <p className="text-gray-400 mt-1">{isProOrAdmin ? 'Planos dos clientes' : 'Seus planos'}</p>
          </div>
          {isProOrAdmin && (
            <button onClick={startCreate}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> Novo
            </button>
          )}
        </div>

        {isProOrAdmin && (
          <select value={clientId} onChange={e => { setClientId(Number(e.target.value) || ''); loadPlans(Number(e.target.value)) }}
            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Todos os clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}

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
        {showForm && isProOrAdmin ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Editar Plano' : 'Novo Plano'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Nome do Plano</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Cliente</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
                  <option value="">Selecione</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Descrição</label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Calorias/dia</label>
                <input type="number" value={form.calorias_diarias} onChange={e => setForm(f => ({ ...f, calorias_diarias: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Proteína (g)</label>
                <input type="number" value={form.proteina_diaria} onChange={e => setForm(f => ({ ...f, proteina_diaria: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Carboidrato (g)</label>
                <input type="number" value={form.carboidrato_diario} onChange={e => setForm(f => ({ ...f, carboidrato_diario: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Gordura (g)</label>
                <input type="number" value={form.gordura_diaria} onChange={e => setForm(f => ({ ...f, gordura_diaria: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300">Refeições</h3>
                <button onClick={addMeal} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Adicionar refeição
                </button>
              </div>

              {form.refeicoes.map((ref, mi) => (
                <div key={mi} className="border border-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <input value={ref.nome} onChange={e => updateMeal(mi, 'nome', e.target.value)} placeholder="Nome da refeição"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
                    <input value={ref.horario} onChange={e => updateMeal(mi, 'horario', e.target.value)} placeholder="Horário"
                      className="w-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
                    {form.refeicoes.length > 1 && (
                      <button onClick={() => removeMeal(mi)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>

                  {ref.alimentos.map((a, ai) => (
                    <div key={ai} className="flex items-center gap-3 text-sm pl-4">
                      <span className="flex-1 text-gray-300">{a.nome}</span>
                      <input type="number" value={a.quantidade} onChange={e => updateFoodQty(mi, ai, e.target.value)}
                        className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs" />
                      <span className="text-gray-500 text-xs w-8">{a.unidade}</span>
                      <button onClick={() => removeFoodFromMeal(mi, ai)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}

                  <div className="relative pl-4">
                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input value={searchMealIdx === mi ? foodSearch : ''} onChange={e => searchFoods(e.target.value, mi)}
                      className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs"
                      placeholder="Buscar alimento para adicionar..." />
                    {searchMealIdx === mi && foods.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg max-h-32 overflow-y-auto">
                        {foods.map(f => (
                          <button key={f.id} onClick={() => addFoodToMeal(mi, f)}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700">
                            {f.nome} - {f.calorias}kcal/{f.porcao}{f.unidade}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancelar</button>
              <button onClick={savePlan} disabled={!form.nome || !form.client_id}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                <Save className="w-4 h-4" /> {editingId ? 'Salvar' : 'Criar Plano'}
              </button>
            </div>
          </div>
        ) : selectedPlan ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedPlan.nome}</h2>
                {selectedPlan.descricao && <p className="text-sm text-gray-400 mt-1">{selectedPlan.descricao}</p>}
              </div>
              <div className="flex items-center gap-2">
                {isProOrAdmin && (
                  <>
                    <button onClick={() => startEdit(selectedPlan)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => deletePlan(selectedPlan.id)} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {selectedPlan.calorias_diarias && (
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-emerald-400">{selectedPlan.calorias_diarias}</p>
                    <p className="text-xs text-gray-500">kcal/dia</p>
                  </div>
                )}
              </div>
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
