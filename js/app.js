// Vista del panel: estado, sesión de Google (Supabase Auth) y dibujo en el DOM.
// Todo lo que llega de las vistas pasa por esc(): los eventos los manda
// cualquiera con la llave publicable, así que no se confía en ningún texto.

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

class App {
  constructor(root) {
    this.root = root;
    let ui = {};
    try { ui = JSON.parse(localStorage.getItem(LS_UI) || '{}'); } catch (e) {}
    const q = new URLSearchParams(location.search);
    this.forceDemo = q.has('demo');
    this.captureHash();
    this.state = { section: ui.section || 'resumen', range: ui.range || 30, wide: window.innerWidth >= 900, mode: !this.forceDemo && this.session() ? 'loading' : 'demo', data: null, email: null, notice: this.hashNotice || null, updatedAt: null };
    this.cards = new Map();
    window.addEventListener('resize', () => { const w = window.innerWidth >= 900; if (w !== this.state.wide) this.setState({ wide: w }); });
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('mouseover', (e) => this.onHover(e));
    root.addEventListener('mouseout', (e) => this.onLeave(e));
    this.render();
    this.load();
  }

  setState(p) { Object.assign(this.state, p); this.render(); }
  saveUI(p) { try { localStorage.setItem(LS_UI, JSON.stringify({ section: this.state.section, range: this.state.range, ...p })); } catch (e) {} }

  captureHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get('access_token')) {
      const s = { access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_at: Date.now() / 1000 + +(h.get('expires_in') || 3600) };
      try { localStorage.setItem(LS_SESSION, JSON.stringify(s)); } catch (e) {}
      history.replaceState(null, '', location.pathname + location.search);
    } else if (h.get('error_description')) {
      this.hashNotice = 'Google: ' + h.get('error_description');
      history.replaceState(null, '', location.pathname + location.search);
    }
  }
  session() { try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); } catch (e) { return null; } }
  async token(force) {
    let s = this.session();
    if (!s) return null;
    if (force || s.expires_at - 60 < Date.now() / 1000) {
      const r = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
      if (!r.ok) { localStorage.removeItem(LS_SESSION); return null; }
      const j = await r.json();
      s = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Date.now() / 1000 + j.expires_in };
      localStorage.setItem(LS_SESSION, JSON.stringify(s));
    }
    return s.access_token;
  }

  async load() {
    if (this.forceDemo || !this.session()) { this.setState({ mode: 'demo', data: null, email: null }); return; }
    this.setState({ mode: 'loading', notice: null });
    try {
      const tk = await this.token();
      if (!tk) throw Object.assign(new Error('Sesión vencida'), { code: 401 });
      const today = limaToday();
      const jobs = [];
      DAILY.forEach((v) => jobs.push([v, 'day=gte.' + addD(today, -89) + '&order=day.asc']));
      jobs.push(['analytics_weekly_active', 'week=gte.' + monday(addD(today, -7 * 12))]);
      jobs.push(['analytics_monthly_active', 'month=gte.' + addD(today, -100)]);
      jobs.push(['analytics_onboarding_funnel', 'cohort_week=gte.' + monday(addD(today, -7 * 16))]);
      jobs.push(['analytics_retention_cohorts', 'cohort_week=gte.' + monday(addD(today, -7 * 16))]);
      FLAT.forEach((v) => jobs.push([v, '']));
      const userP = fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + tk } }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
      const failed = [];
      const res = await Promise.all(jobs.map(([v, f]) => fetchView(v, f, tk).catch((e) => { if (e.code === 401) throw e; failed.push(v); return []; })));
      const data = {};
      jobs.forEach(([v], i) => (data[v] = res[i]));
      const user = await userP;
      const empty = Object.values(data).every((r) => !r.length);
      let notice = null;
      if (failed.length === jobs.length) throw new Error('ninguna vista respondió. ¿Ya corriste agrupay_analytics_v16.sql?');
      if (failed.length) notice = 'No se pudieron leer ' + failed.length + ' vistas: ' + failed.slice(0, 4).join(', ') + (failed.length > 4 ? '…' : '');
      else if (empty) notice = await this.diagnose(tk, user);
      this.setState({ mode: 'live', data, email: user.email || 'sesión iniciada', notice, updatedAt: new Date() });
    } catch (e) {
      if (e.code === 401) localStorage.removeItem(LS_SESSION);
      this.setState({ mode: 'demo', data: null, email: null, notice: (e.code === 401 ? 'La sesión venció. Vuelve a entrar con Google.' : 'No se pudo leer Supabase: ' + e.message) + ' Mostrando datos de ejemplo.' });
    }
  }

  // Por qué llegaron vacías todas las vistas: ¿no es administrador, o sólo
  // hay eventos del simulador (canal debug, que las vistas excluyen)?
  async diagnose(tk, user) {
    const h = { apikey: SB_KEY, Authorization: 'Bearer ' + tk };
    const who = (user.email || 'tu cuenta') + (user.id ? ' (id ' + user.id + ')' : '');
    try {
      const adm = await fetch(SB_URL + '/rest/v1/rpc/analytics_is_admin', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{}' }).then((r) => (r.ok ? r.json() : null));
      if (adm === false) return who + ' no está en analytics_admins, así que las vistas le devuelven cero filas. En el editor SQL de este proyecto corre: insert into public.analytics_admins (user_id) values (\'' + (user.id || '<id>') + '\'); y toca Actualizar.';
      const inst = await fetchView('analytics_installs', 'select=channel', tk).catch(() => null);
      if (inst && !inst.length) return 'Eres administrador, pero todavía no llegó ningún evento a este proyecto. Abre un build de la app que apunte a este proyecto y espera hasta 90 s a que mande el primer lote.';
      if (inst) {
        const ch = group(inst, (x) => x.channel || 'unknown', () => 1);
        const list = [...ch.entries()].map(([k, v]) => k + ': ' + v).join(', ');
        if (inst.every((x) => x.channel === 'debug')) return 'Hay ' + inst.length + ' instalaciones, todas del simulador (canal debug), y las vistas excluyen ese canal a propósito. Prueba desde un iPhone de verdad o desde TestFlight.';
        return 'Las vistas llegaron vacías aunque hay instalaciones (' + list + '). Revisa que los eventos tengan fecha de los últimos 90 días.';
      }
    } catch (e) {}
    return 'Todas las vistas llegaron vacías. Revisa que ' + who + ' esté en analytics_admins.';
  }

  login() {
    const back = location.origin + location.pathname;
    location.href = SB_URL + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(back);
  }
  logout() {
    const s = this.session();
    if (s) fetch(SB_URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + s.access_token } }).catch(() => {});
    localStorage.removeItem(LS_SESSION);
    this.setState({ mode: 'demo', data: null, email: null, notice: null });
  }

  // ── Eventos ────────────────────────────────────────────────────────────
  onClick(e) {
    const bar = e.target.closest('[data-bar]');
    if (bar) { this.showTip(bar); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const a = el.dataset.act;
    if (a === 'go') { this.setState({ section: el.dataset.id }); this.saveUI({ section: el.dataset.id }); window.scrollTo(0, 0); }
    else if (a === 'range') { const n = +el.dataset.n; this.setState({ range: n }); this.saveUI({ range: n }); }
    else if (a === 'login') this.login();
    else if (a === 'logout') this.logout();
    else if (a === 'reload') this.load();
  }
  onHover(e) { const bar = e.target.closest('[data-bar]'); if (bar) this.showTip(bar); }
  onLeave(e) {
    const plot = e.target.closest('[data-plot]');
    if (plot && !plot.contains(e.relatedTarget)) this.clearTip(plot.closest('[data-card]'));
  }
  showTip(bar) {
    const sec = bar.closest('[data-card]');
    const card = this.cards.get(sec.dataset.card);
    if (!card) return;
    const i = +bar.dataset.bar;
    sec.querySelectorAll('[data-bar]').forEach((b, j) => { b.style.opacity = j === i ? 1 : 0.4; });
    sec.querySelector('[data-tip]').textContent = card.bars[i].tip;
  }
  clearTip(sec) {
    const card = sec && this.cards.get(sec.dataset.card);
    if (!card) return;
    sec.querySelectorAll('[data-bar]').forEach((b) => { b.style.opacity = 1; });
    sec.querySelector('[data-tip]').textContent = card.hint;
  }

  // ── Dibujo ─────────────────────────────────────────────────────────────
  render() {
    const S = this.state;
    const loading = S.mode === 'loading';
    const live = S.mode === 'live';
    // Cargando: se arma la sección con los datos de ejemplo sólo para saber la
    // forma de cada tarjeta (barras, ranking o tabla); ningún valor se muestra.
    const data = live && S.data ? S.data : this._demo || (this._demo = makeDemo());
    const today = limaToday();
    const range = S.range;
    const days = [];
    for (let i = range - 1; i >= 0; i--) days.push(addD(today, -i));
    const ctx = { D: data, today, start: days[0], days, range, tip: null, wide: S.wide, setTip: () => {}, clearTip: null };
    const sec = SECTIONS.find((s) => s.id === S.section) || SECTIONS[0];
    let built;
    let buildError = null;
    try { built = build(sec.id, ctx); } catch (e) { console.error(e); buildError = e; built = { kpis: [], cards: [] }; }
    this.cards = new Map(built.cards.map((c) => [c.id, c]));
    const t = S.updatedAt ? S.updatedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
    const status = loading ? { dot: 'var(--accent)', text: 'Cargando…' } : live ? { dot: 'var(--pos)', text: S.email + (t ? ' · ' + t : '') } : { dot: 'var(--warn)', text: 'Datos de ejemplo' };
    const footer = (live || loading ? 'En vivo desde las vistas analytics_* de Supabase.' : 'Datos de ejemplo con la misma forma que las vistas analytics_*. Entra con una cuenta de analytics_admins para ver los reales.') + ' Hora de Lima; excluye el canal debug.';
    document.title = sec.label + ' · AgruPay Analítica';

    const navBtn = (s, cls) => `<button class="${cls}${s.id === sec.id ? ' on' : ''}" data-act="go" data-id="${esc(s.id)}">${esc(s.label)}</button>`;
    const nav = (cls) => SECTIONS.map((s) => navBtn(s, cls)).join('');

    // Conserva el desplazamiento horizontal de la barra de secciones en móvil.
    const pills = this.root.querySelector('.pills');
    const pillsX = pills ? pills.scrollLeft : 0;

    this.root.innerHTML = `
      ${S.wide ? `<aside class="side">
        <div class="brand"><div class="brand-name">AgruPay</div><div class="brand-sub">Analítica de uso</div></div>
        <nav class="side-nav">${nav('side-btn')}</nav>
        <div class="side-foot">Hora de Lima · semana desde el lunes · sin canal debug</div>
      </aside>` : ''}
      <main class="main">
        ${!S.wide ? `<div class="topbar">
          <div class="topbar-brand"><span class="brand-name sm">AgruPay</span><span class="brand-sub">Analítica</span></div>
          <div class="pills">${nav('pill')}</div>
        </div>` : ''}
        <div class="content">
          <div class="head">
            <div class="head-text"><h1>${esc(sec.label)}</h1><div class="desc">${esc(sec.desc)}</div></div>
            <div class="controls">
              ${!sec.fixed ? `<div class="seg">${[7, 30, 90].map((n) => `<button class="${n === range ? 'on' : ''}" data-act="range" data-n="${n}">${n} días</button>`).join('')}</div>` : ''}
              <div class="status"><span class="dot" style="background:${status.dot}"></span><span class="status-text">${esc(status.text)}</span></div>
              ${S.mode === 'demo' && !this.forceDemo ? `<button class="btn primary" data-act="login">Entrar con Google</button>` : ''}
              ${live || loading ? `<button class="btn" data-act="reload"${loading ? ' disabled' : ''}>Actualizar</button><button class="btn muted" data-act="logout">Salir</button>` : ''}
            </div>
          </div>
          ${S.notice ? `<div class="notice">${esc(S.notice)}</div>` : ''}
          ${buildError ? `<div class="notice">No se pudo armar esta sección: ${esc(buildError.message)}</div>` : ''}
          <div class="kpis"${loading ? ' aria-busy="true"' : ''}>${built.kpis.map(loading ? renderKpiSkeleton : renderKpi).join('')}</div>
          <div class="cards"${loading ? ' aria-busy="true"' : ''}>${built.cards.map(loading ? renderCardSkeleton : renderCard).join('')}</div>
          <div class="footer">${esc(footer)}</div>
        </div>
      </main>`;

    const np = this.root.querySelector('.pills');
    if (np) {
      np.scrollLeft = pillsX;
      const on = np.querySelector('.on');
      if (on && (on.offsetLeft < np.scrollLeft || on.offsetLeft + on.offsetWidth > np.scrollLeft + np.clientWidth)) np.scrollLeft = on.offsetLeft - 16;
    }
  }
}

function renderKpi(k) {
  return `<div class="kpi"><div class="kpi-label">${esc(k.label)}</div><div class="kpi-value" style="color:${esc(k.color)}">${esc(k.value)}</div><div class="kpi-sub">${esc(k.sub)}</div></div>`;
}

// Esqueletos: el título y la descripción son fijos de la sección; los valores
// se reemplazan por bloques con brillo.
function renderKpiSkeleton(k) {
  return `<div class="kpi"><div class="kpi-label">${esc(k.label)}</div><div class="sk sk-value"></div><div class="sk sk-line" style="width:60%"></div></div>`;
}

function renderCardSkeleton(c) {
  let body;
  if (c.isBars) {
    const n = Math.min(c.bars.length, 30);
    body = `<div class="chart"><div class="sk sk-line" style="width:45%"></div><div class="plot sk-plot">${Array.from({ length: n }, (_, i) => `<div class="sk sk-bar" style="height:${35 + 45 * Math.abs(Math.sin(i * 0.7))}%"></div>`).join('')}</div></div>`;
  } else if (c.isTable) {
    body = `<div class="sk-rows">${Array.from({ length: Math.min(Math.max(c.trs.length, 3), 6) }, () => `<div class="sk sk-line"></div>`).join('')}</div>`;
  } else {
    body = `<div class="rank">${Array.from({ length: Math.min(Math.max(c.rows.length, 3), 6) }, (_, i) => `<div class="rrow"><div class="sk sk-line" style="width:${70 - i * 7}%"></div><div class="sk sk-track"></div></div>`).join('')}</div>`;
  }
  return `<section class="card" style="grid-column:${esc(c.span)}">
    <div class="card-head"><div class="card-titles"><div class="card-title">${esc(c.title)}</div><div class="card-sub">${esc(c.sub)}</div></div></div>
    ${body}
  </section>`;
}

function renderCard(c) {
  let body = '';
  if (c.empty) body = `<div class="empty">Sin datos en este rango</div>`;
  else if (c.isBars) {
    body = `<div class="chart">
      <div class="tip" data-tip>${esc(c.tip)}</div>
      <div class="plot" data-plot style="gap:${esc(c.gap)}">${c.bars.map((b, i) => `<div class="bar" data-bar="${i}"><div class="stack" style="height:${esc(b.h)}">${b.segs.map((s) => `<div style="flex:${+s.f};background:${esc(s.c)}"></div>`).join('')}</div></div>`).join('')}</div>
      <div class="axis">${c.axis.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
      ${c.legend.length ? `<div class="legend">${c.legend.map((l) => `<div><span class="sw" style="background:${esc(l.c)}"></span><span>${esc(l.label)}</span></div>`).join('')}</div>` : ''}
    </div>`;
  } else if (c.isRank) {
    body = `<div class="rank">${c.rows.map((r) => `<div class="rrow">
      <div class="rhead"><span class="rlabel">${esc(r.label)}</span><span class="rval"><span class="rnote">${esc(r.note)}</span><span class="rnum" style="color:${esc(r.tone)}">${esc(r.value)}</span></span></div>
      <div class="track"><div style="width:${esc(r.w)};background:${esc(r.c)}"></div></div>
    </div>`).join('')}</div>`;
  } else if (c.isTable) {
    body = `<div class="tscroll"><div class="table" style="min-width:${esc(c.minW)}">
      <div class="tr th" style="grid-template-columns:${esc(c.grid)}">${c.cols.map((x) => `<div style="text-align:${esc(x.align)}">${esc(x.label)}</div>`).join('')}</div>
      ${c.trs.map((tr) => `<div class="tr" style="grid-template-columns:${esc(tr.grid)}">${tr.cells.map((td) => `<div style="text-align:${esc(td.align)};color:${esc(td.color)};font-weight:${+td.fw || 400}">${esc(td.v)}</div>`).join('')}</div>`).join('')}
    </div></div>`;
  }
  return `<section class="card" data-card="${esc(c.id)}" style="grid-column:${esc(c.span)}">
    <div class="card-head"><div class="card-titles"><div class="card-title">${esc(c.title)}</div><div class="card-sub">${esc(c.sub)}</div></div><div class="card-meta">${esc(c.meta)}</div></div>
    ${body}
  </section>`;
}

new App(document.getElementById('app'));
