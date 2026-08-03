const { Router } = require('express');
const db = require('../db');
const { verificarToken, somenteTipo, verificarClienteAcessivel } = require('../auth');
const { validate } = require('../validate');
const schemas = require('../schemas');

const router = Router();

function clienteAlvo(req, res) {
  const clientId = (req.body && req.body.client_id) || req.query.client_id || req.usuario.id;
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

router.post('/calcular', verificarToken, somenteTipo('professional', 'client'), validate(schemas.avaliacao), (req, res) => {
  const { client_id, idade, peso, altura, sexo, atividade, objetivo, observacao } = req.body;
  const clientId = req.usuario.tipo === 'client' ? req.usuario.id : client_id;
  if (!verificarClienteAcessivel(req, clientId)) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }

  let tmb;
  if (sexo === 'masculino') tmb = 10 * peso + 6.25 * altura - 5 * idade + 5;
  else tmb = 10 * peso + 6.25 * altura - 5 * idade - 161;
  tmb = Math.round(tmb);
  const tdee = Math.round(tmb * atividade);

  let caloriasAlvo, proteinaKg;
  switch (objetivo) {
    case 'cutting': caloriasAlvo = tdee - 500; proteinaKg = 2.2; break;
    case 'maintenance': caloriasAlvo = tdee; proteinaKg = 1.8; break;
    case 'bulking': caloriasAlvo = tdee + 350; proteinaKg = 2.0; break;
    default: return res.status(400).json({ erro: 'Objetivo inválido' });
  }

  const proteinaG = Math.round(peso * proteinaKg);
  const gorduraG = Math.round((caloriasAlvo * 0.25) / 9);
  const carbG = Math.round((caloriasAlvo - proteinaG * 4 - gorduraG * 9) / 4);

  const profissionalId = req.usuario.tipo === 'professional' ? req.usuario.id : null;

  db.run(
    `INSERT INTO avaliacoes (client_id, profissional_id, idade, peso, altura, sexo, atividade, objetivo, tmb, tdee, calorias_alvo, proteina_g, carboidrato_g, gordura_g, observacao)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [clientId, profissionalId, idade, peso, altura, sexo, atividade, objetivo, tmb, tdee, caloriasAlvo, proteinaG, carbG, gorduraG, observacao || null]
  );

  res.json({
    tmb, tdee, caloriasAlvo, proteinaKg, proteinaG, carbG, gorduraG, objetivo,
    protein_cal: proteinaG * 4,
    carb_cal: carbG * 4,
    fat_cal: gorduraG * 9,
  });
});

router.get('/historico', verificarToken, somenteTipo('professional', 'client'), validate(schemas.avaliacaoQuery, 'query'), (req, res) => {
  const clientId = clienteAlvo(req, res);
  if (!clientId) return;

  const rows = db.query(
    'SELECT * FROM avaliacoes WHERE client_id = ? ORDER BY created_at DESC LIMIT 30',
    [clientId]
  );
  res.json(rows);
});

router.get('/ultima', verificarToken, somenteTipo('professional', 'client'), validate(schemas.avaliacaoQuery, 'query'), (req, res) => {
  const clientId = clienteAlvo(req, res);
  if (!clientId) return;

  const row = db.get(
    'SELECT * FROM avaliacoes WHERE client_id = ? ORDER BY created_at DESC LIMIT 1',
    [clientId]
  );
  res.json(row || null);
});

module.exports = router;
