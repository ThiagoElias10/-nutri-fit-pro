import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { ChefHat, Plus, Trash2, Search, Save, X, Edit } from 'lucide-react'

export default function Recipes() {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState<any[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ nome: '', modo_preparo: '', porcoes: '1', categoria: '', publica: true })
  const [ingredients, setIngredients] = useState<{ alimento_id: number; quantidade: number; nome?: string }[]>([])
  const [foodSearch, setFoodSearch] = useState('')
  const [foods, setFoods] = useState<any[]>([])

  useEffect(() => { loadRecipes() }, [search])

  const loadRecipes = async () => {
    const r = await api.recipes.list({ search: search || undefined })
    setRecipes(r.dados || [])
  }

  const viewRecipe = async (id: number) => {
    const r = await api.recipes.get(id)
    setSelectedRecipe(r)
    setShowForm(false)
  }

  const startCreate = () => {
    setForm({ nome: '', modo_preparo: '', porcoes: '1', categoria: '', publica: true })
    setIngredients([])
    setEditingId(null)
    setShowForm(true)
    setSelectedRecipe(null)
  }

  const startEdit = (r: any) => {
    setForm({
      nome: r.nome, modo_preparo: r.modo_preparo || '', porcoes: String(r.porcoes),
      categoria: r.categoria || '', publica: !!r.publica,
    })
    setIngredients(r.ingredientes?.map((i: any) => ({ alimento_id: i.alimento_id, quantidade: i.quantidade, nome: i.alimento_nome })) || [])
    setEditingId(r.id)
    setShowForm(true)
  }

  const saveRecipe = async () => {
    try {
      const payload: any = {
        nome: form.nome,
        modo_preparo: form.modo_preparo || undefined,
        porcoes: Number(form.porcoes),
        categoria: form.categoria || undefined,
        publica: form.publica,
        ingredientes: ingredients.map(i => ({ alimento_id: i.alimento_id, quantidade: i.quantidade })),
      }
      if (editingId) {
        await api.recipes.update(editingId, payload)
      } else {
        await api.recipes.create(payload)
      }
      setShowForm(false)
      loadRecipes()
    } catch (e: any) { alert(e.message) }
  }

  const deleteRecipe = async (id: number) => {
    if (!confirm('Excluir esta receita?')) return
    await api.recipes.delete(id)
    setSelectedRecipe(null)
    loadRecipes()
  }

  const searchFoods = async (q: string) => {
    setFoodSearch(q)
    if (q.length > 1) {
      const r = await api.foods.list(q)
      setFoods(r.dados)
    } else { setFoods([]) }
  }

  const addIngredient = (food: any) => {
    setIngredients(prev => [...prev, { alimento_id: food.id, quantidade: food.porcao || 100, nome: food.nome }])
    setFoodSearch('')
    setFoods([])
  }

  const removeIngredient = (idx: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  const updateIngredientQty = (idx: number, qty: string) => {
    setIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, quantidade: Number(qty) || 0 } : ing))
  }

  const isOwner = (r: any) => user?.tipo === 'admin' || r.criador_id === user?.id

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Receitas</h1>
            <p className="text-gray-400 mt-1">Receitas saudáveis</p>
          </div>
          <button onClick={startCreate}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Nova
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Buscar receita..." />
        </div>

        <div className="space-y-3">
          {recipes.map(r => (
            <div key={r.id} onClick={() => viewRecipe(r.id)}
              className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-emerald-500/50 ${selectedRecipe?.id === r.id ? 'border-emerald-500' : 'border-gray-800'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{r.nome}</p>
                  <p className="text-xs text-gray-500 mt-1">{r.ingredientes?.length || 0} ingredientes · {r.porcoes} porções</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{r.total_calorias} kcal</p>
                  {r.categoria && <p className="text-xs text-gray-600">{r.categoria}</p>}
                </div>
              </div>
            </div>
          ))}
          {!recipes.length && <p className="text-gray-600 text-center py-8">Nenhuma receita</p>}
        </div>
      </div>

      <div className="lg:col-span-2">
        {showForm ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Editar Receita' : 'Nova Receita'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Nome</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Porções</label>
                <input type="number" value={form.porcoes} onChange={e => setForm(f => ({ ...f, porcoes: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Categoria</label>
                <input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  placeholder="Ex: Salgado, Doce, Lanche"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Modo de Preparo</label>
                <textarea value={form.modo_preparo} onChange={e => setForm(f => ({ ...f, modo_preparo: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none" />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={form.publica} onChange={e => setForm(f => ({ ...f, publica: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500" />
                  Receita pública (visível para todos)
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300">Ingredientes</h3>
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 text-gray-300">{ing.nome}</span>
                  <input type="number" value={ing.quantidade} onChange={e => updateIngredientQty(i, e.target.value)}
                    className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs" />
                  <span className="text-gray-500 text-xs">g</span>
                  <button onClick={() => removeIngredient(i)} className="text-gray-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input value={foodSearch} onChange={e => searchFoods(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs"
                  placeholder="Buscar alimento para adicionar..." />
                {foods.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg max-h-32 overflow-y-auto">
                    {foods.map(f => (
                      <button key={f.id} onClick={() => addIngredient(f)}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700">
                        {f.nome} - {f.calorias}kcal/{f.porcao}{f.unidade}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancelar</button>
              <button onClick={saveRecipe} disabled={!form.nome}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                <Save className="w-4 h-4" /> {editingId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        ) : selectedRecipe ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedRecipe.nome}</h2>
                {selectedRecipe.categoria && <p className="text-sm text-gray-400 mt-1">{selectedRecipe.categoria} · {selectedRecipe.porcoes} porções</p>}
              </div>
              <div className="flex items-center gap-2">
                {isOwner(selectedRecipe) && (
                  <>
                    <button onClick={() => startEdit(selectedRecipe)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => deleteRecipe(selectedRecipe.id)} className="p-2 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
                <div className="text-right ml-4">
                  <p className="text-2xl font-bold text-emerald-400">{selectedRecipe.total_calorias}</p>
                  <p className="text-xs text-gray-500">kcal total</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-emerald-400">{selectedRecipe.total_proteina}g</p>
                <p className="text-xs text-gray-500">Proteína</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-blue-400">{selectedRecipe.total_carboidrato}g</p>
                <p className="text-xs text-gray-500">Carboidratos</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-yellow-400">{selectedRecipe.total_gordura}g</p>
                <p className="text-xs text-gray-500">Gorduras</p>
              </div>
            </div>

            {selectedRecipe.ingredientes?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Ingredientes</h3>
                <div className="space-y-2">
                  {selectedRecipe.ingredientes.map((ing: any) => (
                    <div key={ing.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-800/50 last:border-0">
                      <span className="text-gray-300">{ing.alimento_nome}</span>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{ing.quantidade}g</span>
                        <span className="text-emerald-400">{ing.calorias_total}kcal</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRecipe.modo_preparo && (
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Modo de Preparo</h3>
                <p className="text-sm text-gray-400 whitespace-pre-wrap">{selectedRecipe.modo_preparo}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-600">
            <ChefHat className="w-12 h-12 mx-auto mb-3" />
            <p>Selecione uma receita ao lado</p>
          </div>
        )}
      </div>
    </div>
  )
}
