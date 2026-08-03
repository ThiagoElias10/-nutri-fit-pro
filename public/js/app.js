const state = { usuario: null, token: null, view: 'calculadora', ultimoResultado: null };
const API = '/api';

async function req(path, opts) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch(API + path, { ...opts, headers, body: opts?.body ? JSON.stringify(opts.body) : undefined });
  if (res.status === 204) return null;
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
  if (!res.ok) throw new Error(data.erro || ('Erro ' + res.status));
  return data;
}

function pingAcesso() {
  if (state.token) req('/atividade', { method: 'POST' }).catch(() => {});
}

function toast(msg, tipo) {
  const c = document.querySelector('.toast-container') || (() => { const d = document.createElement('div'); d.className = 'toast-container'; document.body.appendChild(d); return d; })();
  const el = document.createElement('div'); el.className = 'toast ' + (tipo || 'info'); el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; el.style.transition = 'all .3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

function initials(n) { return n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

const OBJETIVO_LABEL = { cutting: 'Emagrecer', maintenance: 'Manter Peso', bulking: 'Ganhar Massa' };
function objetivoLabel(o) { return OBJETIVO_LABEL[o] || o; }
function hojeISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function fmtDataISO(d) {
  if (!d) return '—';
  const p = String(d).split(' ')[0].split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(d);
}

let loginMode = 'login';

function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <h1>🏋️ NutriFit <span class="pro">Pro</span></h1>
        <p class="sub" id="loginSub">Faça login para continuar</p>

        <div id="loginFormContainer">
          <form id="authForm">
            <div id="regNomeGroup" style="display:none">
              <input class="input" id="regNome" type="text" placeholder="Nome completo">
            </div>
            <input class="input" id="authEmail" type="email" placeholder="Email" value="admin@nutrifit.com" required>
            <input class="input" id="authSenha" type="password" placeholder="Senha" value="admin123" required>
            <button type="submit" class="btn btn-primary btn-block" id="authBtn">Entrar</button>
          </form>
        </div>

        <div class="login-toggle">
          <span id="toggleText">Não tem conta?</span>
          <button class="btn btn-ghost btn-sm" id="toggleBtn">Criar Conta</button>
        </div>

        <div class="login-hint" id="loginHint"></div>
      </div>
    </div>
  `;

  function setMode(mode) {
    loginMode = mode;
    const isLogin = mode === 'login';
    document.getElementById('regNomeGroup').style.display = isLogin ? 'none' : 'block';
    document.getElementById('authBtn').textContent = isLogin ? 'Entrar' : 'Criar Conta';
    document.getElementById('toggleText').textContent = isLogin ? 'Não tem conta?' : 'Já tem conta?';
    document.getElementById('toggleBtn').textContent = isLogin ? 'Criar Conta' : 'Fazer Login';
    document.getElementById('loginSub').textContent = isLogin ? 'Faça login para continuar' : 'Crie sua conta gratuitamente';
    document.getElementById('authEmail').value = isLogin ? 'admin@nutrifit.com' : '';
    document.getElementById('authSenha').value = isLogin ? 'admin123' : '';
    document.getElementById('loginHint').style.display = isLogin ? 'block' : 'none';
    if (isLogin) { document.getElementById('authEmail').required = true; document.getElementById('authSenha').required = true; }
  }

  document.getElementById('toggleBtn').addEventListener('click', () => setMode(loginMode === 'login' ? 'register' : 'login'));

  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const senha = document.getElementById('authSenha').value;
    const btn = document.getElementById('authBtn');
    btn.disabled = true;

    if (loginMode === 'login') {
      btn.textContent = 'Entrando...';
      try {
        const data = await req('/auth/login', { method: 'POST', body: { email, senha } });
        state.usuario = data.usuario; state.token = data.token;
        localStorage.setItem('token', data.token);
        initApp();
      } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'Entrar'; }
    } else {
      btn.textContent = 'Criando...';
      const nome = document.getElementById('regNome').value;
      if (!nome) { toast('Informe seu nome', 'error'); btn.disabled = false; btn.textContent = 'Criar Conta'; return; }
      if (senha.length < 6) { toast('Mínimo 6 caracteres', 'error'); btn.disabled = false; btn.textContent = 'Criar Conta'; return; }
      try {
        const data = await req('/auth/register', { method: 'POST', body: { nome, email, senha } });
        toast('Conta criada com sucesso!', 'success');
        state.usuario = data.usuario; state.token = data.token;
        localStorage.setItem('token', data.token);
        initApp();
      } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = 'Criar Conta'; }
    }
  });
}


function initApp() {
  pingAcesso();
  renderLayout();
  navigate((state.usuario.tipo === 'admin' || state.usuario.tipo === 'professional') ? 'dashboard' : 'calculadora');
}

function renderLayout() {
  const u = state.usuario;
  const isClient = u.tipo === 'client';
  const isProf = u.tipo === 'professional';
  const isAdmin = u.tipo === 'admin';
  document.getElementById('app').innerHTML = `
    <div class="app">
      <div class="sidebar-overlay" id="sidebarOverlay"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-logo">🏋️ Nutri<span class="gold">Fit</span> <span class="pro">Pro</span></span>
        </div>
        <nav class="sidebar-nav">
          ${isAdmin ? `<button class="nav-item" data-view="dashboard">📊 Dashboard</button>` : ''}
          ${isProf ? `<button class="nav-item" data-view="dashboard">📊 Dashboard</button>` : ''}
          ${isProf ? `<button class="nav-item" data-view="clientes">👥 Clientes</button>` : ''}
          ${isClient ? `<button class="nav-item ativo" data-view="calculadora">🧮 Calculadora</button>` : ''}
          ${!isAdmin ? `<button class="nav-item" data-view="historico">📋 Histórico</button>` : ''}
          <button class="nav-item" data-view="treinos">🏋️ Treinos</button>
          ${isClient ? `<button class="nav-item" data-view="diario">🍽️ Diário Alimentar</button>` : ''}
          ${isClient ? `<button class="nav-item" data-view="planos">📅 Planos</button>` : ''}
          ${isClient ? `<button class="nav-item" data-view="medidas">📏 Medidas</button>` : ''}
        </nav>
        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar">${esc(initials(u.nome))}</div>
            <div>
              <div class="user-name">${esc(u.nome)}</div>
              <div class="user-tipo">${esc(u.tipo)}</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm btn-block" id="logoutBtn">Sair</button>
        </div>
      </aside>
      <main class="main" id="mainContent">
        <div class="topbar">
          <div class="d-flex" style="display:flex;align-items:center;gap:.75rem">
            <button class="hamburger" id="menuToggle">☰</button>
            <h1 id="pageTitle">Calculadora</h1>
          </div>
          <div class="topbar-actions" id="topbarActions"></div>
        </div>
        <div id="pageContent"></div>
      </main>
    </div>
    <div class="toast-container"></div>
  `;
  document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => navigate(el.dataset.view)));
  document.getElementById('logoutBtn').addEventListener('click', () => { state.token = null; state.usuario = null; localStorage.removeItem('token'); renderLogin(); });

  function toggleSidebar(open) {
    document.getElementById('sidebar').classList.toggle('open', open);
    document.getElementById('sidebarOverlay').classList.toggle('open', open);
  }
  document.getElementById('menuToggle').addEventListener('click', () => toggleSidebar(true));
  document.getElementById('sidebarOverlay').addEventListener('click', () => toggleSidebar(false));
  document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => toggleSidebar(false)));
}

function navigate(view) {
  state.view = view;
  if (dashboardAccessTimer) { clearInterval(dashboardAccessTimer); dashboardAccessTimer = null; }
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('ativo', el.dataset.view === view));
  const t = {
    calculadora: 'Calculadora Nutricional',
    historico: 'Histórico',
    treinos: 'Treinos',
    dashboard: 'Dashboard',
    diario: 'Diário Alimentar',
    planos: 'Planos Alimentares',
    medidas: 'Medidas Corporais',
    clientes: 'Meus Clientes',
  };
  document.getElementById('pageTitle').textContent = t[view] || 'NutriFit Pro';
  document.getElementById('topbarActions').innerHTML = '';
  if (view === 'calculadora') renderCalculadora();
  else if (view === 'historico') renderHistorico();
  else if (view === 'treinos') renderTreinos();
  else if (view === 'diario') renderDiario();
  else if (view === 'planos') renderPlanos();
  else if (view === 'medidas') renderMedidas();
  else if (view === 'clientes') renderClientes();
  else if (view === 'dashboard') renderDashboard();
}

function renderCalculadora() {
  const c = document.getElementById('pageContent');
  c.innerHTML = `
    <div class="card">
      <div class="card-title" style="margin-bottom:1rem">📝 <span class="gold">Seus Dados</span></div>
      <div class="form-grid">
        <div class="form-group">
          <label>Idade (anos)</label>
          <input class="input" id="cIdade" type="number" value="25" min="10" max="100">
        </div>
        <div class="form-group">
          <label>Peso (kg)</label>
          <input class="input" id="cPeso" type="number" value="70" min="30" max="300" step=".1">
        </div>
        <div class="form-group">
          <label>Altura (cm)</label>
          <input class="input" id="cAltura" type="number" value="175" min="100" max="250">
        </div>
        <div class="form-group">
          <label>Sexo</label>
          <select class="input" id="cSexo">
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Nível de Atividade</label>
        <select class="input" id="cAtividade">
          <option value="1.2">Sedentário (pouco ou nenhum exercício)</option>
          <option value="1.375">Leve (1-3 dias/semana)</option>
          <option value="1.55" selected>Moderado (3-5 dias/semana)</option>
          <option value="1.725">Intenso (6-7 dias/semana)</option>
          <option value="1.9">Atleta (2x ao dia)</option>
        </select>
      </div>

      <div class="form-group">
        <label>Objetivo</label>
        <div class="radio-group">
          <label class="radio-item"><input type="radio" name="objetivo" value="cutting" checked><span>🔽 Emagrecer</span></label>
          <label class="radio-item"><input type="radio" name="objetivo" value="maintenance"><span>➡️ Manter</span></label>
          <label class="radio-item"><input type="radio" name="objetivo" value="bulking"><span>🔼 Ganhar Massa</span></label>
        </div>
      </div>

      <button class="btn btn-primary btn-block btn-calc" id="btnCalcular">📊 Calcular</button>
    </div>

    <div class="result-section" id="resultSection">
      <div class="card">
        <div class="card-title" style="margin-bottom:1rem">📊 <span class="gold">Resultados</span></div>
        <div class="meta-grid">
          <div class="meta-item"><span class="label">Taxa Metabólica Basal (TMB)</span><span class="value" id="rTmb">-</span></div>
          <div class="meta-item"><span class="label">Gasto Calórico Diário (TDEE)</span><span class="value" id="rTdee">-</span></div>
          <div class="meta-item"><span class="label">Calorias Recomendadas</span><span class="value" id="rCal">-</span></div>
          <div class="meta-item"><span class="label">Proteína por kg</span><span class="value" id="rProtKg">-</span></div>
        </div>

        <div class="macro-grid" style="margin-top:1rem">
          <div class="macro-card proteina">
            <div class="valor" id="rMacroProt">-</div>
            <div class="rotulo">Proteína</div>
            <div class="gramas" id="rProtG">- g</div>
          </div>
          <div class="macro-card carbo">
            <div class="valor" id="rMacroCarb">-</div>
            <div class="rotulo">Carboidrato</div>
            <div class="gramas" id="rCarbG">- g</div>
          </div>
          <div class="macro-card gordura">
            <div class="valor" id="rMacroGord">-</div>
            <div class="rotulo">Gordura</div>
            <div class="gramas" id="rGordG">- g</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:1rem">🍽️ <span class="gold">Cardápio Sugerido</span></div>
        <div id="cardapio"></div>
        <div class="tip" id="dica"></div>
      </div>
    </div>
  `;

  document.getElementById('btnCalcular').addEventListener('click', calcular);

  if (state.ultimoResultado) {
    document.getElementById('cIdade').value = state.ultimoResultado.idade;
    document.getElementById('cPeso').value = state.ultimoResultado.peso;
    document.getElementById('cAltura').value = state.ultimoResultado.altura;
    document.getElementById('cSexo').value = state.ultimoResultado.sexo;
    document.getElementById('cAtividade').value = String(state.ultimoResultado.atividade);
    document.querySelector(`input[name="objetivo"][value="${state.ultimoResultado.objetivo}"]`).checked = true;
    exibirResultado(state.ultimoResultado);
  }
}

async function calcular() {
  const idade = Number(document.getElementById('cIdade').value);
  const peso = Number(document.getElementById('cPeso').value);
  const altura = Number(document.getElementById('cAltura').value);
  const sexo = document.getElementById('cSexo').value;
  const atividade = Number(document.getElementById('cAtividade').value);
  const objetivo = document.querySelector('input[name="objetivo"]:checked').value;

  if (!idade || !peso || !altura) { toast('Preencha todos os campos', 'error'); return; }

  try {
    const res = await req('/avaliacoes/calcular', {
      method: 'POST',
      body: { idade, peso, altura, sexo, atividade, objetivo }
    });

    state.ultimoResultado = { idade, peso, altura, sexo, atividade, objetivo };
    exibirResultado(res);
    document.getElementById('resultSection').classList.add('show');
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
    toast('Cálculo salvo com sucesso!', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function exibirResultado(r) {
  document.getElementById('rTmb').textContent = r.tmb + ' kcal';
  document.getElementById('rTdee').textContent = r.tdee + ' kcal';
  document.getElementById('rCal').textContent = r.caloriasAlvo + ' kcal';
  document.getElementById('rProtKg').textContent = r.proteinaKg + ' g/kg';

  document.getElementById('rMacroProt').textContent = (r.proteinaG * 4) + ' kcal';
  document.getElementById('rProtG').textContent = r.proteinaG + 'g';
  document.getElementById('rMacroCarb').textContent = (r.carbG * 4) + ' kcal';
  document.getElementById('rCarbG').textContent = r.carbG + 'g';
  document.getElementById('rMacroGord').textContent = (r.gorduraG * 9) + ' kcal';
  document.getElementById('rGordG').textContent = r.gorduraG + 'g';

  const obj = r.objetivo;
  const cardapio = [
    { nome: '🌅 Café da Manhã', desc: sugestao(obj, 'cafe'), cal: Math.round(r.caloriasAlvo * 0.2) },
    { nome: '🍗 Almoço', desc: sugestao(obj, 'almoco'), cal: Math.round(r.caloriasAlvo * 0.35) },
    { nome: '🥤 Lanche Tarde', desc: sugestao(obj, 'lanche'), cal: Math.round(r.caloriasAlvo * 0.15) },
    { nome: '🥩 Jantar', desc: sugestao(obj, 'jantar'), cal: Math.round(r.caloriasAlvo * 0.25) },
    { nome: '🌙 Ceia', desc: sugestao(obj, 'ceia'), cal: Math.round(r.caloriasAlvo * 0.05) }
  ];

  document.getElementById('cardapio').innerHTML = cardapio.map(m => `
    <div class="meal"><div class="nome">${m.nome}</div><div class="desc">${m.desc}</div><div class="cal">~${m.cal} kcal</div></div>
  `).join('');

  const dicas = {
    cutting: '💡 Prefira alimentos com baixa densidade calórica (vegetais, proteínas magras). Beba bastante água! O déficit de 500 kcal/dia resulta em ~0.5kg/semana.',
    maintenance: '💡 Mantenha o equilíbrio! A proteína é essencial para recuperação muscular. Varie as fontes de carboidrato (arroz, batata, frutas).',
    bulking: '💡 Foque em alimentos densos em nutrientes. O superávit de 350 kcal/dia com treino pesado favorece ganho de massa magra. Evite junk food.'
  };
  document.getElementById('dica').textContent = dicas[obj] || '';
}

function sugestao(obj, refeicao) {
  const cardapio = {
    cafe: { bulk: '4 ovos mexidos + 2 fatias pão integral + 1 banana + 30g pasta amendoim + café', cut: '2 ovos mexidos + 1 fatia pão integral + 1 fruta + café sem açúcar', maintenance: '3 ovos + 1 fatia pão integral + 1 banana + café' },
    almoco: { bulk: '200g arroz + 150g frango + 100g feijão + salada + 1 batata doce', cut: '150g arroz integral + 120g frango grelhado + salada verde + legumes', maintenance: '180g arroz + 130g carne magra + 80g feijão + salada' },
    lanche: { bulk: 'shake: 2 scoops whey + 300ml leite + 1 banana + 30g aveia + 20g pasta amendoim', cut: '1 iogurte natural + 1 scoop whey + frutas vermelhas', maintenance: 'shake: 1 scoop whey + 200ml leite + 1 fruta + 20g aveia' },
    jantar: { bulk: '200g salmão + 250g batata doce + brócolis + azeite', cut: '150g peixe branco + legumes refogados + 100g arroz integral', maintenance: '180g carne magra + 200g batata + salada + azeite' },
    ceia: { bulk: '1 pote iogurte grego + 20g whey + 15g castanhas + mel', cut: 'chá + 1 scoop caseína ou 3 claras', maintenance: '1 iogurte grego + mel + canela' }
  };
  return cardapio[refeicao][obj] || '';
}

async function renderHistorico() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="spinner"></div>';
  try {
    const hist = await req('/avaliacoes/historico');
    if (!hist.length) {
      c.innerHTML = '<div class="card"><div class="empty"><div class="icon">📭</div><h3>Nenhum cálculo ainda</h3><p>Faça seu primeiro cálculo na calculadora!</p></div></div>';
      return;
    }
    c.innerHTML = '<div class="card">' + hist.map(h => `
      <div class="hist-item">
        <div>
          <strong>${new Date(h.created_at + 'Z').toLocaleDateString('pt-BR')}</strong>
          <span style="color:var(--text-sec);margin-left:.5rem">${objetivoLabel(h.objetivo)}</span>
          <span style="color:var(--text-muted);margin-left:.5rem">${h.calorias_alvo} kcal | P:${h.proteina_g}g C:${h.carboidrato_g}g G:${h.gordura_g}g</span>
        </div>
        <span class="hist-date">${new Date(h.created_at + 'Z').toLocaleString('pt-BR')}</span>
      </div>
    `).join('') + '</div>';
  } catch (err) {
    c.innerHTML = '<div class="card"><div class="empty"><div class="icon">⚠️</div><h3>Erro</h3><p>' + esc(err.message) + '</p></div></div>';
  }
}

const EX_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><rect width='160' height='120' rx='8' fill='#1a1740'/><circle cx='80' cy='60' r='26' fill='#6c63ff' opacity='.35'/><text x='80' y='78' font-size='30' text-anchor='middle' fill='#6c63ff'>🏋️</text></svg>"
);
function exFallbackImg(el) { el.onerror = null; el.src = EX_FALLBACK; }

async function renderTreinos() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="spinner"></div>';
  try {
    const treinos = await req('/treinos');
    if (!treinos.length) {
      c.innerHTML = '<div class="card"><div class="empty"><div class="icon">🏋️</div><h3>Nenhum treino ainda</h3><p>Seus treinos aparecerão aqui.</p></div></div>';
      return;
    }
    const tipoLabel = { a: 'Treino A', b: 'Treino B', c: 'Treino C', fullbody: 'Full Body', push: 'Push', pull: 'Pull', legs: 'Legs', custom: 'Custom' };
    c.innerHTML = treinos.map(w => {
      const exs = w.exercicios || [];
      const showCliente = state.usuario.tipo === 'professional' || state.usuario.tipo === 'admin';
      return `
        <div class="card treino-card">
          <div class="treino-head">
            <div>
              <div class="card-title">🏋️ ${esc(w.nome)}</div>
              <div class="treino-meta">
                <span class="tag tag-objetivo">${esc(tipoLabel[w.tipo] || w.tipo)}</span>
                ${w.ativo ? '<span class="tag tag-active">Ativo</span>' : '<span class="tag tag-inactive">Inativo</span>'}
                ${showCliente ? `<span class="treino-cliente">👤 ${esc(w.client_nome || ('Cliente #' + w.client_id))}</span>` : ''}
              </div>
            </div>
            <div class="treino-num">${exs.length} ${exs.length === 1 ? 'exercício' : 'exercícios'}</div>
          </div>
          ${exs.length ? `<div class="ex-grid">
            ${exs.map(ex => `
              <div class="ex-card">
                <div class="ex-img"><img src="${esc(ex.imagem_url || EX_FALLBACK)}" alt="${esc(ex.nome)}" loading="lazy" onerror="exFallbackImg(this)"></div>
                <div class="ex-info">
                  <div class="ex-nome">${esc(ex.nome)}</div>
                  <div class="ex-grupo">${esc(ex.grupo_muscular)}</div>
                  <div class="ex-detalhes">${ex.series}×${esc(ex.repeticoes)} <span class="sep">•</span> ${ex.carga ? esc(ex.carga) + ' kg' : 'carga livre'} <span class="sep">•</span> ${ex.descanso}s</div>
                  ${ex.observacao ? `<div class="ex-obs">${esc(ex.observacao)}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>` : '<div class="empty"><p>Sem exercícios neste treino</p></div>'}
        </div>`;
    }).join('');
  } catch (err) {
    c.innerHTML = '<div class="card"><div class="empty"><div class="icon">⚠️</div><h3>Erro</h3><p>' + esc(err.message) + '</p></div></div>';
  }
}

async function renderDiario() {
  const c = document.getElementById('pageContent');
  const hoje = hojeISO();
  c.innerHTML = `
    <div class="card">
      <div class="card-title" style="margin-bottom:1rem">🍽️ <span class="gold">Registrar Alimentação</span></div>
      <div class="form-grid">
        <div class="form-group"><label>Data</label><input class="input" id="dData" type="date" value="${hoje}"></div>
        <div class="form-group"><label>Refeição</label>
          <select class="input" id="dRefeicao">
            <option>Café da manhã</option><option>Almoço</option><option>Lanche</option><option>Jantar</option><option>Ceia</option>
          </select>
        </div>
        <div class="form-group"><label>Alimento</label><select class="input" id="dAlimento"><option>Carregando...</option></select></div>
        <div class="form-group"><label>Quantidade (${''}g/ml)</label><input class="input" id="dQtd" type="number" value="100" min="1"></div>
      </div>
      <button class="btn btn-primary" id="dAdd">＋ Adicionar alimento</button>
    </div>

    <div class="card">
      <div class="card-title" style="margin-bottom:1rem">📊 <span class="gold">Resumo do Dia</span></div>
      <div class="stats-grid" id="dResumo"><div class="spinner"></div></div>
      <div class="bar-wrap" id="dCalBarWrap" style="margin-top:.75rem"></div>
    </div>

    <div id="dDiario"></div>
  `;

  const alimentos = await req('/alimentos');
  document.getElementById('dAlimento').innerHTML = alimentos.map(a =>
    `<option value="${a.id}">${esc(a.nome)} — ${a.calorias} kcal / ${a.porcao}${a.unidade}</option>`
  ).join('');

  async function refresh() {
    const data = document.getElementById('dData').value;
    const { summary, entries } = await req('/diario-alimentar?data=' + data);
    const alvo = await req('/avaliacoes/ultima');

    const macros = [
      { label: 'Calorias', valor: summary.total.calorias, cor: 'var(--gold)', extra: alvo ? 'meta ' + alvo.calorias_alvo + ' kcal' : '' },
      { label: 'Proteína', valor: summary.total.proteina + 'g', cor: '#ff6b6b', extra: alvo ? 'meta ' + alvo.proteina_g + 'g' : '' },
      { label: 'Carboidrato', valor: summary.total.carboidrato + 'g', cor: '#6c63ff', extra: alvo ? 'meta ' + alvo.carboidrato_g + 'g' : '' },
      { label: 'Gordura', valor: summary.total.gordura + 'g', cor: '#2ed573', extra: alvo ? 'meta ' + alvo.gordura_g + 'g' : '' },
    ];
    document.getElementById('dResumo').innerHTML = macros.map(m => `
      <div class="stat-card">
        <div class="stat-top"><span class="stat-num" style="font-size:1.25rem;color:${m.cor}">${m.valor}</span></div>
        <span class="stat-label">${m.label} ${m.extra ? '<br><small>' + esc(m.extra) + '</small>' : ''}</span>
      </div>`).join('');

    if (alvo && alvo.calorias_alvo) {
      const pct = Math.min(100, Math.round(summary.total.calorias / alvo.calorias_alvo * 100));
      document.getElementById('dCalBarWrap').innerHTML = `
        <div class="bar-label">Progresso da meta calórica — <b>${summary.total.calorias}</b> de <b>${alvo.calorias_alvo}</b> kcal (${pct}%)</div>
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>`;
    } else {
      document.getElementById('dCalBarWrap').innerHTML = '';
    }

    const ordem = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'];
    document.getElementById('dDiario').innerHTML = ordem.map(ref => {
      const items = entries.filter(e => e.refeicao === ref);
      if (!items.length) return '';
      const kcal = items.reduce((s, e) => s + e.calorias, 0);
      return `
        <div class="card">
          <div class="card-header">
            <span class="card-title">🍽️ <span class="gold">${esc(ref)}</span></span>
            <span class="count-badge">${Math.round(kcal)} kcal</span>
          </div>
          ${items.map(e => `
            <div class="food-line">
              <span class="food-qtd">${e.quantidade}${e.unidade}</span>
              <span class="food-nome">${esc(e.alimento_nome)}</span>
              <span class="food-mac">P ${e.proteina} • C ${e.carboidrato} • G ${e.gordura}</span>
              <span class="food-kcal">${e.calorias} kcal</span>
              <button class="btn btn-ghost btn-sm food-del" data-id="${e.id}">✕</button>
            </div>`).join('')}
        </div>`;
    }).join('');

    document.querySelectorAll('.food-del').forEach(b =>
      b.addEventListener('click', async () => {
        await req('/diario-alimentar/' + b.dataset.id, { method: 'DELETE' });
        toast('Registro removido', 'success');
        refresh();
      })
    );
  }

  document.getElementById('dAdd').addEventListener('click', async () => {
    const refeicao = document.getElementById('dRefeicao').value;
    const alimento_id = Number(document.getElementById('dAlimento').value);
    const quantidade = Number(document.getElementById('dQtd').value);
    const data = document.getElementById('dData').value;
    if (!alimento_id || !quantidade) { toast('Escolha alimento e quantidade', 'error'); return; }
    try {
      await req('/diario-alimentar', { method: 'POST', body: { refeicao, alimento_id, quantidade, data } });
      toast('Alimento adicionado!', 'success');
      refresh();
    } catch (err) { toast(err.message, 'error'); }
  });
  document.getElementById('dData').addEventListener('change', refresh);
  refresh().catch(err => toast(err.message, 'error'));
}

async function renderPlanos() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="spinner"></div>';
  try {
    const planos = await req('/planos-alimentares');
    if (!planos.length) {
      c.innerHTML = '<div class="card"><div class="empty"><div class="icon">📅</div><h3>Nenhum plano alimentar</h3><p>Seu profissional ainda não criou um plano para você.</p></div></div>';
      return;
    }
    c.innerHTML = planos.map(p => `
      <div class="card plan-card">
        <div class="treino-head">
          <div>
            <div class="card-title">📅 ${esc(p.nome)} ${p.ativo ? '<span class="tag tag-active">Ativo</span>' : '<span class="tag tag-inactive">Inativo</span>'}</div>
            ${p.calorias_diarias ? `<div class="plan-macros">🍚 ${p.calorias_diarias} kcal/dia • P ${p.proteina_diaria || '-'}g • C ${p.carboidrato_diario || '-'}g • G ${p.gordura_diaria || '-'}g</div>` : ''}
          </div>
        </div>
        ${(p.refeicoes || []).map(r => `
          <div class="meal-block">
            <div class="meal-block-head">🍽️ ${esc(r.nome)} <span class="meal-horario">${esc(r.horario || '')}</span> <span class="count-badge">${r.total_calorias || 0} kcal</span></div>
            ${(r.alimentos || []).map(a => `
              <div class="food-line">
                <span class="food-qtd">${a.quantidade}${a.unidade}</span>
                <span class="food-nome">${esc(a.nome)}</span>
                <span class="food-mac">P ${a.proteina_total} • C ${a.carboidrato_total} • G ${a.gordura_total}</span>
                <span class="food-kcal">${a.calorias_total} kcal</span>
              </div>`).join('')}
          </div>`).join('')}
      </div>`).join('');
  } catch (err) {
    c.innerHTML = '<div class="card"><div class="empty"><div class="icon">⚠️</div><h3>Erro</h3><p>' + esc(err.message) + '</p></div></div>';
  }
}

async function renderMedidas() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="spinner"></div>';
  try {
    const evo = await req('/progresso/evolution');
    const medidas = evo.measurements || [];

    c.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:1rem">📏 <span class="gold">Registrar Medidas</span></div>
        <div class="form-grid">
          <div class="form-group"><label>Peso (kg)</label><input class="input" id="mPeso" type="number" step=".1" min="1"></div>
          <div class="form-group"><label>Cintura (cm)</label><input class="input" id="mCintura" type="number" step=".1"></div>
          <div class="form-group"><label>Abdômen (cm)</label><input class="input" id="mAbdomen" type="number" step=".1"></div>
          <div class="form-group"><label>Peitoral (cm)</label><input class="input" id="mPeitoral" type="number" step=".1"></div>
          <div class="form-group"><label>Gordura corporal (%)</label><input class="input" id="mGordura" type="number" step=".1"></div>
          <div class="form-group"><label>Ombro (cm)</label><input class="input" id="mOmbros" type="number" step=".1"></div>
        </div>
        <button class="btn btn-primary" id="mAdd">💾 Salvar medidas</button>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">📈 <span class="gold">Evolução do Peso</span></span></div>
        <div class="chart-box"><canvas id="chartPeso"></canvas></div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">📋 <span class="gold">Histórico de Medidas</span> <span class="count-badge">${medidas.length}</span></span></div>
        <div class="table-wrap">
          <div class="user-row cols6 user-header"><span>Data</span><span>Peso</span><span>Cintura</span><span>Abdômen</span><span>Peitoral</span><span>Gordura</span></div>
          ${medidas.length ? medidas.map(m => `
            <div class="user-row cols6">
              <span style="font-size:.8rem">${new Date(m.created_at + 'Z').toLocaleDateString('pt-BR')}</span>
              <span><strong>${m.peso ?? '—'}</strong> kg</span>
              <span>${m.cintura ?? '—'} cm</span>
              <span>${m.abdomen ?? '—'} cm</span>
              <span>${m.peitoral ?? '—'} cm</span>
              <span>${m.gordura_corporal ?? '—'}%</span>
            </div>`).join('') : '<div class="empty"><p>Nenhuma medida registrada</p></div>'}
        </div>
      </div>
    `;

    if (charts.peso) charts.peso.destroy();
    const pesos = medidas.filter(m => m.peso);
    const ctxPeso = document.getElementById('chartPeso')?.getContext('2d');
    if (ctxPeso && pesos.length) {
      charts.peso = new Chart(ctxPeso, {
        type: 'line',
        data: {
          labels: pesos.map(m => new Date(m.created_at + 'Z').toLocaleDateString('pt-BR')),
          datasets: [{ label: 'Peso (kg)', data: pesos.map(m => m.peso), borderColor: '#6c63ff', backgroundColor: 'rgba(108,99,255,.15)', fill: true, tension: .35, pointBackgroundColor: '#6c63ff' }]
        },
        options: chartOpts()
      });
    }

    document.getElementById('mAdd').addEventListener('click', async () => {
      const body = {
        peso: document.getElementById('mPeso').value || undefined,
        cintura: document.getElementById('mCintura').value || undefined,
        abdomen: document.getElementById('mAbdomen').value || undefined,
        peitoral: document.getElementById('mPeitoral').value || undefined,
        gordura_corporal: document.getElementById('mGordura').value || undefined,
        ombros: document.getElementById('mOmbros').value || undefined,
      };
      if (!body.peso) { toast('Informe ao menos o peso', 'error'); return; }
      try {
        await req('/progresso/measurements', { method: 'POST', body });
        toast('Medidas salvas!', 'success');
        renderMedidas();
      } catch (err) { toast(err.message, 'error'); }
    });
  } catch (err) {
    c.innerHTML = '<div class="card"><div class="empty"><div class="icon">⚠️</div><h3>Erro</h3><p>' + esc(err.message) + '</p></div></div>';
  }
}

async function renderClientes() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="spinner"></div>';
  try {
    const [clientes, disponiveis] = await Promise.all([req('/clientes'), req('/clientes/disponiveis')]);
    c.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:1rem">➕ <span class="gold">Vincular Cliente</span></div>
        <div class="form-grid">
          <div class="form-group">
            <label>Cliente disponível (sem profissional)</label>
            <select class="input" id="cSel">
              <option value="">— Escolher —</option>
              ${disponiveis.map(x => `<option value="${esc(x.email)}">${esc(x.nome)} (${esc(x.email)})</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="btn btn-primary" id="cLink">＋ Vincular</button>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">👥 <span class="gold">Meus Clientes</span> <span class="count-badge">${clientes.length}</span></span></div>
        <div class="table-wrap">
          <div class="user-row cols4 user-header"><span>Nome</span><span>Email</span><span>Avaliações</span><span>Última Avaliação</span></div>
          ${clientes.length ? clientes.map(cl => `
            <div class="user-row cols4">
              <span><strong>${esc(cl.nome)}</strong></span>
              <span style="color:var(--text-sec)">${esc(cl.email)}</span>
              <span><span class="tag tag-objetivo">${cl.total_avaliacoes}</span></span>
              <span style="font-size:.78rem;color:var(--text-muted)">${cl.ultima_avaliacao ? new Date(cl.ultima_avaliacao + 'Z').toLocaleDateString('pt-BR') : '—'}</span>
            </div>`).join('') : '<div class="empty"><p>Nenhum cliente vinculado ainda</p></div>'}
        </div>
      </div>
    `;

    document.getElementById('cLink').addEventListener('click', async () => {
      const client_email = document.getElementById('cSel').value;
      if (!client_email) { toast('Escolha um cliente', 'error'); return; }
      try {
        await req('/clientes/vincular', { method: 'POST', body: { client_email } });
        toast('Cliente vinculado!', 'success');
        renderClientes();
      } catch (err) { toast(err.message, 'error'); }
    });
  } catch (err) {
    c.innerHTML = '<div class="card"><div class="empty"><div class="icon">⚠️</div><h3>Erro</h3><p>' + esc(err.message) + '</p></div></div>';
  }
}

let charts = {};
let dashboardAccessTimer = null;
const acessosVistos = {};

async function renderDashboard() {
  if (state.usuario.tipo === 'professional') return renderDashboardProf();
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="spinner"></div>';
  try {
    const [s, users] = await Promise.all([req('/admin/stats'), req('/admin/users')]);
    await carregarAcessos(true);

    const tipoLabel = { admin: 'Admin', professional: 'Profissional', client: 'Cliente' };
    const PAL = ['#6c63ff', '#ffd200', '#2ed573', '#ff6b6b', '#ffa502', '#8b85ff', '#00d2ff'];
    c.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-top"><span class="stat-num">${s.totalUsuarios}</span><span class="stat-icon" style="background:var(--primary-bg);color:var(--primary)">👥</span></div><span class="stat-label">Total Usuários</span></div>
        <div class="stat-card"><div class="stat-top"><span class="stat-num">${s.activeUsers}</span><span class="stat-icon" style="background:var(--gold-bg);color:var(--gold)">✅</span></div><span class="stat-label">Usuários Ativos</span></div>
        <div class="stat-card"><div class="stat-top"><span class="stat-num">${s.totalAvaliacoes}</span><span class="stat-icon" style="background:rgba(46,213,115,.15);color:var(--success)">📊</span></div><span class="stat-label">Avaliações</span></div>
        <div class="stat-card"><div class="stat-top"><span class="stat-num">${s.totalTreinos}</span><span class="stat-icon" style="background:rgba(108,99,255,.15);color:var(--primary)">🏋️</span></div><span class="stat-label">Treinos</span></div>
        <div class="stat-card"><div class="stat-top"><span class="stat-num">${s.totalPlanos}</span><span class="stat-icon" style="background:rgba(255,165,2,.15);color:var(--warn)">🍽️</span></div><span class="stat-label">Planos Alimentares</span></div>
        <div class="stat-card"><div class="stat-top"><span class="stat-num">${s.totalAlimentos}</span><span class="stat-icon" style="background:rgba(46,213,115,.15);color:var(--success)">🥗</span></div><span class="stat-label">Alimentos</span></div>
      </div>

      <div class="dash-grid">
        <div class="card">
          <div class="card-header"><span class="card-title">📊 <span class="gold">Objetivos dos Usuários</span></span></div>
          <div class="chart-box"><canvas id="chartObj"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">💳 <span class="gold">Usuários por Plano</span></span></div>
          <div class="chart-box"><canvas id="chartPlano"></canvas></div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="card">
          <div class="card-header"><span class="card-title">👥 <span class="gold">Usuários por Tipo</span></span></div>
          <div class="chart-box"><canvas id="chartTipo"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🔔 <span class="gold">Acessos por Dia</span></span></div>
          <div class="chart-box"><canvas id="chartAcesso"></canvas></div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="card">
          <div class="card-header"><span class="card-title">🍽️ <span class="gold">Registros no Diário Alimentar</span></span></div>
          <div class="chart-box"><canvas id="chartDiario"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🏋️ <span class="gold">Treinos Realizados</span></span></div>
          <div class="chart-box"><canvas id="chartTreino"></canvas></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">🔔 <span class="gold">Acessos Recentes</span></span>
          <span class="live-dot">● ao vivo</span>
        </div>
        <div class="access-feed" id="accessFeed"><div class="spinner"></div></div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">👥 <span class="gold">Usuários</span> <span class="count-badge">${users.length}</span></span></div>
        <div class="table-wrap">
          <div class="user-row user-header"><span>ID</span><span>Nome</span><span>Email</span><span>Tipo</span><span>Plano</span><span>Status</span><span>Criado em</span></div>
          ${users.map(u => `
            <div class="user-row">
              <span class="user-id">#${u.id}</span>
              <span><strong>${esc(u.nome)}</strong></span>
              <span style="color:var(--text-sec)">${esc(u.email)}</span>
              <span><span class="tag tag-tipo tag-tipo-${esc(u.tipo)}">${esc(tipoLabel[u.tipo] || u.tipo)}</span></span>
              <span class="tag tag-plan">${esc(u.plano)}</span>
              <span>${u.ativo ? '<span class="tag tag-active">Ativo</span>' : '<span class="tag tag-inactive">Inativo</span>'}</span>
              <span style="font-size:.78rem;color:var(--text-muted)">${new Date(u.created_at + 'Z').toLocaleDateString('pt-BR')}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    function destroy(key) { if (charts[key]) { charts[key].destroy(); delete charts[key]; } }

    destroy('obj');
    if (s.objetivos && s.objetivos.length) {
      charts.obj = new Chart(document.getElementById('chartObj'), {
        type: 'doughnut',
        data: { labels: s.objetivos.map(o => objetivoLabel(o.objetivo)), datasets: [{ data: s.objetivos.map(o => o.total), backgroundColor: s.objetivos.map((o, i) => PAL[i % PAL.length]), borderWidth: 0 }] },
        options: chartOpts('bottom')
      });
    }

    destroy('plano');
    if (s.byPlan && s.byPlan.length) {
      charts.plano = new Chart(document.getElementById('chartPlano'), {
        type: 'doughnut',
        data: { labels: s.byPlan.map(p => p.plano), datasets: [{ data: s.byPlan.map(p => p.total), backgroundColor: s.byPlan.map((p, i) => PAL[i % PAL.length]), borderWidth: 0 }] },
        options: chartOpts('bottom')
      });
    }

    destroy('tipo');
    if (s.byType && s.byType.length) {
      charts.tipo = new Chart(document.getElementById('chartTipo'), {
        type: 'bar',
        data: { labels: s.byType.map(x => tipoLabel[x.tipo] || x.tipo), datasets: [{ label: 'Usuários', data: s.byType.map(x => x.total), backgroundColor: '#6c63ff', borderRadius: 6 }] },
        options: chartOpts()
      });
    }

    destroy('acesso');
    if (s.acessosDiarios && s.acessosDiarios.length) {
      const rev = [...s.acessosDiarios].reverse();
      charts.acesso = new Chart(document.getElementById('chartAcesso'), {
        type: 'line',
        data: { labels: rev.map(r => fmtDataISO(r.dia)), datasets: [{ label: 'Acessos', data: rev.map(r => r.total), borderColor: '#ffd200', backgroundColor: 'rgba(255,210,0,.15)', fill: true, tension: .35, pointBackgroundColor: '#ffd200' }] },
        options: chartOpts()
      });
    }

    destroy('diario');
    if (s.atividadesDiario && s.atividadesDiario.length) {
      const rev = [...s.atividadesDiario].reverse();
      charts.diario = new Chart(document.getElementById('chartDiario'), {
        type: 'line',
        data: { labels: rev.map(r => fmtDataISO(r.dia)), datasets: [{ label: 'Registros', data: rev.map(r => r.total), borderColor: '#2ed573', backgroundColor: 'rgba(46,213,115,.15)', fill: true, tension: .35, pointBackgroundColor: '#2ed573' }] },
        options: chartOpts()
      });
    }

    destroy('treino');
    if (s.treinosRealizados && s.treinosRealizados.length) {
      const rev = [...s.treinosRealizados].reverse();
      charts.treino = new Chart(document.getElementById('chartTreino'), {
        type: 'bar',
        data: { labels: rev.map(r => fmtDataISO(r.dia)), datasets: [{ label: 'Treinos', data: rev.map(r => r.total), backgroundColor: '#ff6b6b', borderRadius: 6 }] },
        options: chartOpts()
      });
    }

    dashboardAccessTimer = setInterval(() => carregarAcessos(false), 5000);
  } catch (err) {
    c.innerHTML = '<div class="card"><div class="empty"><div class="icon">⚠️</div><h3>Erro</h3><p>' + esc(err.message) + '</p></div></div>';
  }
}

function chartOpts(legendPos) {
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: legendPos ? { position: legendPos, labels: { color: '#9999b0', padding: 10, font: { size: 11 } } } : { display: false } },
  };
  if (!legendPos) {
    opts.scales = {
      x: { ticks: { color: '#9999b0', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.06)' } },
      y: { beginAtZero: true, ticks: { color: '#9999b0', font: { size: 10 }, precision: 0 }, grid: { color: 'rgba(255,255,255,.06)' } }
    };
  }
  return opts;
}

async function renderDashboardProf() {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="spinner"></div>';
  try {
    const [dash, clientes, treinos, planos] = await Promise.all([
      req('/dashboard'), req('/clientes'), req('/treinos'), req('/planos-alimentares')
    ]);
    const recentes = dash.ultimas_avaliacoes || [];
    c.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-top"><span class="stat-num">${dash.total_clientes}</span><span class="stat-icon" style="background:var(--primary-bg);color:var(--primary)">👥</span></div><span class="stat-label">Clientes</span></div>
        <div class="stat-card"><div class="stat-top"><span class="stat-num">${treinos.length}</span><span class="stat-icon" style="background:rgba(255,107,107,.15);color:#ff6b6b">🏋️</span></div><span class="stat-label">Treinos</span></div>
        <div class="stat-card"><div class="stat-top"><span class="stat-num">${planos.length}</span><span class="stat-icon" style="background:rgba(255,165,2,.15);color:var(--warn)">🍽️</span></div><span class="stat-label">Planos Alimentares</span></div>
        <div class="stat-card"><div class="stat-top"><span class="stat-num">${recentes.length}</span><span class="stat-icon" style="background:rgba(46,213,115,.15);color:var(--success)">📊</span></div><span class="stat-label">Avaliações Recentes</span></div>
      </div>

      <div class="dash-grid">
        <div class="card">
          <div class="card-header"><span class="card-title">👥 <span class="gold">Meus Clientes</span> <span class="count-badge">${clientes.length}</span></span></div>
          <div class="table-wrap">
            <div class="user-row cols4 user-header"><span>Nome</span><span>Email</span><span>Avaliações</span><span>Última Avaliação</span></div>
            ${clientes.length ? clientes.map(cl => `
              <div class="user-row cols4">
                <span><strong>${esc(cl.nome)}</strong></span>
                <span style="color:var(--text-sec)">${esc(cl.email)}</span>
                <span><span class="tag tag-objetivo">${cl.total_avaliacoes}</span></span>
                <span style="font-size:.78rem;color:var(--text-muted)">${cl.ultima_avaliacao ? new Date(cl.ultima_avaliacao + 'Z').toLocaleDateString('pt-BR') : '—'}</span>
              </div>`).join('') : '<div class="empty"><p>Nenhum cliente vinculado ainda</p></div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">📊 <span class="gold">Últimas Avaliações</span></span></div>
          <div class="access-feed">
            ${recentes.length ? recentes.map(a => `
              <div class="access-item">
                <div class="access-avatar">${esc(initials(a.client_name))}</div>
                <div class="access-info">
                  <div class="access-nome">${esc(a.client_name)}</div>
                  <div class="access-time">${objetivoLabel(a.objetivo)} • ${a.calorias_alvo} kcal • ${new Date(a.created_at + 'Z').toLocaleDateString('pt-BR')}</div>
                </div>
              </div>`).join('') : '<div class="empty"><p>Sem avaliações ainda</p></div>'}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    c.innerHTML = '<div class="card"><div class="empty"><div class="icon">⚠️</div><h3>Erro</h3><p>' + esc(err.message) + '</p></div></div>';
  }
}

async function carregarAcessos(primeiro) {
  const feed = document.getElementById('accessFeed');
  if (!feed) return;
  try {
    const acessos = await req('/admin/acessos');
    const novos = acessos.filter(a => !acessosVistos[a.id]);
    acessos.forEach(a => { acessosVistos[a.id] = true; });
    if (novos.length && !primeiro) {
      const evtLabel = { login: 'entrou', register: 'criou conta', acesso: 'acessou o site' };
      for (const a of novos.slice(0, 3)) {
        toast(`🔔 ${a.nome} ${evtLabel[a.evento] || a.evento}`, 'info');
      }
    }
    const evtLabel = { login: 'login', register: 'cadastro', acesso: 'acesso' };
    feed.innerHTML = acessos.length ? acessos.slice(0, 20).map(a => `
      <div class="access-item">
        <div class="access-avatar">${esc(initials(a.nome))}</div>
        <div class="access-info">
          <div class="access-nome">${esc(a.nome)} <span class="tag tag-evento tag-evento-${esc(a.evento)}">${evtLabel[a.evento] || a.evento}</span></div>
          <div class="access-time">${new Date(a.created_at + 'Z').toLocaleString('pt-BR')} • id #${a.usuario_id}</div>
        </div>
      </div>
    `).join('') : '<div class="empty"><p>Sem acessos ainda</p></div>';
  } catch (e) { /* silencioso */ }
}

const saved = localStorage.getItem('token');
if (saved) {
  try {
    const p = JSON.parse(atob(saved.split('.')[1]));
    if (p.exp * 1000 > Date.now()) {
      state.token = saved; state.usuario = p;
      document.getElementById('app').innerHTML = '<div class="loading-page"><div class="spinner"></div><p style="color:var(--text-sec)">Carregando...</p></div>';
      initApp();
    } else { localStorage.removeItem('token'); renderLogin(); }
  } catch { localStorage.removeItem('token'); renderLogin(); }
} else { renderLogin(); }
