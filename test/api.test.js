process.env.DB_PATH = require('path').join(require('os').tmpdir(), `nutrifit-test-${Date.now()}.db`);
process.env.JWT_SECRET = 'segredo-de-teste';
process.env.LOG_LEVEL = 'error';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const db = require('../src/db');
const { criarApp } = require('../server');

let app;
let server;
let base;

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* corpo não-JSON */ }
  return { status: res.status, data, headers: res.headers };
}

async function login(email, senha) {
  const r = await api('/api/auth/login', { method: 'POST', body: { email, senha } });
  return r;
}

before(async () => {
  await db.initDB();
  app = criarApp();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

test('GET /api retorna metadados do sistema', async () => {
  const r = await api('/api');
  assert.equal(r.status, 200);
  assert.ok(r.data.nome.includes('NutriFit'));
  assert.ok(Array.isArray(r.data.endpoints));
});

test('login admin com forcar_troca_senha', async () => {
  const r = await login('admin@nutrifit.com', 'admin123');
  assert.equal(r.status, 200);
  assert.ok(r.data.token);
  assert.equal(r.data.forcar_troca_senha, true);
  assert.equal(r.data.usuario.tipo, 'admin');
});

test('login com senha incorreta', async () => {
  const r = await login('admin@nutrifit.com', 'errada');
  assert.equal(r.status, 401);
});

test('register valida senha fraca', async () => {
  const r = await api('/api/auth/register', {
    method: 'POST',
    body: { nome: 'Novo', email: 'novo@teste.com', senha: '123' },
  });
  assert.equal(r.status, 400);
  assert.ok(r.data.detalhes);
});

test('register cliente e acesso ao dashboard', async () => {
  const r = await api('/api/auth/register', {
    method: 'POST',
    body: { nome: 'Novo Cliente', email: 'novo@teste.com', senha: 'senha1234' },
  });
  assert.equal(r.status, 201);
  const token = r.data.token;
  const dash = await api('/api/dashboard', { token });
  assert.equal(dash.status, 200);
  assert.equal(typeof dash.data.calorias_hoje, 'number');
});

test('alimentos com paginação', async () => {
  const admin = await login('admin@nutrifit.com', 'admin123');
  const r = await api('/api/alimentos?pagina=1&limite=5', { token: admin.data.token });
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.dados));
  assert.equal(r.data.dados.length, 5);
  assert.equal(r.data.paginacao.pagina, 1);
  assert.ok(r.data.paginacao.total >= 15);
});

test('cliente não pode criar alimentos', async () => {
  const c = await login('joao@email.com', '123456');
  const r = await api('/api/alimentos', {
    method: 'POST',
    token: c.data.token,
    body: { nome: 'X', calorias: 100 },
  });
  assert.equal(r.status, 403);
});

test('profissional acessa apenas diário dos próprios clientes', async () => {
  const carla = await login('carla@nutrifit.com', '123456');
  const diego = await login('diego@nutrifit.com', '123456');

  const proprio = await api('/api/diario-alimentar?client_id=4', { token: carla.data.token });
  assert.equal(proprio.status, 200);

  const deOutro = await api('/api/diario-alimentar?client_id=5', { token: carla.data.token });
  assert.equal(deOutro.status, 403);

  const comoDiego = await api('/api/diario-alimentar?client_id=5', { token: diego.data.token });
  assert.equal(comoDiego.status, 200);
});

test('cliente não acessa dados de outro cliente', async () => {
  const joao = await login('joao@email.com', '123456');
  const r = await api('/api/diario-alimentar?client_id=5', { token: joao.data.token });
  assert.equal(r.status, 403);
});

test('plano alimentar protegido por dono', async () => {
  const maria = await login('maria@email.com', '123456');
  const r = await api('/api/planos-alimentares/1', { token: maria.data.token });
  assert.equal(r.status, 403);

  const joao = await login('joao@email.com', '123456');
  const ok = await api('/api/planos-alimentares/1', { token: joao.data.token });
  assert.equal(ok.status, 200);
  assert.ok(Array.isArray(ok.data.refeicoes));
});

test('profissional não vê treino de cliente não vinculado', async () => {
  const maria = await login('maria@email.com', '123456');
  const comoCliente = await api('/api/treinos?client_id=4', { token: maria.data.token });
  assert.equal(comoCliente.status, 403);

  const carla = await login('carla@nutrifit.com', '123456');
  const naoVinculado = await api('/api/treinos?client_id=5', { token: carla.data.token });
  assert.equal(naoVinculado.status, 403);

  const diego = await login('diego@nutrifit.com', '123456');
  const ok = await api('/api/treinos?client_id=5', { token: diego.data.token });
  assert.equal(ok.status, 200);
  assert.ok(Array.isArray(ok.data));
});

test('CRUD de receitas', async () => {
  const joao = await login('joao@email.com', '123456');
  const r = await api('/api/receitas', {
    method: 'POST',
    token: joao.data.token,
    body: { nome: 'Omelete', ingredientes: [{ alimento_id: 4, quantidade: 100 }] },
  });
  assert.equal(r.status, 201);
  assert.ok(r.data.total_calorias > 0);
  const id = r.data.id;

  const maria = await login('maria@email.com', '123456');
  const outro = await api(`/api/receitas/${id}`, {
    method: 'PUT',
    token: maria.data.token,
    body: { nome: 'Hackeado' },
  });
  assert.equal(outro.status, 403);

  const lista = await api('/api/receitas', { token: maria.data.token });
  assert.equal(lista.status, 200);
  assert.ok(Array.isArray(lista.data.dados));
});

test('notificações geram lembretes para cliente', async () => {
  const joao = await login('joao@email.com', '123456');
  const r = await api('/api/notificacoes', { token: joao.data.token });
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.data.dados));
});

test('fotos de progresso exigem plano pago', async () => {
  const joao = await login('joao@email.com', '123456');
  const r = await api('/api/progresso/photos', {
    method: 'POST',
    token: joao.data.token,
    body: { foto_url: 'https://exemplo.com/foto.jpg' },
  });
  assert.equal(r.status, 402);
});

test('troca de senha exige senha atual correta', async () => {
  const carla = await login('carla@nutrifit.com', '123456');
  const errada = await api('/api/auth/senha', {
    method: 'POST',
    token: carla.data.token,
    body: { senha_atual: 'errada', nova_senha: 'novaSenha1' },
  });
  assert.equal(errada.status, 401);

  const ok = await api('/api/auth/senha', {
    method: 'POST',
    token: carla.data.token,
    body: { senha_atual: '123456', nova_senha: 'novaSenha1' },
  });
  assert.equal(ok.status, 200);

  const novoLogin = await login('carla@nutrifit.com', 'novaSenha1');
  assert.equal(novoLogin.status, 200);

  const antiga = await login('carla@nutrifit.com', '123456');
  assert.equal(antiga.status, 401);
});

test('recuperação de senha por token', async () => {
  const solicita = await api('/api/auth/recuperar', {
    method: 'POST',
    body: { email: 'maria@email.com' },
  });
  assert.equal(solicita.status, 200);
  assert.ok(solicita.data.token);

  const confirma = await api('/api/auth/recuperar/confirmar', {
    method: 'POST',
    body: { token: solicita.data.token, nova_senha: 'senhaNova99' },
  });
  assert.equal(confirma.status, 200);

  const reutilizado = await api('/api/auth/recuperar/confirmar', {
    method: 'POST',
    body: { token: solicita.data.token, nova_senha: 'outraSenha1' },
  });
  assert.equal(reutilizado.status, 400);
});

test('admin: stats, users paginados e senha reset', async () => {
  const admin = await login('admin@nutrifit.com', 'admin123');
  const stats = await api('/api/admin/stats', { token: admin.data.token });
  assert.equal(stats.status, 200);
  assert.ok(stats.data.totalUsuarios >= 5);

  const users = await api('/api/admin/users?limite=2', { token: admin.data.token });
  assert.equal(users.status, 200);
  assert.equal(users.data.paginacao.limite, 2);

  const reset = await api('/api/admin/users/4', {
    method: 'PUT',
    token: admin.data.token,
    body: { nova_senha: 'senhaAdmin1' },
  });
  assert.equal(reset.status, 200);
  const novo = await login('joao@email.com', 'senhaAdmin1');
  assert.equal(novo.status, 200);
});

test('exportação exige plano básico+', async () => {
  const joao = await login('joao@email.com', 'senhaAdmin1');
  const r = await api('/api/exportar', { token: joao.data.token });
  assert.equal(r.status, 402);

  const carla = await login('carla@nutrifit.com', 'novaSenha1');
  const ok = await api('/api/exportar', { token: carla.data.token });
  assert.equal(ok.status, 200);
  assert.ok(Array.isArray(ok.data.dados.clientes));
});

test('rota inexistente retorna 404 JSON', async () => {
  const r = await api('/api/nao-existe');
  assert.equal(r.status, 404);
  assert.equal(r.data.erro, 'Rota não encontrada');
});

test('profissional gera treino semanal para cliente vinculado', async () => {
  const diego = await login('diego@nutrifit.com', '123456');
  const r = await api('/api/treinos/gerar', {
    method: 'POST',
    token: diego.data.token,
    body: { client_id: 5, dias_por_semana: 3 },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.dias_por_semana, 3);
  assert.equal(r.data.treinos.length, 3);
  assert.ok(r.data.treinos[0].nome.includes('Treino A'));
  assert.equal(typeof r.data.treinos[0].dia_semana, 'number');
  assert.ok(r.data.treinos[0].exercicios.length > 0);
  assert.ok(r.data.treinos[0].exercicios[0].imagem_url);
});

test('profissional não gera treino de cliente não vinculado', async () => {
  const carla = await login('carla@nutrifit.com', 'novaSenha1');
  const r = await api('/api/treinos/gerar', {
    method: 'POST',
    token: carla.data.token,
    body: { client_id: 5, dias_por_semana: 2 },
  });
  assert.equal(r.status, 403);
});

test('profissional sem client_id recebe 400', async () => {
  const diego = await login('diego@nutrifit.com', '123456');
  const r = await api('/api/treinos/gerar', {
    method: 'POST',
    token: diego.data.token,
    body: { dias_por_semana: 2 },
  });
  assert.equal(r.status, 400);
});

test('cliente gera o próprio treino semanal e gerar novamente substitui', async () => {
  const maria = await login('maria@email.com', 'senhaNova99');
  const r = await api('/api/treinos/gerar', {
    method: 'POST',
    token: maria.data.token,
    body: { dias_por_semana: 4, objetivo: 'emagrecimento' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.treinos.length, 4);
  const cardios = r.data.treinos.flatMap((t) => t.exercicios).filter((e) => e.grupo_muscular === 'cardio');
  assert.ok(cardios.length > 0, 'deve incluir cardio no plano de emagrecimento');
  assert.ok(r.data.treinos.every((t) => t.exercicios[0].imagem_url));

  const deNovo = await api('/api/treinos/gerar', {
    method: 'POST',
    token: maria.data.token,
    body: { dias_por_semana: 4, objetivo: 'emagrecimento' },
  });
  assert.equal(deNovo.status, 201);
  assert.equal(deNovo.data.treinos.length, 4);

  const lista = await api('/api/treinos', { token: maria.data.token });
  assert.equal(lista.status, 200);
  const semanais = lista.data.filter((t) => t.dia_semana !== null);
  assert.equal(semanais.length, 4);
});

test('geração sem objetivo usa o da última avaliação', async () => {
  const joao = await login('joao@email.com', 'senhaAdmin1');
  const r = await api('/api/treinos/gerar', {
    method: 'POST',
    token: joao.data.token,
    body: { dias_por_semana: 2 },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.objetivo, 'bulking');
  assert.equal(r.data.treinos.length, 2);
});
