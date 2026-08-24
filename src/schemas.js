const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Email inválido');
const senhaForte = z.string().min(8, 'Mínimo de 8 caracteres').max(128, 'Máximo de 128 caracteres');
const nomeObrigatorio = z.string().trim().min(2, 'Nome muito curto').max(120, 'Nome muito longo');
const idPositivo = z.number().int().positive('ID inválido');
const idOpcional = z.coerce.number().int().positive().optional();
const observacao = z.string().max(2000).optional().nullable();

module.exports = {
  login: z.object({ email, senha: z.string().min(1, 'Senha obrigatória') }),
  register: z.object({
    nome: nomeObrigatorio,
    email,
    senha: senhaForte,
    tipo: z.enum(['professional', 'client']).optional().default('client'),
  }),
  mudarSenha: z.object({
    senha_atual: z.string().min(1, 'Senha atual obrigatória'),
    nova_senha: senhaForte,
  }),
  solicitarRecuperacao: z.object({ email }),
  confirmarRecuperacao: z.object({
    token: z.string().trim().min(20, 'Token inválido'),
    nova_senha: senhaForte,
  }),
  atualizarPerfil: z.object({
    nome: z.string().trim().min(2).max(120).optional(),
    telefone: z.string().trim().max(30).optional().nullable(),
    foto_url: z.string().trim().url('URL inválida').max(500).optional().nullable(),
  }).refine((d) => d.nome || d.telefone !== undefined || d.foto_url !== undefined, {
    message: 'Nenhum campo para atualizar',
  }),

  avaliacao: z.object({
    client_id: idOpcional,
    idade: z.number().int().positive('Idade inválida').max(120, 'Idade inválida'),
    peso: z.number().positive('Peso inválido').max(500, 'Peso inválido'),
    altura: z.number().positive('Altura inválida').max(250, 'Altura inválida'),
    sexo: z.enum(['masculino', 'feminino']),
    atividade: z.number().positive('Fator de atividade inválido').max(3, 'Fator de atividade inválido'),
    objetivo: z.enum(['cutting', 'maintenance', 'bulking']),
    observacao,
  }),
  avaliacaoQuery: z.object({ client_id: idOpcional }),

  medidaCorporal: z.object({
    client_id: idOpcional,
    peso: z.number().positive().max(500).optional().nullable(),
    altura: z.number().positive().max(250).optional().nullable(),
    pescoco: z.number().positive().max(200).optional().nullable(),
    ombros: z.number().positive().max(300).optional().nullable(),
    peitoral: z.number().positive().max(300).optional().nullable(),
    biceps_esq: z.number().positive().max(200).optional().nullable(),
    biceps_dir: z.number().positive().max(200).optional().nullable(),
    antebraco_esq: z.number().positive().max(200).optional().nullable(),
    antebraco_dir: z.number().positive().max(200).optional().nullable(),
    cintura: z.number().positive().max(300).optional().nullable(),
    abdomen: z.number().positive().max(300).optional().nullable(),
    quadril: z.number().positive().max(300).optional().nullable(),
    coxa_esq: z.number().positive().max(300).optional().nullable(),
    coxa_dir: z.number().positive().max(300).optional().nullable(),
    panturrilha_esq: z.number().positive().max(300).optional().nullable(),
    panturrilha_dir: z.number().positive().max(300).optional().nullable(),
    gordura_corporal: z.number().positive().max(100).optional().nullable(),
    observacao,
  }),

  fotoProgresso: z.object({
    client_id: idOpcional,
    foto_url: z.string().trim().url('URL inválida').max(1000),
    tipo: z.enum(['frente', 'costas', 'lateral', 'custom']).optional().default('frente'),
    observacao,
  }),
  fotoUpload: z.object({
    client_id: idOpcional,
    tipo: z.enum(['frente', 'costas', 'lateral', 'custom']).optional().default('frente'),
    observacao,
  }),

  alimento: z.object({
    nome: nomeObrigatorio,
    porcao: z.coerce.number().positive().optional().default(100),
    unidade: z.string().trim().max(10).optional().default('g'),
    calorias: z.coerce.number().nonnegative('Calorias inválidas').max(2000),
    proteina: z.coerce.number().nonnegative().max(500).optional().default(0),
    carboidrato: z.coerce.number().nonnegative().max(500).optional().default(0),
    gordura: z.coerce.number().nonnegative().max(500).optional().default(0),
    fibras: z.coerce.number().nonnegative().max(500).optional().default(0),
    categoria: z.string().trim().max(60).optional().nullable(),
  }),
  alimentoQuery: z.object({
    search: z.string().trim().max(100).optional(),
    categoria: z.string().trim().max(60).optional(),
    pagina: z.coerce.number().int().positive().optional(),
    limite: z.coerce.number().int().positive().optional(),
  }),

  exercicio: z.object({
    nome: nomeObrigatorio,
    descricao: z.string().max(2000).optional().nullable(),
    grupo_muscular: z.string().trim().min(2).max(60),
    equipamento: z.string().trim().max(60).optional().nullable(),
    dificuldade: z.enum(['iniciante', 'intermediario', 'avancado']).optional().default('iniciante'),
    video_url: z.string().trim().url().max(1000).optional().nullable(),
    imagem_url: z.string().trim().url().max(1000).optional().nullable(),
  }),
  exercicioQuery: z.object({
    search: z.string().trim().max(100).optional(),
    grupo_muscular: z.string().trim().max(60).optional(),
    dificuldade: z.enum(['iniciante', 'intermediario', 'avancado']).optional(),
    pagina: z.coerce.number().int().positive().optional(),
    limite: z.coerce.number().int().positive().optional(),
  }),

  planoAlimentar: z.object({
    nome: nomeObrigatorio,
    descricao: z.string().max(2000).optional().nullable(),
    client_id: idPositivo,
    calorias_diarias: z.coerce.number().int().nonnegative().optional().nullable(),
    proteina_diaria: z.coerce.number().int().nonnegative().optional().nullable(),
    carboidrato_diario: z.coerce.number().int().nonnegative().optional().nullable(),
    gordura_diaria: z.coerce.number().int().nonnegative().optional().nullable(),
    data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional().nullable(),
    data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional().nullable(),
    refeicoes: z.array(z.object({
      nome: z.string().trim().min(2).max(120),
      horario: z.string().trim().max(10).optional().nullable(),
      ordem: z.coerce.number().int().nonnegative().optional().default(0),
      alimentos: z.array(z.object({
        alimento_id: idPositivo,
        quantidade: z.coerce.number().positive(),
      })).optional().default([]),
    })).optional().default([]),
  }),
  atualizarPlano: z.object({
    nome: nomeObrigatorio.optional(),
    descricao: z.string().max(2000).optional().nullable(),
    calorias_diarias: z.coerce.number().int().nonnegative().optional().nullable(),
    proteina_diaria: z.coerce.number().int().nonnegative().optional().nullable(),
    carboidrato_diario: z.coerce.number().int().nonnegative().optional().nullable(),
    gordura_diaria: z.coerce.number().int().nonnegative().optional().nullable(),
    data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    ativo: z.boolean().optional(),
  }),
  gerarPlano: z.object({
    client_id: idPositivo,
    nome: z.string().trim().min(2).max(120).optional(),
  }),

  diario: z.object({
    client_id: idOpcional,
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional(),
    refeicao: z.string().trim().min(2).max(60),
    alimento_id: idPositivo,
    quantidade: z.coerce.number().positive('Quantidade inválida'),
  }),
  diarioQuery: z.object({
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional(),
    client_id: idOpcional,
  }),

  treino: z.object({
    nome: nomeObrigatorio,
    descricao: z.string().max(2000).optional().nullable(),
    client_id: idPositivo,
    tipo: z.enum(['a', 'b', 'c', 'fullbody', 'push', 'pull', 'legs', 'custom']).optional().default('custom'),
    data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    exercicios: z.array(z.object({
      exercicio_id: idPositivo,
      series: z.coerce.number().int().positive().optional().default(3),
      repeticoes: z.coerce.string().trim().max(20).optional().default('12'),
      carga: z.coerce.number().nonnegative().optional().default(0),
      descanso: z.coerce.number().int().nonnegative().optional().default(60),
      ordem: z.coerce.number().int().nonnegative().optional(),
      observacao: z.string().max(1000).optional().nullable(),
    })).optional().default([]),
  }),
  atualizarTreino: z.object({
    nome: nomeObrigatorio.optional(),
    descricao: z.string().max(2000).optional().nullable(),
    tipo: z.enum(['a', 'b', 'c', 'fullbody', 'push', 'pull', 'legs', 'custom']).optional(),
    ativo: z.boolean().optional(),
  }),
  logTreino: z.object({
    client_id: idOpcional,
    exercicio_id: idPositivo,
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    series_feitas: z.coerce.number().int().nonnegative().optional().nullable(),
    repeticoes_feitas: z.string().trim().max(20).optional().nullable(),
    carga_usada: z.coerce.number().nonnegative().optional().nullable(),
    observacao: z.string().max(1000).optional().nullable(),
  }),

  gerarTreino: z.object({
    client_id: idOpcional,
    dias_por_semana: z.coerce.number().int().min(1).max(6).optional().default(4),
    objetivo: z.enum([
      'cutting', 'maintenance', 'bulking',
      'hipertrofia', 'emagrecimento', 'forca', 'definicao', 'condicionamento',
    ]).optional(),
    substituir: z.boolean().optional().default(true),
  }),

  receita: z.object({
    nome: nomeObrigatorio,
    modo_preparo: z.string().max(5000).optional().nullable(),
    porcoes: z.coerce.number().int().positive().optional().default(1),
    categoria: z.string().trim().max(60).optional().nullable(),
    publica: z.boolean().optional().default(true),
    ingredientes: z.array(z.object({
      alimento_id: idPositivo,
      quantidade: z.coerce.number().positive(),
    })).optional().default([]),
  }),

  notificacao: z.object({
    usuario_id: idPositivo,
    tipo: z.enum(['info', 'sucesso', 'alerta', 'lembrete']).optional().default('info'),
    titulo: z.string().trim().min(2).max(200),
    mensagem: z.string().max(1000).optional().nullable(),
  }),
  notificacaoQuery: z.object({
    apenas_nao_lidas: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    pagina: z.coerce.number().int().positive().optional(),
    limite: z.coerce.number().int().positive().optional(),
  }),

  vincularCliente: z.object({
    client_email: email,
  }),

  atualizarCliente: z.object({
    nome: nomeObrigatorio.optional(),
    telefone: z.string().trim().max(30).optional().nullable(),
    foto_url: z.string().trim().url().max(500).optional().nullable(),
    plano: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  }),

  adminUsuario: z.object({
    nome: nomeObrigatorio.optional(),
    email: email.optional(),
    tipo: z.enum(['admin', 'professional', 'client']).optional(),
    plano: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
    ativo: z.boolean().optional(),
    nova_senha: senhaForte.optional(),
  }),
  adminQuery: z.object({
    busca: z.string().trim().max(100).optional(),
    tipo: z.enum(['admin', 'professional', 'client']).optional(),
    pagina: z.coerce.number().int().positive().optional(),
    limite: z.coerce.number().int().positive().optional(),
  }),
  adminAcessosQuery: z.object({
    pagina: z.coerce.number().int().positive().optional(),
    limite: z.coerce.number().int().positive().optional(),
  }),
};
