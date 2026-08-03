const { Router } = require('express');
const db = require('../db');
const { verificarToken, somenteTipo, verificarClienteAcessivel } = require('../auth');
const { validate, idParams } = require('../validate');
const schemas = require('../schemas');

const router = Router();

function podeVerTreino(req, treino) {
  if (req.usuario.tipo === 'admin') return true;
  if (req.usuario.tipo === 'client') return treino.client_id === req.usuario.id;
  if (req.usuario.tipo === 'professional') {
    if (treino.profissional_id === req.usuario.id) return true;
    return verificarClienteAcessivel(req, treino.client_id);
  }
  return false;
}

function montarTreinos(treinos) {
  if (!treinos.length) return treinos;
  const ids = treinos.map((t) => t.id);
  const clientIds = [...new Set(treinos.map((t) => t.client_id))];
  const clientes = clientIds.length
    ? db.query(`SELECT id, nome FROM usuarios WHERE id IN (${clientIds.map(() => '?').join(',')})`, clientIds)
    : [];
  const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome]));

  const exercicios = db.query(
    `SELECT te.*, e.nome, e.descricao, e.grupo_muscular, e.equipamento, e.video_url, e.imagem_url
     FROM treino_exercicios te
     JOIN exercicios e ON e.id = te.exercicio_id
     WHERE te.treino_id IN (${ids.map(() => '?').join(',')})
     ORDER BY te.treino_id, te.ordem`,
    ids
  );
  const exPorTreino = new Map();
  for (const ex of exercicios) {
    if (!exPorTreino.has(ex.treino_id)) exPorTreino.set(ex.treino_id, []);
    exPorTreino.get(ex.treino_id).push(ex);
  }

  for (const t of treinos) {
    t.client_nome = nomeCliente.get(t.client_id) || null;
    t.exercicios = exPorTreino.get(t.id) || [];
  }
  return treinos;
}

router.get('/', verificarToken, (req, res) => {
  const { client_id } = req.query;
  let sql = 'SELECT * FROM treinos WHERE 1=1';
  const params = [];

  if (req.usuario.tipo === 'client') {
    if (client_id && parseInt(client_id) !== req.usuario.id) {
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    }
    sql += ' AND client_id = ?';
    params.push(req.usuario.id);
  } else if (req.usuario.tipo === 'professional') {
    if (client_id) {
      if (!verificarClienteAcessivel(req, parseInt(client_id))) {
        return res.status(403).json({ erro: 'Acesso não autorizado' });
      }
      sql += ' AND client_id = ?';
      params.push(client_id);
    } else {
      sql += ' AND (profissional_id = ? OR client_id IN (SELECT id FROM usuarios WHERE profissional_id = ?))';
      params.push(req.usuario.id, req.usuario.id);
    }
  } else if (req.usuario.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }
  sql += ' ORDER BY created_at DESC';

  res.json(montarTreinos(db.query(sql, params)));
});

const NOMES_DIAS = { 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado', 7: 'Domingo' };
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];
const DIAS_SUGERIDOS = {
  1: [3],
  2: [2, 5],
  3: [2, 4, 6],
  4: [2, 3, 5, 6],
  5: [2, 3, 4, 5, 6],
  6: [2, 3, 4, 5, 6, 7],
};

const PERFIS = {
  bulking: { series: 4, repeticoes: '8-12', descanso: 60 },
  hipertrofia: { series: 4, repeticoes: '8-12', descanso: 60 },
  definicao: { series: 4, repeticoes: '10-15', descanso: 45, incluirCardio: true },
  cutting: { series: 3, repeticoes: '12-15', descanso: 45, incluirCardio: true },
  emagrecimento: { series: 3, repeticoes: '12-15', descanso: 45, incluirCardio: true },
  forca: { series: 5, repeticoes: '3-5', descanso: 120 },
  maintenance: { series: 3, repeticoes: '10-15', descanso: 60 },
  condicionamento: { series: 3, repeticoes: '10-15', descanso: 60, incluirCardio: true },
};

const DIVISOES = {
  peito_triceps: { nome: 'Peito e Tríceps', tipo: 'a', grupos: ['peitoral', 'triceps', 'abdomen'] },
  costas_biceps: { nome: 'Costas e Bíceps', tipo: 'b', grupos: ['costas', 'biceps', 'abdomen'] },
  pernas_ombros: { nome: 'Pernas e Ombros', tipo: 'c', grupos: ['pernas', 'ombros', 'abdomen'] },
  pernas: { nome: 'Pernas', tipo: 'legs', grupos: ['pernas', 'abdomen'] },
  ombros_abd: { nome: 'Ombros e Abdômen', tipo: 'custom', grupos: ['ombros', 'abdomen'] },
  peito: { nome: 'Peito', tipo: 'push', grupos: ['peitoral', 'triceps', 'abdomen'] },
  costas: { nome: 'Costas', tipo: 'pull', grupos: ['costas', 'biceps', 'abdomen'] },
  ombros: { nome: 'Ombros', tipo: 'custom', grupos: ['ombros', 'abdomen'] },
  bracos_abd: { nome: 'Braços e Abdômen', tipo: 'custom', grupos: ['biceps', 'triceps', 'abdomen'] },
  fullbody: { nome: 'Full Body', tipo: 'fullbody', grupos: ['peitoral', 'costas', 'pernas', 'ombros', 'abdomen'] },
  superior: { nome: 'Superior', tipo: 'push', grupos: ['peitoral', 'costas', 'ombros', 'biceps', 'triceps'] },
  inferior: { nome: 'Inferior', tipo: 'legs', grupos: ['pernas', 'abdomen'] },
  cardio_core: { nome: 'Cardio e Core', tipo: 'custom', grupos: ['cardio', 'abdomen'] },
};

function familiaObjetivo(objetivo) {
  if (objetivo === 'cutting' || objetivo === 'emagrecimento') return 'emagrecimento';
  if (objetivo === 'forca') return 'forca';
  if (objetivo === 'maintenance' || objetivo === 'condicionamento') return 'condicionamento';
  return 'hipertrofia';
}

const PLANOS = {
  emagrecimento: {
    1: ['fullbody'],
    2: ['fullbody', 'cardio_core'],
    3: ['fullbody', 'cardio_core', 'fullbody'],
    4: ['superior', 'cardio_core', 'inferior', 'fullbody'],
    5: ['superior', 'inferior', 'cardio_core', 'superior', 'inferior'],
    6: ['superior', 'inferior', 'cardio_core', 'superior', 'inferior', 'cardio_core'],
  },
  forca: {
    1: ['fullbody'],
    2: ['fullbody', 'fullbody'],
    3: ['fullbody', 'fullbody', 'fullbody'],
    4: ['peito_triceps', 'costas_biceps', 'pernas_ombros', 'fullbody'],
    5: ['peito_triceps', 'costas_biceps', 'pernas', 'ombros_abd', 'fullbody'],
    6: ['peito', 'costas', 'pernas', 'ombros', 'bracos_abd', 'fullbody'],
  },
  hipertrofia: {
    1: ['fullbody'],
    2: ['superior', 'inferior'],
    3: ['peito_triceps', 'costas_biceps', 'pernas_ombros'],
    4: ['peito_triceps', 'costas_biceps', 'pernas', 'ombros_abd'],
    5: ['peito', 'costas', 'pernas', 'ombros', 'bracos_abd'],
    6: ['peito', 'costas', 'pernas', 'ombros', 'bracos_abd', 'cardio_core'],
  },
};

function planoDias(objetivo, dias) {
  const fam = familiaObjetivo(objetivo);
  const base = fam === 'emagrecimento' ? PLANOS.emagrecimento
    : fam === 'forca' ? PLANOS.forca
    : PLANOS.hipertrofia;
  return base[dias] || base[4];
}

function selecionarExercicios(grupos, limitePorGrupo, usados) {
  const escolhidos = [];
  for (const grupo of grupos) {
    const rows = db.query(
      `SELECT * FROM exercicios WHERE grupo_muscular = ?
       ORDER BY CASE dificuldade WHEN 'iniciante' THEN 0 WHEN 'intermediario' THEN 1 ELSE 2 END, nome`,
      [grupo]
    );
    const ineditos = rows.filter((r) => !usados.has(r.id));
    const pool = ineditos.length ? ineditos : rows;
    for (const r of pool.slice(0, limitePorGrupo)) {
      escolhidos.push(r);
      usados.add(r.id);
    }
  }
  return escolhidos;
}

router.post('/gerar', verificarToken, validate(schemas.gerarTreino), (req, res) => {
  let { client_id, dias_por_semana, objetivo, substituir } = req.body;

  if (req.usuario.tipo === 'client') {
    client_id = req.usuario.id;
  } else {
    if (!client_id) return res.status(400).json({ erro: 'Informe o cliente (client_id)' });
    if (req.usuario.tipo === 'professional' && !verificarClienteAcessivel(req, client_id)) {
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    }
  }

  if (!objetivo) {
    const aval = db.get('SELECT objetivo FROM avaliacoes WHERE client_id = ? ORDER BY created_at DESC LIMIT 1', [client_id]);
    objetivo = (aval && aval.objetivo) || 'maintenance';
  }

  const perfil = PERFIS[objetivo] || PERFIS.maintenance;
  const plano = planoDias(objetivo, dias_por_semana);
  const dias = DIAS_SUGERIDOS[dias_por_semana] || DIAS_SUGERIDOS[4];
  const hoje = new Date().toISOString().split('T')[0];
  const usados = new Set();
  const criados = [];

  db.transaction(() => {
    if (substituir !== false) {
      const antigos = db.query('SELECT id FROM treinos WHERE client_id = ? AND dia_semana IS NOT NULL', [client_id]);
      for (const t of antigos) {
        db.run('DELETE FROM diario_treino WHERE treino_id = ?', [t.id]);
        db.run('DELETE FROM treino_exercicios WHERE treino_id = ?', [t.id]);
      }
      db.run('DELETE FROM treinos WHERE client_id = ? AND dia_semana IS NOT NULL', [client_id]);
    }

    plano.forEach((chave, i) => {
      const div = DIVISOES[chave];
      const exercicios = selecionarExercicios(div.grupos, 2, usados);
      if (!exercicios.length) return;

      const treinoId = db.run(
        `INSERT INTO treinos (nome, descricao, client_id, profissional_id, tipo, data_inicio, dia_semana, ordem_dia, ativo)
         VALUES (?,?,?,?,?,?,?,?,1)`,
        [`Treino ${LETRAS[i] || i + 1} - ${div.nome}`,
          `${div.nome} · ${NOMES_DIAS[dias[i]] || 'Dia ' + (i + 1)}`,
          client_id, req.usuario.id, div.tipo, hoje, dias[i], i + 1]
      ).lastInsertRowid;

      for (let j = 0; j < exercicios.length; j++) {
        const e = exercicios[j];
        const isCardio = e.grupo_muscular === 'cardio';
        db.run(
          `INSERT INTO treino_exercicios (treino_id, exercicio_id, series, repeticoes, carga, descanso, ordem)
           VALUES (?,?,?,?,?,?,?)`,
          [treinoId, e.id,
            isCardio ? 1 : perfil.series,
            isCardio ? '20-30 min' : perfil.repeticoes,
            0,
            isCardio ? 0 : perfil.descanso,
            j + 1]
        );
      }
      criados.push(treinoId);
    });
  });

  const lista = criados.length
    ? db.query(`SELECT * FROM treinos WHERE id IN (${criados.map(() => '?').join(',')})`, criados)
    : [];
  res.status(201).json({
    objetivo,
    dias_por_semana: dias.length,
    dia_inicio: NOMES_DIAS[dias[0]] || null,
    treinos: montarTreinos(lista).sort((a, b) => (a.dia_semana || 0) - (b.dia_semana || 0)),
  });
});

router.get('/:id', verificarToken, validate(idParams, 'params'), (req, res) => {
  const t = db.get('SELECT * FROM treinos WHERE id = ?', [req.params.id]);
  if (!t) return res.status(404).json({ erro: 'Treino não encontrado' });
  if (!podeVerTreino(req, t)) return res.status(403).json({ erro: 'Acesso não autorizado' });
  res.json(montarTreinos([t])[0]);
});

router.post('/', verificarToken, somenteTipo('admin', 'professional'), validate(schemas.treino), (req, res) => {
  const { nome, descricao, client_id, tipo, data_inicio, data_fim, exercicios } = req.body;

  if (req.usuario.tipo === 'professional' && !verificarClienteAcessivel(req, client_id)) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }

  const r = db.run(
    'INSERT INTO treinos (nome, descricao, client_id, profissional_id, tipo, data_inicio, data_fim) VALUES (?,?,?,?,?,?,?)',
    [nome, descricao || null, client_id, req.usuario.id, tipo, data_inicio || null, data_fim || null]
  );
  const id = r.lastInsertRowid;

  if (exercicios.length) {
    db.transaction(() => {
      for (let i = 0; i < exercicios.length; i++) {
        const ex = exercicios[i];
        db.run(
          'INSERT INTO treino_exercicios (treino_id, exercicio_id, series, repeticoes, carga, descanso, ordem, observacao) VALUES (?,?,?,?,?,?,?,?)',
          [id, ex.exercicio_id, ex.series, ex.repeticoes, ex.carga, ex.descanso, ex.ordem ?? i + 1, ex.observacao || null]
        );
      }
    });
  }
  res.status(201).json(db.get('SELECT * FROM treinos WHERE id = ?', [id]));
});

router.put('/:id', verificarToken, somenteTipo('admin', 'professional'), validate(idParams, 'params'), validate(schemas.atualizarTreino), (req, res) => {
  const id = req.params.id;
  const t = db.get('SELECT * FROM treinos WHERE id = ?', [id]);
  if (!t) return res.status(404).json({ erro: 'Treino não encontrado' });
  if (!podeVerTreino(req, t)) return res.status(403).json({ erro: 'Acesso não autorizado' });

  const { nome, descricao, tipo, ativo } = req.body;
  db.run(
    `UPDATE treinos SET
       nome = COALESCE(?, nome),
       descricao = COALESCE(?, descricao),
       tipo = COALESCE(?, tipo),
       ativo = COALESCE(?, ativo)
     WHERE id = ?`,
    [nome ?? null, descricao ?? null, tipo ?? null, ativo === undefined ? null : ativo ? 1 : 0, id]
  );
  res.json(db.get('SELECT * FROM treinos WHERE id = ?', [id]));
});

router.delete('/:id', verificarToken, somenteTipo('admin', 'professional'), validate(idParams, 'params'), (req, res) => {
  const id = req.params.id;
  const t = db.get('SELECT * FROM treinos WHERE id = ?', [id]);
  if (!t) return res.status(404).json({ erro: 'Treino não encontrado' });
  if (!podeVerTreino(req, t)) return res.status(403).json({ erro: 'Acesso não autorizado' });

  db.transaction(() => {
    db.run('DELETE FROM diario_treino WHERE treino_id = ?', [id]);
    db.run('DELETE FROM treino_exercicios WHERE treino_id = ?', [id]);
    db.run('DELETE FROM treinos WHERE id = ?', [id]);
  });
  res.status(204).send();
});

router.post('/:id/log', verificarToken, validate(idParams, 'params'), validate(schemas.logTreino), (req, res) => {
  const treinoId = req.params.id;
  const t = db.get('SELECT * FROM treinos WHERE id = ?', [treinoId]);
  if (!t) return res.status(404).json({ erro: 'Treino não encontrado' });
  if (!podeVerTreino(req, t)) return res.status(403).json({ erro: 'Acesso não autorizado' });

  const { exercicio_id, data, series_feitas, repeticoes_feitas, carga_usada, observacao } = req.body;
  const clientId = req.usuario.tipo === 'client' ? req.usuario.id : req.body.client_id || t.client_id;

  db.run(
    'INSERT INTO diario_treino (client_id, treino_id, data, exercicio_id, series_feitas, repeticoes_feitas, carga_usada, observacao) VALUES (?,?,?,?,?,?,?,?)',
    [clientId, treinoId, data || new Date().toISOString().split('T')[0], exercicio_id, series_feitas || null, repeticoes_feitas || null, carga_usada || null, observacao || null]
  );
  res.status(201).json({ ok: true });
});

router.get('/:id/logs', verificarToken, validate(idParams, 'params'), (req, res) => {
  const treinoId = req.params.id;
  const t = db.get('SELECT * FROM treinos WHERE id = ?', [treinoId]);
  if (!t) return res.status(404).json({ erro: 'Treino não encontrado' });
  if (!podeVerTreino(req, t)) return res.status(403).json({ erro: 'Acesso não autorizado' });

  const logs = db.query(
    `SELECT d.*, e.nome as exercicio_nome, e.grupo_muscular
     FROM diario_treino d
     JOIN exercicios e ON e.id = d.exercicio_id
     WHERE d.treino_id = ?
     ORDER BY d.data DESC, d.created_at DESC`,
    [treinoId]
  );
  res.json(logs);
});

module.exports = router;
