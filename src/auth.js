const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const TOKEN_COOKIE = 'nf_token';

function obterSegredo() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const dir = path.dirname(db.DB_PATH);
  const file = path.join(dir, '.jwt-secret');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const secret = crypto.randomBytes(48).toString('hex');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

const SECRET = obterSegredo();

function gerarToken(usuario) {
  return jwt.sign({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo,
    plano: usuario.plano || 'free',
  }, SECRET, { expiresIn: '24h' });
}

function extrairToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies && req.cookies[TOKEN_COOKIE]) return req.cookies[TOKEN_COOKIE];
  return null;
}

function verificarToken(req, res, next) {
  const token = extrairToken(req);
  if (!token) return res.status(401).json({ erro: 'Token não fornecido' });
  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

function somenteTipo(...tipos) {
  return (req, res, next) => {
    if (!tipos.includes(req.usuario.tipo)) {
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    }
    next();
  };
}

function exigirPlano(...planos) {
  return (req, res, next) => {
    if (req.usuario.tipo === 'admin') return next();
    if (planos.includes(req.usuario.plano)) return next();
    return res.status(402).json({
      erro: 'Recurso disponível apenas nos planos ' + planos.join(' ou '),
    });
  };
}

function podeAcessarCliente(usuario, clientId) {
  if (!clientId) return false;
  if (usuario.tipo === 'admin') return true;
  if (usuario.tipo === 'client') return usuario.id === clientId;
  if (usuario.tipo === 'professional') {
    const rel = db.get('SELECT id FROM usuarios WHERE id = ? AND profissional_id = ?', [clientId, usuario.id]);
    return !!rel;
  }
  return false;
}

function verificarClienteAcessivel(req, clientId) {
  return podeAcessarCliente(req.usuario, clientId);
}

function somenteSeuCliente(req, res, next) {
  if (req.usuario.tipo === 'admin') return next();
  const clientId = parseInt(req.params.client_id || req.params.id);
  if (podeAcessarCliente(req.usuario, clientId)) return next();
  return res.status(403).json({ erro: 'Acesso não autorizado' });
}

function logAccess(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const dur = Date.now() - start;
    if (res.statusCode >= 400) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${dur}ms - ${req.usuario?.email || 'anon'}`);
    }
  });
  next();
}

module.exports = {
  gerarToken,
  verificarToken,
  somenteTipo,
  somenteSeuCliente,
  exigirPlano,
  podeAcessarCliente,
  verificarClienteAcessivel,
  logAccess,
  bcrypt,
  TOKEN_COOKIE,
  extrairToken,
};
