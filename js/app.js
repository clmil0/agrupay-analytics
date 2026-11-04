// Vista del panel: estado, sesión de Google (Supabase Auth) y dibujo en el DOM.
// Todo lo que llega de las vistas pasa por esc(): los eventos los manda
// cualquiera con la llave publicable, así que no se confía en ningún texto.

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Íconos de trazo en 24 × 24.
const IC = {
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  store: 'M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  chart: 'M12 20V10M18 20V4M6 20v-4',
  arrow: 'M7 17L17 7M7 7h10v10',
  close: 'M18 6L6 18M6 6l12 12',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};
const svg = (k, s) => `<svg width="${s || 18}" height="${s || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[k]}"></path></svg>`;
// Ícono de cada KPI según su etiqueta.
const kIcon = (l) =>
  /crash|cuelg|error|fallid|revoc|sin monto|sin reconocer|deshecho|sin usar/i.test(l) ? 'alert'
  : /instal/i.test(l) ? 'download'
  : /arranque|latencia|minut|tiempo/i.test(l) ? 'clock'
  : /correo|gmail/i.test(l) ? 'mail'
  : /\bpro\b|paywall|prueba/i.test(l) ? 'star'
  : /regla|clasific|sugerenc|pendiente/i.test(l) ? 'tag'
  : /comercio|pagos/i.test(l) ? 'store'
  : /versi/i.test(l) ? 'layers'
  : /retenci|onboarding|conversi|precisi|confirm|respond|puntaje|cuotas|hipótesis|14 días/i.test(l) ? 'target'
  : /dau|wau|mau|activos|persona|sesion|visita|tester/i.test(l) ? 'users'
  : 'chart';

class App {
  constructor(root) {
    this.root = root;
    let ui = {};
    try { ui = JSON.parse(localStorage.getItem(LS_UI) || '{}'); } catch (e) {}
    const q = new URLSearchParams(location.search);
    this.forceDemo = q.has('demo');
    this.captureHash();
    this.state = { section: SECTIONS.some((s) => s.id === ui.section) || ui.section === 'mas' ? ui.section : 'resumen', range: ui.range || 30, from: ui.from || null, to: ui.to || null, aud: ui.aud || 'all', by: ui.by || 'persona', cohort: ui.cohort || '', wide: window.innerWidth >= 900, mode: !this.forceDemo && this.session() ? 'loading' : 'demo', data: null, email: null, notice: this.hashNotice || null, updatedAt: null, demoChosen: !!ui.demo };
    this.cards = new Map();
    this.sheet = false;
    this.detail = null;
    this.editing = null;
    this.animKey = null;
    window.addEventListener('resize', () => { const w = window.innerWidth >= 900; if (w !== this.state.wide) this.setState({ wide: w }); });
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
    document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (this.editing) this.editTester(null); else if (this.detail) this.openDetail(null); });
    root.addEventListener('change', (e) => this.onChange(e));
    root.addEventListener('input', (e) => { if (e.target.matches('[data-q]')) { rosterQ = e.target.value; this.paintRoster(); } });
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('mouseover', (e) => this.onHover(e));
    root.addEventListener('mousemove', (e) => this.onMove(e));
    root.addEventListener('mouseout', (e) => this.onLeave(e));
    root.addEventListener('pointerdown', (e) => this.onPointer(e, 'down'));
    root.addEventListener('pointermove', (e) => this.onPointer(e, 'move'));
    root.addEventListener('pointerup', () => { this.drag = null; });
    root.addEventListener('pointercancel', () => { this.drag = null; });
    this.render();
    this.load();
  }

  setState(p) { Object.assign(this.state, p); this.render(); }
  saveUI(p) { const S = this.state; try { localStorage.setItem(LS_UI, JSON.stringify({ section: S.section, range: S.range, from: S.from, to: S.to, aud: S.aud, by: S.by, cohort: S.cohort, demo: S.demoChosen, ...p })); } catch (e) {} }
  // Los datos que se dibujan: los de Supabase o, sin sesión, los de ejemplo.
  data() { const S = this.state; return S.mode === 'live' && S.data ? S.data : this._demo || (this._demo = makeDemo()); }
  // Primer y último día del rango. Con «Fechas», dentro de los 90 días cargados.
  span() {
    const S = this.state, today = limaToday(), lo = addD(today, -89);
    if (S.range !== 'custom') return { from: addD(today, -(+S.range - 1)), to: today };
    const c = (d, f) => (d && /^\d{4}-\d\d-\d\d$/.test(d) ? (d < lo ? lo : d > today ? today : d) : f);
    let to = c(S.to, today), from = c(S.from, addD(to, -13));
    if (from > to) [from, to] = [to, from];
    return { from, to };
  }

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
      const aud = this.state.aud;
      // [vista, filtro, audiencia]: las de personas (v22) van sin audiencia.
      const jobs = [];
      DAILY.forEach((v) => jobs.push([v, 'day=gte.' + addD(today, -89) + '&order=day.asc', aud]));
      jobs.push(['analytics_weekly_active', 'week=gte.' + monday(addD(today, -7 * 12)), aud]);
      jobs.push(['analytics_monthly_active', 'month=gte.' + addD(today, -100), aud]);
      jobs.push(['analytics_onboarding_funnel', 'cohort_week=gte.' + monday(addD(today, -7 * 16)), aud]);
      jobs.push(['analytics_retention_cohorts', 'cohort_week=gte.' + monday(addD(today, -7 * 16)), aud]);
      FLAT.forEach((v) => jobs.push([v, '', aud]));
      jobs.push(['analytics_install_daily', 'day=gte.' + addD(today, -89) + '&order=day.asc']);
      jobs.push(['analytics_install_profile', '']);
      jobs.push(['analytics_testers', '']);
      const userP = fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + tk } }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
      const failed = [];
      const res = await Promise.all(jobs.map(([v, f, a]) => fetchView(v, f, tk, a).catch((e) => { if (e.code === 401) throw e; failed.push(v); return []; })));
      const data = {};
      jobs.forEach(([v], i) => (data[v] = res[i]));
      const user = await userP;
      const empty = jobs.every(([v], i) => V22.includes(v) || !res[i].length);
      if (failed.length === jobs.length) throw new Error('ninguna vista respondió. ¿Ya corriste agrupay_analytics_v16.sql?');
      const miss21 = failed.filter((v) => V21.includes(v)), miss22 = failed.filter((v) => V22.includes(v)), other = failed.filter((v) => !V21.includes(v) && !V22.includes(v));
      const parts = [];
      if (other.length) parts.push('No se pudieron leer ' + other.length + ' vistas: ' + other.slice(0, 4).join(', ') + (other.length > 4 ? '…' : '') + '.');
      if (miss21.length) parts.push('Faltan las vistas de comercios, hoja de clasificar y suscripciones (' + miss21.length + '). Corre agrupay_analytics_v21_merchants.sql en este proyecto y toca Actualizar.');
      if (miss22.length) parts.push('Faltan las vistas de testers e hipótesis: corre sql/altanto_analytics_v22_testers.sql (está en este repo) y toca Actualizar.' + (aud !== 'all' ? ' Sin ella, el filtro Testers / No testers no separa nada.' : ''));
      let notice = parts.join(' ') || null;
      if (!notice && empty) notice = aud !== 'all' ? 'Ninguna vista trae datos para «' + lab('aud', aud) + '». ¿Ya marcaste a los testers en la sección Testers?' : await this.diagnose(tk, user);
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
    this.sheet = false;
    this.setState({ mode: 'demo', data: null, email: null, notice: null, demoChosen: false });
    this.saveUI({ demo: false });
  }

  // ── Eventos ────────────────────────────────────────────────────────────
  onClick(e) {
    const bar = e.target.closest('[data-bar]');
    if (bar) { this.showTip(bar); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const a = el.dataset.act;
    if (a === 'go') this.go(el.dataset.id);
    else if (a === 'tab') {
      // Tocar la pestaña en la que ya estás sube al inicio (o vuelve a la lista de «Más»).
      const id = el.dataset.id;
      if (id === this.tab()) { if (id === 'mas' && this.state.section !== 'mas') this.go('mas'); else window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else this.go(id);
    }
    else if (a === 'range') { const n = el.dataset.n === 'custom' ? 'custom' : +el.dataset.n; const p = { range: n }; if (n === 'custom' && !this.state.from) Object.assign(p, this.span(), { range: 'custom' }); this.setState(p); this.saveUI(); }
    else if (a === 'aud') { if (el.dataset.n === this.state.aud) return; this.setState({ aud: el.dataset.n }); this.saveUI(); if (this.state.mode !== 'demo') this.load(); }
    else if (a === 'by') { this.setState({ by: el.dataset.n }); this.saveUI(); }
    else if (a === 't-toggle') { const p = people(this.data()).find((x) => x.id === el.dataset.id); if (p) this.saveTesters([{ install_id: p.id, is_tester: !p.tester }]); }
    else if (a === 'mark-tf') {
      const rows = people(this.data()).filter((p) => p.channel === 'testflight' && !p.tester).map((p) => ({ install_id: p.id, is_tester: true }));
      if (rows.length && window.confirm('¿Marcar como testers las ' + rows.length + ' instalaciones de TestFlight que faltan?')) this.saveTesters(rows);
    }
    else if (a === 't-edit') this.editTester(el.dataset.id);
    else if (a === 't-close') this.editTester(null);
    else if (a === 't-save') { const f = this.root.querySelector('[data-form]'); if (f && f.reportValidity()) this.saveTesters([this.collectTester(f)]).then((ok) => { if (ok) this.editTester(null); }); }
    else if (a === 'detail') this.openDetail(el.dataset.id);
    else if (a === 'close') this.openDetail(null);
    else if (a === 'login') this.login();
    else if (a === 'logout') this.logout();
    else if (a === 'reload') { this.setSheet(false); this.load(); }
    else if (a === 'demo') { this.setState({ demoChosen: true }); this.saveUI({ demo: true }); }
    else if (a === 'sheet') this.setSheet(el.dataset.open === '1');
    else if (a === 'tipclear') this.clearTip(el.closest('[data-card]'));
  }
  onChange(e) {
    const k = e.target.dataset.ch;
    if (k === 'from' || k === 'to') { this.setState({ [k]: e.target.value || null, range: 'custom' }); this.saveUI(); }
    else if (k === 'cohort') { this.setState({ cohort: e.target.value }); this.saveUI(); }
  }
  go(id) { this.detail = null; window.scrollTo(0, 0); this.setState({ section: id }); this.saveUI({ section: id }); }

  // ── Testers ────────────────────────────────────────────────────────────
  editTester(id) { this.editing = id; this.paintDetail(true); }
  // La lista de instalaciones se rehace sola al buscar, sin perder el foco del buscador.
  paintRoster() {
    const host = this.root.querySelector('[data-rlist]');
    const c = this.cards.get('roster');
    if (host && c) host.innerHTML = rosterList(c);
  }
  collectTester(form) {
    const f = new FormData(form);
    const txt = (k) => { const v = String(f.get(k) == null ? '' : f.get(k)).trim(); return v || null; };
    const nm = (k) => { const v = txt(k); return v == null || isNaN(+v) ? null : +v; };
    const row = { install_id: this.editing, alias: txt('alias') || '', is_tester: f.get('is_tester') === 'on', test_start: txt('test_start'), age: nm('age') == null ? null : Math.round(nm('age')) };
    ['cohort', 'gender', 'iphone', 'persona', 'notes', 's_tool_before', 's_tool_after', 's_pay', 's_fatal'].forEach((k) => (row[k] = txt(k)));
    ['s_min_before', 's_min_after', 's_pay_amount'].forEach((k) => (row[k] = nm(k)));
    ['s_matches', 's_replaced', 's_recommended'].forEach((k) => { const v = txt(k); row[k] = v == null ? null : v === 'true'; });
    row.updated_at = new Date().toISOString();
    return row;
  }
  // Guarda en analytics_testers (o, con los datos de ejemplo, sólo en memoria).
  async saveTesters(rows) {
    const S = this.state;
    if (!rows.length || S.mode === 'loading') return false;
    const D = this.data();
    let saved = rows;
    if (S.mode === 'live') {
      try { saved = await upsertTesters(rows, await this.token()); }
      catch (e) { this.setState({ notice: 'No se guardó: ' + e.message }); return false; }
    }
    const list = D.analytics_testers || (D.analytics_testers = []);
    saved.forEach((r) => { const t = list.find((x) => x.install_id === r.install_id); if (t) Object.assign(t, r); else list.push(Object.assign({ alias: '', is_tester: true }, r)); });
    delete D._people;
    this.setState({ notice: S.mode !== 'live' ? 'Con los datos de ejemplo los cambios no se guardan: se pierden al recargar.' : S.aud !== 'all' ? 'Guardado. Toca Actualizar para que las demás secciones cuenten a esta persona en su audiencia.' : null });
    return true;
  }
  // Pestaña activa en móvil: las cuatro principales o «Más» para el resto.
  tab() { const id = this.state.section; return MAIN_TABS.includes(id) ? id : 'mas'; }
  // La hoja de cuenta se abre y cierra sin volver a dibujar, para que se anime.
  setSheet(open) {
    this.sheet = open;
    this.root.querySelectorAll('.m-sheet, .m-backdrop').forEach((x) => x.classList.toggle('open', open));
  }
  // El detalle se dibuja aparte, sin rehacer la página (que repetiría las animaciones).
  openDetail(id) { this.detail = id; this.paintDetail(true); }
  paintDetail(anim) {
    const host = this.root.querySelector('[data-dlg]');
    if (this.editing && host) {
      const D = this.data(), all = people(D);
      const p = all.find((x) => x.id === this.editing);
      if (p) {
        document.documentElement.classList.add('noscroll');
        const opts = (k) => [...new Set(all.map((x) => x[k]).filter(Boolean))].sort();
        host.innerHTML = renderEditor(p, { cohort: opts('cohort'), persona: opts('persona') }, anim);
        if (anim) { const i = host.querySelector('input[name="alias"]'); if (i) i.focus({ preventScroll: true }); }
        return;
      }
      this.editing = null;
    }
    const c = this.detail ? this.cards.get(this.detail) : null;
    if (!c) this.detail = null;
    document.documentElement.classList.toggle('noscroll', !!c);
    if (host) host.innerHTML = c ? renderDetail(c, !this.state.wide, anim) : '';
    if (c && anim) { const b = host.querySelector('.dlg .icon-btn'); if (b) b.focus({ preventScroll: true }); }
  }
  onScroll() {
    const nav = this.root.querySelector('.m-nav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
  }
  // Móvil: tocar o deslizar el dedo sobre las barras o el área recorre el detalle.
  // touch-action: pan-y deja el desplazamiento vertical a la página.
  onPointer(e, kind) {
    if (this.state.wide) return;
    if (kind === 'down') {
      const plot = e.target.closest('[data-plot],[data-area]');
      if (!plot) return;
      try { plot.setPointerCapture(e.pointerId); } catch (_) {}
      this.drag = plot;
    }
    const p = this.drag;
    if (!p) return;
    if (p.hasAttribute('data-area')) { this.areaAt(p, e.clientX); return; }
    const r = p.getBoundingClientRect();
    const n = p.children.length;
    const i = Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n)));
    if (p.children[i]) this.showTip(p.children[i]);
  }
  onHover(e) { const bar = e.target.closest('[data-bar]'); if (bar) this.showTip(bar); }
  onMove(e) { if (!this.state.wide) return; const area = e.target.closest('[data-area]'); if (area) this.areaAt(area, e.clientX); }
  onLeave(e) {
    const plot = e.target.closest('[data-plot]');
    if (plot && !plot.contains(e.relatedTarget)) this.clearTip(plot.closest('[data-card]'));
    const area = e.target.closest('[data-area]');
    if (area && !area.contains(e.relatedTarget)) { const hv = area.querySelector('.hv'); if (hv) hv.classList.remove('on'); }
  }
  showTip(bar) {
    const sec = bar.closest('[data-card]');
    const card = sec && this.cards.get(sec.dataset.card);
    if (!card || !card.bars) return;
    const i = +bar.dataset.bar;
    sec.querySelectorAll('[data-bar]').forEach((b, j) => { b.style.opacity = j === i ? 1 : 0.35; });
    const tip = sec.querySelector('[data-tip]');
    tip.textContent = card.bars[i].tip;
    tip.classList.add('on');
  }
  clearTip(sec) {
    const card = sec && this.cards.get(sec.dataset.card);
    if (!card || !card.bars) return;
    sec.querySelectorAll('[data-bar]').forEach((b) => { b.style.opacity = 1; });
    const tip = sec.querySelector('[data-tip]');
    tip.textContent = card.hint;
    tip.classList.remove('on');
  }
  // Gráfico de área: línea vertical, un punto por serie y la etiqueta oscura con el valor.
  areaAt(el, x) {
    const sec = el.closest('[data-card]');
    const c = sec && this.cards.get(sec.dataset.card);
    if (!c || !c.pts) return;
    const r = el.getBoundingClientRect();
    const i = Math.max(0, Math.min(c.n - 1, Math.round(((x - r.left) / r.width) * (c.n - 1))));
    const p = c.pts[i];
    const hv = el.querySelector('.hv');
    hv.classList.add('on');
    hv.style.setProperty('--x', p.x + '%');
    hv.querySelectorAll('.hv-dot').forEach((d, j) => { d.style.top = p.ys[j] + '%'; });
    const t = c.tips[i];
    const k = t.indexOf(' · ');
    const tip = hv.querySelector('.hv-tip');
    tip.querySelector('small').textContent = k < 0 ? '' : t.slice(0, k);
    tip.querySelector('b').textContent = k < 0 ? t : t.slice(k + 3);
    const y = Math.min(...p.ys);
    tip.style.top = y + '%';
    tip.style.transform = 'translate(' + (p.x < 14 ? -6 : p.x > 86 ? -94 : -50) + '%,' + (y > 20 ? 'calc(-100% - 14px)' : '14px') + ')';
  }

  // ── Dibujo ─────────────────────────────────────────────────────────────
  // Arma la sección con los datos en vivo (o los de ejemplo) para el rango elegido.
  view(sec) {
    const S = this.state;
    const loading = S.mode === 'loading';
    const live = S.mode === 'live';
    // Cargando: se arma la sección con los datos de ejemplo sólo para saber la
    // forma de cada tarjeta (barras, ranking o tabla); ningún valor se muestra.
    const data = this.data();
    const today = limaToday();
    const range = S.range;
    const { from, to } = this.span();
    const days = [];
    for (let d = from; d <= to; d = addD(d, 1)) days.push(d);
    const ctx = { D: data, today, start: from, end: to, days, range: days.length, wide: S.wide, aud: S.aud, by: S.by, cohort: S.cohort };
    let built;
    let buildError = null;
    try { built = build(sec.id, ctx); } catch (e) { console.error(e); buildError = e; built = { kpis: [], cards: [] }; }
    this.cards = new Map(built.cards.map((c) => [c.id, c]));
    const t = S.updatedAt ? S.updatedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
    const status = loading ? { dot: 'var(--c-blue)', text: 'Cargando…' } : live ? { dot: 'var(--pos)', text: S.email + (t ? ' · ' + t : '') } : { dot: 'var(--c-orange)', text: 'Datos de ejemplo' };
    const footer = (live || loading ? 'En vivo desde las vistas analytics_* de Supabase.' : 'Datos de ejemplo con la misma forma que las vistas analytics_*. Entra con una cuenta de analytics_admins para ver los reales.') + ' Audiencia: ' + lab('aud', S.aud) + '. Hora de Lima; excluye el canal debug.';
    // Con los datos de ejemplo sólo las secciones por persona cambian con la audiencia.
    const audNote = !live && !loading && S.aud !== 'all' && !PEOPLE_SECTIONS.includes(sec.id) ? 'Con los datos de ejemplo, el filtro Testers / No testers sólo cambia Hipótesis y Testers. Con datos reales filtra todas las secciones.' : null;
    // Las animaciones de entrada sólo corren al cambiar de sección, rango, audiencia o datos.
    const key = [sec.id, from, to, S.aud, S.mode, S.wide].join('|');
    const enter = key !== this.animKey;
    this.animKey = key;
    return { loading, live, range, built, buildError, status, footer, enter, audNote };
  }

  // Audiencia, rango (con «Fechas») y, en las secciones por persona, desglose y grupo.
  controls(sec, mobile) {
    const S = this.state, today = limaToday();
    const seg = (act, opts, cur) => `<div class="${mobile ? 'm-seg' : 'seg'}"${mobile ? ` style="grid-template-columns:repeat(${opts.length},1fr)"` : ''}>${opts.map(([v, l]) => `<button class="${String(v) === String(cur) ? 'on' : ''}" data-act="${act}" data-n="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
    const out = [seg('aud', Object.entries(LBL.aud), S.aud)];
    if (!sec.fixed) {
      out.push(seg('range', mobile ? [[1, 'Hoy'], [7, '7 d'], [30, '30 d'], [90, '90 d'], ['custom', 'Fechas']] : [[1, 'Hoy'], [7, '7 días'], [30, '30 días'], [90, '90 días'], ['custom', 'Fechas']], S.range));
      if (S.range === 'custom') {
        const { from, to } = this.span(), lo = addD(today, -89);
        out.push(`<div class="dates"><label><span>Desde</span><input type="date" data-ch="from" value="${esc(from)}" min="${lo}" max="${today}"></label><label><span>Hasta</span><input type="date" data-ch="to" value="${esc(to)}" min="${lo}" max="${today}"></label></div>`);
      }
    }
    if (sec.id === 'hipotesis') out.push(seg('by', Object.entries(LBL.by), S.by));
    const cohorts = [...new Set((this.data().analytics_testers || []).map((t) => t.cohort).filter(Boolean))].sort();
    if (PEOPLE_SECTIONS.includes(sec.id) && cohorts.length) out.push(`<select class="sel" data-ch="cohort" aria-label="Grupo de prueba"><option value="">Todos los grupos</option>${cohorts.map((c) => `<option${c === S.cohort ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>`);
    return out.join('');
  }

  render() {
    if (this.state.mode === 'loading') this.detail = null;
    this.root.className = this.state.wide ? 'app' : 'app m';
    if (this.state.wide) this.renderDesktop(); else this.renderMobile();
    this.paintDetail(false);
  }

  renderDesktop() {
    const S = this.state;
    const sec = SECTIONS.find((s) => s.id === S.section) || SECTIONS[0];
    const { loading, live, built, buildError, status, footer, enter, audNote } = this.view(sec);
    document.title = sec.label + ' · AlTanto Analytics';
    const nav = SECTIONS.map((s) => `<button class="${s.id === sec.id ? 'on' : ''}" data-act="go" data-id="${esc(s.id)}">${esc(s.label)}</button>`).join('');
    const who = live && S.email ? S.email.trim()[0].toUpperCase() : '';

    this.root.innerHTML = `
      <div class="shell${enter ? ' enter' : ''}">
        <header class="top anim" style="--i:0">
          <div class="brand"><img class="logo" src="icons/icon-192.png" alt=""><div class="brand-name">AlTanto<span>Analytics</span></div></div>
          <div class="top-right">
            <div class="status-pill" title="${esc(status.text)}"><span class="dot" style="background:${status.dot}"></span><span class="status-text">${esc(status.text)}</span></div>
            ${S.mode === 'demo' && !this.forceDemo ? `<button class="pill primary" data-act="login">Entrar con Google</button>` : ''}
            ${live || loading ? `<button class="round" data-act="reload" title="Actualizar" aria-label="Actualizar"${loading ? ' disabled' : ''}>${svg('refresh', 17)}</button><button class="round" data-act="logout" title="Salir" aria-label="Salir">${svg('logout', 17)}</button>` : ''}
            ${who ? `<div class="avatar" title="${esc(S.email)}">${esc(who)}</div>` : ''}
          </div>
        </header>
        <nav class="tabs anim" style="--i:1">${nav}</nav>
        <section class="hero anim" style="--i:2">
          <div class="hero-text"><h1>${esc(sec.label)}</h1><div class="desc">${esc(sec.desc)}</div></div>
          <div class="hero-ctl">${this.controls(sec, false)}</div>
        </section>
        ${S.notice ? `<div class="notice">${esc(S.notice)}</div>` : ''}
        ${audNote ? `<div class="notice">${esc(audNote)}</div>` : ''}
        ${buildError ? `<div class="notice">No se pudo armar esta sección: ${esc(buildError.message)}</div>` : ''}
        <section class="kpis"${loading ? ' aria-busy="true"' : ''}>${built.kpis.map((k, i) => (loading ? renderKpiSkeleton(k, i + 3) : renderKpi(k, i + 3))).join('')}</section>
        <section class="grid"${loading ? ' aria-busy="true"' : ''}>${built.cards.map((c, i) => (loading ? renderCardSkeleton(c, i + 6) : renderCard(c, false, i + 6))).join('')}</section>
        <div class="footer">${esc(footer)}</div>
      </div>
      <div data-dlg></div>`;
    if (enter) { const on = this.root.querySelector('.tabs .on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }

  // ── Móvil (< 900 px): app de iPhone con barra de pestañas ──────────────
  renderMobile() {
    const S = this.state;
    if (S.mode === 'demo' && !this.forceDemo && !S.demoChosen) {
      document.title = 'AlTanto Analytics';
      this.root.innerHTML = `<div class="m-login">
        <div class="m-login-hero">
          <img class="m-logo" src="icons/icon-512.png" alt="">
          <div class="m-login-titles"><div class="m-login-name">AlTanto</div><div class="m-login-sub">Analytics</div></div>
        </div>
        <div class="m-login-actions">
          ${S.notice ? `<div class="notice">${esc(S.notice)}</div>` : ''}
          <button class="m-btn primary" data-act="login">Entrar con Google</button>
          <button class="m-btn link" data-act="demo">Ver datos de ejemplo</button>
          <div class="m-login-note">Los datos reales necesitan una cuenta en analytics_admins.</div>
        </div>
      </div><div data-dlg></div>`;
      return;
    }

    const sec = SECTIONS.find((s) => s.id === S.section) || null;
    const tab = this.tab();
    const { loading, live, built, buildError, status, footer, enter, audNote } = this.view(sec || SECTIONS[0]);
    const short = loading ? 'Cargando' : live ? 'En vivo' : 'Ejemplo';
    const dot = (c) => `<span class="dot" style="background:${c}"></span>`;
    const chev = '<span class="m-chev"></span>';
    document.title = (sec ? sec.label : 'Más') + ' · AlTanto Analytics';

    let body;
    if (sec) {
      body = `<div class="m-head anim" style="--i:0"><h1>${esc(sec.label)}</h1><div class="desc">${esc(sec.desc)}</div></div>
        <div class="m-pad m-ctl anim" style="--i:1">${this.controls(sec, true)}</div>
        ${S.notice ? `<div class="m-pad"><div class="notice">${esc(S.notice)}</div></div>` : ''}
        ${audNote ? `<div class="m-pad"><div class="notice">${esc(audNote)}</div></div>` : ''}
        ${buildError ? `<div class="m-pad"><div class="notice">No se pudo armar esta sección: ${esc(buildError.message)}</div></div>` : ''}
        <div class="kpis m-pad"${loading ? ' aria-busy="true"' : ''}>${built.kpis.map((k, i) => (loading ? renderKpiSkeleton(k, i + 2) : renderKpi(k, i + 2))).join('')}</div>
        <div class="grid m-pad"${loading ? ' aria-busy="true"' : ''}>${built.cards.map((c, i) => (loading ? renderCardSkeleton(c, i + 4) : renderCard(c, true, i + 4))).join('')}</div>
        <div class="footer m-pad">${esc(footer)}</div>`;
    } else {
      const PAL = ['#d6451b', '#2b4f9e', '#17171a', '#2f6b55', '#c99a12'];
      const more = SECTIONS.filter((s) => !MAIN_TABS.includes(s.id));
      body = `<div class="m-head anim" style="--i:0"><h1>Más</h1></div>
        ${S.notice ? `<div class="m-pad"><div class="notice">${esc(S.notice)}</div></div>` : ''}
        <div class="m-group anim" style="--i:1">${more.map((s, i) => `<button class="m-row" data-act="go" data-id="${esc(s.id)}">
          <span class="m-badge" style="background:${PAL[i % PAL.length]}">${esc(s.label[0])}</span>
          <span class="m-row-text"><span class="m-row-title">${esc(s.label)}</span><span class="m-row-sub">${esc(s.desc)}</span></span>${chev}
        </button>`).join('')}</div>
        <div class="m-group anim" style="--i:2"><button class="m-row m-account" data-act="sheet" data-open="1">${dot(status.dot)}<span class="m-row-title grow">${esc(status.text)}</span><span class="m-row-aside">Cuenta</span>${chev}</button></div>
        <div class="m-foot">Hora de Lima · semana desde el lunes · sin canal debug</div>`;
    }

    const tabs = [
      ['resumen', 'Resumen', '<span class="ic-bars"><i></i><i></i><i></i></span>'],
      ['hipotesis', 'Hipótesis', '<span class="ic-target"><i></i></span>'],
      ['testers', 'Testers', '<span class="ic-users"><i></i><i></i></span>'],
      ['activacion', 'Activación', '<span class="ic-grid"><i></i><i></i><i></i><i></i></span>'],
      ['mas', 'Más', '<span class="ic-dots"><i></i><i></i><i></i></span>'],
    ];

    this.root.innerHTML = `
      <main class="m-scroll${enter ? ' enter' : ''}">${body}</main>
      <header class="m-nav${window.scrollY > 30 ? ' scrolled' : ''}">
        <div class="m-nav-row">
          <div>${tab === 'mas' && sec ? `<button class="m-back" data-act="go" data-id="mas"><span></span>Más</button>` : ''}</div>
          <div class="m-nav-title">${esc(sec ? sec.label : 'Más')}</div>
          <div class="m-nav-right"><button class="m-chip" data-act="sheet" data-open="1">${dot(status.dot)}${short}</button></div>
        </div>
      </header>
      <nav class="m-tabs">${tabs.map(([id, label, ic]) => `<button class="${id === tab ? 'on' : ''}" data-act="tab" data-id="${id}" aria-label="${label}">${ic}${label}</button>`).join('')}</nav>
      <div class="m-backdrop${this.sheet ? ' open' : ''}" data-act="sheet" data-open="0"></div>
      <div class="m-sheet${this.sheet ? ' open' : ''}" role="dialog" aria-label="Cuenta">
        <div class="m-grabber"></div>
        <div class="m-sheet-head"><div class="m-sheet-title">Cuenta</div><button class="m-done" data-act="sheet" data-open="0">Listo</button></div>
        <div class="m-status">${dot(status.dot)}<span>${esc(status.text)}</span></div>
        ${S.mode === 'demo' ? `<button class="m-btn primary" data-act="login">Entrar con Google</button>` : `<div class="m-sheet-actions"><button class="m-btn" data-act="reload"${loading ? ' disabled' : ''}>Actualizar</button><button class="m-btn danger" data-act="logout">Salir</button></div>`}
        <div class="m-sheet-foot">${esc(footer)}</div>
      </div>
      <div data-dlg></div>`;
  }
}

const MAIN_TABS = ['resumen', 'hipotesis', 'testers', 'activacion'];
// Las que se arman persona por persona (v22): cambian con la audiencia también con los datos de ejemplo.
const PEOPLE_SECTIONS = ['hipotesis', 'testers'];
let rosterQ = '';

function renderKpi(k, i) {
  return `<div class="kpi anim" style="--i:${i}"><div class="kpi-ic">${svg(kIcon(k.label), 19)}</div><div class="kpi-tx"><div class="kpi-value" style="color:${esc(k.color)}">${esc(k.value)}</div><div class="kpi-label">${esc(k.label)}</div>${k.sub ? `<div class="kpi-sub">${esc(k.sub)}</div>` : ''}</div></div>`;
}

// Esqueletos: el título de cada tarjeta es fijo de la sección; los valores
// se reemplazan por bloques con brillo de la misma forma.
function renderKpiSkeleton(k, i) {
  return `<div class="kpi anim" style="--i:${i}"><div class="kpi-ic">${svg(kIcon(k.label), 19)}</div><div class="kpi-tx"><div class="sk sk-value"></div><div class="kpi-label">${esc(k.label)}</div></div></div>`;
}

function renderCardSkeleton(c, i) {
  const t = c.type;
  const lines = (n) => `<div class="sk-rows">${Array.from({ length: n }, (_, j) => `<div class="sk sk-line" style="width:${92 - j * 9}%"></div>`).join('')}</div>`;
  let body;
  if (t === 'bars' || t === 'area') body = `<div class="plot sk-plot">${Array.from({ length: 30 }, (_, j) => `<div class="sk sk-bar" style="height:${35 + 45 * Math.abs(Math.sin(j * 0.7))}%"></div>`).join('')}</div>`;
  else if (t === 'gauge') body = `<div class="gauge"><div class="sk sk-ring"></div></div>${lines(2)}`;
  else if (t === 'tiles') body = `<div class="tiles">${Array.from({ length: Math.min(c.tiles.length, 6) }, () => `<div class="sk sk-tile"></div>`).join('')}</div>`;
  else if (t === 'rings') body = `<div class="rings">${c.rings.map(() => `<div class="ring"><div class="sk sk-circle"></div><div class="sk sk-line" style="width:70%"></div></div>`).join('')}</div>`;
  else if (t === 'mix') body = `<div class="sk sk-mix"></div>${lines(Math.min(Math.max(c.rows.length, 3), 5))}`;
  else if (t === 'table') body = lines(Math.min(Math.max(c.trs.length, 3), 6));
  else body = `<div class="rank">${Array.from({ length: Math.min(Math.max((c.rows || []).length, 3), 6) }, (_, j) => `<div class="rrow"><div class="sk sk-line" style="width:${70 - j * 7}%"></div><div class="sk sk-track"></div></div>`).join('')}</div>`;
  return `<section class="card t-${esc(t)} span-${esc(c.size)}${c.tone ? ' tone-' + esc(c.tone) : ''} anim" style="--i:${i}">
    <div class="card-head"><div class="card-titles"><div class="card-title">${esc(c.title)}</div>${c.sub ? `<div class="card-sub">${esc(c.sub)}</div>` : ''}</div></div>
    ${body}
  </section>`;
}

const hasDetail = (c) => c.type !== 'empty' && !!(c.detail || c.more > 0);

function renderCard(c, mobile, i) {
  const can = hasDetail(c);
  const open = (inner, cls) => `<button class="${cls}" data-act="detail" data-id="${esc(c.id)}">${inner}</button>`;
  return `<section class="card t-${esc(c.type)} span-${esc(c.size)}${c.tone ? ' tone-' + esc(c.tone) : ''} anim" style="--i:${i}" data-card="${esc(c.id)}">
    <div class="card-head">
      <div class="card-titles"><div class="card-title">${esc(c.title)}</div>${c.sub ? `<div class="card-sub">${esc(c.sub)}</div>` : ''}</div>
      <div class="card-tools">${c.meta ? `<span class="card-meta">${esc(c.meta)}</span>` : ''}${can ? `<button class="icon-btn" data-act="detail" data-id="${esc(c.id)}" aria-label="Ver detalle de ${esc(c.title)}" title="Ver detalle">${svg('arrow', 16)}</button>` : ''}</div>
    </div>
    ${renderBig(c)}
    ${renderBody(c, mobile, false)}
    ${can && c.more > 0 ? open(`Ver ${c.more} más ${svg('arrow', 14)}`, 'more') : ''}
  </section>`;
}

function renderBig(c) {
  return c.big && c.type !== 'empty' ? `<div class="card-big"><span>${esc(c.big)}</span>${c.bigSub ? `<em>${esc(c.bigSub)}</em>` : ''}</div>` : '';
}

// Detalle: el gráfico en grande y, debajo, la tabla completa.
function renderDetail(c, mobile, anim) {
  const isTable = c.type === 'table';
  const viz = isTable ? '' : `<div class="card dlg-viz t-${esc(c.type)}${c.tone ? ' tone-' + esc(c.tone) : ''}" data-card="${esc(c.id)}">${renderBig(c)}${renderBody(c, mobile, true)}</div>`;
  const d = isTable ? c : c.detail;
  const sec = d ? `<div class="dlg-sec">${isTable ? '' : `<div class="dlg-sec-title">${esc(c.dtitle)}</div>`}<div class="card dlg-table${isTable && c.tone ? ' tone-' + esc(c.tone) : ''}">${renderBody(d, mobile, true)}</div></div>` : '';
  return `<div class="dlg-back${anim ? ' anim-in' : ''}" data-act="close"></div>
    <div class="dlg${anim ? ' anim-in' : ''}" role="dialog" aria-modal="true" aria-label="${esc(c.title)}">
      <div class="dlg-head">
        <div class="card-titles"><div class="dlg-kicker">Detalle${c.meta ? ' · ' + esc(c.meta) : ''}</div><div class="dlg-title">${esc(c.title)}</div>${c.sub ? `<div class="card-sub">${esc(c.sub)}</div>` : ''}</div>
        <button class="icon-btn" data-act="close" aria-label="Cerrar">${svg('close', 18)}</button>
      </div>
      <div class="dlg-body">${viz}${sec}</div>
    </div>`;
}

function renderLegend(c) {
  if (!c.legend.length && !c.avgLabel) return '';
  return `<div class="legend">${c.legend.map((l) => `<div><span class="sw${l.dash ? ' dash' : ''}" style="--c:${esc(l.c)}"></span><span>${esc(l.label)}</span></div>`).join('')}${c.avgLabel ? `<div><span class="sw avg"></span><span>${esc(c.avgLabel)}</span></div>` : ''}</div>`;
}

function renderBody(c, mobile, full) {
  const t = c.type;
  if (t === 'empty') return `<div class="empty">Sin datos en este rango</div>`;

  if (t === 'bars') {
    return `<div class="chart">
      <div class="tip"${mobile ? ' data-act="tipclear"' : ''} data-tip>${esc(c.hint)}</div>
      <div class="plot${full ? ' tall' : ''}" data-plot style="gap:${esc(c.gap)}">${c.bars.map((b, i) => `<div class="bar" data-bar="${i}"><div class="stack" style="height:${esc(b.h)};--d:${Math.min(i * 14, 700)}ms">${b.segs.map((s) => `<div style="flex:${+s.f};background:${esc(s.c)}"></div>`).join('')}</div></div>`).join('')}</div>
      <div class="axis">${c.axis.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
      ${renderLegend(c)}
    </div>`;
  }

  if (t === 'area') {
    const gid = 'g-' + esc(c.id) + (full ? '-f' : '');
    const c0 = esc(c.lines[0].c);
    return `<div class="chart">
      <div class="area${full ? ' tall' : ''}"><div class="area-in" data-area>
        ${c.ticks.map((y) => `<div class="yt" style="top:${y.top}%"><span>${esc(y.label)}</span></div>`).join('')}
        <svg class="area-svg" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${c0};stop-opacity:.3"></stop><stop offset="1" style="stop-color:${c0};stop-opacity:0"></stop></linearGradient></defs>
          ${c.avgY != null ? `<line class="avg-line" x1="0" x2="1000" y1="${(c.avgY * 3).toFixed(1)}" y2="${(c.avgY * 3).toFixed(1)}" vector-effect="non-scaling-stroke"></line>` : ''}
          <path d="${c.areaD}" fill="url(#${gid})"></path>
          ${c.lines.map((l, j) => `<path d="${l.d}" fill="none" class="ln${l.dash ? ' dash' : ''}${j ? ' sub' : ''}" style="stroke:${esc(l.c)}" vector-effect="non-scaling-stroke"></path>`).join('')}
        </svg>
        <div class="hv"><i class="hv-line"></i>${c.lines.map((l) => `<i class="hv-dot" style="border-color:${esc(l.c)}"></i>`).join('')}<div class="hv-tip"><small></small><b></b></div></div>
      </div></div>
      <div class="axis area-axis">${c.axis.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
      ${renderLegend(c)}
    </div>`;
  }

  if (t === 'rank') {
    const rows = full ? c.allRows : c.rows;
    return `<div class="rank">${rows.map((r, i) => `<div class="rrow">
      <div class="rhead"><span class="rlabel">${esc(r.label)}</span><span class="rval">${r.note ? `<span class="rnote">${esc(r.note)}</span>` : ''}<span class="rnum" style="color:${esc(r.tone)}">${esc(r.value)}</span></span></div>
      <div class="track"><div style="width:${+r.w}%;background:${esc(r.c)};--d:${Math.min(i * 60, 700)}ms"></div></div>
    </div>`).join('')}</div>`;
  }

  if (t === 'table') {
    const trs = full ? c.allTrs : c.trs;
    const heat = (x) => (x.heat != null ? `;background:color-mix(in srgb,var(--c-orange) ${Math.round(6 + x.heat * 38)}%,transparent)` : '');
    const cbar = (x) => (x.bar != null ? `<i class="cbar"><i style="width:${Math.max(2, Math.round(x.bar * 100))}%"></i></i>` : '');
    if (mobile) {
      // En el teléfono cada fila se apila: título y campos con su etiqueta, sin scroll horizontal.
      return `<div class="mtable">${trs.map((tr) => `<div class="mtr">
        <div class="mtr-title">${esc(tr.cells[0].v)}</div>
        <div class="mtr-fields">${tr.cells.slice(1).map((td, j) => `<div style="${heat(td).slice(1)}"><span>${esc(c.cols[j + 1].label)}</span><b style="color:${esc(td.color)};font-weight:${+td.fw || 500}">${esc(td.v)}</b>${cbar(td)}</div>`).join('')}</div>
      </div>`).join('')}</div>`;
    }
    return `<div class="tscroll"><div class="table" style="min-width:${esc(c.minW)}">
      <div class="tr th" style="grid-template-columns:${esc(c.grid)}">${c.cols.map((x) => `<div class="td" style="text-align:${esc(x.align)}">${esc(x.label)}</div>`).join('')}</div>
      ${trs.map((tr) => `<div class="tr" style="grid-template-columns:${esc(tr.grid)}">${tr.cells.map((td) => `<div class="td" style="text-align:${esc(td.align)};color:${esc(td.color)};font-weight:${+td.fw || 400}${heat(td)}">${esc(td.v)}${cbar(td)}</div>`).join('')}</div>`).join('')}
    </div></div>`;
  }

  if (t === 'mix') {
    const rows = full ? c.segs : c.rows;
    return `<div class="mix-bar">${c.segs.map((s) => `<div style="flex:${+s.f} 1 0;background:${esc(s.c)}" title="${esc(s.label)} · ${esc(s.pct)}"></div>`).join('')}</div>
      <div class="mix-rows">${rows.map((s) => `<div class="mix-row"><span class="mix-l"><span class="dot" style="background:${esc(s.c)}"></span><span>${esc(s.label)}</span></span><span class="mix-note">${esc(s.note)}</span><span class="mix-v">${esc(s.value)}</span><span class="mix-p">${esc(s.pct)}</span></div>`).join('')}</div>`;
  }

  if (t === 'gauge') {
    return `<div class="gauge"><svg viewBox="0 0 250 250" aria-hidden="true"><circle cx="125" cy="125" r="104" class="g-track"></circle><circle cx="125" cy="125" r="104" class="g-val" pathLength="100" stroke-dasharray="${(+c.value).toFixed(1)} 100"></circle></svg>
      <div class="g-in"><span class="g-num">${esc(c.label)}</span><span class="g-cap">${esc(c.caption)}</span></div></div>
      <div class="g-rows">${c.rows.map((r) => `<div class="g-row"><span><span class="dot" style="background:${esc(r.c)}"></span>${esc(r.label)}</span><b>${esc(r.value)}</b></div>`).join('')}</div>`;
  }

  if (t === 'tiles') {
    const ts = full ? c.allTiles : c.tiles;
    const tag = full ? 'div' : 'button';
    return `<div class="tiles">${ts.map((x, i) => `<${tag} class="tile tile-${esc(x.tone || 'dark')}"${full ? '' : ` data-act="detail" data-id="${esc(c.id)}"`} style="--d:${i * 60}ms">
      <div class="tile-top"><span>${esc(x.kicker)}</span><span class="tile-ic">${svg('arrow', 14)}</span></div>
      <div class="tile-title">${esc(x.title)}</div><div class="tile-sub">${esc(x.sub)}</div>
      <div class="tile-foot"><b>${esc(x.value)}</b><small>${esc(x.foot)}</small></div>
    </${tag}>`).join('')}</div>`;
  }

  if (t === 'rings') {
    return `<div class="rings">${c.rings.map((r) => `<div class="ring"><div class="ring-c"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="32" class="r-track"></circle><circle cx="40" cy="40" r="32" class="r-val" pathLength="100" stroke-dasharray="${r.value.toFixed(1)} 100" style="stroke:${esc(r.c)}"></circle></svg><span>${esc(r.txt)}</span></div><div class="ring-l">${esc(r.label)}</div></div>`).join('')}</div>`;
  }

  // Hipótesis: el valor contra la meta (la rayita), su estado y el desglose.
  if (t === 'hyp') {
    const w = c.value == null ? 0 : Math.max(1, Math.min(100, c.value));
    const gs = full ? c.groups : c.groups.slice(0, 4);
    return `<div class="hyp">
      <div class="hyp-top"><span class="hyp-val">${esc(c.label)}</span><span class="hyp-chip" style="--c:${esc(c.statusC)}">${esc(c.status)}</span></div>
      <div class="hyp-metric">${esc(c.metric)}</div>
      <div class="hyp-bar"><i style="width:${w}%;background:${esc(c.statusC)}"></i><b style="left:${Math.min(100, +c.target)}%"></b></div>
      <div class="hyp-foot"><span>${esc(c.targetLabel)}</span><span>${esc(c.nLabel)}</span></div>
      ${gs.length ? `<div class="hyp-groups">${gs.map((g) => `<div class="hyp-g"><span class="hyp-gl">${esc(g.label)}</span><span class="hyp-gn">${esc(g.note)}</span><b style="color:${esc(g.c)}">${esc(g.value)}</b></div>`).join('')}${!full && c.groups.length > gs.length ? `<div class="hyp-gn">y ${c.groups.length - gs.length} grupos más en el detalle</div>` : ''}</div>` : ''}
    </div>`;
  }

  if (t === 'roster') {
    const tf = c.people.filter((p) => p.channel === 'TestFlight' && !p.tester).length;
    return `<div class="roster">
      <div class="roster-tools"><input class="roster-q" type="search" data-q value="${esc(rosterQ)}" placeholder="Busca por el inicio del ID, alias o persona" aria-label="Buscar instalación">${tf ? `<button class="pill ghost" data-act="mark-tf">Marcar ${tf} de TestFlight</button>` : ''}</div>
      <div data-rlist>${rosterList(c)}</div>
    </div>`;
  }
  return '';
}

// Las filas de la lista de instalaciones que coinciden con la búsqueda.
function rosterList(c) {
  const q = rosterQ.trim().toLowerCase();
  const hit = c.people.filter((p) => !q || [p.id, p.alias, p.persona, p.cohort, p.iphone].some((v) => String(v || '').toLowerCase().includes(q)));
  const max = 200;
  if (!c.people.length) return `<div class="empty">Todavía no hay instalaciones. Corre sql/altanto_analytics_v22_testers.sql y toca Actualizar.</div>`;
  if (!hit.length) return `<div class="empty">Ninguna instalación coincide con «${esc(rosterQ)}»</div>`;
  return `<div class="rr-list">${hit.slice(0, max).map((p) => `<div class="rr${p.tester ? ' on' : ''}">
      <button class="chk${p.tester ? ' on' : ''}" data-act="t-toggle" data-id="${esc(p.id)}" role="switch" aria-checked="${p.tester}" aria-label="Tester ${esc(p.short)}"><i></i></button>
      <div class="rr-main"><div class="rr-title"><code>${esc(p.short)}</code>${p.alias ? `<b>${esc(p.alias)}</b>` : `<span class="rr-muted">${p.tester ? 'Sin alias' : 'No tester'}</span>`}</div><div class="rr-sub">${esc([p.persona, p.iphone, p.channel, p.cohort].filter(Boolean).join(' · ') || '—')}</div></div>
      <div class="rr-days">${esc(fd(p.first))} → ${esc(fd(p.last))}<small>${esc(N(p.days))} días con datos</small></div>
      <button class="pill ghost small" data-act="t-edit" data-id="${esc(p.id)}">Editar</button>
    </div>`).join('')}</div>${hit.length > max ? `<div class="rr-more">Mostrando ${max} de ${hit.length}. Busca por el inicio del ID para encontrar a alguien.</div>` : ''}`;
}

// Perfil y encuesta de una instalación, en la misma hoja del detalle.
function renderEditor(p, opts, anim) {
  const s = p.s || {};
  const v = (k) => esc(s[k] == null ? '' : k === 'test_start' ? String(s[k]).slice(0, 10) : s[k]);
  const fld = (label, html, cls) => `<label class="fld${cls ? ' ' + cls : ''}"><span>${esc(label)}</span>${html}</label>`;
  const inp = (k, type, extra) => `<input name="${k}" type="${type || 'text'}" value="${v(k)}"${extra || ''}>`;
  const sel = (k, list) => `<select name="${k}"><option value="">—</option>${list.map(([o, l]) => `<option value="${esc(o)}"${s[k] != null && String(s[k]) === String(o) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const yn = (k) => sel(k, [['true', 'Sí'], ['false', 'No']]);
  const dl = (id, xs) => `<datalist id="${id}">${xs.map((x) => `<option value="${esc(x)}"></option>`).join('')}</datalist>`;
  return `<div class="dlg-back${anim ? ' anim-in' : ''}" data-act="t-close"></div>
    <div class="dlg dlg-form${anim ? ' anim-in' : ''}" role="dialog" aria-modal="true" aria-label="Editar tester">
      <div class="dlg-head">
        <div class="card-titles"><div class="dlg-kicker">Instalación ${esc(p.short)}${p.iphone ? ' · ' + esc(p.iphone) : ''}${p.channel ? ' · ' + esc(lab('channel', p.channel)) : ''}</div><div class="dlg-title">${esc(p.alias || 'Sin alias')}</div><div class="card-sub">Primer día ${esc(fd(p.first))} · último ${esc(fd(p.last))} · ${esc(N(p.days.size))} días con datos</div></div>
        <button class="icon-btn" data-act="t-close" aria-label="Cerrar">${svg('close', 18)}</button>
      </div>
      <form class="dlg-body" data-form onsubmit="return false">
        <div class="fsec">Perfil</div>
        <div class="fgrid">
          ${fld('Alias', inp('alias', 'text', ' maxlength="40" placeholder="Un alias, no el nombre completo"'))}
          <label class="fld fchk"><input type="checkbox" name="is_tester"${p.tester || !p.saved ? ' checked' : ''}><span>Es tester</span></label>
          ${fld('Grupo de prueba', inp('cohort', 'text', ' list="dl-cohort" maxlength="40" placeholder="Prueba 1"'))}
          ${fld('Día 1 de su prueba', inp('test_start', 'date'), '')}
          ${fld('Edad', inp('age', 'number', ' min="10" max="100" step="1" inputmode="numeric"'))}
          ${fld('Género', sel('gender', Object.entries(LBL.gender)))}
          ${fld('iPhone', inp('iphone', 'text', ' maxlength="40" placeholder="' + esc(devName(p.device) || 'Modelo') + '"'))}
          ${fld('User persona', inp('persona', 'text', ' list="dl-persona" maxlength="40"'))}
          ${fld('Notas', `<textarea name="notes" rows="2" maxlength="500">${v('notes')}</textarea>`, 'wide')}
        </div>
        <div class="fsec">Encuesta y entrevista</div>
        <div class="fgrid">
          ${fld('H1 · Minutos por semana revisando gastos, al empezar', inp('s_min_before', 'number', ' min="0" step="1" inputmode="numeric"'))}
          ${fld('H1 · Lo mismo, el día 14', inp('s_min_after', 'number', ' min="0" step="1" inputmode="numeric"'))}
          ${fld('H8 · ¿Los gastos cuadran con sus registros?', yn('s_matches'))}
          ${fld('H5 · ¿Reemplazó su herramienta?', yn('s_replaced'))}
          ${fld('H5 · Qué usaba antes', inp('s_tool_before', 'text', ' maxlength="60" placeholder="Excel, cuaderno, app del banco…"'))}
          ${fld('H5 · Qué usa ahora', inp('s_tool_after', 'text', ' maxlength="60"'))}
          ${fld('H4 · ¿Pagaría por Premium?', sel('s_pay', Object.entries(LBL.pay)))}
          ${fld('H4 · Cuánto al mes (S/)', inp('s_pay_amount', 'number', ' min="0" step="0.5" inputmode="decimal"'))}
          ${fld('H6 · Si la app dejara de existir…', sel('s_fatal', Object.entries(LBL.fatal)))}
          ${fld('H7 · ¿Habló de la app o la recomendó?', yn('s_recommended'))}
        </div>
        ${dl('dl-cohort', opts.cohort)}${dl('dl-persona', opts.persona)}
        <div class="factions"><button type="button" class="pill" data-act="t-close">Cancelar</button><button type="button" class="pill primary" data-act="t-save">Guardar</button></div>
      </form>
    </div>`;
}

new App(document.getElementById('app'));
