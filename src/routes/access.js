const { Router } = require('express');
const db = require('../db');
const { verificarToken } = require('../auth');

const router = Router();

router.post('/', verificarToken, (req, res) => {
  db.logAcesso(req.usuario.id, 'acesso', req);
  res.json({ ok: true });
});

router.get('/', verificarToken, (req, res) => {
  const { data } = req.query;
  let sql = 'SELECT * FROM acessos WHERE usuario_id = ?';
  const params = [req.usuario.id];
  if (data) {
    sql += ' AND date(created_at) = ?';
    params.push(data);
  }
  sql += ' ORDER BY created_at DESC LIMIT 50';
  res.json(db.query(sql, params));
});

module.exports = router;
