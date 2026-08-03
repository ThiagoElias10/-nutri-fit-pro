const { Router } = require('express');
const db = require('../db');
const { verificarToken, somenteTipo } = require('../auth');
const { validate, idParams } = require('../validate');
const schemas = require('../schemas');

const router = Router();

router.get('/', verificarToken, validate(schemas.exercicioQuery, 'query'), (req, res) => {
  const { search, grupo_muscular, dificuldade, pagina, limite } = req.query;
  let sql = 'SELECT * FROM exercicios WHERE 1=1';
  const params = [];

  if (search) { sql += ' AND nome LIKE ?'; params.push(`%${search}%`); }
  if (grupo_muscular) { sql += ' AND grupo_muscular = ?'; params.push(grupo_muscular); }
  if (dificuldade) { sql += ' AND dificuldade = ?'; params.push(dificuldade); }
  sql += ' ORDER BY nome';
  res.json(db.paginar(sql, params, { pagina, limite }));
});

router.get('/grupos', verificarToken, (req, res) => {
  const grupos = db.query('SELECT DISTINCT grupo_muscular FROM exercicios ORDER BY grupo_muscular');
  res.json(grupos.map((g) => g.grupo_muscular));
});

router.post('/', verificarToken, somenteTipo('admin', 'professional'), validate(schemas.exercicio), (req, res) => {
  const { nome, descricao, grupo_muscular, equipamento, dificuldade, video_url, imagem_url } = req.body;
  const r = db.run(
    'INSERT INTO exercicios (nome, descricao, grupo_muscular, equipamento, dificuldade, video_url, imagem_url) VALUES (?,?,?,?,?,?,?)',
    [nome, descricao || null, grupo_muscular, equipamento || null, dificuldade, video_url || null, imagem_url || null]
  );
  res.status(201).json(db.get('SELECT * FROM exercicios WHERE id = ?', [r.lastInsertRowid]));
});

router.get('/:id', verificarToken, validate(idParams, 'params'), (req, res) => {
  const ex = db.get('SELECT * FROM exercicios WHERE id = ?', [req.params.id]);
  if (!ex) return res.status(404).json({ erro: 'Exercício não encontrado' });
  res.json(ex);
});

router.put('/:id', verificarToken, somenteTipo('admin', 'professional'), validate(idParams, 'params'), validate(schemas.exercicio), (req, res) => {
  const id = req.params.id;
  const exist = db.get('SELECT id FROM exercicios WHERE id = ?', [id]);
  if (!exist) return res.status(404).json({ erro: 'Exercício não encontrado' });

  const { nome, descricao, grupo_muscular, equipamento, dificuldade, video_url, imagem_url } = req.body;
  db.run(
    'UPDATE exercicios SET nome = ?, descricao = ?, grupo_muscular = ?, equipamento = ?, dificuldade = ?, video_url = ?, imagem_url = ? WHERE id = ?',
    [nome, descricao || null, grupo_muscular, equipamento || null, dificuldade, video_url || null, imagem_url || null, id]
  );
  res.json(db.get('SELECT * FROM exercicios WHERE id = ?', [id]));
});

router.delete('/:id', verificarToken, somenteTipo('admin', 'professional'), validate(idParams, 'params'), (req, res) => {
  const id = req.params.id;
  const exist = db.get('SELECT id FROM exercicios WHERE id = ?', [id]);
  if (!exist) return res.status(404).json({ erro: 'Exercício não encontrado' });
  db.run('DELETE FROM exercicios WHERE id = ?', [id]);
  res.status(204).send();
});

module.exports = router;
