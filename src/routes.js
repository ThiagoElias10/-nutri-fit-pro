const { Router } = require('express');
const { verificarToken, logAccess } = require('./auth');
const db = require('./db');

const router = Router();
router.use(logAccess);

router.use('/auth', require('./routes/auth'));
router.use('/avaliacoes', require('./routes/assessments'));
router.use('/clientes', require('./routes/clients'));
router.use('/alimentos', require('./routes/foods'));
router.use('/planos-alimentares', require('./routes/meal-plans'));
router.use('/diario-alimentar', require('./routes/food-diary'));
router.use('/exercicios', require('./routes/exercises'));
router.use('/treinos', require('./routes/workouts'));
router.use('/progresso', require('./routes/progress'));
router.use('/atividade', require('./routes/access'));
router.use('/receitas', require('./routes/receitas'));
router.use('/notificacoes', require('./routes/notificacoes'));
router.use('/exportar', require('./routes/exportar'));
router.use('/admin', require('./routes/admin'));

router.get('/dashboard', verificarToken, (req, res) => {
  if (req.usuario.tipo === 'admin') {
    const stats = db.get("SELECT COUNT(*) as c FROM usuarios WHERE tipo = 'client'").c;
    const profs = db.get("SELECT COUNT(*) as c FROM usuarios WHERE tipo = 'professional'").c;
    const avals = db.get('SELECT COUNT(*) as c FROM avaliacoes').c;
    const planos = db.get('SELECT COUNT(*) as c FROM planos_alimentares').c;
    return res.json({ total_clientes: stats, total_profissionais: profs, total_avaliacoes: avals, totalPlanos: planos });
  }

  if (req.usuario.tipo === 'professional') {
    const clientes = db.get('SELECT COUNT(*) as c FROM usuarios WHERE profissional_id = ?', [req.usuario.id]).c;
    const ultimasAvaliacoes = db.query(
      `SELECT a.*, u.nome as client_name FROM avaliacoes a
       JOIN usuarios u ON u.id = a.client_id
       WHERE a.client_id IN (SELECT id FROM usuarios WHERE profissional_id = ?)
       ORDER BY a.created_at DESC LIMIT 5`,
      [req.usuario.id]
    );
    const naoLidas = db.get('SELECT COUNT(*) as c FROM notificacoes WHERE usuario_id = ? AND lida = 0', [req.usuario.id]).c;
    return res.json({ total_clientes: clientes, ultimas_avaliacoes: ultimasAvaliacoes, notificacoes_nao_lidas: naoLidas });
  }

  if (req.usuario.tipo === 'client') {
    const ultimaAv = db.get(
      'SELECT * FROM avaliacoes WHERE client_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.usuario.id]
    );
    const diarioHoje = db.get(
      "SELECT COUNT(*) as c, COALESCE(SUM(calorias),0) as total_cal FROM diario_alimentar WHERE client_id = ? AND data = date('now')",
      [req.usuario.id]
    );
    const planosAtivos = db.get(
      'SELECT COUNT(*) as c FROM planos_alimentares WHERE client_id = ? AND ativo = 1',
      [req.usuario.id]
    ).c;
    const naoLidas = db.get('SELECT COUNT(*) as c FROM notificacoes WHERE usuario_id = ? AND lida = 0', [req.usuario.id]).c;

    return res.json({
      ultima_avaliacao: ultimaAv || null,
      calorias_hoje: diarioHoje.total_cal || 0,
      total_refeicoes_hoje: diarioHoje.c || 0,
      planos_ativos: planosAtivos,
      notificacoes_nao_lidas: naoLidas,
    });
  }

  res.json({});
});

module.exports = router;
