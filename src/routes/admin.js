const { Router } = require('express');
const db = require('../db');
const { verificarToken, somenteTipo, bcrypt } = require('../auth');
const { validate } = require('../validate');
const schemas = require('../schemas');

const router = Router();

router.get('/stats', verificarToken, somenteTipo('admin'), (req, res) => {
  const totalUsuarios = db.get('SELECT COUNT(*) as c FROM usuarios').c;
  const activeUsers = db.get('SELECT COUNT(*) as c FROM usuarios WHERE ativo = 1').c;
  const byType = db.query('SELECT tipo, COUNT(*) as total FROM usuarios GROUP BY tipo');
  const byPlan = db.query('SELECT plano, COUNT(*) as total FROM usuarios GROUP BY plano');
  const totalAvaliacoes = db.get('SELECT COUNT(*) as c FROM avaliacoes').c;
  const totalPlanos = db.get('SELECT COUNT(*) as c FROM planos_alimentares').c;
  const totalTreinos = db.get('SELECT COUNT(*) as c FROM treinos').c;
  const totalAlimentos = db.get('SELECT COUNT(*) as c FROM alimentos').c;
  const totalExercicios = db.get('SELECT COUNT(*) as c FROM exercicios').c;
  const objetivos = db.query('SELECT objetivo, COUNT(*) as total FROM avaliacoes GROUP BY objetivo');
  const atividadesDiario = db.query('SELECT COUNT(*) as total, date(data) as dia FROM diario_alimentar GROUP BY dia ORDER BY dia DESC LIMIT 7');
  const treinosRealizados = db.query('SELECT COUNT(*) as total, date(data) as dia FROM diario_treino GROUP BY dia ORDER BY dia DESC LIMIT 7');
  const acessosDiarios = db.query('SELECT COUNT(*) as total, date(created_at) as dia FROM acessos GROUP BY dia ORDER BY dia DESC LIMIT 7');

  res.json({
    totalUsuarios, activeUsers, byType, byPlan,
    totalAvaliacoes, totalPlanos, totalTreinos, totalAlimentos, totalExercicios,
    objetivos, atividadesDiario, treinosRealizados, acessosDiarios,
  });
});

router.get('/users', verificarToken, somenteTipo('admin'), validate(schemas.adminQuery, 'query'), (req, res) => {
  const { busca, tipo, pagina, limite } = req.query;
  let sql = `FROM usuarios u LEFT JOIN usuarios p ON p.id = u.profissional_id WHERE 1=1`;
  const params = [];
  if (busca) { sql += ' AND (u.nome LIKE ? OR u.email LIKE ?)'; params.push(`%${busca}%`, `%${busca}%`); }
  if (tipo) { sql += ' AND u.tipo = ?'; params.push(tipo); }
  sql += ' ORDER BY u.created_at DESC';

  const paginado = db.paginar(`SELECT u.id, u.nome, u.email, u.tipo, u.plano, u.ativo, u.created_at, p.nome as profissional_nome ${sql}`, params, { pagina, limite });

  const ids = paginado.dados.map((u) => u.id);
  if (ids.length) {
    const contagens = db.query(
      `SELECT client_id, COUNT(*) as n FROM avaliacoes WHERE client_id IN (${ids.map(() => '?').join(',')}) GROUP BY client_id`,
      ids
    );
    const contAval = new Map(contagens.map((r) => [r.client_id, r.n]));
    const contPlanos = new Map(db.query(
      `SELECT client_id, COUNT(*) as n FROM planos_alimentares WHERE client_id IN (${ids.map(() => '?').join(',')}) GROUP BY client_id`, ids
    ).map((r) => [r.client_id, r.n]));
    const contTreinos = new Map(db.query(
      `SELECT client_id, COUNT(*) as n FROM treinos WHERE client_id IN (${ids.map(() => '?').join(',')}) GROUP BY client_id`, ids
    ).map((r) => [r.client_id, r.n]));

    for (const u of paginado.dados) {
      u.total_avaliacoes = contAval.get(u.id) || 0;
      u.total_planos = contPlanos.get(u.id) || 0;
      u.total_treinos = contTreinos.get(u.id) || 0;
    }
  }
  res.json(paginado);
});

router.put('/users/:id', verificarToken, somenteTipo('admin'), validate(schemas.adminUsuario), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const u = db.get('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });

    const { nome, email, tipo, plano, ativo, nova_senha } = req.body;
    db.run("UPDATE usuarios SET nome = COALESCE(?, nome), email = COALESCE(?, email), tipo = COALESCE(?, tipo), plano = COALESCE(?, plano), ativo = COALESCE(?, ativo), updated_at = datetime('now','localtime') WHERE id = ?",
      [nome ?? null, email ?? null, tipo ?? null, plano ?? null, ativo === undefined ? null : ativo ? 1 : 0, id]);
    if (nova_senha) {
      const hash = await bcrypt.hash(nova_senha, 10);
      db.run('UPDATE usuarios SET senha = ?, forcar_troca_senha = 1 WHERE id = ?', [hash, id]);
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.delete('/users/:id', verificarToken, somenteTipo('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.usuario.id) return res.status(400).json({ erro: 'Você não pode desativar o próprio usuário' });
  const u = db.get('SELECT id FROM usuarios WHERE id = ?', [id]);
  if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });

  db.run("UPDATE usuarios SET ativo = 0, updated_at = datetime('now','localtime') WHERE id = ?", [id]);
  res.json({ ok: true });
});

router.get('/acessos', verificarToken, somenteTipo('admin'), validate(schemas.adminAcessosQuery, 'query'), (req, res) => {
  const { pagina, limite } = req.query;
  const sql = `FROM acessos a JOIN usuarios u ON u.id = a.usuario_id ORDER BY a.created_at DESC, a.id DESC`;
  res.json(db.paginar(
    `SELECT a.id, a.usuario_id, a.evento, a.ip, a.created_at, u.nome, u.email, u.tipo ${sql}`,
    [], { pagina, limite }
  ));
});

module.exports = router;
