const { Router } = require('express');
const db = require('../db');
const { verificarToken, somenteTipo } = require('../auth');
const { validate, idParams } = require('../validate');
const schemas = require('../schemas');

const router = Router();

router.get('/', verificarToken, validate(schemas.alimentoQuery, 'query'), (req, res) => {
  const { search, categoria, pagina, limite } = req.query;
  let sql = 'SELECT * FROM alimentos WHERE 1=1';
  const params = [];
  if (search) { sql += ' AND nome LIKE ?'; params.push(`%${search}%`); }
  if (categoria) { sql += ' AND categoria = ?'; params.push(categoria); }
  sql += ' ORDER BY nome';
  res.json(db.paginar(sql, params, { pagina, limite }));
});

router.get('/categorias', verificarToken, (req, res) => {
  const cats = db.query('SELECT DISTINCT categoria FROM alimentos WHERE categoria IS NOT NULL ORDER BY categoria');
  res.json(cats.map((c) => c.categoria));
});

router.post('/', verificarToken, somenteTipo('admin', 'professional'), validate(schemas.alimento), (req, res) => {
  const { nome, porcao, unidade, calorias, proteina, carboidrato, gordura, fibras, categoria } = req.body;
  const r = db.run(
    'INSERT INTO alimentos (nome, porcao, unidade, calorias, proteina, carboidrato, gordura, fibras, categoria) VALUES (?,?,?,?,?,?,?,?,?)',
    [nome, porcao, unidade, calorias, proteina, carboidrato, gordura, fibras, categoria || null]
  );
  res.status(201).json(db.get('SELECT * FROM alimentos WHERE id = ?', [r.lastInsertRowid]));
});

router.get('/:id', verificarToken, validate(idParams, 'params'), (req, res) => {
  const food = db.get('SELECT * FROM alimentos WHERE id = ?', [req.params.id]);
  if (!food) return res.status(404).json({ erro: 'Alimento não encontrado' });
  res.json(food);
});

router.put('/:id', verificarToken, somenteTipo('admin', 'professional'), validate(idParams, 'params'), validate(schemas.alimento), (req, res) => {
  const id = req.params.id;
  const exist = db.get('SELECT id FROM alimentos WHERE id = ?', [id]);
  if (!exist) return res.status(404).json({ erro: 'Alimento não encontrado' });

  const { nome, porcao, unidade, calorias, proteina, carboidrato, gordura, fibras, categoria } = req.body;
  db.run(
    `UPDATE alimentos SET nome = ?, porcao = ?, unidade = ?, calorias = ?, proteina = ?, carboidrato = ?, gordura = ?, fibras = ?, categoria = ? WHERE id = ?`,
    [nome, porcao, unidade, calorias, proteina, carboidrato, gordura, fibras, categoria || null, id]
  );
  res.json(db.get('SELECT * FROM alimentos WHERE id = ?', [id]));
});

router.delete('/:id', verificarToken, somenteTipo('admin', 'professional'), validate(idParams, 'params'), (req, res) => {
  const id = req.params.id;
  const exist = db.get('SELECT id FROM alimentos WHERE id = ?', [id]);
  if (!exist) return res.status(404).json({ erro: 'Alimento não encontrado' });
  db.run('DELETE FROM alimentos WHERE id = ?', [id]);
  res.status(204).send();
});

module.exports = router;
