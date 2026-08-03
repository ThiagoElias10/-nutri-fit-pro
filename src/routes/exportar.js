const { Router } = require('express');
const db = require('../db');
const { verificarToken, exigirPlano } = require('../auth');

const router = Router();

router.get('/', verificarToken, exigirPlano('basic', 'pro', 'enterprise'), (req, res) => {
  const u = req.usuario;

  if (u.tipo === 'client') {
    const dados = {
      usuario: db.get('SELECT id, nome, email, telefone, plano, created_at FROM usuarios WHERE id = ?', [u.id]),
      avaliacoes: db.query('SELECT * FROM avaliacoes WHERE client_id = ?', [u.id]),
      medidas: db.query('SELECT * FROM medidas_corporais WHERE client_id = ?', [u.id]),
      diario: db.query('SELECT * FROM diario_alimentar WHERE client_id = ?', [u.id]),
      planos: db.query('SELECT * FROM planos_alimentares WHERE client_id = ?', [u.id]),
      treinos: db.query('SELECT * FROM treinos WHERE client_id = ?', [u.id]),
      registros_treino: db.query('SELECT * FROM diario_treino WHERE client_id = ?', [u.id]),
      fotos: db.query('SELECT id, tipo, observacao, created_at FROM progresso_fotos WHERE client_id = ?', [u.id]),
    };
    return res.json({ exportado_em: new Date().toISOString(), tipo: 'cliente', dados });
  }

  if (u.tipo === 'professional') {
    const clientes = db.query(
      'SELECT id, nome, email, telefone, created_at FROM usuarios WHERE profissional_id = ? AND ativo = 1 ORDER BY nome',
      [u.id]
    );
    const ids = clientes.map((c) => c.id);
    const dados = { profissional: { id: u.id, nome: u.nome, email: u.email } };
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      dados.clientes = clientes;
      dados.avaliacoes = db.query(`SELECT * FROM avaliacoes WHERE client_id IN (${placeholders})`, ids);
      dados.planos = db.query(`SELECT * FROM planos_alimentares WHERE client_id IN (${placeholders})`, ids);
      dados.treinos = db.query(`SELECT * FROM treinos WHERE client_id IN (${placeholders})`, ids);
      dados.medidas = db.query(`SELECT * FROM medidas_corporais WHERE client_id IN (${placeholders})`, ids);
    } else {
      dados.clientes = [];
    }
    return res.json({ exportado_em: new Date().toISOString(), tipo: 'profissional', dados });
  }

  if (u.tipo === 'admin') {
    const dados = {
      usuarios: db.query('SELECT id, nome, email, tipo, plano, ativo, created_at FROM usuarios'),
      avaliacoes: db.query('SELECT * FROM avaliacoes'),
      planos: db.query('SELECT * FROM planos_alimentares'),
      treinos: db.query('SELECT * FROM treinos'),
    };
    return res.json({ exportado_em: new Date().toISOString(), tipo: 'admin', dados });
  }

  res.status(403).json({ erro: 'Acesso não autorizado' });
});

module.exports = router;
