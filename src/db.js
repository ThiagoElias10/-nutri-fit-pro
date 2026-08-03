const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const logger = require('./logger');

function getDbDir() {
  if (process.versions.electron) {
    try { return require('electron').app.getPath('userData'); } catch {}
  }
  return path.join(__dirname, '..');
}

const DB_DIR = getDbDir();
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'nutrifit.db');

let db;

function query(sql, params = []) {
  return db.prepare(sql).all(...params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

function save() {}

function transaction(fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function paginar(sql, params = [], { pagina = 1, limite = 50, maxLimite = 100 } = {}) {
  const p = Math.max(1, parseInt(pagina) || 1);
  const l = Math.min(maxLimite, Math.max(1, parseInt(limite) || 50));
  const total = get(`SELECT COUNT(*) as total FROM (${sql})`, params).total;
  const dados = query(`${sql} LIMIT ? OFFSET ?`, [...params, l, (p - 1) * l]);
  return {
    dados,
    paginacao: { pagina: p, limite: l, total, total_paginas: Math.ceil(total / l) },
  };
}

const MIGRATIONS = [
  { version: 1, name: 'schema-inicial', up: createSchemaInicial },
  { version: 2, name: 'seguranca-senhas', up: migracaoSeguranca },
  { version: 3, name: 'notificacoes', up: migracaoNotificacoes },
  { version: 4, name: 'indices', up: migracaoIndices },
  { version: 5, name: 'treino-semanal', up: migracaoTreinoSemanal },
  { version: 6, name: 'biblioteca-exercicios', up: migracaoBibliotecaExercicios },
];

const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

function ex(nome, descricao, grupo, equipamento, dificuldade, slug) {
  return [nome, descricao, grupo, equipamento, dificuldade, IMG_BASE + slug + '/0.jpg'];
}

const EXERCICIOS_CATALOGO = [
  // Peitoral
  ex('Supino reto', 'Deitado no banco reto, empurre a barra para cima', 'peitoral', 'barra', 'intermediario', 'Barbell_Bench_Press_-_Medium_Grip'),
  ex('Supino com halteres', 'Deitado, empurre os halteres acima do peito', 'peitoral', 'halteres', 'iniciante', 'Dumbbell_Bench_Press'),
  ex('Supino inclinado', 'No banco inclinado, empurre os halteres para cima', 'peitoral', 'halteres', 'intermediario', 'Incline_Dumbbell_Press'),
  ex('Crucifixo reto', 'Com halteres, abra os braços lateralmente', 'peitoral', 'halteres', 'iniciante', 'Dumbbell_Flyes'),
  ex('Flexão de braço', 'Apoiado nas mãos e pés, desça e suba o tronco', 'peitoral', 'peso_corporal', 'iniciante', 'Incline_Push-Up_Medium'),
  // Costas
  ex('Puxada frontal', 'Puxe a barra em direção ao peito', 'costas', 'polia', 'iniciante', 'Close-Grip_Front_Lat_Pulldown'),
  ex('Puxada aberta', 'Pegada aberta, puxe a barra até o peito', 'costas', 'polia', 'intermediario', 'Full_Range-Of-Motion_Lat_Pulldown'),
  ex('Remada curvada', 'Com barra, puxe em direção ao abdômen', 'costas', 'barra', 'avancado', 'Bent_Over_Barbell_Row'),
  ex('Remada unilateral', 'Com halter, puxe apoiando o joelho no banco', 'costas', 'halteres', 'iniciante', 'One-Arm_Dumbbell_Row'),
  ex('Remada invertida', 'Suspenso na barra, puxe o peito até a barra', 'costas', 'peso_corporal', 'iniciante', 'Inverted_Row'),
  // Ombros
  ex('Desenvolvimento militar', 'Empurre a barra acima da cabeça sentado', 'ombros', 'barra', 'intermediario', 'Seated_Barbell_Military_Press'),
  ex('Desenvolvimento com halteres', 'Empurre os halteres acima da cabeça', 'ombros', 'halteres', 'iniciante', 'Dumbbell_Shoulder_Press'),
  ex('Elevação lateral', 'Com halteres, eleve os braços lateralmente', 'ombros', 'halteres', 'iniciante', 'Side_Lateral_Raise'),
  ex('Elevação frontal', 'Com halteres, eleve os braços à frente', 'ombros', 'halteres', 'iniciante', 'Front_Dumbbell_Raise'),
  ex('Arnold press', 'Rotacione os punhos ao elevar os halteres', 'ombros', 'halteres', 'intermediario', 'Arnold_Dumbbell_Press'),
  ex('Face pull', 'Puxe a corda em direção ao rosto abrindo os cotovelos', 'ombros', 'polia', 'intermediario', 'Face_Pull'),
  // Bíceps
  ex('Rosca direta', 'Com barra, flexione os cotovelos', 'biceps', 'barra', 'iniciante', 'Barbell_Curl'),
  ex('Rosca alternada', 'Com halteres, alterne os braços flexionando', 'biceps', 'halteres', 'iniciante', 'Dumbbell_Alternate_Bicep_Curl'),
  ex('Rosca martelo', 'Com halteres em pegada neutra, flexione', 'biceps', 'halteres', 'iniciante', 'Hammer_Curls'),
  ex('Rosca concentrada', 'Com halter, apoie o cotovelo e flexione', 'biceps', 'halteres', 'intermediario', 'Concentration_Curls'),
  // Tríceps
  ex('Tríceps testa', 'Deitado, estenda os cotovelos com barra atrás da cabeça', 'triceps', 'barra', 'intermediario', 'EZ-Bar_Skullcrusher'),
  ex('Tríceps coice', 'Inclinado, estenda o cotovelo com halter', 'triceps', 'halteres', 'iniciante', 'Dumbbell_One-Arm_Triceps_Extension'),
  ex('Tríceps na polia', 'De costas para a polia, puxe a corda para baixo', 'triceps', 'polia', 'iniciante', 'Cable_Rope_Overhead_Triceps_Extension'),
  ex('Mergulho', 'Apoiado nas paralelas, desça e suba o corpo', 'triceps', 'peso_corporal', 'intermediario', 'Dips_-_Triceps_Version'),
  // Pernas
  ex('Agachamento livre', 'Com barra nas costas, agache mantendo a coluna neutra', 'pernas', 'barra', 'intermediario', 'Barbell_Full_Squat'),
  ex('Agachamento goblet', 'Segure o halter no peito e agache', 'pernas', 'halteres', 'iniciante', 'Goblet_Squat'),
  ex('Leg press 45°', 'Empurre a plataforma com os pés', 'pernas', 'maquina', 'iniciante', 'Leg_Press'),
  ex('Cadeira extensora', 'Estenda as pernas na máquina', 'pernas', 'maquina', 'iniciante', 'Leg_Extensions'),
  ex('Cadeira flexora', 'Flexione as pernas na máquina', 'pernas', 'maquina', 'iniciante', 'Lying_Leg_Curls'),
  ex('Stiff', 'Com barra, incline o tronco mantendo as pernas estendidas', 'pernas', 'barra', 'avancado', 'Romanian_Deadlift'),
  ex('Afundo com halteres', 'Dê passos à frente alternando as pernas', 'pernas', 'halteres', 'iniciante', 'Dumbbell_Lunges'),
  ex('Elevação pélvica', 'Deitado, eleve o quadril com a barra apoiada', 'pernas', 'barra', 'intermediario', 'Barbell_Hip_Thrust'),
  ex('Panturrilha sentado', 'Na máquina, eleve os calcanhares', 'pernas', 'maquina', 'iniciante', 'Barbell_Seated_Calf_Raise'),
  ex('Panturrilha em pé', 'Eleve os calcanhares na máquina', 'pernas', 'maquina', 'iniciante', 'Donkey_Calf_Raises'),
  // Abdômen
  ex('Abdominal crunch', 'Deitado, eleve o tronco em direção aos joelhos', 'abdomen', 'peso_corporal', 'iniciante', 'Crunches'),
  ex('Prancha', 'Mantenha o corpo reto apoiado nos antebraços', 'abdomen', 'peso_corporal', 'iniciante', 'Plank'),
  ex('Elevação de pernas', 'Suspenso, eleve as pernas retas', 'abdomen', 'peso_corporal', 'intermediario', 'Hanging_Leg_Raise'),
  ex('Prancha russa', 'Sentado, gire o tronco de um lado ao outro', 'abdomen', 'polia', 'intermediario', 'Cable_Russian_Twists'),
  // Cardio
  ex('Esteira', 'Caminhada ou corrida na esteira', 'cardio', 'cardio', 'iniciante', 'Jogging_Treadmill'),
  ex('Bicicleta ergométrica', 'Pedale mantendo ritmo constante', 'cardio', 'cardio', 'iniciante', 'Bicycling_Stationary'),
  ex('Elíptico', 'Movimento contínuo no aparelho elíptico', 'cardio', 'cardio', 'iniciante', 'Elliptical_Trainer'),
  ex('Bicicleta no ar', 'Pedalada intensa no ar em intervalos', 'cardio', 'cardio', 'intermediario', 'Air_Bike'),
  ex('Escalador', 'Simule escalada alternando os joelhos', 'cardio', 'cardio', 'intermediario', 'Mountain_Climbers'),
  ex('Cordas de batalha', 'Agite as cordas com os braços alternados', 'cardio', 'cardio', 'intermediario', 'Battling_Ropes'),
];

function createSchemaInicial() {
  db.exec(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    telefone TEXT,
    foto_url TEXT,
    tipo TEXT CHECK(tipo IN ('admin','professional','client')) DEFAULT 'client',
    plano TEXT CHECK(plano IN ('free','basic','pro','enterprise')) DEFAULT 'free',
    profissional_id INTEGER REFERENCES usuarios(id),
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now','localtime')),
    updated_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS acessos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    evento TEXT NOT NULL CHECK(evento IN ('login','register','acesso')),
    ip TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS avaliacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES usuarios(id),
    profissional_id INTEGER REFERENCES usuarios(id),
    idade INTEGER NOT NULL,
    peso REAL NOT NULL,
    altura REAL NOT NULL,
    sexo TEXT NOT NULL CHECK(sexo IN ('masculino','feminino')),
    atividade REAL NOT NULL,
    objetivo TEXT NOT NULL CHECK(objetivo IN ('cutting','maintenance','bulking')),
    tmb INTEGER NOT NULL,
    tdee INTEGER NOT NULL,
    calorias_alvo INTEGER NOT NULL,
    proteina_g INTEGER NOT NULL,
    carboidrato_g INTEGER NOT NULL,
    gordura_g INTEGER NOT NULL,
    observacao TEXT,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS medidas_corporais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES usuarios(id),
    peso REAL,
    altura REAL,
    pescoco REAL,
    ombros REAL,
    peitoral REAL,
    biceps_esq REAL,
    biceps_dir REAL,
    antebraco_esq REAL,
    antebraco_dir REAL,
    cintura REAL,
    abdomen REAL,
    quadril REAL,
    coxa_esq REAL,
    coxa_dir REAL,
    panturrilha_esq REAL,
    panturrilha_dir REAL,
    gordura_corporal REAL,
    observacao TEXT,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS alimentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    porcao REAL NOT NULL DEFAULT 100,
    unidade TEXT DEFAULT 'g',
    calorias REAL NOT NULL,
    proteina REAL NOT NULL,
    carboidrato REAL NOT NULL,
    gordura REAL NOT NULL,
    fibras REAL DEFAULT 0,
    categoria TEXT,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS receitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    modo_preparo TEXT,
    porcoes INTEGER DEFAULT 1,
    calorias_total REAL,
    proteina_total REAL,
    carboidrato_total REAL,
    gordura_total REAL,
    categoria TEXT,
    criador_id INTEGER REFERENCES usuarios(id),
    publica INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS receita_ingredientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receita_id INTEGER NOT NULL REFERENCES receitas(id),
    alimento_id INTEGER NOT NULL REFERENCES alimentos(id),
    quantidade REAL NOT NULL
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS planos_alimentares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    client_id INTEGER NOT NULL REFERENCES usuarios(id),
    profissional_id INTEGER REFERENCES usuarios(id),
    calorias_diarias INTEGER,
    proteina_diaria INTEGER,
    carboidrato_diario INTEGER,
    gordura_diaria INTEGER,
    data_inicio DATE,
    data_fim DATE,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS refeicoes_plano (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plano_id INTEGER NOT NULL REFERENCES planos_alimentares(id),
    nome TEXT NOT NULL,
    horario TIME,
    ordem INTEGER DEFAULT 0
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS refeicao_alimentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    refeicao_id INTEGER NOT NULL REFERENCES refeicoes_plano(id),
    alimento_id INTEGER NOT NULL REFERENCES alimentos(id),
    quantidade REAL NOT NULL DEFAULT 100,
    unidade TEXT DEFAULT 'g'
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS diario_alimentar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES usuarios(id),
    data DATE NOT NULL,
    refeicao TEXT NOT NULL,
    alimento_id INTEGER NOT NULL REFERENCES alimentos(id),
    quantidade REAL NOT NULL DEFAULT 100,
    calorias REAL,
    proteina REAL,
    carboidrato REAL,
    gordura REAL,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS exercicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    grupo_muscular TEXT NOT NULL,
    equipamento TEXT,
    dificuldade TEXT CHECK(dificuldade IN ('iniciante','intermediario','avancado')) DEFAULT 'iniciante',
    video_url TEXT,
    imagem_url TEXT,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS treinos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    client_id INTEGER NOT NULL REFERENCES usuarios(id),
    profissional_id INTEGER REFERENCES usuarios(id),
    tipo TEXT CHECK(tipo IN ('a','b','c','fullbody','push','pull','legs','custom')) DEFAULT 'custom',
    data_inicio DATE,
    data_fim DATE,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS treino_exercicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    treino_id INTEGER NOT NULL REFERENCES treinos(id),
    exercicio_id INTEGER NOT NULL REFERENCES exercicios(id),
    series INTEGER DEFAULT 3,
    repeticoes TEXT DEFAULT '12',
    carga REAL DEFAULT 0,
    descanso INTEGER DEFAULT 60,
    ordem INTEGER DEFAULT 0,
    observacao TEXT
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS diario_treino (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES usuarios(id),
    treino_id INTEGER REFERENCES treinos(id),
    data DATE NOT NULL,
    exercicio_id INTEGER NOT NULL REFERENCES exercicios(id),
    series_feitas INTEGER,
    repeticoes_feitas TEXT,
    carga_usada REAL,
    observacao TEXT,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS progresso_fotos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES usuarios(id),
    foto_url TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('frente','costas','lateral','custom')) DEFAULT 'frente',
    observacao TEXT,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  preencherImagensExercicios();
}

function preencherImagensExercicios() {
  const rows = query('SELECT id, nome FROM exercicios');
  const stmt = db.prepare('UPDATE exercicios SET imagem_url = ? WHERE id = ? AND (imagem_url IS NULL OR imagem_url = ?)');
  for (const r of rows) {
    const cat = EXERCICIOS_CATALOGO.find((e) => e[0] === r.nome);
    if (cat) stmt.run(cat[5], r.id, '');
  }
}

function migracaoSeguranca() {
  try {
    db.exec('ALTER TABLE usuarios ADD COLUMN forcar_troca_senha INTEGER DEFAULT 0');
  } catch (e) {
    if (!String(e.message).includes('duplicate column')) throw e;
  }
  try {
    db.exec('ALTER TABLE usuarios ADD COLUMN ultimo_login DATETIME');
  } catch (e) {
    if (!String(e.message).includes('duplicate column')) throw e;
  }

  db.exec(`CREATE TABLE IF NOT EXISTS recuperacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    token TEXT NOT NULL,
    expira_em DATETIME NOT NULL,
    usado INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  db.exec(`UPDATE usuarios SET forcar_troca_senha = 1 WHERE email = 'admin@nutrifit.com' AND forcar_troca_senha = 0`);
}

function migracaoNotificacoes() {
  db.exec(`CREATE TABLE IF NOT EXISTS notificacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    de_quem INTEGER REFERENCES usuarios(id),
    tipo TEXT DEFAULT 'info',
    titulo TEXT NOT NULL,
    mensagem TEXT,
    lida INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);
}

function migracaoIndices() {
  db.exec('CREATE INDEX IF NOT EXISTS idx_avaliacoes_client ON avaliacoes(client_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_medidas_client ON medidas_corporais(client_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_diario_alimentar_client_data ON diario_alimentar(client_id, data)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_diario_treino_client_data ON diario_treino(client_id, data)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_planos_client ON planos_alimentares(client_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_treinos_client ON treinos(client_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_progresso_fotos_client ON progresso_fotos(client_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_refeicoes_plano ON refeicoes_plano(plano_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_refeicao_alimentos ON refeicao_alimentos(refeicao_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_treino_exercicios ON treino_exercicios(treino_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_acessos_usuario ON acessos(usuario_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id, lida)');
}

function migracaoTreinoSemanal() {
  try {
    db.exec('ALTER TABLE treinos ADD COLUMN dia_semana INTEGER');
  } catch (e) {
    if (!String(e.message).includes('duplicate column')) throw e;
  }
  try {
    db.exec('ALTER TABLE treinos ADD COLUMN ordem_dia INTEGER');
  } catch (e) {
    if (!String(e.message).includes('duplicate column')) throw e;
  }
}

function garantirExercicios() {
  const stmt = db.prepare(
    `INSERT INTO exercicios (nome, descricao, grupo_muscular, equipamento, dificuldade, imagem_url)
     SELECT ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM exercicios WHERE nome = ?)`
  );
  for (const e of EXERCICIOS_CATALOGO) stmt.run(...e, e[0]);
}

function migracaoBibliotecaExercicios() {
  garantirExercicios();
}

function migrate() {
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT (datetime('now','localtime'))
  )`);

  for (const m of MIGRATIONS) {
    const applied = get('SELECT version FROM migrations WHERE version = ?', [m.version]);
    if (applied) continue;
    logger.info('Aplicando migração', { version: m.version, name: m.name });
    transaction(() => {
      m.up();
      run('INSERT INTO migrations (version, name) VALUES (?, ?)', [m.version, m.name]);
    });
  }
}

function seed() {
  const exist = get('SELECT id FROM usuarios WHERE email = ?', ['admin@nutrifit.com']);
  if (exist) return;

  const hashAdmin = bcrypt.hashSync('admin123', 10);
  const hashPadrao = bcrypt.hashSync('123456', 10);

  transaction(() => {
    run('INSERT INTO usuarios (nome, email, senha, tipo, plano, forcar_troca_senha) VALUES (?, ?, ?, ?, ?, ?)',
      ['Admin', 'admin@nutrifit.com', hashAdmin, 'admin', 'enterprise', 1]);
    run('INSERT INTO usuarios (nome, email, senha, tipo, plano) VALUES (?, ?, ?, ?, ?)',
      ['Dra. Carla Nutricionista', 'carla@nutrifit.com', hashPadrao, 'professional', 'pro']);
    run('INSERT INTO usuarios (nome, email, senha, tipo, plano) VALUES (?, ?, ?, ?, ?)',
      ['Personal Diego', 'diego@nutrifit.com', hashPadrao, 'professional', 'pro']);
    run('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
      ['João Silva', 'joao@email.com', hashPadrao, 'client']);
    run('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
      ['Maria Santos', 'maria@email.com', hashPadrao, 'client']);

    run('UPDATE usuarios SET profissional_id = 2 WHERE id = 4');
    run('UPDATE usuarios SET profissional_id = 3 WHERE id = 5');

    const alimentos = [
      ['Arroz branco cozido', 100, 'g', 128, 2.5, 28, 0.3, 0.4, 'graos'],
      ['Feijão preto cozido', 100, 'g', 77, 4.5, 14, 0.5, 8.4, 'graos'],
      ['Peito de frango grelhado', 100, 'g', 165, 31, 0, 3.6, 0, 'carnes'],
      ['Ovo cozido', 50, 'g', 78, 6.3, 0.6, 5.3, 0, 'ovos'],
      ['Batata doce cozida', 100, 'g', 86, 1.6, 20, 0.1, 3, 'tuberculos'],
      ['Aveia em flocos', 40, 'g', 148, 5.4, 25, 2.8, 4.2, 'cereais'],
      ['Banana prata', 60, 'g', 55, 0.6, 14, 0.1, 1.2, 'frutas'],
      ['Leite integral', 200, 'ml', 120, 6, 10, 6.4, 0, 'laticinios'],
      ['Whey protein isolate', 30, 'g', 113, 26, 1, 0.3, 0, 'suplementos'],
      ['Pão integral', 50, 'g', 127, 4.9, 23, 1.5, 3.5, 'cereais'],
      ['Azeite de oliva', 15, 'ml', 119, 0, 0, 13.5, 0, 'gorduras'],
      ['Salmão grelhado', 100, 'g', 206, 22, 0, 13, 0, 'carnes'],
      ['Abobrinha refogada', 100, 'g', 27, 1.2, 4.7, 0.4, 1.4, 'verduras'],
      ['Cenoura crua', 100, 'g', 41, 0.9, 10, 0.2, 2.8, 'verduras'],
      ['Iogurte natural', 170, 'g', 100, 6, 8, 5, 0, 'laticinios'],
    ];

    const stmtAlimento = db.prepare('INSERT INTO alimentos (nome, porcao, unidade, calorias, proteina, carboidrato, gordura, fibras, categoria) VALUES (?,?,?,?,?,?,?,?,?)');
    for (const a of alimentos) stmtAlimento.run(...a);

    garantirExercicios();

    run('INSERT INTO avaliacoes (client_id, idade, peso, altura, sexo, atividade, objetivo, tmb, tdee, calorias_alvo, proteina_g, carboidrato_g, gordura_g) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [4, 28, 78, 178, 'masculino', 1.55, 'bulking', 1755, 2720, 3070, 156, 386, 85]);
    run('INSERT INTO avaliacoes (client_id, idade, peso, altura, sexo, atividade, objetivo, tmb, tdee, calorias_alvo, proteina_g, carboidrato_g, gordura_g) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [5, 24, 63, 165, 'feminino', 1.375, 'maintenance', 1416, 1947, 1947, 113, 231, 54]);

    run('INSERT INTO planos_alimentares (nome, client_id, profissional_id, calorias_diarias, proteina_diaria, carboidrato_diario, gordura_diaria) VALUES (?,?,?,?,?,?,?)',
      ['Plano Bulking - João', 4, 2, 3070, 156, 386, 85]);

    const refeicoes = [
      { nome: 'Café da manhã', horario: '07:00', ordem: 1, alimentos: [[6, 80], [7, 120], [8, 200], [9, 30]] },
      { nome: 'Almoço', horario: '12:00', ordem: 2, alimentos: [[1, 200], [2, 150], [3, 200], [13, 100]] },
      { nome: 'Lanche', horario: '16:00', ordem: 3, alimentos: [[7, 100], [15, 170], [9, 30]] },
      { nome: 'Jantar', horario: '20:00', ordem: 4, alimentos: [[5, 200], [3, 200], [12, 100], [14, 50]] },
    ];

    for (const r of refeicoes) {
      const rId = run('INSERT INTO refeicoes_plano (plano_id, nome, horario, ordem) VALUES (?,?,?,?)',
        [1, r.nome, r.horario, r.ordem]).lastInsertRowid;
      for (const [alimentoId, qtd] of r.alimentos) {
        run('INSERT INTO refeicao_alimentos (refeicao_id, alimento_id, quantidade) VALUES (?,?,?)',
          [rId, alimentoId, qtd]);
      }
    }

    run('INSERT INTO treinos (nome, client_id, profissional_id, tipo) VALUES (?,?,?,?)',
      ['Treino A - Superior', 4, 3, 'a']);

    const exsTreino = [[1, 3, '12', 40], [4, 3, '12', 20], [5, 3, '12', 10], [9, 3, '12', 8], [13, 3, '20', 0]];
    for (let i = 0; i < exsTreino.length; i++) {
      const [exId, series, reps, carga] = exsTreino[i];
      run('INSERT INTO treino_exercicios (treino_id, exercicio_id, series, repeticoes, carga, ordem) VALUES (?,?,?,?,?,?)',
        [1, exId, series, reps, carga, i + 1]);
    }
  });
}

function logAcesso(usuarioId, evento, req) {
  try {
    const ip = (req && req.ip) || null;
    const ua = req && req.get ? req.get('User-Agent') : (req && req.headers ? req.headers['user-agent'] : null);
    run('INSERT INTO acessos (usuario_id, evento, ip, user_agent) VALUES (?,?,?,?)',
      [usuarioId, evento, ip, ua || null]);
  } catch (e) {
    logger.error('Erro ao registrar acesso', { erro: e.message });
  }
}

function initDB() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  migrate();
  seed();
  return db;
}

module.exports = {
  initDB,
  query,
  get,
  run,
  save,
  transaction,
  paginar,
  logAcesso,
  DB_PATH,
};
