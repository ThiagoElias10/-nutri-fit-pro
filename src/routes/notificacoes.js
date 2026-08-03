const { Router } = require('express');
const db = require('../db');
const { verificarToken, somenteTipo } = require('../auth');
const { validate, idParams } = require('../validate');
const schemas = require('../schemas');

const router = Router();

function gerarLembretes(usuarioId) {
  const hoje = new Date().toISOString().split('T')[0];
  const jaExiste = db.get(
    "SELECT id FROM notificacoes WHERE usuario_id = ? AND tipo = ? AND date(created_at) = date('now','localtime')",
    [usuarioId, 'lembrete']
  );
  if (jaExiste) return;

  const ja = db.get('SELECT * FROM usuarios WHERE id = ? AND tipo = ?', [usuarioId, 'client']);
  if (!ja) return;

  const lembrete = db.get(
    'SELECT * FROM avaliacoes WHERE client_id = ? ORDER BY created_at DESC LIMIT 1',
    [usuarioId]
  );
  if (lembrete) {
    db.run(
      `INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem) VALUES (?,?,?,?)`,
      [usuarioId, 'lembrete', 'Meta de calorias de hoje',
        `Sua meta é ${lembrete.calorias_alvo} kcal. Registre suas refeições no diário alimentar.`]
    );
  }

  const treinosHoje = db.query(
    `SELECT COUNT(*) as c FROM treinos
     WHERE client_id = ? AND ativo = 1
       AND (data_inicio IS NULL OR data_inicio <= ?)
       AND (data_fim IS NULL OR data_fim >= ?)`,
    [usuarioId, hoje, hoje]
  )[0].c;
  if (treinosHoje > 0) {
    db.run(
      `INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem) VALUES (?,?,?,?)`,
      [usuarioId, 'lembrete', 'Você tem treinos agendados', 'Não esqueça de registrar seu treino de hoje.']
    );
  }
}

router.get('/', verificarToken, validate(schemas.notificacaoQuery, 'query'), (req, res) => {
  gerarLembretes(req.usuario.id);
  const { apenas_nao_lidas, pagina, limite } = req.query;
  let sql = 'FROM notificacoes WHERE usuario_id = ?';
  const params = [req.usuario.id];
  if (apenas_nao_lidas) {
    sql += ' AND lida = 0';
  }
  sql += ' ORDER BY created_at DESC';
  res.json(db.paginar(`SELECT * ${sql}`, params, { pagina, limite }));
});

router.post('/', verificarToken, somenteTipo('admin', 'professional'), validate(schemas.notificacao), (req, res) => {
  const { usuario_id, tipo, titulo, mensagem } = req.body;

  if (req.usuario.tipo === 'professional') {
    const alvo = db.get('SELECT id FROM usuarios WHERE id = ? AND tipo = ?', [usuario_id, 'client']);
    if (!alvo) return res.status(404).json({ erro: 'Cliente não encontrado' });
    const vinculado = db.get('SELECT id FROM usuarios WHERE id = ? AND profissional_id = ?', [usuario_id, req.usuario.id]);
    if (!vinculado) return res.status(403).json({ erro: 'Cliente não vinculado a você' });
  }

  const r = db.run(
    'INSERT INTO notificacoes (usuario_id, de_quem, tipo, titulo, mensagem) VALUES (?,?,?,?,?)',
    [usuario_id, req.usuario.id, tipo, titulo, mensagem || null]
  );
  res.status(201).json(db.get('SELECT * FROM notificacoes WHERE id = ?', [r.lastInsertRowid]));
});

router.put('/:id/lida', verificarToken, validate(idParams, 'params'), (req, res) => {
  const id = req.params.id;
  const n = db.get('SELECT * FROM notificacoes WHERE id = ?', [id]);
  if (!n) return res.status(404).json({ erro: 'Notificação não encontrada' });
  if (n.usuario_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }
  db.run('UPDATE notificacoes SET lida = 1 WHERE id = ?', [id]);
  res.json({ ok: true });
});

router.delete('/:id', verificarToken, validate(idParams, 'params'), (req, res) => {
  const id = req.params.id;
  const n = db.get('SELECT * FROM notificacoes WHERE id = ?', [id]);
  if (!n) return res.status(404).json({ erro: 'Notificação não encontrada' });
  if (n.usuario_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }
  db.run('DELETE FROM notificacoes WHERE id = ?', [id]);
  res.status(204).send();
});

module.exports = router;
