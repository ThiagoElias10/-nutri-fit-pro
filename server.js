require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const db = require('./src/db');
const routes = require('./src/routes');
const logger = require('./src/logger');

function originsPermitidas(req, res, next) {
  const lista = (process.env.CORS_ORIGINS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (lista.includes(origin)) return cb(null, true);
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
      try {
        if (new URL(origin).host === req.headers.host) return cb(null, true);
      } catch {
        /* origem inválida */
      }
      return cb(new Error('Origem não permitida pelo CORS'));
    },
    credentials: true,
  })(req, res, next);
}

function criarApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(originsPermitidas);
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: 'Muitas requisições. Tente novamente mais tarde.' },
  }));

  app.use((req, res, next) => {
    const inicio = Date.now();
    res.on('finish', () => {
      const duracao = Date.now() - inicio;
      logger.info(`${req.method} ${req.originalUrl}`, {
        status: res.statusCode,
        duracaoMs: duracao,
        ip: req.ip,
        usuario: req.usuario?.email || 'anon',
      });
    });
    next();
  });

  app.use('/api', routes);

  app.get('/api', (req, res) => {
    res.json({
      nome: 'NutriFit Pro SaaS',
      versao: '2.1.0',
      endpoints: [
        'POST /api/auth/login',
        'POST /api/auth/register',
        'POST /api/auth/logout',
        'GET /api/auth/me',
        'PUT /api/auth/me',
        'POST /api/auth/senha',
        'POST /api/auth/recuperar',
        'POST /api/auth/recuperar/confirmar',
        'GET /api/dashboard',
        'POST /api/avaliacoes/calcular',
        'GET /api/avaliacoes/historico',
        'GET /api/avaliacoes/ultima',
        'GET /api/clientes',
        'POST /api/clientes/vincular',
        'DELETE /api/clientes/vincular/:id',
        'GET /api/clientes/disponiveis',
        'PUT /api/clientes/:id',
        'GET /api/alimentos',
        'GET /api/alimentos/categorias',
        'POST /api/alimentos',
        'GET /api/alimentos/:id',
        'PUT /api/alimentos/:id',
        'DELETE /api/alimentos/:id',
        'GET /api/planos-alimentares',
        'POST /api/planos-alimentares',
        'GET /api/planos-alimentares/:id',
        'PUT /api/planos-alimentares/:id',
        'DELETE /api/planos-alimentares/:id',
        'GET /api/diario-alimentar',
        'POST /api/diario-alimentar',
        'DELETE /api/diario-alimentar/:id',
        'GET /api/exercicios',
        'GET /api/exercicios/grupos',
        'POST /api/exercicios',
        'GET /api/exercicios/:id',
        'PUT /api/exercicios/:id',
        'DELETE /api/exercicios/:id',
        'GET /api/treinos',
        'POST /api/treinos',
        'GET /api/treinos/:id',
        'PUT /api/treinos/:id',
        'DELETE /api/treinos/:id',
        'POST /api/treinos/:id/log',
        'GET /api/treinos/:id/logs',
        'GET /api/progresso/measurements',
        'POST /api/progresso/measurements',
        'PUT /api/progresso/measurements/:id',
        'DELETE /api/progresso/measurements/:id',
        'GET /api/progresso/photos',
        'POST /api/progresso/photos',
        'DELETE /api/progresso/photos/:id',
        'GET /api/progresso/evolution',
        'GET /api/receitas',
        'POST /api/receitas',
        'GET /api/receitas/:id',
        'PUT /api/receitas/:id',
        'DELETE /api/receitas/:id',
        'GET /api/notificacoes',
        'POST /api/notificacoes',
        'PUT /api/notificacoes/:id/lida',
        'DELETE /api/notificacoes/:id',
        'GET /api/exportar',
        'GET /api/atividade',
        'GET /api/admin/stats',
        'GET /api/admin/users',
        'GET /api/admin/acessos',
        'PUT /api/admin/users/:id',
        'DELETE /api/admin/users/:id',
      ],
    });
  });

  const dist = path.join(__dirname, 'frontend', 'dist');
  const legacy = path.join(__dirname, 'public');
  const statico = require('fs').existsSync(dist) ? dist : legacy;
  app.use(express.static(statico));

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
      return res.sendFile(path.join(statico, 'index.html'));
    }
    next();
  });

  app.use((req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada' });
  });

  app.use((err, req, res, _next) => {
    if (err && err.message === 'Origem não permitida pelo CORS') {
      return res.status(403).json({ erro: 'Origem não permitida' });
    }
    logger.error('Erro não tratado', { erro: err.message, stack: err.stack, rota: req.originalUrl });
    res.status(500).json({ erro: 'Erro interno do servidor' });
  });

  return app;
}

async function start() {
  await db.initDB();

  const app = criarApp();
  const PORT = parseInt(process.env.PORT, 10) || 3002;
  const HOST = process.env.HOST || '0.0.0.0';
  const server = app.listen(PORT, HOST, () => {
    logger.info(`NutriFit Pro SaaS rodando em http://${HOST}:${PORT}`);
  });
  return server;
}

if (require.main === module) {
  start().catch((e) => { logger.error('Falha ao iniciar', { erro: e.message, stack: e.stack }); process.exit(1); });
} else {
  module.exports = { start, criarApp };
}
