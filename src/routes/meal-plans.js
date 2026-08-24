const { Router } = require('express');
const db = require('../db');
const { verificarToken, somenteTipo, verificarClienteAcessivel } = require('../auth');
const { validate, idParams } = require('../validate');
const schemas = require('../schemas');

const router = Router();

function podeVerPlano(req, plano) {
  if (req.usuario.tipo === 'admin') return true;
  if (req.usuario.tipo === 'client') return plano.client_id === req.usuario.id;
  if (req.usuario.tipo === 'professional') {
    if (plano.profissional_id === req.usuario.id) return true;
    return verificarClienteAcessivel(req, plano.client_id);
  }
  return false;
}

function montarNutricionais(planos) {
  if (!planos.length) return planos;
  const ids = planos.map((p) => p.id);
  const refeicoes = db.query(
    `SELECT * FROM refeicoes_plano WHERE plano_id IN (${ids.map(() => '?').join(',')}) ORDER BY plano_id, ordem`,
    ids
  );
  const refIds = refeicoes.map((r) => r.id);
  const alimentos = refIds.length
    ? db.query(
        `SELECT ra.*, a.nome, a.unidade, a.porcao, a.calorias, a.proteina, a.carboidrato, a.gordura
         FROM refeicao_alimentos ra
         JOIN alimentos a ON a.id = ra.alimento_id
         WHERE ra.refeicao_id IN (${refIds.map(() => '?').join(',')})`,
        refIds
      )
    : [];

  const refPorPlano = new Map();
  for (const r of refeicoes) {
    if (!refPorPlano.has(r.plano_id)) refPorPlano.set(r.plano_id, []);
    refPorPlano.get(r.plano_id).push(r);
  }
  const alimPorRef = new Map();
  for (const a of alimentos) {
    if (!alimPorRef.has(a.refeicao_id)) alimPorRef.set(a.refeicao_id, []);
    alimPorRef.get(a.refeicao_id).push(a);
  }

  for (const p of planos) {
    p.refeicoes = refPorPlano.get(p.id) || [];
    for (const r of p.refeicoes) {
      r.alimentos = alimPorRef.get(r.id) || [];
      for (const a of r.alimentos) {
        const fator = a.quantidade / (a.porcao || 100);
        a.calorias_total = Math.round(a.calorias * fator);
        a.proteina_total = Math.round(a.proteina * fator * 10) / 10;
        a.carboidrato_total = Math.round(a.carboidrato * fator * 10) / 10;
        a.gordura_total = Math.round(a.gordura * fator * 10) / 10;
      }
      r.total_calorias = r.alimentos.reduce((s, a) => s + (a.calorias_total || 0), 0);
      r.total_proteina = Math.round(r.alimentos.reduce((s, a) => s + (a.proteina_total || 0), 0) * 10) / 10;
      r.total_carb = Math.round(r.alimentos.reduce((s, a) => s + (a.carboidrato_total || 0), 0) * 10) / 10;
      r.total_gordura = Math.round(r.alimentos.reduce((s, a) => s + (a.gordura_total || 0), 0) * 10) / 10;
    }
  }
  return planos;
}

router.get('/', verificarToken, (req, res) => {
  const { client_id } = req.query;
  let sql = 'SELECT * FROM planos_alimentares WHERE 1=1';
  const params = [];

  if (req.usuario.tipo === 'client') {
    sql += ' AND client_id = ?';
    params.push(req.usuario.id);
  } else if (client_id) {
    if (req.usuario.tipo === 'professional' && !verificarClienteAcessivel(req, parseInt(client_id))) {
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    }
    sql += ' AND client_id = ?';
    params.push(client_id);
  } else if (req.usuario.tipo === 'professional') {
    sql += ' AND (profissional_id = ? OR client_id IN (SELECT id FROM usuarios WHERE profissional_id = ?))';
    params.push(req.usuario.id, req.usuario.id);
  } else if (req.usuario.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }
  sql += ' ORDER BY created_at DESC';

  const plans = db.query(sql, params);
  res.json(montarNutricionais(plans));
});

router.get('/:id', verificarToken, validate(idParams, 'params'), (req, res) => {
  const plan = db.get('SELECT * FROM planos_alimentares WHERE id = ?', [req.params.id]);
  if (!plan) return res.status(404).json({ erro: 'Plano não encontrado' });
  if (!podeVerPlano(req, plan)) return res.status(403).json({ erro: 'Acesso não autorizado' });

  res.json(montarNutricionais([plan])[0]);
});

router.post('/', verificarToken, somenteTipo('admin', 'professional'), validate(schemas.planoAlimentar), (req, res) => {
  const { nome, descricao, client_id, calorias_diarias, proteina_diaria, carboidrato_diario, gordura_diaria, data_inicio, data_fim, refeicoes } = req.body;

  if (req.usuario.tipo === 'professional' && !verificarClienteAcessivel(req, client_id)) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }

  const r = db.run(
    `INSERT INTO planos_alimentares (nome, descricao, client_id, profissional_id, calorias_diarias, proteina_diaria, carboidrato_diario, gordura_diaria, data_inicio, data_fim)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [nome, descricao || null, client_id, req.usuario.id, calorias_diarias || null, proteina_diaria || null, carboidrato_diario || null, gordura_diaria || null, data_inicio || null, data_fim || null]
  );
  const id = r.lastInsertRowid;

  if (refeicoes.length) {
    db.transaction(() => {
      for (const ref of refeicoes) {
        const refId = db.run('INSERT INTO refeicoes_plano (plano_id, nome, horario, ordem) VALUES (?,?,?,?)',
          [id, ref.nome, ref.horario || null, ref.ordem || 0]).lastInsertRowid;
        for (const alim of ref.alimentos) {
          db.run('INSERT INTO refeicao_alimentos (refeicao_id, alimento_id, quantidade) VALUES (?,?,?)',
            [refId, alim.alimento_id, alim.quantidade]);
        }
      }
    });
  }

  res.status(201).json(db.get('SELECT * FROM planos_alimentares WHERE id = ?', [id]));
});

router.put('/:id', verificarToken, somenteTipo('admin', 'professional'), validate(idParams, 'params'), validate(schemas.atualizarPlano), (req, res) => {
  const id = req.params.id;
  const plan = db.get('SELECT * FROM planos_alimentares WHERE id = ?', [id]);
  if (!plan) return res.status(404).json({ erro: 'Plano não encontrado' });
  if (!podeVerPlano(req, plan)) return res.status(403).json({ erro: 'Acesso não autorizado' });

  const { nome, descricao, calorias_diarias, proteina_diaria, carboidrato_diario, gordura_diaria, data_inicio, data_fim, ativo } = req.body;
  db.run(
    `UPDATE planos_alimentares SET
       nome = COALESCE(?, nome),
       descricao = COALESCE(?, descricao),
       calorias_diarias = COALESCE(?, calorias_diarias),
       proteina_diaria = COALESCE(?, proteina_diaria),
       carboidrato_diario = COALESCE(?, carboidrato_diario),
       gordura_diaria = COALESCE(?, gordura_diaria),
       data_inicio = COALESCE(?, data_inicio),
       data_fim = COALESCE(?, data_fim),
       ativo = COALESCE(?, ativo)
     WHERE id = ?`,
    [nome ?? null, descricao ?? null, calorias_diarias ?? null, proteina_diaria ?? null,
      carboidrato_diario ?? null, gordura_diaria ?? null, data_inicio ?? null, data_fim ?? null,
      ativo === undefined ? null : ativo ? 1 : 0, id]
  );
  res.json(db.get('SELECT * FROM planos_alimentares WHERE id = ?', [id]));
});

router.delete('/:id', verificarToken, somenteTipo('admin', 'professional'), validate(idParams, 'params'), (req, res) => {
  const id = req.params.id;
  const plan = db.get('SELECT * FROM planos_alimentares WHERE id = ?', [id]);
  if (!plan) return res.status(404).json({ erro: 'Plano não encontrado' });
  if (!podeVerPlano(req, plan)) return res.status(403).json({ erro: 'Acesso não autorizado' });

  db.transaction(() => {
    db.run('DELETE FROM refeicao_alimentos WHERE refeicao_id IN (SELECT id FROM refeicoes_plano WHERE plano_id = ?)', [id]);
    db.run('DELETE FROM refeicoes_plano WHERE plano_id = ?', [id]);
    db.run('DELETE FROM planos_alimentares WHERE id = ?', [id]);
  });
  res.status(204).send();
});

// Gerar plano alimentar a partir da avaliação mais recente
router.post('/gerar', verificarToken, somenteTipo('admin', 'professional'), validate(schemas.gerarPlano), (req, res) => {
  const { client_id, nome } = req.body;

  if (req.usuario.tipo === 'professional' && !verificarClienteAcessivel(req, client_id)) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }

  const avaliacao = db.get(
    'SELECT * FROM avaliacoes WHERE client_id = ? ORDER BY created_at DESC LIMIT 1',
    [client_id]
  );
  if (!avaliacao) return res.status(404).json({ erro: 'Nenhuma avaliação encontrada para este cliente' });

  const planName = nome || `Plano - ${avaliacao.objetivo}`;

  const alimentos = db.query('SELECT * FROM alimentos ORDER BY calorias ASC');
  const protAlimentos = alimentos.filter(a => a.proteina > 10).slice(0, 10);
  const carbAlimentos = alimentos.filter(a => a.carboidrato > 15 && a.proteina < 10).slice(0, 10);
  const gordAlimentos = alimentos.filter(a => a.gordura > 5 && a.proteina < 10).slice(0, 10);
  const frutas = alimentos.filter(a => a.categoria && a.categoria.toLowerCase().includes('fruta')).slice(0, 5);
  const lacteos = alimentos.filter(a => a.categoria && (a.categoria.toLowerCase().includes('leite') || a.categoria.toLowerCase().includes('laticínio'))).slice(0, 5);

  const refAlimentos = [
    { nome: 'Café da Manhã', horario: '07:00', ordem: 0, tipos: ['carb', 'prot', 'lacteo'] },
    { nome: 'Lanche Manhã', horario: '10:00', ordem: 1, tipos: ['fruta', 'lacteo'] },
    { nome: 'Almoço', horario: '12:00', ordem: 2, tipos: ['prot', 'carb'] },
    { nome: 'Lanche Tarde', horario: '15:00', ordem: 3, tipos: ['fruta', 'prot'] },
    { nome: 'Jantar', horario: '19:00', ordem: 4, tipos: ['prot', 'carb'] },
  ];

  const calPorRefeicao = Math.round(avaliacao.calorias_alvo / refAlimentos.length);

  const refeicoes = refAlimentos.map((ref, i) => {
    const alimentosSelecionados = [];
    let calAtual = 0;

    for (const tipo of ref.tipos) {
      let pool = [];
      if (tipo === 'prot') pool = protAlimentos;
      else if (tipo === 'carb') pool = carbAlimentos;
      else if (tipo === 'fruta') pool = frutas;
      else if (tipo === 'lacteo') pool = lacteos;
      else pool = gordAlimentos;

      const alimento = pool[i % pool.length];
      if (alimento) {
        const fator = alimento.porcao || 100;
        const qty = Math.round((calPorRefeicao / ref.tipos.length / (alimento.calorias || 1)) * fator);
        const qtyFinal = Math.max(30, Math.min(qty, 300));
        calAtual += Math.round((alimento.calorias || 0) * qtyFinal / fator);
        alimentosSelecionados.push({ alimento_id: alimento.id, quantidade: qtyFinal });
      }
    }
    return { ...ref, alimentos: alimentosSelecionados };
  });

  const r = db.run(
    `INSERT INTO planos_alimentares (nome, descricao, client_id, profissional_id, calorias_diarias, proteina_diaria, carboidrato_diario, gordura_diaria, ativo)
     VALUES (?,?,?,?,?,?,?,?,1)`,
    [planName, `Gerado a partir da avaliação de ${new Date(avaliacao.created_at).toLocaleDateString('pt-BR')}`,
     client_id, req.usuario.id, avaliacao.calorias_alvo, avaliacao.proteina_g, avaliacao.carboidrato_g, avaliacao.gordura_g]
  );
  const planoId = r.lastInsertRowid;

  db.transaction(() => {
    for (const ref of refeicoes) {
      const refId = db.run('INSERT INTO refeicoes_plano (plano_id, nome, horario, ordem) VALUES (?,?,?,?)',
        [planoId, ref.nome, ref.horario, ref.ordem]).lastInsertRowid;
      for (const alim of ref.alimentos) {
        db.run('INSERT INTO refeicao_alimentos (refeicao_id, alimento_id, quantidade) VALUES (?,?,?)',
          [refId, alim.alimento_id, alim.quantidade]);
      }
    }
  });

  const plano = db.get('SELECT * FROM planos_alimentares WHERE id = ?', [planoId]);
  res.status(201).json(montarNutricionais([plano])[0]);
});

module.exports = router;
