export interface User {
  id: number; nome: string; email: string; tipo: 'admin' | 'professional' | 'client'
  plano: string; foto_url: string | null; telefone: string | null
  profissional_id: number | null; profissional?: User; created_at: string
  total_clientes?: number
}

export interface Assessment {
  id: number; client_id: number; idade: number; peso: number; altura: number
  sexo: string; atividade: number; objetivo: string; tmb: number; tdee: number
  calorias_alvo: number; proteina_g: number; carboidrato_g: number; gordura_g: number
  observacao: string | null; created_at: string
}

export interface Food {
  id: number; nome: string; porcao: number; unidade: string
  calorias: number; proteina: number; carboidrato: number; gordura: number
  fibras: number; categoria: string | null
}

export interface MealPlan {
  id: number; nome: string; descricao: string | null; client_id: number
  profissional_id: number | null; calorias_diarias: number | null
  proteina_diaria: number | null; carboidrato_diario: number | null
  gordura_diaria: number | null; ativo: number; created_at: string
  refeicoes?: Meal[]
}

export interface Meal { id: number; plano_id: number; nome: string; horario: string; ordem: number; alimentos?: MealFood[]; total_calorias?: number; total_proteina?: number; total_carb?: number; total_gordura?: number }

export interface MealFood { id: number; refeicao_id: number; alimento_id: number; quantidade: number; nome?: string; unidade?: string; calorias?: number; proteina?: number; carboidrato?: number; gordura?: number; calorias_total?: number; proteina_total?: number; carboidrato_total?: number; gordura_total?: number }

export interface Exercise {
  id: number; nome: string; descricao: string | null; grupo_muscular: string
  equipamento: string | null; dificuldade: string; video_url: string | null
  imagem_url: string | null
}

export interface Workout {
  id: number; nome: string; descricao: string | null; client_id: number
  profissional_id: number | null; tipo: string; ativo: number; created_at: string
  data_inicio: string | null; data_fim: string | null
  dia_semana: number | null; ordem_dia: number | null
  client_nome?: string | null
  exercicios?: WorkoutExercise[]
}

export interface WorkoutExercise { id: number; treino_id: number; exercicio_id: number; series: number; repeticoes: string; carga: number; descanso: number; ordem: number; observacao: string | null; nome?: string; grupo_muscular?: string; equipamento?: string; imagem_url?: string | null }

export interface WorkoutGenerationInput {
  client_id?: number
  dias_por_semana?: number
  objetivo?: string
  substituir?: boolean
}

export interface WorkoutGeneration {
  objetivo: string
  dias_por_semana: number
  dia_inicio: string | null
  treinos: Workout[]
}

export interface DiaryEntry { id: number; client_id?: number; data: string; refeicao: string; alimento_id: number; quantidade: number; calorias: number; proteina: number; carboidrato: number; gordura: number; alimento_nome?: string; unidade?: string }

export interface DiaryResponse { entries: DiaryEntry[]; summary: { refeicoes: Record<string, DiaryEntry[]>; total: { calorias: number; proteina: number; carboidrato: number; gordura: number } } }

export interface BodyMeasurement { id: number; client_id: number; peso: number | null; cintura: number | null; abdomen: number | null; gordura_corporal: number | null; created_at: string; [key: string]: any }

export interface LoginResult { token: string; forcar_troca_senha: boolean; usuario: User }
export interface Client { id: number; nome: string; email: string; telefone: string | null; foto_url: string | null; plano: string; created_at: string; ultima_avaliacao: string | null; total_avaliacoes: number }

export interface Pagination { pagina: number; limite: number; total: number; total_paginas: number }
export interface Paginated<T> { dados: T[]; paginacao: Pagination }

export interface RecipeIngredient {
  id: number; receita_id: number; alimento_id: number; quantidade: number
  alimento_nome?: string; unidade?: string; porcao?: number
  calorias?: number; proteina?: number; carboidrato?: number; gordura?: number
  calorias_total?: number; proteina_total?: number; carboidrato_total?: number; gordura_total?: number
}

export interface Recipe {
  id: number; nome: string; modo_preparo: string | null; porcoes: number
  categoria: string | null; criador_id: number; publica: number; created_at: string
  ingredientes?: RecipeIngredient[]
  total_calorias?: number; total_proteina?: number; total_carboidrato?: number; total_gordura?: number
}

export interface AppNotification {
  id: number; usuario_id: number; de_quem: number | null; tipo: string
  titulo: string; mensagem: string | null; lida: number; created_at: string
}

export interface ProgressPhoto {
  id: number; client_id: number; foto_url: string; tipo: string
  observacao: string | null; created_at: string
}

export interface WorkoutLog {
  id: number; client_id: number; treino_id: number | null; data: string
  exercicio_id: number; series_feitas: number | null; repeticoes_feitas: string | null
  carga_usada: number | null; observacao: string | null; created_at: string
  exercicio_nome?: string; grupo_muscular?: string
}

export interface WorkoutLogInput {
  exercicio_id: number; data?: string; series_feitas?: number
  repeticoes_feitas?: string; carga_usada?: number; observacao?: string; client_id?: number
}

export interface AdminUser extends Client { total_planos: number; total_treinos: number; ativo: number; profissional_nome: string | null }

export interface AdminStats {
  totalUsuarios: number; activeUsers: number
  byType: { tipo: string; total: number }[]
  byPlan: { plano: string; total: number }[]
  totalAvaliacoes: number; totalPlanos: number; totalTreinos: number; totalAlimentos: number; totalExercicios: number
  objetivos: { objetivo: string; total: number }[]
  atividadesDiario: { total: number; dia: string }[]
  treinosRealizados: { total: number; dia: string }[]
  acessosDiarios: { total: number; dia: string }[]
}

export interface AdminAcesso { id: number; usuario_id: number; evento: string; ip: string | null; created_at: string; nome: string; email: string; tipo: string }

export interface DashboardAdmin { total_clientes: number; total_profissionais: number; total_avaliacoes: number }
export interface DashboardProfessional { total_clientes: number; ultimas_avaliacoes: Assessment[]; notificacoes_nao_lidas: number }
export interface DashboardClient { ultima_avaliacao: Assessment | null; calorias_hoje: number; total_refeicoes_hoje: number; planos_ativos: number; notificacoes_nao_lidas: number }

export interface EvolutionData {
  measurements: BodyMeasurement[]
  assessments: { created_at: string; peso: number; tmb: number; tdee: number; calorias_alvo: number }[]
}
