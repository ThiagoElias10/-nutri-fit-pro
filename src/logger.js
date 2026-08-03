const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const level = (process.env.LOG_LEVEL || 'info').toLowerCase();

function log(lvl, msg, meta) {
  if ((LEVELS[lvl] || 20) < (LEVELS[level] || 20)) return;
  const entry = {
    ts: new Date().toISOString(),
    level: lvl,
    msg,
    ...meta,
  };
  if (lvl === 'error') console.error(JSON.stringify(entry));
  else if (lvl === 'warn') console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

module.exports = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
