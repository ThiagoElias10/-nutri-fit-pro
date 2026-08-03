const { Router } = require('express');
const db = require('../db');
const { verificarToken, verificarClienteAcessivel } = require('../auth');
const { validate, idParams } = require('../validate');
const schemas = require('../schemas');

const router = Router();

function clienteAlvo(req, res) {
  const clientId = parseInt((req.body && req.body.client_id) || req.query.client_id || req.usuario.id);
  if (req.usuario.tipo === 'client' && clientId !== req.usuario.id) {
    res.status(403).json({ erro: 'Acesso não autorizado' });
    return null;
  }
  if (req.usuario.tipo === 'professional' && clientId !== req.usuario.id && !verificarClienteAcessivel(req, clientId)) {
    res.status(403).json({ erro: 'Acesso não autorizado' });
    return null;
  }
  return clientId;
}

router.get('/', verificarToken, validate(schemas.diarioQuery, 'query'), (req, res) => {
  const clientId = clienteAlvo(req, res);
  if (!clientId) return;

  const { data } = req.query;
  let sql = `SELECT d.*, a.nome as alimento_nome, a.unidade, a.porcao,
             a.calorias as cal_porcao, a.proteina as prot_porcao, a.carboidrato as carb_porcao, a.gordura as gord_porcao,
             a.categoria
             FROM diario_alimentar d
             JOIN alimentos a ON a.id = d.alimento_id
             WHERE d.client_id = ?`;
  const params = [clientId];
  if (data) {
    sql += ' AND d.data = ?';
    params.push(data);
  } else {
    sql += " AND d.data = date('now')";
  }
  sql += ' ORDER BY d.created_at ASC';

  const entries = db.query(sql, params);
  for (const e of entries) {
    const fator = e.quantidade / (e.porcao || 100);
    e.calorias = Math.round(e.cal_porcao * fator);
    e.proteina = Math.round(e.prot_porcao * fator * 10) / 10;
    e.carboidrato = Math.round(e.carb_porcao * fator * 10) / 10;
    e.gordura = Math.round(e.gord_porcao * fator * 10) / 10;
  }

  const summary = {
    refeicoes: {},
    total: { calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 },
  };

  for (const e of entries) {
    if (!summary.refeicoes[e.refeicao]) summary.refeicoes[e.refeicao] = [];
    summary.refeicoes[e.refeicao].push(e);
    summary.total.calorias += e.calorias;
    summary.total.proteina += e.proteina;
    summary.total.carboidrato += e.carboidrato;
    summary.total.gordura += e.gordura;
  }

  summary.total.calorias = Math.round(summary.total.calorias);
  summary.total.proteina = Math.round(summary.total.proteina * 10) / 10;
  summary.total.carboidrato = Math.round(summary.total.carboidrato * 10) / 10;
  summary.total.gordura = Math.round(summary.total.gordura * 10) / 10;

  res.json({ entries, summary });
});

router.post('/', verificarToken, validate(schemas.diario), (req, res) => {
  const { client_id, data, refeicao, alimento_id, quantidade } = req.body;
  const clientId = client_id || req.usuario.id;
  if (!verificarClienteAcessivel(req, clientId)) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }

  const alimento = db.get('SELECT * FROM alimentos WHERE id = ?', [alimento_id]);
  if (!alimento) return res.status(404).json({ erro: 'Alimento não encontrado' });

  const fator = quantidade / (alimento.porcao || 100);
  db.run(
    `INSERT INTO diario_alimentar (client_id, data, refeicao, alimento_id, quantidade, calorias, proteina, carboidrato, gordura)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      clientId,
      data || new Date().toISOString().split('T')[0],
      refeicao,
      alimento_id,
      quantidade,
      Math.round(alimento.calorias * fator),
      Math.round(alimento.proteina * fator * 10) / 10,
      Math.round(alimento.carboidrato * fator * 10) / 10,
      Math.round(alimento.gordura * fator * 10) / 10,
    ]
  );
  res.status(201).json({ ok: true });
});

router.delete('/:id', verificarToken, validate(idParams, 'params'), (req, res) => {
  const id = req.params.id;
  const entry = db.get('SELECT * FROM diario_alimentar WHERE id = ?', [id]);
  if (!entry) return res.status(404).json({ erro: 'Registro não encontrado' });

  if (req.usuario.tipo === 'client') {
    if (entry.client_id !== req.usuario.id) return res.status(403).json({ erro: 'Acesso não autorizado' });
  } else if (!verificarClienteAcessivel(req, entry.client_id)) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }

  db.run('DELETE FROM diario_alimentar WHERE id = ?', [id]);
  res.status(204).send();
});

module.exports = router;
