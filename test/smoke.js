process.env.DB_PATH = require('path').join(require('os').tmpdir(), 'smoke-' + Date.now() + '.db');
process.env.PORT = 3199;

const { start } = require('../server');

start().then(async (srv) => {
  const r = await fetch('http://localhost:3199/api');
  const j = await r.json();
  console.log('GET /api ->', r.status, j.nome, j.versao);

  const s = await fetch('http://localhost:3199/');
  console.log('GET / ->', s.status, (s.headers.get('content-type') || '').split(';')[0]);

  srv.closeAllConnections();
  srv.close();
  process.exitCode = 0;
}).catch((e) => { console.error(e); process.exit(1); });
