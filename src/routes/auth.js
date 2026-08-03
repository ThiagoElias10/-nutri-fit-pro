const { Router } = require('express');
const crypto = require('crypto');
const db = require('../db');
const { gerarToken, verificarToken, bcrypt, TOKEN_COOKIE } = require('../auth');
const { validate } = require('../validate');
const schemas = require('../schemas');

const router = Router();

const cookieOpcoes = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

function montarCookie(res, token) {
  res.cookie(TOKEN_COOKIE, token, cookieOpcoes);
}

router.post('/login', validate(schemas.login), async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    const users = db.query('SELECT * FROM usuarios WHERE email = ? AND ativo = 1', [email]);
    if (!users.length || !(await bcrypt.compare(senha, users[0].senha))) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const u = users[0];
    const token = gerarToken(u);
    db.run("UPDATE usuarios SET ultimo_login = datetime('now','localtime') WHERE id = ?", [u.id]);
    db.logAcesso(u.id, 'login', req);
    montarCookie(res, token);
    res.json({
      token,
      forcar_troca_senha: !!u.forcar_troca_senha,
      usuario: { id: u.id, nome: u.nome, email: u.email, tipo: u.tipo, plano: u.plano, foto_url: u.foto_url },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/register', validate(schemas.register), async (req, res, next) => {
  try {
    const { nome, email, senha, tipo } = req.body;
    if (db.get('SELECT id FROM usuarios WHERE email = ?', [email])) {
      return res.status(400).json({ erro: 'Email já cadastrado' });
    }

    const hash = await bcrypt.hash(senha, 10);
    const userTipo = tipo === 'professional' ? 'professional' : 'client';
    const r = db.run('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?,?,?,?)', [nome, email, hash, userTipo]);

    const user = db.get('SELECT id, nome, email, tipo, plano FROM usuarios WHERE id = ?', [r.lastInsertRowid]);
    const token = gerarToken(user);
    db.logAcesso(user.id, 'register', req);
    montarCookie(res, token);
    res.status(201).json({ token, forcar_troca_senha: false, usuario: user });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(TOKEN_COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', verificarToken, (req, res) => {
  const users = db.query(
    'SELECT id, nome, email, tipo, plano, telefone, foto_url, profissional_id, forcar_troca_senha, created_at FROM usuarios WHERE id = ?',
    [req.usuario.id]
  );
  if (!users.length) return res.status(404).json({ erro: 'Usuário não encontrado' });

  const u = users[0];
  if (u.profissional_id) {
    u.profissional = db.get('SELECT id, nome, email FROM usuarios WHERE id = ?', [u.profissional_id]) || null;
  }
  if (u.tipo === 'professional') {
    u.total_clientes = db.get('SELECT COUNT(*) as c FROM usuarios WHERE profissional_id = ?', [u.id]).c;
  }
  res.json(u);
});

router.put('/me', verificarToken, validate(schemas.atualizarPerfil), (req, res) => {
  const { nome, telefone, foto_url } = req.body;
  db.run("UPDATE usuarios SET nome = COALESCE(?, nome), telefone = ?, foto_url = ?, updated_at = datetime('now','localtime') WHERE id = ?",
    [nome ?? null, telefone !== undefined ? telefone : null, foto_url !== undefined ? foto_url : null, req.usuario.id]);
  res.json({ ok: true });
});

router.post('/senha', verificarToken, validate(schemas.mudarSenha), async (req, res, next) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    const u = db.get('SELECT senha FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!u || !(await bcrypt.compare(senha_atual, u.senha))) {
      return res.status(401).json({ erro: 'Senha atual incorreta' });
    }
    const hash = await bcrypt.hash(nova_senha, 10);
    db.run("UPDATE usuarios SET senha = ?, forcar_troca_senha = 0, updated_at = datetime('now','localtime') WHERE id = ?",
      [hash, req.usuario.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post('/recuperar', validate(schemas.solicitarRecuperacao), (req, res) => {
  const { email } = req.body;
  const u = db.get('SELECT id FROM usuarios WHERE email = ? AND ativo = 1', [email]);
  if (!u) return res.status(200).json({ ok: true, mensagem: 'Se o email existir, um token será gerado' });

  const token = crypto.randomBytes(32).toString('hex');
  db.run("INSERT INTO recuperacoes (usuario_id, token, expira_em) VALUES (?,?,datetime('now','localtime','+1 hour'))",
    [u.id, token]);

  // Aplicativo local sem serviço de e-mail: o token é retornado e deve ser entregue por outro canal.
  res.json({ ok: true, token, expira_em: '1 hora' });
});

router.post('/recuperar/confirmar', validate(schemas.confirmarRecuperacao), async (req, res, next) => {
  try {
    const { token, nova_senha } = req.body;
    const rec = db.get(
      `SELECT * FROM recuperacoes WHERE token = ? AND usado = 0 AND expira_em > datetime('now','localtime')`,
      [token]
    );
    if (!rec) return res.status(400).json({ erro: 'Token inválido ou expirado' });

    const hash = await bcrypt.hash(nova_senha, 10);
    db.run("UPDATE usuarios SET senha = ?, forcar_troca_senha = 0, updated_at = datetime('now','localtime') WHERE id = ?",
      [hash, rec.usuario_id]);
    db.run('UPDATE recuperacoes SET usado = 1 WHERE id = ?', [rec.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
