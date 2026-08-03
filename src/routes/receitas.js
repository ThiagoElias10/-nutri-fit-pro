const { Router } = require('express');
const db = require('../db');
const { verificarToken } = require('../auth');
const { validate, idParams } = require('../validate');
const schemas = require('../schemas');

const router = Router();

function montarIngredientes(receitas) {
  if (!receitas.length) return receitas;
  const ids = receitas.map((r) => r.id);
  const ingredientes = db.query(
    `SELECT ri.*, a.nome as alimento_nome, a.unidade, a.porcao, a.calorias, a.proteina, a.carboidrato, a.gordura
     FROM receita_ingredientes ri
     JOIN alimentos a ON a.id = ri.alimento_id
     WHERE ri.receita_id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const porReceita = new Map();
  for (const ing of ingredientes) {
    if (!porReceita.has(ing.receita_id)) porReceita.set(ing.receita_id, []);
    porReceita.get(ing.receita_id).push(ing);
  }
  for (const r of receitas) {
    const lista = porReceita.get(r.id) || [];
    let cal = 0, prot = 0, carb = 0, gord = 0;
    for (const ing of lista) {
      const fator = ing.quantidade / (ing.porcao || 100);
      ing.calorias_total = Math.round(ing.calorias * fator);
      ing.proteina_total = Math.round(ing.proteina * fator * 10) / 10;
      ing.carboidrato_total = Math.round(ing.carboidrato * fator * 10) / 10;
      ing.gordura_total = Math.round(ing.gordura * fator * 10) / 10;
      cal += ing.calorias_total;
      prot += ing.proteina_total;
      carb += ing.carboidrato_total;
      gord += ing.gordura_total;
    }
    r.ingredientes = lista;
    r.total_calorias = Math.round(cal);
    r.total_proteina = Math.round(prot * 10) / 10;
    r.total_carboidrato = Math.round(carb * 10) / 10;
    r.total_gordura = Math.round(gord * 10) / 10;
  }
  return receitas;
}

function podeGerenciar(req, receita) {
  if (req.usuario.tipo === 'admin') return true;
  return receita.criador_id === req.usuario.id;
}

router.get('/', verificarToken, (req, res) => {
  const { search, categoria, pagina, limite } = req.query;
  let sql = 'SELECT * FROM receitas WHERE (publica = 1 OR criador_id = ?)';
  const params = [req.usuario.id];
  if (search) { sql += ' AND nome LIKE ?'; params.push(`%${search}%`); }
  if (categoria) { sql += ' AND categoria = ?'; params.push(categoria); }
  sql += ' ORDER BY created_at DESC';
  const paginado = db.paginar(sql, params, { pagina, limite });
  paginado.dados = montarIngredientes(paginado.dados);
  res.json(paginado);
});

router.get('/:id', verificarToken, validate(idParams, 'params'), (req, res) => {
  const r = db.get('SELECT * FROM receitas WHERE id = ?', [req.params.id]);
  if (!r) return res.status(404).json({ erro: 'Receita não encontrada' });
  if (!r.publica && r.criador_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }
  res.json(montarIngredientes([r])[0]);
});

router.post('/', verificarToken, validate(schemas.receita), (req, res) => {
  const { nome, modo_preparo, porcoes, categoria, publica, ingredientes } = req.body;
  const r = db.run(
    'INSERT INTO receitas (nome, modo_preparo, porcoes, categoria, criador_id, publica) VALUES (?,?,?,?,?,?)',
    [nome, modo_preparo || null, porcoes, categoria || null, req.usuario.id, publica ? 1 : 0]
  );
  const id = r.lastInsertRowid;

  if (ingredientes.length) {
    db.transaction(() => {
      for (const ing of ingredientes) {
        db.run('INSERT INTO receita_ingredientes (receita_id, alimento_id, quantidade) VALUES (?,?,?)',
          [id, ing.alimento_id, ing.quantidade]);
      }
    });
  }
  res.status(201).json(montarIngredientes([db.get('SELECT * FROM receitas WHERE id = ?', [id])])[0]);
});

router.put('/:id', verificarToken, validate(idParams, 'params'), validate(schemas.receita), (req, res) => {
  const id = req.params.id;
  const r = db.get('SELECT * FROM receitas WHERE id = ?', [id]);
  if (!r) return res.status(404).json({ erro: 'Receita não encontrada' });
  if (!podeGerenciar(req, r)) return res.status(403).json({ erro: 'Acesso não autorizado' });

  const { nome, modo_preparo, porcoes, categoria, publica, ingredientes } = req.body;
  db.run(
    'UPDATE receitas SET nome = ?, modo_preparo = ?, porcoes = ?, categoria = ?, publica = ? WHERE id = ?',
    [nome, modo_preparo || null, porcoes, categoria || null, publica ? 1 : 0, id]
  );

  if (ingredientes.length) {
    db.transaction(() => {
      db.run('DELETE FROM receita_ingredientes WHERE receita_id = ?', [id]);
      for (const ing of ingredientes) {
        db.run('INSERT INTO receita_ingredientes (receita_id, alimento_id, quantidade) VALUES (?,?,?)',
          [id, ing.alimento_id, ing.quantidade]);
      }
    });
  }
  res.json(montarIngredientes([db.get('SELECT * FROM receitas WHERE id = ?', [id])])[0]);
});

router.delete('/:id', verificarToken, validate(idParams, 'params'), (req, res) => {
  const id = req.params.id;
  const r = db.get('SELECT * FROM receitas WHERE id = ?', [id]);
  if (!r) return res.status(404).json({ erro: 'Receita não encontrada' });
  if (!podeGerenciar(req, r)) return res.status(403).json({ erro: 'Acesso não autorizado' });

  db.transaction(() => {
    db.run('DELETE FROM receita_ingredientes WHERE receita_id = ?', [id]);
    db.run('DELETE FROM receitas WHERE id = ?', [id]);
  });
  res.status(204).send();
});

module.exports = router;
