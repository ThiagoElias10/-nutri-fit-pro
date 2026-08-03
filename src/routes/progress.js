const { Router } = require('express');
const db = require('../db');
const { verificarToken, verificarClienteAcessivel, exigirPlano } = require('../auth');
const { validate, idParams } = require('../validate');
const schemas = require('../schemas');

const router = Router();

const CAMPOS_MEDIDA = [
  'peso', 'altura', 'pescoco', 'ombros', 'peitoral', 'biceps_esq', 'biceps_dir',
  'antebraco_esq', 'antebraco_dir', 'cintura', 'abdomen', 'quadril', 'coxa_esq', 'coxa_dir',
  'panturrilha_esq', 'panturrilha_dir', 'gordura_corporal', 'observacao',
];

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

router.get('/measurements', verificarToken, (req, res) => {
  const clientId = clienteAlvo(req, res);
  if (!clientId) return;
  const rows = db.query(
    'SELECT * FROM medidas_corporais WHERE client_id = ? ORDER BY created_at DESC LIMIT 30',
    [clientId]
  );
  res.json(rows);
});

router.post('/measurements', verificarToken, validate(schemas.medidaCorporal), (req, res) => {
  const clientId = req.body.client_id || req.usuario.id;
  if (!verificarClienteAcessivel(req, clientId)) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }

  const cols = ['client_id', ...CAMPOS_MEDIDA];
  const vals = CAMPOS_MEDIDA.map((f) => req.body[f] !== undefined && req.body[f] !== null ? req.body[f] : null);
  const placeholders = CAMPOS_MEDIDA.map(() => '?');
  const r = db.run(
    `INSERT INTO medidas_corporais (${cols.join(',')}) VALUES (?${placeholders.map(() => ',?').join('')})`,
    [clientId, ...vals]
  );
  res.status(201).json(db.get('SELECT * FROM medidas_corporais WHERE id = ?', [r.lastInsertRowid]));
});

router.put('/measurements/:id', verificarToken, validate(idParams, 'params'), validate(schemas.medidaCorporal), (req, res) => {
  const id = req.params.id;
  const m = db.get('SELECT * FROM medidas_corporais WHERE id = ?', [id]);
  if (!m) return res.status(404).json({ erro: 'Medida não encontrada' });
  if (!verificarClienteAcessivel(req, m.client_id)) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }

  const sets = CAMPOS_MEDIDA.filter((f) => req.body[f] !== undefined && req.body[f] !== null)
    .map((f) => `${f} = ?`);
  const params = CAMPOS_MEDIDA.filter((f) => req.body[f] !== undefined && req.body[f] !== null)
    .map((f) => req.body[f]);
  if (sets.length) {
    db.run(`UPDATE medidas_corporais SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  }
  res.json(db.get('SELECT * FROM medidas_corporais WHERE id = ?', [id]));
});

router.delete('/measurements/:id', verificarToken, validate(idParams, 'params'), (req, res) => {
  const id = req.params.id;
  const m = db.get('SELECT * FROM medidas_corporais WHERE id = ?', [id]);
  if (!m) return res.status(404).json({ erro: 'Medida não encontrada' });
  if (!verificarClienteAcessivel(req, m.client_id)) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }
  db.run('DELETE FROM medidas_corporais WHERE id = ?', [id]);
  res.status(204).send();
});

router.get('/photos', verificarToken, exigirPlano('pro', 'enterprise'), (req, res) => {
  const clientId = clienteAlvo(req, res);
  if (!clientId) return;
  const photos = db.query(
    'SELECT * FROM progresso_fotos WHERE client_id = ? ORDER BY created_at DESC',
    [clientId]
  );
  res.json(photos);
});

router.post('/photos', verificarToken, exigirPlano('pro', 'enterprise'), validate(schemas.fotoProgresso), (req, res) => {
  const clientId = req.body.client_id || req.usuario.id;
  if (!verificarClienteAcessivel(req, clientId)) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }

  const { foto_url, tipo, observacao } = req.body;
  const r = db.run(
    'INSERT INTO progresso_fotos (client_id, foto_url, tipo, observacao) VALUES (?,?,?,?)',
    [clientId, foto_url, tipo, observacao || null]
  );
  res.status(201).json(db.get('SELECT * FROM progresso_fotos WHERE id = ?', [r.lastInsertRowid]));
});

router.delete('/photos/:id', verificarToken, exigirPlano('pro', 'enterprise'), validate(idParams, 'params'), (req, res) => {
  const id = req.params.id;
  const foto = db.get('SELECT * FROM progresso_fotos WHERE id = ?', [id]);
  if (!foto) return res.status(404).json({ erro: 'Foto não encontrada' });
  if (!verificarClienteAcessivel(req, foto.client_id)) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }
  db.run('DELETE FROM progresso_fotos WHERE id = ?', [id]);
  res.status(204).send();
});

router.get('/evolution', verificarToken, (req, res) => {
  const clientId = clienteAlvo(req, res);
  if (!clientId) return;

  const measurements = db.query(
    'SELECT created_at, peso, gordura_corporal, cintura, abdomen, peitoral, biceps_esq, coxa_esq FROM medidas_corporais WHERE client_id = ? ORDER BY created_at ASC',
    [clientId]
  );
  const assessments = db.query(
    'SELECT created_at, peso, tmb, tdee, calorias_alvo FROM avaliacoes WHERE client_id = ? ORDER BY created_at ASC',
    [clientId]
  );
  res.json({ measurements, assessments });
});

module.exports = router;
