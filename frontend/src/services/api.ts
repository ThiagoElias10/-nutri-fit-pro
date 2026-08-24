import type {
  AdminAcesso, AdminStats, AdminUser, AppNotification, Assessment, BodyMeasurement,
  Client, DashboardAdmin, DashboardClient, DashboardProfessional, DiaryEntry, EvolutionData,
  Exercise, Food, LoginResult, MealPlan, Paginated, ProgressPhoto, Recipe, User, Workout, WorkoutGeneration, WorkoutGenerationInput, WorkoutLog, WorkoutLogInput,
} from '../types'

const BASE = '/api'

let token: string | null = localStorage.getItem('nf_token')

export function setToken(t: string | null) {
  token = t
  if (t) localStorage.setItem('nf_token', t)
  else localStorage.removeItem('nf_token')
}

export function getToken() { return token }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  if (options?.body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  })

  if (res.status === 401) {
    setToken(null)
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new Error('Sessão expirada')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ erro: res.statusText }))
    throw new Error(err.erro || 'Erro na requisição')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export interface CrudFood extends Food {}
export interface CrudExercise extends Exercise {}

export const api = {
  auth: {
    login: (email: string, senha: string) =>
      request<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),
    register: (data: Partial<User>) =>
      request<LoginResult>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request<User>('/auth/me'),
    update: (data: Partial<User>) => request<{ ok: boolean }>('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (senha_atual: string, nova_senha: string) =>
      request<{ ok: boolean }>('/auth/senha', { method: 'POST', body: JSON.stringify({ senha_atual, nova_senha }) }),
    logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    requestReset: (email: string) => request<{ ok: boolean; token?: string }>('/auth/recuperar', { method: 'POST', body: JSON.stringify({ email }) }),
    confirmReset: (token: string, nova_senha: string) =>
      request<{ ok: boolean }>('/auth/recuperar/confirmar', { method: 'POST', body: JSON.stringify({ token, nova_senha }) }),
  },
  dashboard: () => request<DashboardAdmin | DashboardProfessional | DashboardClient>('/dashboard'),
  assessments: {
    calculate: (data: Partial<Assessment>) => request<Partial<Assessment>>('/avaliacoes/calcular', { method: 'POST', body: JSON.stringify(data) }),
    history: (client_id?: number) => request<Assessment[]>(`/avaliacoes/historico${client_id ? `?client_id=${client_id}` : ''}`),
    last: (client_id?: number) => request<Assessment>(`/avaliacoes/ultima${client_id ? `?client_id=${client_id}` : ''}`),
    create: (data: Partial<Assessment>) => request<Assessment>('/avaliacoes', { method: 'POST', body: JSON.stringify(data) }),
  },
  clients: {
    list: () => request<Client[]>('/clientes'),
    available: () => request<Client[]>('/clientes/disponiveis'),
    link: (client_email: string) => request<{ ok: boolean }>('/clientes/vincular', { method: 'POST', body: JSON.stringify({ client_email }) }),
    unlink: (id: number) => request<{ ok: boolean }>('/clientes/vincular/' + id, { method: 'DELETE' }),
    update: (id: number, data: Partial<Client>) => request<{ ok: boolean }>('/clientes/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  },
  foods: {
    list: (search?: string, categoria?: string, pagina = 1) => {
      const q = new URLSearchParams({ pagina: String(pagina) })
      if (search) q.set('search', search)
      if (categoria) q.set('categoria', categoria)
      return request<Paginated<Food>>(`/alimentos${q.toString() ? '?' + q : ''}`)
    },
    get: (id: number) => request<Food>('/alimentos/' + id),
    categories: () => request<string[]>('/alimentos/categorias'),
    create: (data: Partial<Food>) => request<Food>('/alimentos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Food>) => request<Food>('/alimentos/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>('/alimentos/' + id, { method: 'DELETE' }),
  },
  mealPlans: {
    list: (client_id?: number) => request<MealPlan[]>(`/planos-alimentares${client_id ? `?client_id=${client_id}` : ''}`),
    get: (id: number) => request<MealPlan>('/planos-alimentares/' + id),
    create: (data: any) => request<MealPlan>('/planos-alimentares', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<MealPlan>('/planos-alimentares/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>('/planos-alimentares/' + id, { method: 'DELETE' }),
    generate: (client_id: number, nome?: string) => request<MealPlan>('/planos-alimentares/gerar', { method: 'POST', body: JSON.stringify({ client_id, nome }) }),
  },
  foodDiary: {
    get: (client_id?: number, data?: string) => {
      const q = new URLSearchParams()
      if (client_id) q.set('client_id', String(client_id))
      if (data) q.set('data', data)
      return request<DiaryEntry[]>(`/diario-alimentar${q.toString() ? '?' + q : ''}`)
    },
    add: (data: Partial<DiaryEntry>) => request<DiaryEntry>('/diario-alimentar', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>('/diario-alimentar/' + id, { method: 'DELETE' }),
    metas: (client_id?: number) => {
      const q = client_id ? `?client_id=${client_id}` : ''
      return request<{ calorias: number; proteina: number; carboidrato: number; gordura: number; objetivo: string; peso: number } | null>(`/diario-alimentar/metas${q}`)
    },
  },
  exercises: {
    list: (params?: { search?: string; grupo_muscular?: string; dificuldade?: string; pagina?: number }) => {
      const q = new URLSearchParams()
      if (params?.search) q.set('search', params.search)
      if (params?.grupo_muscular) q.set('grupo_muscular', params.grupo_muscular)
      if (params?.dificuldade) q.set('dificuldade', params.dificuldade)
      if (params?.pagina) q.set('pagina', String(params.pagina))
      return request<Paginated<Exercise>>(`/exercicios${q.toString() ? '?' + q : ''}`)
    },
    get: (id: number) => request<Exercise>('/exercicios/' + id),
    groups: () => request<string[]>('/exercicios/grupos'),
    create: (data: Partial<Exercise>) => request<Exercise>('/exercicios', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Exercise>) => request<Exercise>('/exercicios/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>('/exercicios/' + id, { method: 'DELETE' }),
  },
  workouts: {
    list: (client_id?: number) => request<Workout[]>(`/treinos${client_id ? `?client_id=${client_id}` : ''}`),
    get: (id: number) => request<Workout>('/treinos/' + id),
    create: (data: Partial<Workout>) => request<Workout>('/treinos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Workout>) => request<Workout>('/treinos/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>('/treinos/' + id, { method: 'DELETE' }),
    log: (id: number, data: WorkoutLogInput) => request<{ ok: boolean }>('/treinos/' + id + '/log', { method: 'POST', body: JSON.stringify(data) }),
    logs: (id: number) => request<WorkoutLog[]>('/treinos/' + id + '/logs'),
    generate: (data: WorkoutGenerationInput) => request<WorkoutGeneration>('/treinos/gerar', { method: 'POST', body: JSON.stringify(data) }),
  },
  progress: {
    measurements: (client_id?: number) => request<BodyMeasurement[]>(`/progresso/measurements${client_id ? `?client_id=${client_id}` : ''}`),
    addMeasurement: (data: Partial<BodyMeasurement>) => request<BodyMeasurement>('/progresso/measurements', { method: 'POST', body: JSON.stringify(data) }),
    updateMeasurement: (id: number, data: Partial<BodyMeasurement>) => request<BodyMeasurement>('/progresso/measurements/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    deleteMeasurement: (id: number) => request<void>('/progresso/measurements/' + id, { method: 'DELETE' }),
    evolution: (client_id?: number) => request<EvolutionData>(`/progresso/evolution${client_id ? `?client_id=${client_id}` : ''}`),
    photos: (client_id?: number) => request<ProgressPhoto[]>(`/progresso/photos${client_id ? `?client_id=${client_id}` : ''}`),
    addPhoto: (data: Partial<ProgressPhoto>) => request<ProgressPhoto>('/progresso/photos', { method: 'POST', body: JSON.stringify(data) }),
    deletePhoto: (id: number) => request<void>('/progresso/photos/' + id, { method: 'DELETE' }),
  },
  recipes: {
    list: (params?: { search?: string; categoria?: string; pagina?: number }) => {
      const q = new URLSearchParams()
      if (params?.search) q.set('search', params.search)
      if (params?.categoria) q.set('categoria', params.categoria)
      if (params?.pagina) q.set('pagina', String(params.pagina))
      return request<Paginated<Recipe>>(`/receitas${q.toString() ? '?' + q : ''}`)
    },
    get: (id: number) => request<Recipe>('/receitas/' + id),
    create: (data: Partial<Recipe>) => request<Recipe>('/receitas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Recipe>) => request<Recipe>('/receitas/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>('/receitas/' + id, { method: 'DELETE' }),
  },
  notifications: {
    list: (apenas_nao_lidas?: boolean, pagina = 1) =>
      request<Paginated<AppNotification>>(`/notificacoes?pagina=${pagina}${apenas_nao_lidas ? '&apenas_nao_lidas=1' : ''}`),
    create: (data: Partial<AppNotification>) => request<AppNotification>('/notificacoes', { method: 'POST', body: JSON.stringify(data) }),
    markRead: (id: number) => request<{ ok: boolean }>('/notificacoes/' + id + '/lida', { method: 'PUT' }),
    delete: (id: number) => request<void>('/notificacoes/' + id, { method: 'DELETE' }),
  },
  exportData: () => request<Record<string, unknown>>('/exportar'),
  admin: {
    stats: () => request<AdminStats>('/admin/stats'),
    users: (params?: { busca?: string; tipo?: string; pagina?: number }) => {
      const q = new URLSearchParams()
      if (params?.busca) q.set('busca', params.busca)
      if (params?.tipo) q.set('tipo', params.tipo)
      if (params?.pagina) q.set('pagina', String(params.pagina))
      return request<Paginated<AdminUser>>(`/admin/users${q.toString() ? '?' + q : ''}`)
    },
    updateUser: (id: number, data: Partial<AdminUser>) => request<{ ok: boolean }>('/admin/users/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    deleteUser: (id: number) => request<{ ok: boolean }>('/admin/users/' + id, { method: 'DELETE' }),
    acessos: (pagina = 1) => request<Paginated<AdminAcesso>>(`/admin/acessos?pagina=${pagina}`),
  },
}
