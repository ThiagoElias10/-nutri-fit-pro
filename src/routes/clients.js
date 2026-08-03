const { Router } = require('express');
const db = require('../db');
const { verificarToken, somenteTipo, verificarClienteAcessivel } = require('../auth');
const { validate, idParams, paginacaoQuery } = require('../validate');
const schemas = require('../schemas');

const router = Router();

router.get('/', verificarToken, validate(paginacaoQuery, 'query'), (req, res) => {
  if (req.usuario.tipo === 'professional') {
    const clientes = db.query(
      `SELECT id, nome, email, telefone, foto_url, plano, created_at, updated_at
       FROM usuarios WHERE profissional_id = ? AND ativo = 1 ORDER BY nome`,
      [req.usuario.id]
    );
    const avaliacoes = db.query(
      `SELECT a.client_id, MAX(a.created_at) as ultima, COUNT(*) as total
       FROM avaliacoes a
       WHERE a.client_id IN (SELECT id FROM usuarios WHERE profissional_id = ?)
       GROUP BY a.client_id`,
      [req.usuario.id]
    );
    const mapa = new Map(avaliacoes.map((a) => [a.client_id, a]));
    for (const c of clientes) {
      c.ultima_avaliacao = mapa.get(c.id)?.ultima || null;
      c.total_avaliacoes = mapa.get(c.id)?.total || 0;
    }
    return res.json(clientes);
  }

  if (req.usuario.tipo === 'admin') {
    const { pagina, limite } = req.query;
    const base = `FROM usuarios u LEFT JOIN usuarios p ON p.id = u.profissional_id WHERE u.tipo = 'client'`;
    const total = db.get(`SELECT COUNT(*) as total ${base}`).total;
    const p = Math.max(1, parseInt(pagina) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limite) || 50));
    const clientes = db.query(
      `SELECT u.*, p.nome as profissional_nome ${base} ORDER BY u.nome LIMIT ? OFFSET ?`,
      [l, (p - 1) * l]
    );
    return res.json({ dados: clientes, paginacao: { pagina: p, limite: l, total, total_paginas: Math.ceil(total / l) } });
  }

  res.status(403).json({ erro: 'Acesso não autorizado' });
});

router.post('/vincular', verificarToken, somenteTipo('professional'), validate(schemas.vincularCliente), (req, res) => {
  const { client_email } = req.body;
  const client = db.get(
    'SELECT id, nome, email, profissional_id FROM usuarios WHERE email = ? AND tipo = ?',
    [client_email, 'client']
  );
  if (!client) return res.status(404).json({ erro: 'Cliente não encontrado' });
  if (client.profissional_id) return res.status(400).json({ erro: 'Cliente já possui um profissional vinculado' });

  db.run("UPDATE usuarios SET profissional_id = ?, updated_at = datetime('now','localtime') WHERE id = ?",
    [req.usuario.id, client.id]);
  res.json({ ok: true, cliente: client });
});

router.delete('/vincular/:client_id', verificarToken, somenteTipo('professional'), (req, res) => {
  const clientId = parseInt(req.params.client_id);
  const rel = db.get('SELECT id FROM usuarios WHERE id = ? AND profissional_id = ?', [clientId, req.usuario.id]);
  if (!rel) return res.status(404).json({ erro: 'Cliente não vinculado' });

  db.run("UPDATE usuarios SET profissional_id = NULL, updated_at = datetime('now','localtime') WHERE id = ?", [clientId]);
  res.json({ ok: true });
});

router.get('/disponiveis', verificarToken, somenteTipo('professional'), (req, res) => {
  const clients = db.query(
    'SELECT id, nome, email FROM usuarios WHERE tipo = ? AND profissional_id IS NULL AND ativo = 1 ORDER BY nome',
    ['client']
  );
  res.json(clients);
});

router.put('/:id', verificarToken, validate(schemas.atualizarCliente), validate(idParams, 'params'), (req, res) => {
  const clientId = parseInt(req.params.id);
  if (req.usuario.tipo === 'professional') {
    if (!verificarClienteAcessivel(req, clientId)) {
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    }
  } else if (req.usuario.tipo !== 'admin' && req.usuario.id !== clientId) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }

  const { nome, telefone, foto_url, plano } = req.body;
  db.run("UPDATE usuarios SET nome = COALESCE(?, nome), telefone = ?, foto_url = ?, updated_at = datetime('now','localtime') WHERE id = ?",
    [nome ?? null, telefone !== undefined ? telefone : null, foto_url !== undefined ? foto_url : null, clientId]);
  if (plano && req.usuario.tipo === 'admin') {
    db.run('UPDATE usuarios SET plano = ? WHERE id = ?', [plano, clientId]);
  }
  res.json({ ok: true });
});

module.exports = router;
