// Vista del panel: estado, sesión de Google (Supabase Auth) y dibujo en el DOM.
// Todo lo que llega de las vistas pasa por esc(): los eventos los manda
// cualquiera con la llave publicable, así que no se confía en ningún texto.

// Sin tildes y en minúsculas, para buscar «ines» y encontrar «Inés».
const fold = (v) => String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  check: 'M20 6L9 17l-5-5',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  repeat: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
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
    this.state = { section: SECTIONS.some((s) => s.id === ui.section) || ui.section === 'mas' ? ui.section : 'resumen', range: ui.range || 30, from: ui.from || null, to: ui.to || null, aud: ui.aud || 'all', pick: Array.isArray(ui.pick) ? ui.pick.filter((x) => typeof x === 'string').slice(0, 200) : [], by: ui.by || 'persona', calMonth: null, calDay: null, calKinds: Array.isArray(ui.calKinds) ? ui.calKinds : [], calAuto: ui.calAuto !== false, sideMini: typeof ui.sideMini === 'boolean' ? ui.sideMini : null, cohort: ui.cohort || '', wide: window.innerWidth >= 900, mode: !this.forceDemo && this.session() ? 'loading' : 'demo', data: null, email: null, notice: this.hashNotice || null, updatedAt: null, demoChosen: !!ui.demo };
    this.cards = new Map();
    this.sheet = false;
    this.detail = null;
    this.editing = null;
    this.picking = null;
    this.secMenu = false;
    this.msEdit = null;
    this.guide = null;
    this.animKey = null;
    window.addEventListener('resize', () => { const w = window.innerWidth >= 900; if (w !== this.state.wide || (w && this.sideMini() !== this._mini)) this.setState({ wide: w }); });
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
    document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (this.secMenu) this.toggleSecMenu(false); else if (this.guide) this.openGuide(null); else if (this.msEdit) this.editMs(null); else if (this.picking) this.openPicker(false); else if (this.editing) this.editTester(null); else if (this.detail) this.openDetail(null); });
    root.addEventListener('change', (e) => this.onChange(e));
    root.addEventListener('input', (e) => { if (e.target.matches('[data-q]')) { rosterQ = e.target.value; this.paintRoster(); } else if (e.target.matches('[data-pq]')) { this.picking.q = e.target.value; this.paintPicker(); } else if (e.target.matches('[data-gq]')) { this.guide.q = e.target.value; this.paintGuide(); } else if (e.target.matches('[data-sq]')) { this.secQ = e.target.value; const l = this.root.querySelector('[data-smlist]'); if (l) l.innerHTML = secMenuList(this.state.section, this.secQ); } });
    // Ctrl K (o ⌘ K) abre el buscador de secciones; Enter va a la primera que coincide.
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && this.state.wide) { e.preventDefault(); this.toggleSecMenu(!this.secMenu); }
      else if (e.key === 'Enter' && this.secMenu && e.target.matches('[data-sq]')) { const f = this.root.querySelector('[data-smlist] [data-act="go"]'); if (f) { this.secMenu = false; this.go(f.dataset.id); } }
    });
    // La rueda del mouse mueve el menú de secciones de lado a lado.
    root.addEventListener('wheel', (e) => { const t = e.target.closest('[data-tabs]'); if (!t || Math.abs(e.deltaY) <= Math.abs(e.deltaX) || t.scrollWidth <= t.clientWidth) return; e.preventDefault(); t.scrollLeft += e.deltaY; }, { passive: false });
    root.addEventListener('scroll', (e) => { if (e.target.matches && e.target.matches('[data-tabs]')) { this._navX = e.target.scrollLeft; this.navEdges(); } }, true);
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
  saveUI(p) { const S = this.state; try { localStorage.setItem(LS_UI, JSON.stringify({ section: S.section, range: S.range, from: S.from, to: S.to, aud: S.aud, pick: S.pick, by: S.by, calKinds: S.calKinds, calAuto: S.calAuto, sideMini: S.sideMini, cohort: S.cohort, demo: S.demoChosen, ...p })); } catch (e) {} }
  // Los datos que se dibujan: los de Supabase o, sin sesión, los de ejemplo.
  data() { const S = this.state; return S.mode === 'live' && S.data ? S.data : this._demo || (this._demo = makeDemo()); }
  // Primer y último día del rango. Con «Fechas», dentro de los 90 días cargados.
  span() {
    const S = this.state, today = limaToday(), lo = addD(today, -89);
    if (S.range !== 'custom') return { from: addD(today, -(+S.range - 1)), to: today };
    return this.clampSpan(S.from, S.to);
  }
  clampSpan(f, t) {
    const today = limaToday(), lo = addD(today, -89);
    const c = (d, f) => (d && /^\d{4}-\d\d-\d\d$/.test(d) ? (d < lo ? lo : d > today ? today : d) : f);
    let to = c(t, today), from = c(f, addD(to, -13));
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

  // Sin personas elegidas, el panel sale de la caché que Supabase mantiene al día
  // (v26): primero lo guardado en este navegador, al instante; luego una sola
  // llamada a analytics_dashboard; al final analytics_refresh procesa sólo los
  // eventos nuevos y, si cambió algo, se vuelve a pedir. Con personas elegidas
  // (o sin v26) se leen las vistas una por una, como antes.
  async load() {
    if (this.forceDemo || !this.session()) { this.setState({ mode: 'demo', data: null, email: null }); return; }
    const seq = (this.loadSeq = (this.loadSeq || 0) + 1);
    const current = () => seq === this.loadSeq;
    const aud = this.state.aud;
    const cached = !this.state.pick.length;
    const saved = cached ? await idbGet('dash:' + aud) : null;
    if (!current()) return;
    if (saved && saved.views) this.setState({ mode: 'live', data: saved.views, email: saved.email, notice: null, updatedAt: new Date(saved.at), syncing: true, source: 'local' });
    else this.setState({ mode: 'loading', notice: null, syncing: false, source: cached ? 'cache' : 'views' });
    try {
      const tk = await this.token();
      if (!tk) throw Object.assign(new Error('Sesión vencida'), { code: 401 });
      const userP = fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + tk } }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
      if (cached) {
        let dash = await fetchDashboard(tk, aud);
        if (dash) {
          const user = await userP;
          if (!current()) return;
          await this.showDash(dash, aud, tk, user, true, current);
          const r = await refreshCache(tk).catch(() => null);
          if (!current()) return;
          if (r && r.status === 'ok') dash = await fetchDashboard(tk, aud);
          if (!current()) return;
          if (r && r.status === 'ok' && dash) await this.showDash(dash, aud, tk, user, false, current);
          else {
            // Sin eventos nuevos: igual quedó revisado ahora.
            const sys = this.state.data && this.state.data._system;
            if (sys && r && r.checked_at) sys.checked_at = r.checked_at;
            this.setState({ syncing: false });
          }
          return;
        }
      }
      await this.loadViews(tk, userP, current);
    } catch (e) {
      if (!current()) return;
      if (e.code === 401) localStorage.removeItem(LS_SESSION);
      if (saved && e.code !== 401) { this.setState({ syncing: false, notice: 'No se pudo actualizar desde Supabase (' + e.message + '). Se muestra lo último guardado en este navegador.' }); return; }
      this.setState({ mode: 'demo', data: null, email: null, syncing: false, notice: (e.code === 401 ? 'La sesión venció. Vuelve a entrar con Google.' : 'No se pudo leer Supabase: ' + e.message) + ' Mostrando datos de ejemplo.' });
    }
  }

  // Dibuja lo que devolvió analytics_dashboard y lo guarda en este navegador.
  async showDash(dash, aud, tk, user, syncing, current) {
    const data = dash.views || {};
    if (dash.system) data._system = dash.system;
    const empty = Object.entries(data).every(([v, rows]) => V22.includes(v) || V23.includes(v) || V25.includes(v) || !rows || !rows.length);
    let notice = null;
    if (empty) notice = aud !== 'all' ? 'Ninguna vista trae datos para «' + lab('aud', aud) + '». ¿Ya marcaste a los testers en la sección Testers?' : await this.diagnose(tk, user);
    if (!current()) return;
    const at = dash.refreshed_at ? new Date(dash.refreshed_at) : new Date();
    const email = user.email || 'sesión iniciada';
    // Copia tomada antes de dibujar: el dibujo le agrega datos derivados (_people…) que no se guardan.
    idbSet('dash:' + aud, { views: { ...data }, email, at: at.toISOString() });
    this.setState({ mode: 'live', data, email, notice, updatedAt: at, syncing, source: 'cache' });
  }

  // Lectura vista por vista (personas elegidas, o Supabase sin v26).
  async loadViews(tk, userP, current) {
    const today = limaToday();
    // Personas elegidas: mandan sobre Testers / No testers.
    const aud = this.state.pick.length ? { ids: this.state.pick } : this.state.aud;
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
    jobs.push(['analytics_milestones', 'order=day.asc']);
    jobs.push(['analytics_app_releases', '']);
    jobs.push(['analytics_merchant_person_daily', 'day=gte.' + addD(today, -89) + '&order=day.asc']);
    const failed = [];
    const sysP = fetchSystem(tk).catch(() => null);
    const res = await Promise.all(jobs.map(([v, f, a]) => fetchView(v, f, tk, a).catch((e) => { if (e.code === 401) throw e; failed.push(v); return []; })));
    const data = {};
    jobs.forEach(([v], i) => (data[v] = res[i]));
    const sys = await sysP;
    if (sys) data._system = sys;
    const user = await userP;
    const empty = jobs.every(([v], i) => V22.includes(v) || V23.includes(v) || V25.includes(v) || !res[i].length);
    if (failed.length === jobs.length) throw new Error('ninguna vista respondió. ¿Ya corriste agrupay_analytics_v16.sql?');
    const miss21 = failed.filter((v) => V21.includes(v)), miss22 = failed.filter((v) => V22.includes(v)), miss23 = failed.filter((v) => V23.includes(v)), miss25 = failed.filter((v) => V25.includes(v)), other = failed.filter((v) => !V21.includes(v) && !V22.includes(v) && !V23.includes(v) && !V25.includes(v));
    const parts = [];
    if (other.length) parts.push('No se pudieron leer ' + other.length + ' vistas: ' + other.slice(0, 4).join(', ') + (other.length > 4 ? '…' : '') + '.');
    if (miss21.length) parts.push('Faltan las vistas de comercios, hoja de clasificar y suscripciones (' + miss21.length + '). Corre agrupay_analytics_v21_merchants.sql en este proyecto y toca Actualizar.');
    if (miss22.length) parts.push('Faltan las vistas de testers e hipótesis: corre sql/altanto_analytics_v22_testers.sql (está en este repo) y toca Actualizar.' + (aud !== 'all' ? ' Sin ella, el filtro Testers / No testers no separa nada.' : ''));
    if (miss23.length) parts.push('Falta la vista de Monitoreo de comercios: corre sql/altanto_analytics_v23_comercios.sql (está en este repo) y toca Actualizar.');
    if (miss25.length) parts.push('Falta la Bitácora: corre sql/altanto_analytics_v25_bitacora.sql (está en este repo) y toca Actualizar.');
    let notice = parts.join(' ') || null;
    if (!notice && empty) notice = this.state.pick.length ? 'Ninguna vista trae datos de las personas elegidas en este rango.' : aud !== 'all' ? 'Ninguna vista trae datos para «' + lab('aud', aud) + '». ¿Ya marcaste a los testers en la sección Testers?' : await this.diagnose(tk, user);
    if (!current()) return;
    this.setState({ mode: 'live', data, email: user.email || 'sesión iniciada', notice, updatedAt: new Date(), syncing: false, source: 'views' });
  }

  // «Cómo se leen estos datos»: en el Resumen siempre y, mientras carga, en
  // cualquier sección. De dónde salen, cada cuánto se ponen al día, qué se
  // procesó la última vez y cuánto ocupa la base.
  dataStrip(sec) {
    const S = this.state;
    const loading = S.mode === 'loading';
    if (sec.id !== 'resumen' && !loading) return '';
    const sys = S.mode !== 'loading' ? this.data()._system : null;
    const pick = S.pick.length > 0;
    let dot, head, how;
    if (S.mode === 'demo') { dot = 'var(--c-orange)'; head = 'Datos de ejemplo'; how = 'No se lee Supabase. Entra con Google para ver los datos reales.'; }
    else if (loading) { dot = 'var(--c-blue)'; head = 'Cargando'; how = S.source === 'views' ? 'Personas elegidas: se calcula al momento desde las vistas de Supabase.' : 'Una sola llamada a la caché de Supabase: los números ya están calculados, no se recalcula nada.'; }
    else if (S.syncing) { dot = 'var(--c-blue)'; head = S.source === 'local' ? 'Lo guardado en este navegador' : 'Caché de Supabase'; how = 'Buscando eventos nuevos: Supabase procesa sólo lo que llegó desde la última vez…'; }
    else if (S.source === 'views') { dot = 'var(--pos)'; head = 'En vivo'; how = pick ? 'Personas elegidas: se calcula al momento desde las vistas, sin la caché.' : 'Vista por vista (la caché de v26 no respondió).'; }
    else { dot = 'var(--pos)'; head = 'Caché incremental'; how = 'Supabase la pone al día cada ' + ((sys && sys.schedule_min) || 5) + ' min y al abrir el panel, procesando sólo los eventos nuevos.'; }
    const bits = [];
    if (sys && S.mode === 'live') {
      bits.push('Revisado ' + HM(sys.checked_at || sys.refreshed_at) + ' · último evento recibido ' + HM(sys.data_until));
      const li = sys.last_info;
      if (li && li.status === 'ok') bits.push('Última pasada: ' + (ok(li.events) ? N(li.events) + ' eventos nuevos, ' : '') + (li.from_day ? 'recalculó desde el ' + fd(li.from_day) : 'rehízo lo de 30 días') + ' en ' + MS(li.ms));
      if (num(sys.cron_failed_24h) > 0) bits.push('⚠ ' + N(sys.cron_failed_24h) + ' actualizaciones automáticas fallaron en 24 h');
    }
    const used = sys && sys.db_limit_bytes ? Math.min(100, (num(sys.db_bytes) / num(sys.db_limit_bytes)) * 100) : null;
    const db = used != null ? `<span class="ds-db" title="Base de analítica en Supabase: ${esc(MB(sys.db_bytes))} de ${esc(MB(sys.db_limit_bytes))}. Crece ~${esc(MB(num(sys.growth_per_day) * 30))} al mes.">Base ${esc(MB(sys.db_bytes))} de ${esc(MB(sys.db_limit_bytes))}<i class="ds-bar"><b style="width:${Math.max(2, used).toFixed(1)}%;background:${used >= 80 ? 'var(--neg)' : 'var(--c-blue)'}"></b></i>${esc(P(r1(used)))}</span>` : '';
    return `<div class="datasrc anim" style="--i:1" role="status"><span class="ds-main"><span class="dot" style="background:${dot}"></span><b>${esc(head)}</b><span>${esc(how)}</span></span>${bits.map((b) => `<span class="ds-bit">${esc(b)}</span>`).join('')}${db}</div>`;
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
    idbClear();
    this.loadSeq = (this.loadSeq || 0) + 1;
    this.sheet = false;
    this.setState({ mode: 'demo', data: null, email: null, notice: null, demoChosen: false });
    this.saveUI({ demo: false });
  }

  // ── Eventos ────────────────────────────────────────────────────────────
  onClick(e) {
    const bar = e.target.closest('[data-bar]');
    if (bar) { this.showTip(bar); return; }
    const el = e.target.closest('[data-act]');
    // Un toque fuera del menú de secciones lo cierra.
    if (!el) return;
    const a = el.dataset.act;
    if (a === 'go') { this.secMenu = false; this.go(el.dataset.id); }
    else if (a === 'tab') {
      // Tocar la pestaña en la que ya estás sube al inicio (o vuelve a la lista de «Más»).
      const id = el.dataset.id;
      if (id === this.tab()) { if (id === 'mas' && this.state.section !== 'mas') this.go('mas'); else window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else this.go(id);
    }
    else if (a === 'range') { this.setState({ range: +el.dataset.n }); this.saveUI(); }
    else if (a === 'shift') this.shift(+el.dataset.n);
    else if (a === 'aud') { if (el.dataset.n === this.state.aud && !this.state.pick.length) return; this.setState({ aud: el.dataset.n, pick: [] }); this.saveUI(); if (this.state.mode !== 'demo') this.load(); }
    else if (a === 'pick') this.openPicker(true);
    else if (a === 'p-close') this.openPicker(false);
    else if (a === 'p-toggle') { const d = this.picking.sel; const id = el.dataset.id; if (d.has(id)) d.delete(id); else d.add(id); this.paintPicker(); }
    else if (a === 'p-all') { this.pickHits().forEach((p) => this.picking.sel.add(p.id)); this.paintPicker(); }
    else if (a === 'p-clear') { this.picking.sel.clear(); this.paintPicker(); }
    else if (a === 'p-apply') this.applyPick([...this.picking.sel]);
    else if (a === 'p-drop') this.applyPick(this.state.pick.filter((x) => x !== el.dataset.id));
    else if (a === 'navscroll') { const t = this.root.querySelector('[data-tabs]'); if (t) t.scrollBy({ left: +el.dataset.n * t.clientWidth * 0.7, behavior: 'smooth' }); }
    else if (a === 'secmenu') this.toggleSecMenu(!this.secMenu);
    else if (a === 'secmenu-close') this.toggleSecMenu(false);
    else if (a === 'side-mini') { this.setState({ sideMini: !this.sideMini() }); this.saveUI(); }
    else if (a === 'guide') this.openGuide(el.dataset.id || this.state.section);
    else if (a === 'g-close') this.openGuide(null);
    else if (a === 'g-all') { this.guide.all = !this.guide.all; this.paintGuide(); }
    else if (a === 'cal-move') { const m = this.calMonth(); const d = new Date(m + '-01T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + +el.dataset.n); this.setState({ calMonth: d.toISOString().slice(0, 7), calDay: null }); }
    else if (a === 'cal-today') this.setState({ calMonth: null, calDay: limaToday() });
    else if (a === 'cal-day') { const d = el.dataset.d; this.setState({ calDay: this.state.calDay === d ? null : d, calMonth: d.slice(0, 7) }); }
    else if (a === 'cal-kind') { const k = el.dataset.k; let ks = this.state.calKinds.slice(); ks = ks.includes(k) ? ks.filter((x) => x !== k) : ks.concat(k); this.setState({ calKinds: ks }); this.saveUI(); }
    else if (a === 'cal-auto') { this.setState({ calAuto: !this.state.calAuto }); this.saveUI(); }
    else if (a === 'm-new') this.editMs({ day: el.dataset.d || this.state.calDay || limaToday() });
    else if (a === 'm-edit') { const m = milestones(this.data()).find((x) => x.id === el.dataset.id); if (m) this.editMs(m.auto ? { day: m.day, kind: m.kind === 'cohort_d14' ? 'survey' : m.kind, title: m.title, cohort: m.cohort, version: m.version } : m); }
    else if (a === 'm-close') this.editMs(null);
    else if (a === 'm-save') { const f = this.root.querySelector('[data-mform]'); if (f && f.reportValidity()) this.saveMs(f); }
    else if (a === 'm-del') this.deleteMs();
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
    if (k === 'from' || k === 'to') { if (!e.target.value) return; const sp = this.span(); sp[k] = e.target.value; const c = this.clampSpan(sp.from, sp.to); this.setState({ from: c.from, to: c.to, range: 'custom' }); this.saveUI(); }
    else if (k === 'cohort') { this.setState({ cohort: e.target.value }); this.saveUI(); }
  }
  go(id) { this.detail = null; window.scrollTo(0, 0); this.setState({ section: id }); this.saveUI({ section: id }); }

  // Mueve el rango entero hacia atrás (-1) o adelante (+1), sin salir de los 90 días cargados.
  shift(n) {
    const today = limaToday(), lo = addD(today, -89);
    const { from, to } = this.span();
    const len = Math.round((new Date(to + 'T00:00:00Z') - new Date(from + 'T00:00:00Z')) / 864e5) + 1;
    let f = addD(from, n * len), t = addD(to, n * len);
    if (t > today) { t = today; f = addD(today, -(len - 1)); }
    if (f < lo) { f = lo; t = addD(lo, len - 1); if (t > today) t = today; }
    // Si vuelve a terminar hoy con un largo de los botones, queda como ese botón.
    if (t === today && [1, 7, 30, 90].includes(len)) this.setState({ range: len });
    else this.setState({ range: 'custom', from: f, to: t });
    this.saveUI();
  }

  // ── Menú de secciones ──────────────────────────────────────────────────
  sideMini() { return this.state.sideMini == null ? window.innerWidth < 1180 : this.state.sideMini; }
  toggleSecMenu(open) {
    this.secMenu = open;
    this.secQ = '';
    const m = this.root.querySelector('[data-secmenu]'), bk = this.root.querySelector('.sec-back');
    if (m) { m.classList.toggle('open', open); m.innerHTML = renderSecMenu(this.state.section, ''); }
    if (bk) bk.classList.toggle('open', open);
    if (open) { const i = this.root.querySelector('[data-sq]'); if (i) i.focus({ preventScroll: true }); }
  }
  // Flechas y degradado sólo donde queda menú escondido.
  navEdges() {
    const t = this.root.querySelector('[data-tabs]'), w = t && t.parentElement;
    if (!w) return;
    w.classList.toggle('can-l', t.scrollLeft > 4);
    w.classList.toggle('can-r', t.scrollLeft + t.clientWidth < t.scrollWidth - 4);
  }

  // ── Bitácora ──────────────────────────────────────────────────────────
  calMonth() { return this.state.calMonth || (this.state.calDay || limaToday()).slice(0, 7); }
  editMs(m) { this.msEdit = m; if (!m) document.documentElement.classList.remove('noscroll'); this.paintDetail(!!m); }
  async saveMs(form) {
    const f = new FormData(form);
    const txt = (k) => { const v = String(f.get(k) == null ? '' : f.get(k)).trim(); return v || null; };
    const row = { day: txt('day'), end_day: txt('end_day'), kind: txt('kind') || 'other', title: txt('title'), notes: txt('notes'), cohort: txt('cohort'), version: txt('version'), link: txt('link'), updated_at: new Date().toISOString() };
    if (row.end_day && row.end_day < row.day) row.end_day = null;
    if (this.msEdit.id) row.id = this.msEdit.id;
    const S = this.state, D = this.data();
    let saved = Object.assign({ id: row.id || 'local-' + Date.now(), created_by: S.email || null }, row);
    if (S.mode === 'live') {
      try { saved = await saveMilestone(row, await this.token()); }
      catch (e) { this.setState({ notice: 'No se guardó el hito: ' + e.message }); return; }
    }
    const list = D.analytics_milestones || (D.analytics_milestones = []);
    const i = list.findIndex((x) => x.id === saved.id);
    if (i >= 0) list[i] = saved; else list.push(saved);
    delete D._ms;
    this.msEdit = null;
    document.documentElement.classList.remove('noscroll');
    this.setState({ calDay: saved.day.slice(0, 10), calMonth: saved.day.slice(0, 7), notice: S.mode !== 'live' ? 'Con los datos de ejemplo los hitos no se guardan: se pierden al recargar.' : null });
  }
  async deleteMs() {
    const m = this.msEdit;
    if (!m || !m.id || !window.confirm('¿Borrar «' + m.title + '»? No se puede deshacer.')) return;
    const S = this.state, D = this.data();
    if (S.mode === 'live') {
      try { await deleteMilestone(m.id, await this.token()); }
      catch (e) { this.setState({ notice: 'No se borró: ' + e.message }); return; }
    }
    D.analytics_milestones = (D.analytics_milestones || []).filter((x) => x.id !== m.id);
    delete D._ms;
    this.msEdit = null;
    document.documentElement.classList.remove('noscroll');
    this.render();
  }

  // ── Guía ──────────────────────────────────────────────────────────────
  openGuide(id) { this.guide = id ? { id, q: '', all: false } : null; if (!id) document.documentElement.classList.remove('noscroll'); this.paintDetail(!!id); }
  paintGuide() {
    const host = this.root.querySelector('[data-glist]');
    if (host) host.innerHTML = guideBody(this.guide);
    const b = this.root.querySelector('[data-act="g-all"]');
    if (b) b.classList.toggle('on', this.guide.all);
  }

  // ── Personas elegidas ──────────────────────────────────────────────────
  openPicker(open) {
    this.picking = open ? { q: '', sel: new Set(this.state.pick) } : null;
    if (!open) document.documentElement.classList.remove('noscroll');
    this.paintDetail(open);
  }
  // Coincide con el ID, el correo, el alias, la persona o el iPhone. Varios
  // términos separados por coma o espacio buscan cualquiera (pegar una lista).
  pickHits() {
    const terms = fold(this.picking.q).split(/[\s,;]+/).filter(Boolean);
    const all = people(this.data()).slice().sort((a, b) => (b.tester - a.tester) || String(b.last || '').localeCompare(String(a.last || '')));
    if (!terms.length) return all;
    return all.filter((p) => { const hay = [p.id, p.email, p.alias, p.persona, p.iphone].map(fold); return terms.some((t) => hay.some((h) => h.includes(t))); });
  }
  paintPicker() {
    const host = this.root.querySelector('[data-plist]');
    if (host) host.innerHTML = pickList(this.pickHits(), this.picking.sel);
    const n = this.root.querySelector('[data-pcount]');
    if (n) n.textContent = pickCount(this.picking.sel.size);
  }
  applyPick(ids) {
    this.picking = null;
    document.documentElement.classList.remove('noscroll');
    this.setState({ pick: ids });
    this.saveUI();
    if (this.state.mode !== 'demo') this.load();
  }

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
    if (this.guide && host) {
      document.documentElement.classList.add('noscroll');
      host.innerHTML = renderGuide(this.guide, anim);
      return;
    }
    if (this.msEdit && host) {
      document.documentElement.classList.add('noscroll');
      const D = this.data();
      const cohorts = [...new Set((D.analytics_testers || []).map((t) => t.cohort).concat((D.analytics_milestones || []).map((m) => m.cohort)).filter(Boolean))].sort();
      host.innerHTML = renderMsEditor(this.msEdit, cohorts, anim);
      if (anim) { const i = host.querySelector('input[name="title"]'); if (i && this.state.wide) i.focus({ preventScroll: true }); }
      return;
    }
    if (this.picking && host) {
      document.documentElement.classList.add('noscroll');
      host.innerHTML = renderPicker(this.pickHits(), this.picking, anim);
      if (anim) { const i = host.querySelector('[data-pq]'); if (i && this.state.wide) i.focus({ preventScroll: true }); }
      return;
    }
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
    const ctx = { D: data, today, start: from, end: to, days, range: days.length, wide: S.wide, aud: S.aud, pick: new Set(S.pick), by: S.by, cohort: S.cohort, cal: { month: this.calMonth(), day: S.calDay, kinds: S.calKinds, auto: S.calAuto } };
    CUR_SEC = sec.id;
    let built;
    let buildError = null;
    try { built = build(sec.id, ctx); } catch (e) { console.error(e); buildError = e; built = { kpis: [], cards: [] }; }
    this.cards = new Map(built.cards.map((c) => [c.id, c]));
    const t = S.updatedAt ? S.updatedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
    const status = loading ? { dot: 'var(--c-blue)', text: 'Cargando…' } : live ? { dot: S.syncing ? 'var(--c-blue)' : 'var(--pos)', text: S.email + (t ? ' · ' + t : '') + (S.syncing ? ' · actualizando…' : '') } : { dot: 'var(--c-orange)', text: 'Datos de ejemplo' };
    const footer = (live || loading ? (S.pick.length ? 'En vivo desde las vistas analytics_* de Supabase.' : 'Desde la caché de Supabase, que procesa los eventos nuevos cada 5 minutos y al tocar Actualizar.') : 'Datos de ejemplo con la misma forma que las vistas analytics_*. Entra con una cuenta de analytics_admins para ver los reales.') + ' Audiencia: ' + (S.pick.length ? pickCount(S.pick.length) : lab('aud', S.aud)) + '. Hora de Lima; excluye el canal debug.';
    // Con los datos de ejemplo sólo las secciones por persona cambian con la audiencia.
    const audNote = !live && !loading && (S.aud !== 'all' || S.pick.length) && !PEOPLE_SECTIONS.includes(sec.id) ? 'Con los datos de ejemplo, los filtros de audiencia y de personas sólo cambian Hipótesis, Testers y Monitoreo de comercios. Con datos reales filtran todas las secciones.' : null;
    // Las animaciones de entrada sólo corren al cambiar de sección, rango, audiencia o datos.
    const key = [sec.id, from, to, S.aud, S.pick.join(','), S.mode, S.wide, sec.id === 'bitacora' ? this.calMonth() : ''].join('|');
    const enter = key !== this.animKey;
    this.animKey = key;
    return { loading, live, range, built, buildError, status, footer, enter, audNote };
  }

  // Audiencia, rango (con «Fechas») y, en las secciones por persona, desglose y grupo.
  controls(sec, mobile) {
    const S = this.state, today = limaToday();
    const seg = (act, opts, cur) => `<div class="${mobile ? 'm-seg' : 'seg'}"${mobile ? ` style="grid-template-columns:repeat(${opts.length},1fr)"` : ''}>${opts.map(([v, l]) => `<button class="${String(v) === String(cur) ? 'on' : ''}" data-act="${act}" data-n="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
    // Con personas elegidas, ningún botón de audiencia queda marcado.
    if (sec.noAud) return '';
    const out = [seg('aud', Object.entries(LBL.aud), S.pick.length ? null : S.aud)];
    const all = people(this.data());
    const one = S.pick.length === 1 ? all.find((p) => p.id === S.pick[0]) : null;
    const pl = !S.pick.length ? 'Elegir personas' : one ? one.alias || one.email || one.short : pickCount(S.pick.length);
    out[0] = `<div class="ctl-row">${out[0]}<button class="pick-btn${S.pick.length ? ' on' : ''}" data-act="pick" aria-haspopup="dialog">${svg('users', 16)}<span>${esc(pl)}</span></button></div>`;
    if (!sec.fixed) {
      out.push(seg('range', mobile ? [[1, 'Hoy'], [7, '7 d'], [30, '30 d'], [90, '90 d']] : [[1, 'Hoy'], [7, '7 días'], [30, '30 días'], [90, '90 días']], S.range));
      const { from, to } = this.span(), lo = addD(today, -89);
      out.push(`<div class="dates"><button class="dstep" data-act="shift" data-n="-1" aria-label="Rango anterior"${from <= lo ? ' disabled' : ''}>${svg('left', 16)}</button><label><span>Desde</span><input type="date" data-ch="from" value="${esc(from)}" min="${lo}" max="${today}"></label><i>–</i><label><span>Hasta</span><input type="date" data-ch="to" value="${esc(to)}" min="${lo}" max="${today}"></label><button class="dstep" data-act="shift" data-n="1" aria-label="Rango siguiente"${to >= today ? ' disabled' : ''}>${svg('right', 16)}</button></div>`);
    }
    if (sec.id === 'hipotesis') out.push(seg('by', Object.entries(LBL.by), S.by));
    const cohorts = [...new Set((this.data().analytics_testers || []).map((t) => t.cohort).filter(Boolean))].sort();
    if (PEOPLE_SECTIONS.includes(sec.id) && cohorts.length) out.push(`<select class="sel" data-ch="cohort" aria-label="Grupo de prueba"><option value="">Todos los grupos</option>${cohorts.map((c) => `<option${c === S.cohort ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>`);
    // Las personas elegidas, como fichas que se quitan de a una.
    if (S.pick.length) {
      const pm = new Map(all.map((p) => [p.id, p]));
      out.push(`<div class="pick-chips">${S.pick.slice(0, 8).map((id) => { const p = pm.get(id); return `<button class="pchip" data-act="p-drop" data-id="${esc(id)}" title="Quitar">${esc(p ? p.alias || p.email || p.short : String(id).slice(0, 8))}${svg('close', 12)}</button>`; }).join('')}${S.pick.length > 8 ? `<span class="pchip more">+${S.pick.length - 8}</span>` : ''}<button class="pchip clear" data-act="aud" data-n="${esc(S.aud)}">Quitar filtro</button></div>`);
    }
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
    const grouped = SEC_GROUPS.map((g) => ({ label: g.label, list: g.ids.map((id) => SECTIONS.find((s) => s.id === id)).filter(Boolean) }));
    const group = grouped.find((g) => g.list.some((s) => s.id === sec.id));
    const mini = this.sideMini();
    this._mini = mini;
    const side = grouped.map((g) => `<div class="side-group"><div class="side-title">${esc(g.label)}</div>${g.list.map((s) => `<button class="side-item${s.id === sec.id ? ' on' : ''}" data-act="go" data-id="${esc(s.id)}"${mini ? ` title="${esc(s.label)}"` : ''} aria-current="${s.id === sec.id ? 'page' : 'false'}">${svg(SEC_ICON[s.id] || 'chart', 18)}<span>${esc(s.label)}</span></button>`).join('')}</div>`).join('');
    const who = live && S.email ? S.email.trim()[0].toUpperCase() : '';

    this.root.innerHTML = `
      <div class="frame${mini ? ' mini' : ''}">
        <aside class="side" aria-label="Secciones">
          <div class="side-brand"><img class="logo" src="icons/icon-192.png" alt=""><div class="brand-name">AlTanto<span>Analytics</span></div></div>
          <button class="side-search" data-act="secmenu" aria-haspopup="dialog" title="Buscar sección (Ctrl K)">${svg('search', 17)}<span>Buscar sección</span><kbd>Ctrl K</kbd></button>
          <nav class="side-nav" data-side>${side}</nav>
          <button class="side-toggle" data-act="side-mini" aria-label="${mini ? 'Mostrar el menú completo' : 'Achicar el menú'}" title="${mini ? 'Mostrar el menú completo' : 'Achicar el menú'}">${svg(mini ? 'right' : 'left', 16)}<span>Achicar menú</span></button>
        </aside>
        <div class="shell${enter ? ' enter' : ''}">
          <header class="top anim" style="--i:0">
            <div class="crumb">${group ? `<span>${esc(group.label)}</span>${svg('right', 14)}` : ''}<b>${esc(sec.label)}</b></div>
            <div class="top-right">
              <div class="status-pill" title="${esc(status.text)}"><span class="dot" style="background:${status.dot}"></span><span class="status-text">${esc(status.text)}</span></div>
              ${S.mode === 'demo' && !this.forceDemo ? `<button class="pill primary" data-act="login">Entrar con Google</button>` : ''}
              ${live || loading ? `<button class="round" data-act="reload" title="Actualizar" aria-label="Actualizar"${loading ? ' disabled' : ''}>${svg('refresh', 17)}</button><button class="round" data-act="logout" title="Salir" aria-label="Salir">${svg('logout', 17)}</button>` : ''}
              ${who ? `<div class="avatar" title="${esc(S.email)}">${esc(who)}</div>` : ''}
            </div>
          </header>
          <section class="hero anim" style="--i:1">
            <div class="hero-text"><div class="h1-row"><h1>${esc(sec.label)}</h1><button class="help-btn" data-act="guide" aria-label="Guía de ${esc(sec.label)}" title="Qué significa cada cosa">?</button></div><div class="desc">${esc(sec.desc)}</div></div>
            <div class="hero-ctl">${this.controls(sec, false)}</div>
          </section>
          ${this.dataStrip(sec)}
          ${S.notice ? `<div class="notice">${esc(S.notice)}</div>` : ''}
          ${audNote ? `<div class="notice">${esc(audNote)}</div>` : ''}
          ${buildError ? `<div class="notice">No se pudo armar esta sección: ${esc(buildError.message)}</div>` : ''}
          <section class="kpis"${loading ? ' aria-busy="true"' : ''}>${built.kpis.map((k, i) => (loading ? renderKpiSkeleton(k, i + 2) : renderKpi(k, i + 2))).join('')}</section>
          <section class="grid"${loading ? ' aria-busy="true"' : ''}>${built.cards.map((c, i) => (loading ? renderCardSkeleton(c, i + 5) : renderCard(c, false, i + 5))).join('')}</section>
          <div class="footer">${esc(footer)}</div>
        </div>
      </div>
      <div class="sec-back${this.secMenu ? ' open' : ''}" data-act="secmenu-close"></div>
      <div class="sec-menu${this.secMenu ? ' open' : ''}" data-secmenu role="dialog" aria-label="Todas las secciones">${renderSecMenu(sec.id, this.secQ || '')}</div>
      <div data-dlg></div>`;
    // El menú lateral no salta al volver a dibujar.
    const sn = this.root.querySelector('[data-side]');
    if (sn) { if (this._sideY != null) sn.scrollTop = this._sideY; sn.addEventListener('scroll', () => { this._sideY = sn.scrollTop; }, { passive: true }); }
    if (this.secMenu) { const i = this.root.querySelector('[data-sq]'); if (i) i.focus({ preventScroll: true }); }
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
      body = `<div class="m-head anim" style="--i:0"><div class="h1-row"><h1>${esc(sec.label)}</h1><button class="help-btn" data-act="guide" aria-label="Guía de ${esc(sec.label)}">?</button></div><div class="desc">${esc(sec.desc)}</div></div>
        <div class="m-pad m-ctl anim" style="--i:1">${this.controls(sec, true)}</div>
        ${this.dataStrip(sec) ? `<div class="m-pad">${this.dataStrip(sec)}</div>` : ''}
        ${S.notice ? `<div class="m-pad"><div class="notice">${esc(S.notice)}</div></div>` : ''}
        ${audNote ? `<div class="m-pad"><div class="notice">${esc(audNote)}</div></div>` : ''}
        ${buildError ? `<div class="m-pad"><div class="notice">No se pudo armar esta sección: ${esc(buildError.message)}</div></div>` : ''}
        <div class="kpis m-pad"${loading ? ' aria-busy="true"' : ''}>${built.kpis.map((k, i) => (loading ? renderKpiSkeleton(k, i + 2) : renderKpi(k, i + 2))).join('')}</div>
        <div class="grid m-pad"${loading ? ' aria-busy="true"' : ''}>${built.cards.map((c, i) => (loading ? renderCardSkeleton(c, i + 4) : renderCard(c, true, i + 4))).join('')}</div>
        <div class="footer m-pad">${esc(footer)}</div>`;
    } else {
      const PAL = ['#d6451b', '#2b4f9e', '#17171a', '#2f6b55', '#c99a12'];
      let k = 0;
      const groups = SEC_GROUPS.map((g) => ({ label: g.label, list: g.ids.filter((id) => !MAIN_TABS.includes(id)).map((id) => SECTIONS.find((s) => s.id === id)).filter(Boolean) })).filter((g) => g.list.length);
      body = `<div class="m-head anim" style="--i:0"><h1>Más</h1></div>
        ${S.notice ? `<div class="m-pad"><div class="notice">${esc(S.notice)}</div></div>` : ''}
        ${groups.map((g, gi) => `<div class="m-gtitle anim" style="--i:${gi + 1}">${esc(g.label)}</div><div class="m-group anim" style="--i:${gi + 1}">${g.list.map((s) => `<button class="m-row" data-act="go" data-id="${esc(s.id)}">
          <span class="m-badge" style="background:${PAL[k++ % PAL.length]}">${esc(s.label[0])}</span>
          <span class="m-row-text"><span class="m-row-title">${esc(s.label)}</span><span class="m-row-sub">${esc(s.desc)}</span></span>${chev}
        </button>`).join('')}</div>`).join('')}
        <div class="m-group anim" style="--i:${groups.length + 1}"><button class="m-row m-account" data-act="sheet" data-open="1">${dot(status.dot)}<span class="m-row-title grow">${esc(status.text)}</span><span class="m-row-aside">Cuenta</span>${chev}</button></div>
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
// Cómo se agrupan las secciones en el menú, en «Todas» y en «Más».
const SEC_GROUPS = [
  { label: 'Prueba con usuarios', ids: ['resumen', 'hipotesis', 'testers', 'bitacora'] },
  { label: 'Uso del producto', ids: ['activacion', 'uso', 'adopcion'] },
  { label: 'Correo y clasificación', ids: ['correo', 'clasificacion', 'comercios', 'monitoreo', 'suscripciones'] },
  { label: 'Negocio y calidad', ids: ['pro', 'calidad', 'versiones'] },
];
// Ícono de cada sección en el menú lateral.
const SEC_ICON = { resumen: 'chart', hipotesis: 'target', testers: 'users', bitacora: 'calendar', activacion: 'trend', uso: 'activity', adopcion: 'sliders', correo: 'mail', clasificacion: 'tag', comercios: 'store', monitoreo: 'eye', suscripciones: 'repeat', pro: 'star', calidad: 'zap', versiones: 'layers' };
function renderSecMenu(cur, q) {
  return `<div class="sm-head">${svg('search', 18)}<input type="search" data-sq value="${esc(q)}" placeholder="Busca una sección: retención, comercios, versiones…" aria-label="Buscar sección"><kbd>Esc</kbd></div><div class="sm-list" data-smlist>${secMenuList(cur, q)}</div>`;
}
function secMenuList(cur, q) {
  const f = fold((q || '').trim());
  const groups = SEC_GROUPS.map((g) => ({ label: g.label, list: g.ids.map((id) => SECTIONS.find((s) => s.id === id)).filter((s) => s && (!f || fold(s.label + ' ' + s.desc + ' ' + g.label).includes(f))) })).filter((g) => g.list.length);
  if (!groups.length) return `<div class="empty">Ninguna sección coincide con «${esc(q)}».</div>`;
  return groups.map((g) => `<div class="sm-group"><div class="sm-title">${esc(g.label)}</div>${g.list.map((s) => `<button class="sm-item${s.id === cur ? ' on' : ''}" data-act="go" data-id="${esc(s.id)}"><span class="sm-ic">${svg(SEC_ICON[s.id] || 'chart', 18)}</span><span class="sm-tx"><b>${esc(s.label)}</b><span>${esc(s.desc)}</span></span></button>`).join('')}</div>`).join('');
}
const pickCount = (n) => n + (n === 1 ? ' persona' : ' personas');

// Hoja para elegir personas por ID, correo o alias (una o varias).
function renderPicker(hits, st, anim) {
  return `<div class="dlg-back${anim ? ' anim-in' : ''}" data-act="p-close"></div>
    <div class="dlg pick-dlg${anim ? ' anim-in' : ''}" role="dialog" aria-modal="true" aria-label="Elegir personas">
      <div class="dlg-head">
        <div class="card-titles"><div class="dlg-kicker">Filtro</div><div class="dlg-title">Elegir personas</div><div class="card-sub">Busca por ID, correo, alias o user persona. Para elegir varias de una vez, pega una lista separada por comas o espacios y toca «Elegir los resultados».</div></div>
        <button class="icon-btn" data-act="p-close" aria-label="Cerrar">${svg('close', 18)}</button>
      </div>
      <div class="pick-tools"><input class="roster-q" type="search" data-pq value="${esc(st.q)}" placeholder="ID, correo, alias…" aria-label="Buscar personas"><button class="pill ghost small" data-act="p-all">Elegir los resultados</button><button class="pill ghost small" data-act="p-clear">Ninguna</button></div>
      <div class="dlg-body"><div data-plist>${pickList(hits, st.sel)}</div></div>
      <div class="pick-foot"><span data-pcount>${esc(pickCount(st.sel.size))}</span><button class="pill ghost" data-act="p-close">Cancelar</button><button class="pill primary" data-act="p-apply">Aplicar</button></div>
    </div>`;
}
function pickList(hits, sel) {
  if (!hits.length) return '<div class="empty">Nadie coincide con la búsqueda.</div>';
  const max = 300;
  return `<div class="pick-list">${hits.slice(0, max).map((p) => { const on = sel.has(p.id); return `<button class="pk${on ? ' on' : ''}" data-act="p-toggle" data-id="${esc(p.id)}" role="checkbox" aria-checked="${on}">
      <span class="pk-box">${on ? svg('check', 14) : ''}</span>
      <span class="pk-main"><span class="pk-title"><code>${esc(p.short)}</code>${p.alias ? `<b>${esc(p.alias)}</b>` : ''}${p.tester ? '<span class="pk-tag">Tester</span>' : ''}</span><span class="pk-sub">${esc([p.email, p.persona, p.iphone, p.channel ? lab('channel', p.channel) : ''].filter(Boolean).join(' · ') || '—')}</span></span>
      <span class="pk-days">${esc(p.last ? fd(p.last) : '')}</span>
    </button>`; }).join('')}</div>${hits.length > max ? `<div class="rr-more">Mostrando ${max} de ${hits.length}. Afina la búsqueda.</div>` : ''}`;
}
// Las que se arman persona por persona (v22): cambian con la audiencia también con los datos de ejemplo.
const PEOPLE_SECTIONS = ['hipotesis', 'testers', 'monitoreo'];
let rosterQ = '';

function renderKpi(k, i) {
  const def = guideDef(k.label);
  return `<div class="kpi anim${def ? ' has-def' : ''}" style="--i:${i}"${def ? ` title="${esc(k.label + ': ' + def)}"` : ''}><div class="kpi-ic">${svg(kIcon(k.label), 19)}</div><div class="kpi-tx"><div class="kpi-value" style="color:${esc(k.color)}">${esc(k.value)}</div><div class="kpi-label">${esc(k.label)}</div>${k.sub ? `<div class="kpi-sub">${esc(k.sub)}</div>` : ''}</div></div>`;
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
  // Una tabla se abre entera, o con su propio detalle (más columnas) si lo trae.
  const d = isTable ? c.detail || c : c.detail;
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

  if (t === 'calendar') {
    const wd = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return `<div class="cal">
      <div class="cal-nav"><button class="dstep" data-act="cal-move" data-n="-1" aria-label="Mes anterior">${svg('left', 16)}</button><button class="pill ghost small" data-act="cal-today">Hoy</button><button class="dstep" data-act="cal-move" data-n="1" aria-label="Mes siguiente">${svg('right', 16)}</button><button class="pill primary small cal-add" data-act="m-new">+ Anotar hito</button></div>
      <div class="cal-grid">${wd.map((d) => `<div class="cal-wd">${d}</div>`).join('')}${c.cells.map((x) => `<button class="cal-cell${x.out ? ' out' : ''}${x.today ? ' today' : ''}${x.sel ? ' sel' : ''}${x.evs.length ? ' has' : ''}" data-act="cal-day" data-d="${esc(x.d)}" aria-label="${esc(fd(x.d))}${x.evs.length ? ', ' + x.evs.length + ' hitos' : ''}"><span class="cal-n">${x.n}</span>${x.evs.slice(0, 4).map((e) => `<span class="cal-ev${e.auto ? ' auto' : ''}" style="--c:${e.c}">${esc(e.title)}</span>`).join('')}${x.evs.length > 4 ? `<span class="cal-more">+${x.evs.length - 4}</span>` : ''}</button>`).join('')}</div>
    </div>`;
  }
  if (t === 'mlist') {
    return `<div class="mlist">${c.groups.map((g) => (g.label ? `<div class="ml-h">${esc(g.label)}</div>` : '') + (g.items.length ? g.items.map((m) => msItem(m, !!c.day)).join('') : `<div class="ml-empty">${c.day ? 'Nada anotado ese día.' : 'Nada todavía.'}</div>`)).join('')}${c.day ? `<button class="pill primary small ml-add" data-act="m-new" data-d="${esc(c.day)}">+ Anotar el ${esc(fd(c.day))}</button>` : ''}</div>`;
  }
  if (t === 'timeline') {
    return `<div class="tl"><div class="tl-filters">${c.kinds.map((k) => `<button class="kchip${k.on ? ' on' : ''}" data-act="cal-kind" data-k="${esc(k.k)}" style="--c:${k.c}"><i></i>${esc(k.label)}<small>${k.n}</small></button>`).join('')}<button class="kchip auto${c.auto ? ' on' : ''}" data-act="cal-auto">${c.auto ? svg('check', 12) : ''}Automáticos</button></div>
      ${c.items.length ? `<div class="tl-list">${c.items.map((m) => msItem(m, true)).join('')}</div>` : '<div class="empty">Nada con estos filtros.</div>'}</div>`;
  }
  if (t === 'roster') {
    const tf = c.people.filter((p) => p.channel === 'TestFlight' && !p.tester).length;
    return `<div class="roster">
      <div class="roster-tools"><input class="roster-q" type="search" data-q value="${esc(rosterQ)}" placeholder="Busca por ID, correo, alias o persona" aria-label="Buscar instalación">${tf ? `<button class="pill ghost" data-act="mark-tf">Marcar ${tf} de TestFlight</button>` : ''}</div>
      <div data-rlist>${rosterList(c)}</div>
    </div>`;
  }
  return '';
}

// Las filas de la lista de instalaciones que coinciden con la búsqueda.
function rosterList(c) {
  const q = fold(rosterQ.trim());
  const hit = c.people.filter((p) => !q || [p.id, p.alias, p.email, p.persona, p.cohort, p.iphone].some((v) => fold(v).includes(q)));
  const max = 200;
  if (!c.people.length) return `<div class="empty">Todavía no hay instalaciones. Corre sql/altanto_analytics_v22_testers.sql y toca Actualizar.</div>`;
  if (!hit.length) return `<div class="empty">Ninguna instalación coincide con «${esc(rosterQ)}»</div>`;
  return `<div class="rr-list">${hit.slice(0, max).map((p) => `<div class="rr${p.tester ? ' on' : ''}">
      <button class="chk${p.tester ? ' on' : ''}" data-act="t-toggle" data-id="${esc(p.id)}" role="switch" aria-checked="${p.tester}" aria-label="Tester ${esc(p.short)}"><i></i></button>
      <div class="rr-main"><div class="rr-title"><code>${esc(p.short)}</code>${p.alias ? `<b>${esc(p.alias)}</b>` : `<span class="rr-muted">${p.tester ? 'Sin alias' : 'No tester'}</span>`}</div><div class="rr-sub">${esc([p.email, p.persona, p.iphone, p.channel, p.cohort].filter(Boolean).join(' · ') || '—')}</div></div>
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

// ── Bitácora ────────────────────────────────────────────────────────────
// Sección en pantalla, para que los KPI busquen su definición en la guía correcta.
let CUR_SEC = 'resumen';
// guide.js puede llegar después (caché del navegador): sin él, el panel sigue funcionando sin guía.
const G = () => (typeof GUIDE !== 'undefined' ? GUIDE : { general: { label: 'Conceptos generales', terms: [] } });
const guideDef = (label) => { const all = G(), g = all[CUR_SEC]; const x = (g && g.terms.find((t) => t.t === label)) || all.general.terms.find((t) => t.t === label); return x ? x.d : null; };
const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '');

// Cómo cambió una métrica de la semana antes a la semana después.
function impTxt(label, pair, points) {
  const [a, b] = pair;
  if (a == null || b == null) return '';
  const fmt = (v) => (points ? P(r1(v)) : N(r1(v)));
  const diff = points ? b - a : a ? ((b - a) / a) * 100 : null;
  if (diff == null) return '';
  const cls = Math.abs(diff) < (points ? 1 : 3) ? 'flat' : diff > 0 ? 'up' : 'down';
  return `<span class="imp ${cls}"><em>${esc(label)}</em>${esc(fmt(a))} → ${esc(fmt(b))}<b>${diff > 0 ? '+' : ''}${esc(points ? r1(diff) + ' pts' : P(r1(diff)))}</b></span>`;
}
function msItem(m, long) {
  const imp = long && m.imp;
  const link = safeUrl(m.link);
  return `<div class="ms${m.auto ? ' auto' : ''}" style="--c:${m.c}">
    <div class="ms-date"><b>${esc(fd(m.day))}</b>${m.end ? `<span>al ${esc(fd(m.end))}</span>` : ''}</div>
    <div class="ms-main">
      <div class="ms-top"><span class="ms-kind">${esc(m.klabel)}</span>${m.auto ? '<span class="ms-auto">Automático</span>' : ''}${m.cohort ? `<span class="ms-tag">${esc(m.cohort)}</span>` : ''}${m.version && !m.auto ? `<span class="ms-tag">v${esc(m.version)}</span>` : ''}</div>
      <div class="ms-title">${esc(m.title)}</div>
      ${m.notes ? `<div class="ms-notes">${esc(m.notes)}</div>` : ''}
      ${imp ? `<div class="ms-imp">${impTxt('DAU', imp.dau, false)}${impTxt('Clasif. automática', imp.auto, true)}${imp.partial ? `<span class="ms-part">después: ${imp.days} de 7 días</span>` : ''}</div>` : ''}
      ${link || m.by ? `<div class="ms-foot">${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Abrir enlace</a>` : ''}${m.by ? `<span>${esc(m.by)}</span>` : ''}</div>` : ''}
    </div>
    <button class="pill ghost small" data-act="m-edit" data-id="${esc(m.id)}" title="${m.auto ? 'Anotar algo sobre este hito' : 'Editar'}">${m.auto ? 'Anotar' : 'Editar'}</button>
  </div>`;
}
function renderMsEditor(m, cohorts, anim) {
  const v = (k) => esc(m[k] == null ? '' : String(m[k]));
  const fld = (label, html, cls) => `<label class="fld${cls ? ' ' + cls : ''}"><span>${esc(label)}</span>${html}</label>`;
  const editing = !!m.id;
  return `<div class="dlg-back${anim ? ' anim-in' : ''}" data-act="m-close"></div>
    <div class="dlg dlg-form ms-dlg${anim ? ' anim-in' : ''}" role="dialog" aria-modal="true" aria-label="Hito">
      <div class="dlg-head">
        <div class="card-titles"><div class="dlg-kicker">Bitácora</div><div class="dlg-title">${editing ? 'Editar hito' : 'Anotar un hito'}</div><div class="card-sub">Lo que pasó (o va a pasar) y por qué importa. Lo ven todos los administradores del panel.</div></div>
        <button class="icon-btn" data-act="m-close" aria-label="Cerrar">${svg('close', 18)}</button>
      </div>
      <form class="dlg-body" data-mform onsubmit="return false">
        <div class="fgrid">
          ${fld('Qué pasó', `<input name="title" type="text" required maxlength="200" value="${v('title')}" placeholder="Llamada con 5 testers de Prueba 1">`, 'wide')}
          ${fld('Tipo', `<select name="kind">${MKIND_MANUAL.map((k) => `<option value="${k}"${(m.kind || 'other') === k ? ' selected' : ''}>${esc(mkLab(k))}</option>`).join('')}</select>`)}
          ${fld('Fecha', `<input name="day" type="date" required value="${v('day')}">`)}
          ${fld('Hasta (si dura varios días)', `<input name="end_day" type="date" value="${v('end')}">`)}
          ${fld('Grupo de testers', `<input name="cohort" type="text" list="dl-mcohort" maxlength="40" value="${v('cohort')}" placeholder="Prueba 1">`)}
          ${fld('Versión de la app', `<input name="version" type="text" maxlength="20" value="${v('version')}" placeholder="3.8.4">`)}
          ${fld('Enlace', `<input name="link" type="url" maxlength="500" value="${v('link')}" placeholder="https://miro.com/…">`)}
          ${fld('Notas: qué aprendimos o decidimos', `<textarea name="notes" rows="4" maxlength="2000">${v('notes')}</textarea>`, 'wide')}
        </div>
        <datalist id="dl-mcohort">${cohorts.map((x) => `<option value="${esc(x)}"></option>`).join('')}</datalist>
        <div class="factions">${editing ? '<button type="button" class="pill ghost danger" data-act="m-del">Borrar</button>' : ''}<button type="button" class="pill" data-act="m-close">Cancelar</button><button type="button" class="pill primary" data-act="m-save">Guardar</button></div>
      </form>
    </div>`;
}

// ── Guía ────────────────────────────────────────────────────────────────
function renderGuide(st, anim) {
  const GD = G(), g = GD[st.id] || GD.general;
  const sec = SECTIONS.find((s) => s.id === st.id);
  return `<div class="dlg-back${anim ? ' anim-in' : ''}" data-act="g-close"></div>
    <div class="dlg guide-dlg${anim ? ' anim-in' : ''}" role="dialog" aria-modal="true" aria-label="Guía">
      <div class="dlg-head">
        <div class="card-titles"><div class="dlg-kicker">Guía</div><div class="dlg-title">${esc(sec ? sec.label : g.label)}</div>${g.intro ? `<div class="card-sub">${esc(g.intro)}</div>` : ''}</div>
        <button class="icon-btn" data-act="g-close" aria-label="Cerrar">${svg('close', 18)}</button>
      </div>
      <div class="pick-tools"><input class="roster-q" type="search" data-gq value="${esc(st.q)}" placeholder="Busca un término: DAU, retención, p90…" aria-label="Buscar en la guía"><button class="kchip${st.all ? ' on' : ''}" data-act="g-all">Todo el glosario</button></div>
      <div class="dlg-body" data-glist>${guideBody(st)}</div>
    </div>`;
}
function guideBody(st) {
  const q = fold((st.q || '').trim());
  const hit = (x) => !q || fold(x.t + ' ' + x.d).includes(q);
  const block = (title, terms) => { const ts = terms.filter(hit); return ts.length ? `<div class="g-sec"><div class="g-h">${esc(title)}</div><dl class="g-terms">${ts.map((x) => `<div><dt>${esc(x.t)}</dt><dd>${esc(x.d)}</dd></div>`).join('')}</dl></div>` : ''; };
  const GD = G(), g = GD[st.id];
  let html = '';
  if (!q && !st.all && g && g.how) html += `<div class="g-sec"><div class="g-h">Cómo leerla</div><ul class="g-how">${g.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  if (st.all || q) {
    const order = [st.id].concat(SECTIONS.map((s) => s.id).filter((id) => id !== st.id)).filter((id) => GD[id]);
    html += order.map((id) => block((SECTIONS.find((s) => s.id === id) || {}).label || id, GD[id].terms)).join('') + block(GD.general.label, GD.general.terms);
  } else {
    if (g) html += block('Conceptos de esta sección', g.terms);
    html += block(GD.general.label, GD.general.terms);
  }
  return html || `<div class="empty">Nada coincide con «${esc(st.q)}».</div>`;
}

new App(document.getElementById('app'));
