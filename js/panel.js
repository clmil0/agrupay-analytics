// Lógica del panel: datos de ejemplo, lectura de Supabase y armado de cada sección.
// Sale del diseño «Panel de Analítica»; la vista está en app.js.

const SB_URL = 'https://zxfeixwrruclypwjuhnl.supabase.co';
const SB_KEY = 'sb_publishable_wJE6quWd2Lu_4rgYvF39CA_iur9-VeT';
const LS_SESSION = 'agrupay-panel-session';
const LS_UI = 'agrupay-panel-ui';
// Paleta crema / negro / naranja / azul; cada color es un token de styles.css (cambia en modo oscuro).
const COL = { a: 'var(--c-orange)', ink: 'var(--c-ink)', blue: 'var(--c-blue)', gold: 'var(--c-yellow)', green: 'var(--c-green)', pur: 'var(--c-blue)', cyan: 'var(--c-green)', pos: 'var(--pos)', org: 'var(--c-ink)', neg: 'var(--neg)', warn: 'var(--warn)', mute: 'var(--c-sand)' };

const SECTIONS = [
  { id: 'resumen', label: 'Resumen', desc: 'Usuarios activos, instalaciones nuevas y qué trae a la gente de vuelta.' },
  { id: 'hipotesis', label: 'Hipótesis', desc: 'Cada hipótesis de la prueba contra su meta, persona por persona y día a día. Se mide al cierre del rango.' },
  { id: 'testers', label: 'Testers', desc: 'Quién es tester y quién no, su perfil, su encuesta y cómo se mueve cada uno.' },
  { id: 'activacion', label: 'Activación y retención', desc: 'Onboarding por cohorte, hitos y retención D1 / D7 / D30.' },
  { id: 'uso', label: 'Uso', desc: 'Pantallas, toques, navegación y funciones.' },
  { id: 'correo', label: 'Motor de correo', desc: 'Lectores por banco, lecturas, latencia y cuentas conectadas.' },
  { id: 'clasificacion', label: 'Clasificación', desc: 'Automático contra manual, precisión de cada motor, sugerencias y Pendientes.' },
  { id: 'comercios', label: 'Comercios', desc: 'Qué comercios se clasifican solos, cuáles se corrigen y cuáles llegan sin categoría.' },
  { id: 'suscripciones', label: 'Suscripciones', desc: 'Cuánto acierta el detector de suscripciones en los últimos 30 días.', fixed: true },
  { id: 'pro', label: 'Pro y paywall', desc: 'Qué función vende y cuánto se usa lo Pro.' },
  { id: 'calidad', label: 'Calidad', desc: 'Arranque, crashes, cuelgues, errores y Face ID.' },
  { id: 'adopcion', label: 'Adopción de ajustes', desc: 'Última foto diaria de cada instalación en los últimos 14 días.', fixed: true },
  { id: 'versiones', label: 'Versiones', desc: 'Versiones en uso en los últimos 7 días.', fixed: true },
];

const LBL = {
  src: { icon: 'Ícono', notification: 'Notificación', link: 'Widget / Atajos', invite: 'Invitación' },
  step: { slide_1: 'Pantalla 1', slide_2: 'Pantalla 2', slide_3: 'Pantalla 3', login: 'Inicio de sesión', connect_tapped: 'Tocó conectar', connected: 'Conectó el correo', restore_offered: 'Se ofreció restaurar', history: 'Historial', reading: 'Leyendo', no_account: 'Sin cuenta', finished: 'Terminó' },
  ms: { first_movement: 'Primer movimiento', first_email_movement: 'Primer movimiento del correo', first_classification: 'Primera clasificación', first_rule: 'Primera regla', first_friend: 'Primer amigo' },
  engine: { rule: 'Regla de comercio', keyword: 'Palabra clave', voice: 'Voz', recurring: 'Recurrente', usuario: 'Usuario' },
  sugg: { rule: 'Regla', root: 'Raíz', catalog: 'Catálogo' },
  pro: { history: 'Historial', ai: 'Asistente IA', alerts: 'Alertas', cloud: 'Nube', sync: 'Sincronización', themes: 'Temas', profile: 'Perfil', general: 'General' },
  acct: { account_connect_started: 'Abrió la ventana', account_connected: 'Conectó', account_connect_failed: 'Falló', account_disconnected: 'Desconectó' },
  prov: { google: 'Google', microsoft: 'Microsoft', gmail: 'Gmail', outlook: 'Outlook' },
  msrc: { form: 'Formulario', form_locked: 'Formulario (bloqueado)', quick: 'Rápido', voice: 'Voz', siri: 'Siri', recurring: 'Recurrente' },
  via: { detail: 'Detalle', pending_suggestion: 'Sugerencia en Pendientes', pending_sheet: 'Hoja en Pendientes', bulk: 'En bloque', bulk_suggestions: 'Sugerencias en bloque', selection: 'Selección', assistant: 'Asistente', quick_sheet: 'Hoja de clasificar', burst: 'Ráfaga' },
  origin: { pending: 'Pendientes', bulk: 'En bloque', detail: 'Detalle', add_form: 'Formulario', quick_sheet: 'Hoja de clasificar', burst: 'Ráfaga', selection: 'Selección' },
  msrcs: { auto: 'Solo (motor)', arrived: 'Llegó sin categoría', manual: 'A mano', reclassified: 'Reclasificado' },
  mode: { single: 'Hoja suelta', burst: 'Ráfaga', bulk: 'En bloque' },
  level: { detected: 'Detectada', suggested: 'Sugerida' },
  cadence: { weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' },
  ctrl: { 'movements.month': 'Mes', 'movements.accounts': 'Tus cuentas', 'movements.earlier': 'Meses anteriores', 'movements.penguin': 'Pingüino', 'movements.classify': 'Clasificar ›' },
  notif: { imported: 'Importados', payment_reminder: 'Recordatorio de pago', debt_reminder: 'Recordatorio de deuda', recurring: 'Recurrente', budget: 'Presupuesto', category_limit: 'Límite de categoría', other: 'Otro' },
  unlock: { ok: 'Correcto', cancelled: 'Cancelado', not_recognized: 'No reconocido', lockout: 'Bloqueado' },
  channel: { testflight: 'TestFlight', appstore: 'App Store', development: 'Xcode' },
  aud: { all: 'Todos', testers: 'Testers', others: 'No testers' },
  gender: { f: 'Mujer', m: 'Hombre', otro: 'Otro' },
  pay: { si: 'Sí pagaría', tal_vez: 'Tal vez', no: 'No pagaría' },
  fatal: { muy: 'Muy decepcionado', algo: 'Algo decepcionado', nada: 'Nada decepcionado' },
  by: { persona: 'User persona', gender: 'Género', age: 'Edad', iphone: 'iPhone' },
};
const lab = (d, k) => (k == null ? '—' : (LBL[d] && LBL[d][k]) || k);

const limaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
const addD = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const monday = (s) => { const d = new Date(s + 'T00:00:00Z'); return addD(s, -((d.getUTCDay() + 6) % 7)); };
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fd = (s) => { if (!s) return '—'; const p = String(s).slice(0, 10).split('-'); return (+p[2]) + ' ' + MES[+p[1] - 1]; };
const nf = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
const ok = (v) => v != null && v !== '' && !isNaN(v) && isFinite(v);
const N = (v) => (ok(v) ? nf.format(+v) : '—');
const N0 = (v) => (ok(v) ? nf.format(Math.round(+v)) : '—');
const P = (v) => (ok(v) ? nf.format(+v) + ' %' : '—');
const MS = (v) => (!ok(v) ? '—' : +v >= 1000 ? nf.format(Math.round(+v / 100) / 10) + ' s' : Math.round(+v) + ' ms');
const MIN = (v) => (ok(v) ? nf.format(+v) + ' min' : '—');
const FH = (h) => (!ok(h) ? '—' : h < 1 ? Math.round(h * 60) + ' min' : h < 48 ? nf.format(Math.round(h * 10) / 10) + ' h' : nf.format(Math.round(h / 2.4) / 10) + ' d');
const num = (v) => (ok(v) ? +v : 0);
// Último día del rango elegido; lo fija build(). Con «Fechas» puede no ser hoy.
let R_END = null;
const inR = (rows, start, key) => (rows || []).filter((x) => { const d = String(x[key || 'day']).slice(0, 10); return d >= start && (!R_END || d <= R_END); });
const group = (rows, kf, vf) => { const m = new Map(); (rows || []).forEach((x) => { const k = kf(x); m.set(k, (m.get(k) || 0) + num(vf(x))); }); return m; };
const sum = (rows, f) => (rows || []).reduce((a, x) => a + num(typeof f === 'function' ? f(x) : x[f]), 0);
const byDay = (rows) => { const m = new Map(); (rows || []).forEach((x) => m.set(String(x.day).slice(0, 10), x)); return m; };
const latest = (rows, key) => (rows || []).slice().sort((a, b) => (a[key] < b[key] ? 1 : -1))[0];
const wavg = (rows, k, w) => { const xs = (rows || []).filter((x) => ok(x[k])); const n = sum(xs, w); return n ? xs.reduce((a, x) => a + num(x[k]) * num(x[w]), 0) / n : null; };
const items = (m, d, extra) => [...m.entries()].map(([k, v]) => Object.assign({ label: d ? lab(d, k) : (k == null ? '—' : String(k)), value: v, key: k }, extra ? extra(k, v) : {}));
// Suma las columnas `keys` de la fila `x` en el acumulado de la clave `k`.
const tally = (m, k, keys, x) => { const o = m.get(k) || m.set(k, Object.fromEntries(keys.map((c) => [c, 0]))).get(k); keys.forEach((c) => { o[c] += num(x[c]); }); return o; };
const pct = (a, b) => (num(b) ? Math.round((num(a) / num(b)) * 1000) / 10 : null);
// Comercios: lo que va a una persona llega como `yape_persona`, `plin_persona`… o `persona`.
const mlab = (k) => { if (k == null) return '—'; const m = /^(?:(.+)_)?persona$/.exec(k); if (!m) return String(k); return m[1] ? ({ yape: 'Yape', plin: 'Plin' }[m[1]] || m[1].toUpperCase()) + ' · a persona' : 'A una persona'; };
const clab = (k) => { if (k == null || k === '') return '—'; if (k === 'sin_clasificar') return 'Sin clasificar'; const s = String(k).replace(/_/g, ' '); return s[0].toUpperCase() + s.slice(1); };
// Para porcentajes donde lo bajo es lo malo (precisión, acierto).
const pctLow = (v, bad) => (!ok(v) ? { v: '—', color: 'var(--text3)' } : { v: P(v), n: +v, color: v < bad ? 'var(--neg)' : 'var(--text)', fw: v < bad ? 600 : 400 });
// Celda numérica que guarda el valor crudo para las barras y el mapa de calor de las tablas.
const nc = (v, f) => ({ v: (f || N)(v), n: ok(v) ? +v : null });
const r1 = (v) => (ok(v) ? Math.round(+v * 10) / 10 : null);
const pctCell = (v, bad) => (!ok(v) ? { v: '—', color: 'var(--text3)' } : { v: P(Math.round(v * 10) / 10), n: +v, color: bad != null && v >= bad ? 'var(--neg)' : 'var(--text)', fw: bad != null && v >= bad ? 600 : 400 });

function makeDemo() {
  let seed = 11;
  const r = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ri = (a, b) => Math.round(a + r() * (b - a));
  const jit = (v, j) => Math.max(0, Math.round(v * (1 - j + r() * 2 * j)));
  const today = limaToday();
  const D = {};
  const push = (k, o) => (D[k] = D[k] || []).push(o);
  const ver = (i) => (i < 40 ? '1.4.0' : i < 70 ? '1.4.1' : '1.5.0');
  for (let i = 0; i < 90; i++) {
    const day = addD(today, i - 89);
    const wd = new Date(day + 'T00:00:00Z').getUTCDay();
    const dau = jit((70 + i * 0.9) * (wd === 0 || wd === 6 ? 0.86 : 1), 0.07);
    const pro = Math.round(dau * (0.15 + i * 0.0006));
    push('analytics_daily_active', { day, active_installs: dau, active_pro: pro, sessions: Math.round(dau * 2.4), opens: Math.round(dau * 3.2), events: dau * 58 });
    const inst = ri(2, 9) + (i > 60 ? ri(0, 4) : 0);
    const pre = i < 4 ? ri(20, 40) : 0;
    push('analytics_new_installs_daily', { day, installs: inst + pre, new_users: inst, existing_users_updated: pre });
    [['icon', 0.7], ['notification', 0.17], ['link', 0.1], ['invite', 0.03]].forEach(([source, f]) => push('analytics_open_sources_daily', { day, source, opens: jit(dau * 3.2 * f, 0.15), installs: jit(dau * f * 1.2, 0.15) }));
    [['summary', 3.2, 40], ['movements/Movimientos', 2.1, 35], ['movements/Pendientes', 1.4, 50], ['movements/Análisis', 0.6, 45], ['add_movement', 0.7, 18], ['expense_detail', 1.1, 12], ['category_detail', 0.5, 30], ['friends/Amigos', 0.4, 20], ['friends/Cobros', 0.25, 25], ['goals', 0.3, 22], ['settings', 0.35, 30], ['dictation', 0.2, 9], ['assistant', 0.12, 70], ['bulk_classify', 0.15, 60], ['paywall', 0.08, 14]].forEach(([screen, w, sec]) => { const v = jit(dau * w, 0.15); push('analytics_screens_daily', { day, screen, views: v, installs: jit(dau * Math.min(1, w * 0.5), 0.1), minutes: Math.round(v * sec / 6) / 10 }); });
    [['summary.card', 1.3], ['tabbar.add', 0.9], ['summary.settings', 0.3], ['summary.assistant', 0.12], ['appearance.locked_theme', 0.03], ['onboarding.skip', 0.02]].forEach(([target, w]) => push('analytics_taps_daily', { day, target, taps: jit(dau * w, 0.2), installs: jit(dau * w * 0.4, 0.2) }));
    [['tab_select', 'movements', 1.6], ['tab_select', 'summary', 0.9], ['tab_select', 'friends', 0.5], ['tab_select', 'goals', 0.3], ['section_select', 'Pendientes', 1.0], ['section_select', 'Movimientos', 0.8], ['section_select', 'Análisis', 0.5], ['section_select', 'Cobros', 0.3], ['section_select', 'Amigos', 0.2], ['section_select', 'Perfil', 0.15]].forEach(([event, target, w]) => push('analytics_navigation_daily', { day, event, target, selects: jit(dau * w, 0.2), installs: jit(dau * w * 0.4, 0.2) }));
    [['pending_inbox', 0.9], ['category_detail', 0.5], ['analysis', 0.45], ['hide_amounts', 0.3], ['dictation', 0.22], ['mic_hold', 0.12], ['bulk_classify', 0.15], ['friends', 0.2], ['receivables', 0.14], ['split', 0.1], ['assistant', 0.1], ['recurring', 0.08], ['export', 0.03], ['siri', 0.03], ['payment_reminder', 0.05], ['range_sync', 0.02]].forEach(([feature, w]) => push('analytics_feature_usage_daily', { day, feature, uses: jit(dau * w, 0.25), installs: jit(dau * w * 0.6, 0.25) }));
    const emails = dau * 1.6;
    [['BCP', 0.32], ['BBVA', 0.18], ['Interbank', 0.16], ['Scotiabank', 0.08], ['Yape', 0.18], ['Plin', 0.08]].forEach(([bank, w]) => {
      const n = emails * w;
      const miss = bank === 'Interbank' && i > 83 ? 0.14 : 0.012;
      push('analytics_parser_health_daily', { day, bank, kind: 'expense', result: 'inserted', provider: 'gmail', emails: jit(n * 0.8, 0.15), installs: jit(n * 0.3, 0.15) });
      push('analytics_parser_health_daily', { day, bank, kind: 'income', result: 'inserted', provider: 'gmail', emails: jit(n * 0.12, 0.2), installs: jit(n * 0.08, 0.2) });
      push('analytics_parser_health_daily', { day, bank, kind: 'expense', result: 'duplicate', provider: 'gmail', emails: jit(n * 0.06, 0.3), installs: jit(n * 0.03, 0.3) });
      push('analytics_parser_health_daily', { day, bank, kind: 'expense', result: 'amount_missing', provider: 'gmail', emails: Math.round(n * miss + (r() < 0.3 ? 1 : 0)), installs: 1 });
    });
    const runs = jit(dau * 2, 0.1), checked = runs * 3;
    push('analytics_sync_runs_daily', { day, range_sync: false, runs, checked, new_movements: Math.round(checked * 0.55), unrecognized: jit(checked * 0.08, 0.2), failed_fetch: ri(0, 3), avg_seconds: 2.1, pct_unrecognized: 8 });
    push('analytics_email_latency_daily', { day, provider: 'gmail', movements: jit(emails * 0.85, 0.1), p50_min: Math.round((3 + r() * 1.5) * 10) / 10, p90_min: Math.round((12 + r() * 5) * 10) / 10 });
    push('analytics_email_latency_daily', { day, provider: 'outlook', movements: jit(emails * 0.1, 0.2), p50_min: Math.round((5 + r() * 2) * 10) / 10, p90_min: Math.round((18 + r() * 6) * 10) / 10 });
    const started = ri(3, 10), conn = Math.round(started * 0.82);
    push('analytics_accounts_daily', { day, event: 'account_connect_started', provider: 'google', reason: null, origin: null, events: started, installs: started });
    push('analytics_accounts_daily', { day, event: 'account_connected', provider: 'google', reason: null, origin: null, events: conn, installs: conn });
    push('analytics_accounts_daily', { day, event: 'account_connect_failed', provider: 'google', reason: 'cancelled', origin: null, events: started - conn, installs: started - conn });
    if (r() < 0.25) push('analytics_accounts_daily', { day, event: 'account_connect_failed', provider: 'microsoft', reason: 'token_exchange', origin: null, events: 1, installs: 1 });
    if (r() < 0.3) push('analytics_accounts_daily', { day, event: 'account_disconnected', provider: 'google', reason: r() < 0.6 ? 'revoked' : 'user', origin: null, events: 1, installs: 1 });
    const ex = emails * 0.8, ar = Math.round(ex * (0.38 + i * 0.001)), ak = Math.round(ex * 0.18), tp = Math.round(ex - ar - ak), av = ri(1, 5), arc = ri(0, 3), mp = Math.round(tp * 0.6);
    push('analytics_auto_vs_manual_daily', { day, auto_rule: ar, auto_keyword: ak, auto_voice: av, auto_recurring: arc, to_pending: tp, manual_entry: ri(3, 10), manual_from_pending: mp, pct_auto: Math.round(1000 * (ar + ak + av + arc) / (ar + ak + av + arc + mp)) / 10 });
    const pm = Math.max(3, 14 - i * 0.04 + r() * 2);
    push('analytics_pending_backlog_daily', { day, installs: Math.round(dau * 0.9), avg_pending_month: Math.round(pm * 10) / 10, p50_pending_month: Math.round(pm * 0.7), p90_pending_month: Math.round(pm * 2.6), avg_pending_total: Math.round(pm * 2.2 * 10) / 10, pct_month_pending: Math.round(pm * 2.1 * 10) / 10 });
    [['pending_suggestion', 0.4], ['pending_sheet', 0.25], ['detail', 0.15], ['bulk', 0.1], ['bulk_suggestions', 0.07], ['selection', 0.03]].forEach(([via, w]) => { const m = jit(mp * w * 1.1, 0.25); push('analytics_classification_daily', { day, via, category: 'varios', actions: Math.max(1, Math.round(m * 0.7)), movements: m, from_pending: Math.round(m * 0.85), reclassified: Math.round(m * 0.1), with_rule: Math.round(m * 0.3), installs: Math.max(1, Math.round(m * 0.4)) }); });
    [['form', 0.5], ['quick', 0.2], ['voice', 0.15], ['siri', 0.05], ['recurring', 0.08], ['form_locked', 0.02]].forEach(([source, w]) => push('analytics_movements_created_daily', { day, source, kind: 'expense', movements: jit(dau * 0.12 * w * 4, 0.3), installs: jit(dau * 0.1 * w * 4, 0.3) }));
    [['pending', 0.6], ['bulk', 0.2], ['detail', 0.15], ['add_form', 0.05]].forEach(([origin, w]) => push('analytics_rules_daily', { day, origin, rules: jit(dau * 0.18 * w, 0.4), installs: jit(dau * 0.1 * w, 0.4) }));
    push('analytics_notifications_daily', { day, type: 'imported', sent: jit(dau * 0.8, 0.1), opened: jit(dau * 0.18, 0.2) });
    [['payment_reminder', 0.04], ['debt_reminder', 0.02], ['recurring', 0.03], ['budget', 0.02], ['category_limit', 0.015]].forEach(([type, w]) => push('analytics_notifications_daily', { day, type, sent: 0, opened: jit(dau * w, 0.4) }));
    [['history', 0.06], ['ai', 0.04], ['themes', 0.03], ['cloud', 0.02], ['alerts', 0.015], ['sync', 0.015], ['profile', 0.01], ['general', 0.02]].forEach(([feature, w]) => { const s = jit(dau * w, 0.4); push('analytics_paywall_daily', { day, feature, shown: s, installs_shown: s, trials: Math.round(s * (feature === 'history' ? 0.16 : feature === 'ai' ? 0.12 : 0.06) + (r() < 0.15 ? 1 : 0)) }); });
    [['history', 0.55], ['themes', 0.5], ['cloud', 0.45], ['ai', 0.2], ['alerts', 0.12], ['profile', 0.08]].forEach(([feature, w]) => push('analytics_pro_feature_usage_daily', { day, feature, installs: jit(pro * w, 0.2) }));
    const v = ver(i);
    push('analytics_launch_perf_daily', { day, app_version: v, launches: Math.round(dau * 1.3), p50_ms: jit(v === '1.5.0' ? 540 : 640, 0.06), p90_ms: jit(v === '1.5.0' ? 1250 : 1480, 0.08) });
    push('analytics_screen_perf_daily', { day, screen: 'dashboard_catalog', samples: Math.round(dau * 1.3), p50_ms: jit(180, 0.1), p90_ms: jit(430, 0.12) });
    push('analytics_stability_daily', { day, app_version: v, crashes: r() < 0.25 ? ri(1, 2) : 0, hangs_metrickit: r() < 0.3 ? 1 : 0, main_hangs: ri(0, 4), installs_affected: ri(0, 4) });
    push('analytics_metrickit_daily', { day, app_version: v, reports: Math.round(dau * 0.5), avg_launch_ms: jit(v === '1.5.0' ? 480 : 560, 0.05), avg_resume_ms: jit(120, 0.1), avg_hang_ms: jit(300, 0.2), avg_peak_memory_mb: jit(185, 0.05), fg_abnormal_exits: ri(0, 2) });
    [['sync_list', 'transient', 0.05], ['sync_list', 'failed', 0.015], ['sync_fetch', 'message_download', 0.03], ['payment_reminder', 'send_failed', 0.008]].forEach(([domain, code, w]) => { const e = jit(dau * w, 0.5); if (e) push('analytics_errors_daily', { day, domain, code, errors: e, installs: Math.max(1, Math.round(e * 0.7)) }); });
    [['ok', 0.3], ['cancelled', 0.025], ['not_recognized', 0.02], ['lockout', 0.002]].forEach(([result, w]) => { const a = jit(dau * w, 0.3); if (a) push('analytics_unlock_daily', { day, result, attempts: a, installs: Math.max(1, Math.round(a * 0.6)) }); });
    // v21: comercio, categoría, motor, parte automática, parte corregida, peso.
    [['RAPPI', 'delivery', 'rule', 0.92, 0.03, 3], ['WONG', 'supermercado', 'rule', 0.85, 0.02, 2.5], ['PLAZA VEA', 'supermercado', 'keyword', 0.7, 0.06, 2.2], ['TAMBO', 'comida', 'keyword', 0.6, 0.12, 2.4], ['UBER', 'transporte', 'rule', 0.9, 0.03, 2], ['NETFLIX', 'suscripciones', 'keyword', 0.96, 0.01, 0.5], ['SPOTIFY', 'suscripciones', 'keyword', 0.95, 0.01, 0.5], ['yape_persona', 'transferencias', null, 0, 0, 3.5], ['plin_persona', 'transferencias', null, 0, 0, 1.2], ['STARBUCKS', 'cafe', 'keyword', 0.5, 0.18, 1.1], ['INKAFARMA', 'salud', null, 0.15, 0.05, 0.9], ['PRIMAX', 'transporte', 'keyword', 0.55, 0.22, 1.3], ['MASS', 'supermercado', null, 0.1, 0.05, 1.4], ['CINEPLANET', 'ocio', 'keyword', 0.4, 0.1, 0.6]].forEach(([merchant, cat, engine, pa, pc, w]) => {
      const n = jit(dau * 0.025 * w, 0.4);
      const au = engine ? Math.round(n * pa) : 0, ar = n - au;
      const row = (source, eng, from, to, m) => { if (m > 0) push('analytics_merchant_daily', { day, merchant, source, engine: eng, from_category: from, to_category: to, movements: m, installs: Math.max(1, Math.round(m * 0.7)) }); };
      row('auto', engine, 'sin_clasificar', cat, au);
      row('arrived', null, 'sin_clasificar', null, ar);
      row('manual', null, 'sin_clasificar', merchant.endsWith('persona') ? (r() < 0.6 ? 'familia' : 'varios') : cat, Math.round(ar * 0.6));
      row('reclassified', engine, cat, cat === 'comida' ? 'cafe' : cat === 'transporte' ? 'auto' : 'varios', Math.round(au * pc + (engine && r() < 0.08 ? 1 : 0)));
      row('reclassified', null, cat, 'varios', r() < 0.03 ? 1 : 0);
    });
    [['single', 0.25, 1], ['burst', 0.08, 7], ['bulk', 0.04, 10]].forEach(([mode, w, per]) => {
      const s = jit(dau * w, 0.3); if (!s) return;
      const it = s * per, cl = Math.round(it * (mode === 'burst' ? 0.72 : 0.92));
      push('analytics_classify_sheet_daily', { day, mode, sheets: s, installs: Math.max(1, Math.round(s * 0.7)), items: it, classified: cl, tagged: Math.round(it * 0.07), skipped: mode === 'burst' ? it - cl : null, completed: Math.round(s * (mode === 'burst' ? 0.55 : 0.9)), bulk_with_earlier: mode === 'bulk' ? Math.round(s * 0.4) : 0, bulk_with_rule: mode === 'bulk' ? Math.round(s * 0.6) : 0 });
    });
    const qc = jit(dau * 0.9, 0.2), qu = jit(qc * 0.04, 0.6);
    push('analytics_classification_undo_daily', { day, undos: Math.round(qu * 0.7), movements_undone: qu, movements_classified: qc, pct_undone: pct(qu, qc) });
    if (r() < 0.2) push('analytics_rules_backfill_daily', { day, runs: ri(1, 3), movements: ri(5, 60) });
  }
  const da = D.analytics_daily_active;
  for (let w = 12; w >= 0; w--) {
    const wk = monday(addD(today, -7 * w));
    const xs = da.filter((x) => monday(x.day) === wk);
    const avg = xs.length ? sum(xs, 'active_installs') / xs.length : 0;
    push('analytics_weekly_active', { week: wk, active_installs: Math.round(avg * 2.3), active_pro: Math.round(avg * 2.3 * 0.2) });
  }
  for (let m = 3; m >= 0; m--) {
    const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - m);
    const month = d.toISOString().slice(0, 10);
    const xs = da.filter((x) => x.day.slice(0, 7) === month.slice(0, 7));
    const avg = xs.length ? sum(xs, 'active_installs') / xs.length : 60;
    push('analytics_monthly_active', { month, active_installs: Math.round(avg * 3.6), active_pro: Math.round(avg * 3.6 * 0.2) });
  }
  const STEPS = [['slide_1', 1, 1], ['slide_2', 2, 0.92], ['slide_3', 3, 0.87], ['login', 4, 0.78], ['connect_tapped', 5, 0.66], ['connected', 6, 0.58], ['restore_offered', 7, 0.12], ['history', 8, 0.52], ['reading', 9, 0.5], ['no_account', 10, 0.09], ['finished', 11, 0.61]];
  for (let w = 15; w >= 0; w--) {
    const cw = monday(addD(today, -7 * w));
    const n = ri(25, 60);
    STEPS.forEach(([step, step_order, f]) => push('analytics_onboarding_funnel', { cohort_week: cw, step, step_order, installs: Math.round(n * f * (0.95 + r() * 0.1)) }));
    const age = (new Date(today) - new Date(cw)) / 864e5;
    push('analytics_retention_cohorts', { cohort_week: cw, installs: Math.round(n * 0.9), d1_pct: age >= 7 ? Math.round((40 + r() * 10) * 10) / 10 : null, d7_pct: age >= 19 ? Math.round((24 + r() * 8) * 10) / 10 : null, d30_pct: age >= 65 ? Math.round((14 + r() * 6) * 10) / 10 : null });
  }
  for (let h = 0; h < 24; h++) push('analytics_open_hours_30d', { hour: h, opens: Math.round(20 + 260 * Math.exp(-((h - 8.5) ** 2) / 3) + 200 * Math.exp(-((h - 13) ** 2) / 2) + 330 * Math.exp(-((h - 21) ** 2) / 4) + r() * 30) });
  [[0, 210], [1, 64], [2, 31], [3, 22], [4, 9], [5, 6], [6, 11], [8, 3], [12, 7]].forEach(([m, n]) => push('analytics_max_months_back_30d', { max_months_back: m, installs: n }));
  [['Días', 340, 120], ['Semanas', 510, 160], ['Meses', 280, 110]].forEach(([mode, c, i]) => push('analytics_chart_modes_30d', { mode, choices: c, installs: i }));
  [['pending_inbox', 78, 0.2], ['category_detail', 61, 1.5], ['analysis', 52, 2], ['hide_amounts', 34, 3], ['dictation', 29, 4], ['friends', 24, 6], ['bulk_classify', 21, 5], ['receivables', 17, 9], ['split', 12, 11], ['assistant', 11, 8], ['recurring', 10, 14], ['app_lock', 9, 7], ['export', 4, 21], ['siri', 3, 18]].forEach(([feature, p, d]) => push('analytics_feature_discovery', { feature, installs: Math.round(p * 6.2), pct_of_installs: p, median_days_to_discover: d }));
  [['first_movement', 82.4, 0.3], ['first_email_movement', 61.2, 1.2], ['first_classification', 54.8, 4.1], ['first_rule', 31.5, 26], ['first_friend', 13.9, 72]].forEach(([milestone, p, h]) => push('analytics_activation_milestones', { milestone, installs: Math.round(p * 5), pct_of_new_installs: p, median_hours: h }));
  [['rule', 4120, 61], ['keyword', 1980, 214], ['voice', 210, 19], ['recurring', 96, 2]].forEach(([engine, c, k]) => push('analytics_auto_accuracy_30d', { engine, classified: c, corrected: k, pct_accuracy: Math.round(1000 * (1 - k / c)) / 10 }));
  [['rule', 1420, 980, 160], ['root', 860, 470, 190], ['catalog', 1210, 540, 330]].forEach(([kind, s, a, d]) => push('analytics_suggestions_30d', { kind, shown: s, accepted: a, dismissed: d, pct_accepted: Math.round(1000 * a / (a + d)) / 10 }));
  [['history', 118, 19], ['ai', 82, 10], ['themes', 61, 4], ['cloud', 44, 3], ['alerts', 30, 2], ['sync', 29, 2], ['profile', 18, 1], ['general', 40, 2]].forEach(([feature, s, t]) => push('analytics_paywall_30d', { feature, installs_shown: s, installs_trial: t, pct_conversion: Math.round(1000 * t / s) / 10 }));
  push('analytics_pro_engagement_30d', { pro_installs: 41, using_pro_features: 33, not_using_pro_features: 8, avg_features: 1.85 });
  [['lavender', 22, 14], ['mint', 17, 11], ['sky', 13, 9], ['peach', 9, 6], ['rose', 8, 6], ['charcoal', 6, 5]].forEach(([theme, c, i]) => push('analytics_themes_30d', { theme, changes: c, installs: i }));
  push('analytics_adoption_latest', { installs: 412, pct_gmail: 81.3, pct_outlook: 7.8, pct_pro: 10.2, pct_app_lock: 24.5, pct_notifications: 68.9, pct_widgets: 19.4, pct_budget: 27.2, pct_with_friends: 22.1, pct_with_rules: 58.6, avg_rules: 6.4 });
  [['1.5.0', 'appstore', 238], ['1.5.0', 'testflight', 14], ['1.4.1', 'appstore', 96], ['1.4.0', 'appstore', 21], ['1.5.1', 'testflight', 6]].forEach(([app_version, channel, installs]) => push('analytics_versions_7d', { app_version, channel, installs }));
  Object.assign(D, merchant30(D.analytics_merchant_daily, addD(today, -29)));
  [['movements.month', 420, 160, 1.8, 35, 0, null], ['movements.classify', 380, 150, null, 0, 120, null], ['movements.penguin', 140, 80, null, 0, 0, 62.5], ['movements.accounts', 110, 70, null, 0, 0, null], ['movements.earlier', 90, 50, null, 0, 0, null]].forEach(([control, taps, installs, avg_months_back, all_months, bursts, avg_pct_classified]) => push('analytics_movements_controls_30d', { control, taps, installs, avg_months_back, all_months, bursts, avg_pct_classified }));
  [['detected', 'monthly', 140, 22, 84, 9], ['detected', 'yearly', 18, 4, 79, 0], ['detected', 'weekly', 6, 5, 71, 0], ['suggested', 'monthly', 40, 38, 58, 6], ['suggested', 'weekly', 5, 9, 52, 0]].forEach(([level, cadence, confirmed, rejected, avg_score, as_installments]) => push('analytics_subscription_detection_30d', { level, cadence, confirmed, rejected, pct_confirmed: pct(confirmed, confirmed + rejected), avg_score, as_installments }));
  [['NETFLIX', 'suscripciones', 48, 2, 93], ['SPOTIFY', 'suscripciones', 41, 3, 91], ['SMART FIT', 'deporte', 22, 4, 82], ['MOVISTAR', 'servicios', 19, 6, 77], ['CLARO', 'servicios', 12, 5, 74], ['RAPPI', 'delivery', 3, 21, 48], ['UBER', 'transporte', 1, 14, 44], ['APPLE.COM/BILL', 'suscripciones', 27, 1, 88]].forEach(([merchant, category, confirmed, rejected, avg_score]) => push('analytics_subscription_merchants_30d', { merchant, category, confirmed, rejected, avg_score }));
  // v22: 14 testers de TestFlight que empezaron hace 6 a 18 días y 30 instalaciones de App Store.
  const DEV = ['iPhone15,2', 'iPhone14,5', 'iPhone16,1', 'iPhone13,2', 'iPhone17,3', 'iPhone14,7', 'iPhone12,1'];
  const NAMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fabio', 'Gaby', 'Hugo', 'Inés', 'Jorge', 'Kari', 'Luis', 'Mía', 'Nico'];
  const PERS = ['Controlador', 'Despistado', 'Ahorrador'];
  const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(r() * 16)]).join('');
  const pick = (xs) => xs[Math.floor(r() * xs.length)];
  for (let k = 0; k < 44; k++) {
    const tester = k < NAMES.length;
    const id = hex(8) + '-' + hex(4) + '-4' + hex(3) + '-a' + hex(3) + '-' + hex(12);
    const first = tester ? addD(today, -(6 + Math.round(k * 0.9))) : addD(today, -ri(1, 85));
    const eng = tester ? 0.45 + r() * 0.5 : 0.15 + r() * 0.6;
    const conn = r() < (tester ? 0.86 : 0.7);
    const channel = tester ? 'testflight' : 'appstore';
    let last = first;
    for (let d = first, n = 1; d <= today; d = addD(d, 1), n++) {
      if (n > 1 && r() > eng * (n <= 7 ? 0.95 : n <= 14 ? 0.75 : 0.55)) continue;
      last = d;
      const sessions = ri(1, 3), email = conn ? ri(0, 4) : 0, card = Math.round(email * 0.8), cardAuto = Math.round(card * (0.55 + r() * 0.35));
      push('analytics_install_daily', { install_id: id, day: d, channel, app_version: '1.5.0', events: sessions * 20, sessions, opens: sessions + ri(0, 2), action_sessions: Math.max(0, sessions - (r() < 0.4 ? 1 : 0)), value_actions: r() < eng ? ri(1, 6) : 0, movements_created: ri(0, 1), classified: ri(0, 4), rules: r() < 0.1 ? 1 : 0, email_movements: email, card_movements: card, card_auto: cardAuto, card_corrected: cardAuto && r() < 0.25 ? 1 : 0, connected: n === 1 && conn ? 1 : 0, onboarding_finished: n === 1 && (conn || r() < 0.5) ? 1 : 0, goals_created: 0, goals_views: r() < 0.12 ? 1 : 0, invites: r() < 0.03 ? 1 : 0, assistant: r() < 0.05 ? 1 : 0, crashes: r() < 0.01 ? 1 : 0, errors: r() < 0.05 ? 1 : 0, minutes: Math.round((2 + r() * 8) * sessions * 10) / 10 });
    }
    push('analytics_install_profile', { install_id: id, first_day: first, last_day: last, first_version: '1.5.0', last_version: '1.5.0', channel, device: pick(DEV), os: 'iOS 18.6', preexisting: false, onboarding_step_order: conn ? 11 : 5, onboarding_last_step: conn ? 'finished' : 'connect_tapped' });
    if (!tester) continue;
    // Responde la encuesta final quien ya pasó su día 14.
    const done = first <= addD(today, -13) && r() < 0.9, before = ri(30, 90);
    push('analytics_testers', { install_id: id, alias: NAMES[k], is_tester: true, cohort: 'Prueba 1', test_start: first, age: ri(19, 48), gender: r() < 0.5 ? 'f' : 'm', iphone: null, persona: PERS[k % 3], notes: null, s_min_before: before, s_min_after: done ? Math.round(before * (0.25 + r() * 0.6)) : null, s_matches: done ? r() < 0.88 : null, s_tool_before: pick(['Excel', 'Cuaderno', 'App del banco', 'Nada']), s_tool_after: done ? pick(['AlTanto', 'AlTanto', 'AlTanto y Excel', 'Excel']) : null, s_replaced: done ? r() < 0.7 : null, s_pay: done ? pick(['si', 'tal_vez', 'no', 'no']) : null, s_pay_amount: done ? pick([0, 5, 10, 15]) : null, s_fatal: done ? pick(['muy', 'algo', 'algo', 'nada']) : null, s_recommended: done ? r() < 0.45 : null });
  }
  return D;
}

// Sólo para el ejemplo: arma las vistas de 30 días de comercios desde la diaria,
// con las mismas cuentas que hace v21 en SQL.
function merchant30(daily, start) {
  const md = inR(daily, start);
  const rk = new Map(), rc = new Map(), au = new Map(), ar = new Map(), ch = new Map();
  const add = (m, k, o, f) => { const x = m.get(k) || m.set(k, o).get(k); f(x); };
  md.forEach((x) => {
    const v = num(x.movements);
    add(rk, x.merchant, { merchant: x.merchant, arrived: 0, auto: 0, arrived_unclassified: 0, manual_from_pending: 0, reclassified: 0, corrected_auto: 0 }, (m) => {
      if (x.source === 'auto') { m.auto += v; m.arrived += v; }
      if (x.source === 'arrived') { m.arrived_unclassified += v; m.arrived += v; }
      if (x.source === 'manual') m.manual_from_pending += v;
      if (x.source === 'reclassified') { m.reclassified += v; if (x.engine) m.corrected_auto += v; }
    });
    if (x.source === 'reclassified') add(rc, [x.merchant, x.from_category, x.to_category, x.engine || 'usuario'].join('|'), { merchant: x.merchant, from_category: x.from_category, to_category: x.to_category, replaced: x.engine || 'usuario', movements: 0, days: new Set() }, (m) => { m.movements += v; m.days.add(x.day); });
    if (x.source === 'auto') add(au, [x.merchant, x.engine, x.to_category].join('|'), { merchant: x.merchant, engine: x.engine, category: x.to_category, movements: 0 }, (m) => { m.movements += v; });
    if (x.source === 'arrived') ar.set(x.merchant, (ar.get(x.merchant) || 0) + v);
    if (x.source === 'manual') add(ch, x.merchant, new Map(), (m) => m.set(x.to_category, (m.get(x.to_category) || 0) + v));
  });
  return {
    analytics_merchant_ranking_30d: [...rk.values()].map((m) => Object.assign(m, { pct_auto: pct(m.auto, m.arrived), pct_auto_kept: m.auto ? Math.round(1000 * (1 - m.corrected_auto / m.auto)) / 10 : null })),
    analytics_merchant_reclassified_30d: [...rc.values()].map((m) => Object.assign(m, { days: m.days.size })),
    analytics_merchant_auto_30d: [...au.values()],
    analytics_merchant_unclassified_30d: [...ar.entries()].map(([merchant, arrived]) => {
      const top = [...(ch.get(merchant) || new Map()).entries()].sort((a, b) => b[1] - a[1]);
      return { merchant, arrived, classified_by_hand: top.reduce((a, x) => a + x[1], 0), top_category: top[0] ? top[0][0] : null, top_category_movements: top[0] ? top[0][1] : null };
    }),
  };
}

const DAILY = ['analytics_daily_active', 'analytics_new_installs_daily', 'analytics_open_sources_daily', 'analytics_notifications_daily', 'analytics_screens_daily', 'analytics_taps_daily', 'analytics_navigation_daily', 'analytics_feature_usage_daily', 'analytics_parser_health_daily', 'analytics_sync_runs_daily', 'analytics_email_latency_daily', 'analytics_accounts_daily', 'analytics_classification_daily', 'analytics_auto_vs_manual_daily', 'analytics_pending_backlog_daily', 'analytics_movements_created_daily', 'analytics_rules_daily', 'analytics_paywall_daily', 'analytics_pro_feature_usage_daily', 'analytics_launch_perf_daily', 'analytics_screen_perf_daily', 'analytics_stability_daily', 'analytics_metrickit_daily', 'analytics_errors_daily', 'analytics_unlock_daily', 'analytics_merchant_daily', 'analytics_classify_sheet_daily', 'analytics_classification_undo_daily', 'analytics_rules_backfill_daily'];
const FLAT = ['analytics_open_hours_30d', 'analytics_max_months_back_30d', 'analytics_chart_modes_30d', 'analytics_feature_discovery', 'analytics_activation_milestones', 'analytics_auto_accuracy_30d', 'analytics_suggestions_30d', 'analytics_paywall_30d', 'analytics_pro_engagement_30d', 'analytics_themes_30d', 'analytics_adoption_latest', 'analytics_versions_7d', 'analytics_merchant_ranking_30d', 'analytics_merchant_reclassified_30d', 'analytics_merchant_auto_30d', 'analytics_merchant_unclassified_30d', 'analytics_movements_controls_30d', 'analytics_subscription_detection_30d', 'analytics_subscription_merchants_30d'];
// Las que agrega agrupay_analytics_v21_merchants.sql, para avisar si falta correrlo.
const V21 = ['analytics_merchant_daily', 'analytics_classify_sheet_daily', 'analytics_classification_undo_daily', 'analytics_rules_backfill_daily', 'analytics_merchant_ranking_30d', 'analytics_merchant_reclassified_30d', 'analytics_merchant_auto_30d', 'analytics_merchant_unclassified_30d', 'analytics_movements_controls_30d', 'analytics_subscription_detection_30d', 'analytics_subscription_merchants_30d'];

// Las de sql/altanto_analytics_v22_testers.sql (en este repo). Se piden sin audiencia:
// el panel separa testers del resto con analytics_testers.
const V22 = ['analytics_install_daily', 'analytics_install_profile', 'analytics_testers'];

// `aud` (testers / others) viaja en el encabezado x-audience, que v22 lee en
// analytics_ev para que cada vista cuente sólo a esa audiencia.
async function fetchView(view, filter, token, aud) {
  let out = [];
  const headers = { apikey: SB_KEY, Authorization: 'Bearer ' + token };
  if (aud && aud !== 'all') headers['x-audience'] = aud;
  for (let off = 0; off < 50000; off += 1000) {
    const res = await fetch(SB_URL + '/rest/v1/' + view + '?select=*' + (filter ? '&' + filter : '') + '&limit=1000&offset=' + off, { headers });
    if (res.status === 401) { const e = new Error('Sesión vencida'); e.code = 401; throw e; }
    if (!res.ok) throw new Error(view + ' respondió ' + res.status);
    const rows = await res.json();
    out = out.concat(rows);
    if (rows.length < 1000) break;
  }
  return out;
}

// Guarda filas de analytics_testers: crea las nuevas y, en las que ya existen,
// cambia sólo las columnas que vienen (todas las filas con las mismas columnas).
async function upsertTesters(rows, token) {
  const res = await fetch(SB_URL + '/rest/v1/analytics_testers?on_conflict=install_id', { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(rows) });
  if (res.status === 401) { const e = new Error('Sesión vencida'); e.code = 401; throw e; }
  if (!res.ok) throw new Error('analytics_testers respondió ' + res.status + (res.status === 404 ? ': corre sql/altanto_analytics_v22_testers.sql' : ''));
  return res.json();
}


// ── Tarjetas ─────────────────────────────────────────────────────────────
// Cada tarjeta tiene un tipo (bars, area, rank, table, mix, gauge, tiles, rings)
// y un tamaño en la cuadrícula de 12 columnas: full, lg (8), md (6) o sm (4).
// `detail` es lo que se abre con «Ver detalle»: otra tarjeta, casi siempre una tabla.
function base(o) {
  return { id: o.id, title: o.title, sub: o.sub || '', meta: o.meta || '', size: o.wide ? 'full' : o.size || 'md', tone: o.tone || '', big: o.big || '', bigSub: o.bigSub || '', type: 'empty', detail: o.detail || null, dtitle: o.dtitle || 'Detalle', more: 0 };
}

// Tope «redondo» del eje: 1, 2, 2,5, 5 o 10 por potencia de diez.
const nice = (v) => { if (!(v > 0)) return 1; const m = Math.pow(10, Math.floor(Math.log10(v))); return [1, 2, 2.5, 5, 10].map((k) => k * m).find((x) => x >= v); };
const SHORT = (v) => (Math.abs(v) >= 1000 ? nf.format(Math.round(v / 100) / 10) + ' k' : nf.format(Math.round(v * 10) / 10));
// Curva suave (Catmull-Rom) por los puntos, en el lienzo de 1000 × 300 del gráfico de área.
function curve(P) {
  const cy = (y) => Math.min(300, Math.max(0, y));
  let d = 'M' + P[0][0].toFixed(1) + ',' + P[0][1].toFixed(1);
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    d += ' C' + [p1[0] + (p2[0] - p0[0]) / 6, cy(p1[1] + (p2[1] - p0[1]) / 6), p2[0] - (p3[0] - p1[0]) / 6, cy(p2[1] - (p3[1] - p1[1]) / 6), p2[0], p2[1]].map((x) => x.toFixed(1)).join(',');
  }
  return d;
}

// Serie por día (u hora, semana…). Con `area` dibuja líneas suaves sin apilar
// (la primera con relleno); si no, barras apiladas.
function bars(ctx, o) {
  const vals = o.keys.map((k) => o.series.map((s) => Math.max(0, num(s.get(k)))));
  const tots = vals.map((v) => v.reduce((a, b) => a + b, 0));
  const fmt = o.fmt || N;
  const xl = o.xlab || fd;
  const n = o.keys.length;
  const multi = o.series.length > 1;
  const stacked = multi && !o.area;
  const tips = o.keys.map((k, i) => (o.tipFn ? o.tipFn(k, vals[i]) : xl(k) + ' · ' + o.series.map((s, j) => (multi ? s.label + ' ' : '') + fmt(vals[i][j])).join(' · ')));
  const axis = n ? [xl(o.keys[0]), xl(o.keys[Math.floor((n - 1) / 2)]), xl(o.keys[n - 1])] : [];
  // Detalle: la tabla completa, lo más reciente arriba cuando son días.
  const rev = o.keys === ctx.days;
  const order = o.keys.map((_, i) => i);
  if (rev) order.reverse();
  const detail = o.detail !== undefined ? o.detail : table({
    id: o.id + '-d', show: Infinity,
    cols: [{ label: o.klabel || 'Día', align: 'left', w: 'minmax(96px,1.3fr)' }].concat(o.series.map((s) => ({ label: s.label, bar: !multi }))).concat(stacked ? [{ label: 'Total', bar: true }] : []),
    rows: order.map((i) => [{ v: xl(o.keys[i]), fw: 500 }].concat(vals[i].map((v) => ({ v: fmt(v), n: v }))).concat(stacked ? [{ v: fmt(tots[i]), n: tots[i], fw: 600 }] : [])),
  });
  const dtitle = o.dtitle || (rev ? 'Día por día' : 'Detalle');

  if (o.area) {
    const top = o.top || nice(Math.max(0, ...vals.flat()) * 1.12);
    const X = (i) => (n > 1 ? (i / (n - 1)) * 1000 : 500);
    const Y = (v) => 300 - (v / top) * 300;
    const lines = o.series.map((s, j) => {
      const P = vals.map((v, i) => [X(i), Y(v[j])]);
      return { c: s.c, dash: !!s.dash, d: n ? curve(n > 1 ? P : [[0, P[0][1]], [1000, P[0][1]]]) : '' };
    });
    const avg = o.avgLine && n ? vals.reduce((a, v) => a + v[0], 0) / n : null;
    const tf = o.fmt || SHORT;
    return Object.assign(base(o), {
      type: vals.flat().some((v) => v > 0) ? 'area' : 'empty', n, lines, tips, axis, detail, dtitle,
      areaD: lines[0] && lines[0].d ? lines[0].d + ' L1000,300 L0,300 Z' : '',
      avgY: avg != null ? Y(avg) / 3 : null, avgLabel: avg != null ? 'Promedio ' + fmt(r1(avg)) : '',
      ticks: [top, top / 2, 0].map((v, i) => ({ top: i * 50, label: tf(v) })),
      pts: vals.map((v, i) => ({ x: X(i) / 10, ys: v.map((x) => Y(x) / 3) })),
      legend: multi || avg != null ? o.series.map((s) => ({ label: s.label, c: s.c, dash: !!s.dash })) : [],
    });
  }

  const max = Math.max(0, ...tots);
  const hint = ctx.wide ? 'Pasa el cursor por una barra para ver el detalle' : 'Toca o desliza sobre las barras';
  const list = o.keys.map((k, i) => ({ h: tots[i] > 0 ? Math.max(2, (tots[i] / max) * 100) + '%' : '0%', tip: tips[i], segs: o.series.map((s, j) => ({ f: vals[i][j], c: s.c })).filter((x) => x.f > 0) }));
  return Object.assign(base(o), { type: max === 0 ? 'empty' : 'bars', bars: list, tip: hint, hint, axis, detail, dtitle, gap: n > 45 ? '2px' : n > 20 ? '3px' : '6px', legend: multi ? o.series.map((s) => ({ label: s.label, c: s.c })) : [] });
}

// Ranking de barras horizontales: la tarjeta muestra los primeros `show`, el detalle todos.
function rank(o) {
  const it = (o.items || []).filter((x) => ok(x.value));
  if (o.sort !== false) it.sort((a, b) => b.value - a.value);
  const max = o.max || Math.max(0, ...it.map((x) => x.value));
  const fmt = o.fmt || N;
  const rows = it.map((x, i) => ({ label: x.label, value: fmt(x.value), note: x.note || '', tone: x.tone || 'var(--text)', w: max ? Math.min(100, (x.value / max) * 100) : 0, c: x.c || o.c || (i === 0 ? COL.a : COL.ink) }));
  const show = o.show || 7;
  return Object.assign(base(o), { type: !rows.length || max === 0 ? 'empty' : 'rank', rows: rows.slice(0, show), allRows: rows, more: Math.max(0, rows.length - show) });
}

// Tabla. Una columna con `bar` dibuja una barrita bajo cada número y una con `heat`
// tiñe la celda; ambas usan el valor crudo `n` de la celda (ver nc, pctCell).
function table(o) {
  const grid = o.cols.map((c) => c.w || 'minmax(64px,1fr)').join(' ');
  const rows = (o.rows || []).map((row) => row.map((c) => (c && typeof c === 'object' ? c : { v: c })));
  // Barras contra el máximo; calor estirado entre el mínimo y el máximo de la columna, para que se note la diferencia.
  const colN = o.cols.map((c, j) => rows.map((r) => (r[j] && ok(r[j].n) ? +r[j].n : null)).filter((v) => v != null));
  const tops = colN.map((xs) => Math.max(0, ...xs)), lows = colN.map((xs) => Math.min(...xs));
  const trs = rows.map((row) => ({ grid, cells: row.map((x, j) => {
    const c = o.cols[j];
    const has = ok(x.n);
    const bar = c.bar && has && tops[j] ? Math.max(0, +x.n) / tops[j] : null;
    const heat = c.heat && has ? (tops[j] > lows[j] ? (+x.n - lows[j]) / (tops[j] - lows[j]) : 1) : null;
    return { v: x.v == null ? '—' : x.v, align: c.align || 'right', color: x.color || 'var(--text)', fw: x.fw || 400, heat, bar };
  }) }));
  const show = o.show || 6;
  return Object.assign(base(o), { type: trs.length ? 'table' : 'empty', trs: trs.slice(0, show), allTrs: trs, more: Math.max(0, trs.length - show), grid, minW: o.minW || '0px', cols: o.cols.map((c) => ({ label: c.label, align: c.align || 'right' })) });
}

// Mezcla: una barra partida en bloques proporcionales y la lista con su parte.
const MIXPAL = [COL.gold, COL.blue, COL.a, COL.ink, COL.green, COL.mute];
function mix(o) {
  const it = (o.items || []).filter((x) => ok(x.value) && x.value > 0);
  if (o.sort !== false) it.sort((a, b) => b.value - a.value);
  const tot = it.reduce((a, x) => a + x.value, 0);
  const fmt = o.fmt || N;
  const segs = it.map((x, i) => ({ label: x.label, value: fmt(x.value), f: x.value, pct: P(r1((x.value / tot) * 100)), note: x.note || '', c: x.c || MIXPAL[i % MIXPAL.length] }));
  const show = o.show || 6;
  return Object.assign(base(o), { type: tot ? 'mix' : 'empty', big: o.big || (tot ? fmt(tot) : ''), segs, rows: segs.slice(0, show), more: Math.max(0, segs.length - show) });
}

// Anillo grande para un porcentaje, en una tarjeta de color.
function gauge(o) {
  const v = ok(o.value) ? Math.max(0, Math.min(100, +o.value)) : null;
  return Object.assign(base(Object.assign({ size: 'sm', tone: 'blue' }, o)), { type: v == null ? 'empty' : 'gauge', value: v, label: v == null ? '—' : nf.format(r1(v)) + '%', caption: o.caption || '', rows: o.rows || [] });
}

// Mosaicos oscuros (o naranjas, para lo que hay que mirar). Tocar uno abre el detalle.
function tiles(o) {
  const it = o.items || [];
  const show = o.show || 8;
  return Object.assign(base(o), { type: it.length ? 'tiles' : 'empty', tiles: it.slice(0, show), allTiles: it, more: Math.max(0, it.length - show) });
}

// Anillos pequeños, uno por porcentaje.
function rings(o) {
  const it = (o.items || []).filter((x) => ok(x.value));
  return Object.assign(base(o), { type: it.length ? 'rings' : 'empty', rings: it.map((x) => ({ label: x.label, value: Math.max(0, Math.min(100, +x.value)), txt: P(r1(x.value)), c: x.c || COL.a })) });
}

const kpi = (label, value, sub, color) => ({ label, value, sub: sub || '', color: color || 'var(--text)' });

// ── Personas (v22) ───────────────────────────────────────────────────────
// Una por instalación: su perfil, su fila de analytics_testers (si la tiene) y
// sus días. El día 1 de su prueba es `test_start` o, si no hay, su primer día.
const IPHONE = { 'iPhone12,1': 'iPhone 11', 'iPhone12,3': 'iPhone 11 Pro', 'iPhone12,5': 'iPhone 11 Pro Max', 'iPhone12,8': 'iPhone SE (2.ª)', 'iPhone13,1': 'iPhone 12 mini', 'iPhone13,2': 'iPhone 12', 'iPhone13,3': 'iPhone 12 Pro', 'iPhone13,4': 'iPhone 12 Pro Max', 'iPhone14,4': 'iPhone 13 mini', 'iPhone14,5': 'iPhone 13', 'iPhone14,2': 'iPhone 13 Pro', 'iPhone14,3': 'iPhone 13 Pro Max', 'iPhone14,6': 'iPhone SE (3.ª)', 'iPhone14,7': 'iPhone 14', 'iPhone14,8': 'iPhone 14 Plus', 'iPhone15,2': 'iPhone 14 Pro', 'iPhone15,3': 'iPhone 14 Pro Max', 'iPhone15,4': 'iPhone 15', 'iPhone15,5': 'iPhone 15 Plus', 'iPhone16,1': 'iPhone 15 Pro', 'iPhone16,2': 'iPhone 15 Pro Max', 'iPhone17,1': 'iPhone 16 Pro', 'iPhone17,2': 'iPhone 16 Pro Max', 'iPhone17,3': 'iPhone 16', 'iPhone17,4': 'iPhone 16 Plus', 'iPhone17,5': 'iPhone 16e' };
const devName = (d) => (d ? IPHONE[d] || d : '');
const ageBand = (a) => (!ok(a) ? '' : a < 25 ? '18–24' : a < 35 ? '25–34' : a < 45 ? '35–44' : '45+');
const sd = (v) => (v ? String(v).slice(0, 10) : null);

function people(D) {
  if (D._people) return D._people;
  const tm = new Map((D.analytics_testers || []).map((t) => [t.install_id, t]));
  const dm = new Map();
  (D.analytics_install_daily || []).forEach((x) => { const m = dm.get(x.install_id) || dm.set(x.install_id, new Map()).get(x.install_id); m.set(sd(x.day), x); });
  const seen = new Set();
  const make = (x) => {
    seen.add(x.install_id);
    const t = tm.get(x.install_id) || {};
    const days = dm.get(x.install_id) || new Map();
    const ds = [...days.keys()].sort();
    const first = sd(x.first_day) || ds[0] || null;
    return { id: x.install_id, short: String(x.install_id).slice(0, 8), alias: t.alias || '', tester: !!t.is_tester, saved: !!t.install_id, s: t, cohort: t.cohort || '', start: sd(t.test_start) || first, first, last: ds[ds.length - 1] || sd(x.last_day), channel: x.channel || '', device: x.device || '', iphone: t.iphone || devName(x.device), persona: t.persona || '', gender: t.gender || '', age: t.age, step: x.onboarding_last_step || null, days };
  };
  const out = (D.analytics_install_profile || []).map(make);
  // Marcados como testers pero sin perfil (todavía no mandan nada, o sólo del simulador).
  tm.forEach((t, id) => { if (!seen.has(id)) out.push(make({ install_id: id })); });
  return (D._people = out);
}
const pname = (p) => p.alias || p.short;
const inAud = (p, aud, cohort) => (aud === 'testers' ? p.tester : aud === 'others' ? !p.tester : true) && (!cohort || p.cohort === cohort);
const byKey = (by, p) => (by === 'gender' ? lab('gender', p.gender || null) : by === 'age' ? ageBand(p.age) : by === 'iphone' ? p.iphone : p.persona) || 'Sin dato';

// Día n de la prueba de p, lo sumado de `k` entre sus días a y b (hasta `asOf`)
// y si su día b ya terminó.
const relD = (p, n) => addD(p.start, n - 1);
const span = (p, a, b, k, asOf) => { let s = 0; for (let n = a; n <= b; n++) { const d = relD(p, n); if (d > asOf) break; s += num((p.days.get(d) || {})[k]); } return s; };
const ever = (p, k, asOf) => { let s = 0; p.days.forEach((x, d) => { if (d <= asOf) s += num(x[k]); }); return s; };
const ripe = (p, b, asOf) => { const d = relD(p, b); return d <= asOf && d < limaToday(); };
const dayOf = (p, asOf) => Math.round((new Date(asOf + 'T00:00:00Z') - new Date(p.start + 'T00:00:00Z')) / 864e5) + 1;
const yes = (v) => (v == null || v === '' ? null : v === true || v === 'true');
// Logrado antes del día b: cumple ya; si no, sólo se decide al terminar ese día.
const byDay14 = (got, p, b, asOf, val) => ({ v: got ? true : ripe(p, b, asOf) ? false : null, pending: !got && !ripe(p, b, asOf), val });

// Las hipótesis de la prueba. `ev` dice, para una persona y una fecha de corte,
// si la cumple (true / false), si aún no se puede saber (v: null + pending) o
// si no hay dato (v: null). `below`: la meta es quedar por debajo.
// `trend`: se dibuja su avance día a día.
const HYP = [
  { id: 'h8', code: 'H8', name: 'Los gastos cuadran', claim: 'Al menos 9 de 10 confirman que los gastos de la app cuadran con los que registran hoy.', metric: '% que confirma que cuadran', target: 90, src: 'Encuesta final',
    ev: (p) => { const v = yes(p.s.s_matches); return { v, val: v == null ? 'Sin respuesta' : v ? 'Cuadran' : 'No cuadran' }; } },
  { id: 'h0', code: 'H0', name: 'Problema real', claim: 'Al menos 6 de 10 registran o revisan sus gastos 3 o más veces en dos semanas.', metric: '% con 3 o más sesiones con acción entre el día 1 y el 14', target: 60, src: 'App', trend: true,
    ev: (p, a) => { const s = span(p, 1, 14, 'action_sessions', a); return byDay14(s >= 3, p, 14, a, N(s) + (s === 1 ? ' sesión' : ' sesiones')); } },
  { id: 'h1', code: 'H1', name: 'Ahorro de tiempo', claim: 'Al menos 6 de 10 reducen 50 % o más el tiempo que pasan revisando sus gastos.', metric: '% que reduce su tiempo de revisión 50 % o más', target: 60, src: 'Encuesta inicial y día 14',
    ev: (p) => { const b = p.s.s_min_before, f = p.s.s_min_after; if (!ok(b) || !ok(f) || +b <= 0) return { v: null, val: ok(b) ? N0(b) + ' min al empezar · falta el día 14' : 'Sin respuesta' }; const red = ((b - f) / b) * 100; return { v: red >= 50, val: N0(b) + ' → ' + N0(f) + ' min (' + (red >= 0 ? '−' : '+') + N0(Math.abs(red)) + ' %)' }; } },
  { id: 'h2', code: 'H2', name: 'Onboarding', claim: 'Al menos 8 de 10 completan el onboarding con el correo conectado.', metric: '% que conectó su correo', target: 80, src: 'App', trend: true,
    ev: (p, a) => { const c = ever(p, 'connected', a) > 0; return byDay14(c, p, 1, a, c ? 'Conectó' : p.step ? 'Llegó a «' + lab('step', p.step) + '»' : 'No conectó'); } },
  { id: 'h3', code: 'H3', name: 'Hábito', claim: 'Al menos 6 de 10 hacen otra revisión útil en la segunda semana, sin que se lo pidan.', metric: '% con al menos una acción de valor entre el día 8 y el 14 (abrir no cuenta)', target: 60, src: 'App', trend: true,
    ev: (p, a) => { const s = span(p, 8, 14, 'value_actions', a); return byDay14(s >= 1, p, 14, a, N(s) + ' acciones en la semana 2'); } },
  { id: 'h4', code: 'H4', name: 'Disposición a pagar', claim: 'Al menos 3 de 10 están interesados en pagar por las funciones Premium.', metric: '% que respondió que sí pagaría', target: 30, src: 'Entrevista después del día 14',
    ev: (p) => { const v = p.s.s_pay; return { v: v ? v === 'si' : null, val: v ? lab('pay', v) + (ok(p.s.s_pay_amount) && +p.s.s_pay_amount > 0 ? ' · S/ ' + N(p.s.s_pay_amount) + ' al mes' : '') : 'Sin respuesta' }; } },
  { id: 'h5', code: 'H5', name: 'Resultados, no novedad', claim: 'Reemplazan su herramienta y en la semana 2 usan la app al menos 80 % de lo que la usaron en la semana 1.', metric: '% que reemplazó su herramienta y mantuvo su uso', target: 60, src: 'Encuesta y app',
    ev: (p, a) => {
      const w1 = span(p, 1, 7, 'action_sessions', a), w2 = span(p, 8, 14, 'action_sessions', a);
      const keep = w1 ? w2 >= 0.8 * w1 : w2 > 0;
      const rep = yes(p.s.s_replaced);
      const val = (rep == null ? 'Sin respuesta' : rep ? 'Reemplazó' : 'No reemplazó') + (p.s.s_tool_before ? ' (' + p.s.s_tool_before + (p.s.s_tool_after ? ' → ' + p.s.s_tool_after : '') + ')' : '') + ' · semana 2: ' + N(w2) + ' de ' + N(w1);
      if (!ripe(p, 14, a)) return { v: null, pending: true, val };
      return { v: rep == null ? null : rep && keep, val };
    } },
  { id: 'h6', code: 'H6', name: 'Market fit', claim: 'Al menos 3 de 10 se sentirían muy decepcionados si la app dejara de existir.', metric: '% que respondió «muy decepcionado»', target: 30, src: 'Encuesta final',
    ev: (p) => { const v = p.s.s_fatal; return { v: v ? v === 'muy' : null, val: v ? lab('fatal', v) : 'Sin respuesta' }; } },
  { id: 'h7', code: 'H7', name: 'Recomendación', claim: 'Al menos 3 de 10 invitan o hablan de la app con otras personas.', metric: '% que recomendó la app o mandó una invitación', target: 30, src: 'Entrevista y app',
    ev: (p, a) => { const inv = ever(p, 'invites', a), r = yes(p.s.s_recommended); const v = inv > 0 || r === true ? true : r === false ? false : null; return { v, val: (r == null ? 'Sin respuesta' : r ? 'La recomendó' : 'No la recomendó') + (inv ? ' · ' + N(inv) + ' invitaciones' : '') }; } },
  { id: 'h9', code: 'H9', name: 'Creación de metas', claim: 'Al menos 5 de 10 crean una meta en sus primeros 7 días.', metric: '% que creó una meta entre el día 1 y el 7', target: 50, src: 'App', trend: true,
    ev: (p, a, ctx) => { const s = span(p, 1, 7, ctx.goalKey, a); return byDay14(s >= 1, p, 7, a, ctx.goalKey === 'goals_created' ? N(s) + ' metas' : N(s) + ' visitas a Metas'); } },
  { id: 'h10', code: 'H10', name: 'Categorización automática', claim: 'Al menos 80 % de los consumos con tarjeta quedan bien categorizados sin que el usuario los edite.', metric: '% de lo que clasificó el motor que el usuario reclasificó después', target: 20, below: true, ratio: true, src: 'App · consumos con tarjeta',
    ev: (p, a) => { const au = span(p, 1, 14, 'card_auto', a), co = span(p, 1, 14, 'card_corrected', a); return { a: au, c: co, v: au ? (co / au) * 100 < 20 : null, val: au ? P(r1((co / au) * 100)) + ' (' + N(co) + ' de ' + N(au) + ')' : 'Sin consumos con tarjeta' }; } },
];

// El resultado de una hipótesis en un grupo de personas.
function score(h, pop, asOf, ctx) {
  const rows = pop.map((p) => Object.assign({ p }, h.ev(p, asOf, ctx)));
  const dec = rows.filter((x) => x.v != null);
  const pend = rows.filter((x) => x.v == null && x.pending).length;
  const hit = dec.filter((x) => x.v).length;
  let value, n;
  if (h.ratio) { const a = sum(rows, 'a'); value = a ? (sum(rows, 'c') / a) * 100 : null; n = rows.filter((x) => x.a > 0).length; }
  else { n = dec.length; value = n ? (hit / n) * 100 : null; }
  const pass = value == null ? null : h.below ? value < h.target : value >= h.target;
  return { rows, value, n, hit, pend, pass };
}
const ST = { pass: ['Cumple', 'var(--pos)'], fail: ['No cumple', 'var(--neg)'], pend: ['En curso', 'var(--c-blue)'], none: ['Sin datos', 'var(--text3)'] };
const stOf = (s) => (s.value == null ? (s.pend ? ST.pend : ST.none) : s.pass ? ST.pass : ST.fail);

function hypCard(h, pop, asOf, ctx) {
  const s = score(h, pop, asOf, ctx);
  const [status, statusC] = stOf(s);
  const groups = new Map();
  pop.forEach((p) => { const k = byKey(ctx.by, p); (groups.get(k) || groups.set(k, []).get(k)).push(p); });
  const g = [...groups.entries()].map(([k, ps]) => {
    const x = score(h, ps, asOf, ctx);
    return { label: k, n: x.n, value: x.value == null ? '—' : P(r1(x.value)), note: !x.n ? (x.pend ? 'en curso' : 'sin datos') : h.ratio ? N(x.n) + ' con tarjeta' : N(x.hit) + ' de ' + N(x.n), c: stOf(x)[1] };
  }).sort((a, b) => b.n - a.n);
  const order = (x) => (x.v === false ? 0 : x.pending ? 1 : x.v === true ? 2 : 3);
  const rows = s.rows.slice().sort((a, b) => order(a) - order(b) || pname(a.p).localeCompare(pname(b.p)));
  const nLabel = h.ratio ? (s.n ? N(s.n) + ' personas con consumos' : '') : s.n ? N(s.hit) + ' de ' + N(s.n) + ' personas' : '';
  return Object.assign(base({ id: 'hyp-' + h.id, title: h.code + ' · ' + h.name, sub: h.claim, meta: h.src, size: 'sm', dtitle: 'Persona por persona',
    detail: table({ id: 'hyp-' + h.id + '-d', show: Infinity, minW: '620px',
      cols: [{ label: 'Persona', align: 'left', w: 'minmax(110px,1.2fr)' }, { label: lab('by', ctx.by), align: 'left', w: 'minmax(90px,1fr)' }, { label: 'Día', w: 'minmax(48px,.5fr)' }, { label: 'Dato', align: 'left', w: 'minmax(170px,2.2fr)' }, { label: 'Resultado', align: 'left', w: 'minmax(90px,1fr)' }],
      rows: rows.map((x) => { const d = dayOf(x.p, asOf); const st = x.v === true ? ST.pass : x.v === false ? ST.fail : x.pending ? ST.pend : ST.none; return [{ v: pname(x.p), fw: 500 }, { v: byKey(ctx.by, x.p) }, d >= 1 ? 'D' + d : '—', { v: x.val }, { v: st[0], color: st[1], fw: 600 }]; }) }) }),
  { type: pop.length ? 'hyp' : 'empty', metric: h.metric, value: s.value, label: s.value == null ? '—' : P(r1(s.value)), target: h.target, targetLabel: (h.below ? 'Meta: menos de ' : 'Meta: ') + h.target + ' %', status: status + (s.value != null && s.pend ? ' · ' + s.pend + ' en curso' : ''), statusC, nLabel, groups: g, rows: g });
}

// Lista de instalaciones para marcar testers. La búsqueda y la edición viven en app.js.
function roster(o, all) {
  const list = all.slice().sort((a, b) => (b.tester - a.tester) || String(b.last || '').localeCompare(String(a.last || '')));
  return Object.assign(base(o), { type: 'roster', people: list.map((p) => ({ id: p.id, short: p.short, alias: p.alias, tester: p.tester, persona: p.persona, iphone: p.iphone, channel: lab('channel', p.channel || null), first: p.first, last: p.last, days: p.days.size, cohort: p.cohort, step: p.step })), rows: [] });
}

function build(id, ctx) {
  const D = ctx.D, st = ctx.start, days = ctx.days, R = ctx.range, T = ctx.today;
  const perDay = (rows, f) => { const m = group(rows, (x) => String(x.day).slice(0, 10), f); return (d) => m.get(d) || 0; };
  R_END = ctx.end || null;
  const surveyed = (p) => ['s_matches', 's_min_after', 's_replaced', 's_pay', 's_fatal', 's_recommended'].some((k) => p.s[k] != null && p.s[k] !== '');

  if (id === 'hipotesis') {
    // Se mide al cierre del rango. Sólo cuenta quien empezó dentro de los 90 días cargados.
    const asOf = ctx.end, lo = addD(T, -89);
    const pop = people(D).filter((p) => inAud(p, ctx.aud, ctx.cohort) && p.start && p.start <= asOf && p.start >= lo);
    const hctx = Object.assign({}, ctx, { goalKey: (D.analytics_install_daily || []).some((x) => num(x.goals_created) > 0) ? 'goals_created' : 'goals_views' });
    const sc = HYP.map((h) => score(h, pop, asOf, hctx));
    const judged = sc.filter((s) => s.value != null);
    const passN = judged.filter((s) => s.pass).length;
    const inTest = pop.filter((p) => { const d = dayOf(p, asOf); return d >= 1 && d <= 14; }).length;
    const doneN = pop.filter((p) => ripe(p, 14, asOf)).length;
    const trend = HYP.filter((h) => h.trend);
    const TC = [COL.a, COL.blue, COL.green, COL.gold];
    // El avance empieza el día en que empezó la primera persona.
    const first = pop.reduce((a, p) => (!a || p.start < a ? p.start : a), null);
    const tdays = first ? days.filter((d) => d >= first) : [];
    const series = trend.map((h, i) => {
      const m = new Map(tdays.map((d) => { const ps = pop.filter((p) => p.start <= d); return [d, ps.length ? (ps.filter((p) => h.ev(p, d, hctx).v === true).length / ps.length) * 100 : 0]; }));
      return { label: h.code + ' · ' + h.name, c: TC[i % TC.length], get: (d) => m.get(d) };
    });
    const D14 = Array.from({ length: 14 }, (_, i) => i + 1);
    const goalNote = hctx.goalKey === 'goals_views' ? ' H9 usa las visitas a Metas mientras la app no mande «goal_created».' : '';
    return {
      kpis: [
        kpi('Hipótesis que se cumplen', judged.length ? passN + ' de ' + judged.length : '—', judged.length < HYP.length ? (HYP.length - judged.length) + ' sin resultado todavía' : 'todas medidas', judged.length && passN < judged.length ? 'var(--warn)' : null),
        kpi('Personas medidas', N(pop.length), lab('aud', ctx.aud) + (ctx.cohort ? ' · ' + ctx.cohort : '') + ' · al ' + fd(asOf)),
        kpi('En sus 14 días', N(inTest), 'todavía en la prueba'),
        kpi('Terminaron los 14 días', N(doneN), pop.length ? P(r1((doneN / pop.length) * 100)) + ' de las personas' : '—'),
        kpi('Encuestas respondidas', N(pop.filter(surveyed).length), 'de ' + N(pop.length)),
      ],
      cards: HYP.map((h) => hypCard(h, pop, asOf, hctx)).concat([
        // Con su propio ctx.days, para que el detalle ponga lo más reciente arriba.
        bars(Object.assign({}, ctx, { days: tdays }), { id: 'h-trend', wide: true, area: true, top: 100, title: 'Cómo avanzan día a día', sub: 'De las personas que ya habían empezado, cuántas lo lograron hasta ese día. Metas: H0 60 %, H2 80 %, H3 60 %, H9 50 %.' + goalNote, keys: tdays, fmt: (v) => P(r1(v)), tipFn: (d, v) => fd(d) + ' · ' + trend.map((h, i) => h.code + ' ' + P(r1(v[i]))).join(' · '), series }),
        table({ id: 'h-days', wide: true, show: 12, minW: '860px', title: 'Sesiones con acción por día de la prueba', sub: 'Una fila por persona; D1 es su primer día. Más intenso, más sesiones; «·» es un día sin ninguna y el vacío, un día que aún no llega.',
          cols: [{ label: 'Persona', align: 'left', w: 'minmax(110px,1.6fr)' }].concat(D14.map((n) => ({ label: 'D' + n, heat: true, align: 'center', w: 'minmax(34px,.5fr)' }))).concat([{ label: 'Total', bar: true, w: 'minmax(56px,.8fr)' }]),
          rows: pop.slice().sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0)).map((p) => [{ v: pname(p), fw: 500 }].concat(D14.map((n) => { const d = relD(p, n); if (d > asOf) return { v: '' }; const v = num((p.days.get(d) || {}).action_sessions); return v ? { v: N(v), n: v } : { v: '·', color: 'var(--text3)' }; })).concat([nc(span(p, 1, 14, 'action_sessions', asOf))])) }),
      ]),
    };
  }

  if (id === 'testers') {
    const all = people(D);
    const pop = all.filter((p) => inAud(p, ctx.aud, ctx.cohort));
    const Ts = all.filter((p) => p.tester), Os = all.filter((p) => !p.tester);
    const actIn = (p, a, b) => { let n = 0; p.days.forEach((x, d) => { if (d >= a && d <= b && num(x.events) > 0) n++; }); return n; };
    const act7 = (ps) => ps.filter((p) => actIn(p, addD(ctx.end, -6), ctx.end) > 0).length;
    const perAct = (ps) => { const m = new Map(); ps.forEach((p) => p.days.forEach((x, d) => { if (num(x.events) > 0) m.set(d, (m.get(d) || 0) + 1); })); return (d) => m.get(d) || 0; };
    const inRng = (p, k) => { let s = 0; p.days.forEach((x, d) => { if (d >= st && d <= ctx.end) s += num(x[k]); }); return s; };
    const noProfile = Ts.filter((p) => !p.persona || !ok(p.age) || !p.gender).length;
    const act = pop.filter((p) => p.tester || actIn(p, st, ctx.end) > 0).map((p) => ({ p, ad: actIn(p, st, ctx.end), ses: inRng(p, 'sessions') })).sort((a, b) => b.p.tester - a.p.tester || b.ses - a.ses);
    const cnt = (f) => items(group(Ts, f, () => 1));
    return {
      kpis: [
        kpi('Testers marcados', N(Ts.length), 'de ' + N(all.length) + ' instalaciones'),
        kpi('Testers activos', N(act7(Ts)), '7 días al ' + fd(ctx.end)),
        kpi('No testers activos', N(act7(Os)), '7 días al ' + fd(ctx.end)),
        kpi('Testers sin perfil', N(noProfile), 'falta persona, edad o género', noProfile ? 'var(--warn)' : null),
        kpi('Encuestas respondidas', N(Ts.filter(surveyed).length), 'de ' + N(Ts.length) + ' testers'),
      ],
      cards: [
        roster({ id: 'roster', wide: true, title: 'Instalaciones', sub: 'Marca quién es tester y toca Editar para su perfil y su encuesta. Cada tester ve el inicio de su ID en Configuración › Ayuda › «Enviar estadísticas ahora».' }, all),
        bars(ctx, { id: 't-active', size: 'lg', area: true, title: 'Activos por día', sub: 'Personas con al menos un evento: testers contra el resto.', keys: days, tipFn: (d, v) => fd(d) + ' · ' + N(v[0]) + ' testers · ' + N(v[1]) + ' no testers', series: [{ label: 'Testers', c: COL.a, get: perAct(Ts) }, { label: 'No testers', c: COL.blue, get: perAct(Os) }] }),
        mix({ id: 't-persona', size: 'sm', title: 'Testers por user persona', bigSub: 'testers', items: cnt((p) => p.persona || 'Sin persona') }),
        table({ id: 't-activity', wide: true, show: 10, minW: '980px', title: 'Actividad por persona', sub: lab('aud', ctx.aud) + ' del ' + fd(st) + ' al ' + fd(ctx.end) + '. «Con acción»: sesiones en las que registró o revisó algo. «De valor»: clasificar, reglas, metas, asistente…',
          cols: [{ label: 'Persona', align: 'left', w: 'minmax(110px,1.4fr)' }, { label: 'Tester', align: 'left', w: 'minmax(52px,.6fr)' }, { label: 'User persona', align: 'left', w: 'minmax(96px,1.1fr)' }, { label: 'iPhone', align: 'left', w: 'minmax(100px,1.1fr)' }, { label: 'Días activos', bar: true }, { label: 'Sesiones' }, { label: 'Con acción', heat: true }, { label: 'De valor' }, { label: 'Gastos del correo' }, { label: 'Minutos' }, { label: 'Errores' }, { label: 'Último día', w: 'minmax(70px,.8fr)' }],
          rows: act.map(({ p, ad, ses }) => [{ v: pname(p), fw: 500 }, p.tester ? 'Sí' : 'No', p.persona || '—', p.iphone || '—', nc(ad), N(ses), nc(inRng(p, 'action_sessions')), N(inRng(p, 'value_actions')), N(inRng(p, 'email_movements')), N(r1(inRng(p, 'minutes'))), { v: N(inRng(p, 'errors')), color: inRng(p, 'errors') ? 'var(--warn)' : 'var(--text)' }, fd(p.last)]) }),
        mix({ id: 't-age', size: 'sm', title: 'Testers por edad', bigSub: 'testers', items: cnt((p) => ageBand(p.age) || 'Sin edad') }),
        mix({ id: 't-gender', size: 'sm', title: 'Testers por género', bigSub: 'testers', items: cnt((p) => lab('gender', p.gender || null).replace('—', 'Sin dato')) }),
        mix({ id: 't-iphone', size: 'sm', title: 'Testers por iPhone', bigSub: 'testers', items: cnt((p) => p.iphone || 'Sin dato') }),
      ],
    };
  }

  if (id === 'resumen') {
    const da = inR(D.analytics_daily_active, st); const dam = byDay(da);
    const lastDay = da.map((x) => String(x.day).slice(0, 10)).sort().pop();
    const last = lastDay ? dam.get(lastDay) : null;
    const avg = da.length ? sum(da, 'active_installs') / da.length : null;
    const avgPro = da.length ? sum(da, 'active_pro') / da.length : null;
    const wk = latest(D.analytics_weekly_active, 'week'); const mo = latest(D.analytics_monthly_active, 'month');
    const ni = inR(D.analytics_new_installs_daily, st); const nim = byDay(ni);
    const act = sum(da, 'active_installs');
    const weeks = (D.analytics_weekly_active || []).map((x) => String(x.week).slice(0, 10)).sort().slice(-12);
    const wkm = new Map((D.analytics_weekly_active || []).map((x) => [String(x.week).slice(0, 10), x]));
    const src = inR(D.analytics_open_sources_daily, st);
    const hours = new Map((D.analytics_open_hours_30d || []).map((x) => [num(x.hour), num(x.opens)]));
    const peak = [...hours.entries()].sort((a, b) => b[1] - a[1])[0];
    const dv = (d, k) => num(dam.get(d) && dam.get(d)[k]);
    return {
      kpis: [
        kpi('DAU', N(last && last.active_installs), last ? fd(lastDay) + ' · promedio ' + N0(avg) : '—'),
        kpi('WAU', N(wk && wk.active_installs), wk ? 'semana del ' + fd(wk.week) : '—'),
        kpi('MAU', N(mo && mo.active_installs), mo ? MESL[+String(mo.month).slice(5, 7) - 1] : '—'),
        kpi('Pro activos por día', N0(avgPro), avg ? P(Math.round((avgPro / avg) * 1000) / 10) + ' de los activos' : '—'),
        kpi('Instalaciones nuevas', N(sum(ni, 'new_users')), 'en ' + R + ' días'),
        kpi('Sesiones por persona', act ? N(Math.round((sum(da, 'sessions') / act) * 10) / 10) : '—', 'por día activo'),
      ],
      cards: [
        bars(ctx, { id: 'dau', size: 'lg', area: true, avgLine: true, title: 'Usuarios activos por día', sub: 'Instalaciones distintas con al menos un evento.', big: N0(avg), bigSub: 'activos por día en promedio', keys: days, tipFn: (d, v) => fd(d) + ' · ' + N(v[0]) + ' activos · ' + N(v[1]) + ' Pro', series: [{ label: 'Activos', c: COL.a, get: (d) => dv(d, 'active_installs') }, { label: 'Pro', c: COL.ink, dash: true, get: (d) => dv(d, 'active_pro') }] }),
        gauge({ id: 'pro-share', title: 'Pro entre los activos', value: avg ? (avgPro / avg) * 100 : null, caption: 'de los activos de cada día son Pro', rows: [{ label: 'Pro por día', value: N0(avgPro), c: COL.gold }, { label: 'Gratis por día', value: avg ? N0(avg - avgPro) : '—', c: '#fff' }],
          dtitle: 'Día por día', detail: table({ id: 'pro-share-d', show: Infinity, cols: [{ label: 'Día', align: 'left', w: 'minmax(96px,1.3fr)' }, { label: 'Activos', bar: true }, { label: 'Pro' }, { label: '% Pro', heat: true }], rows: days.slice().reverse().filter((d) => dam.has(d)).map((d) => [{ v: fd(d), fw: 500 }, nc(dv(d, 'active_installs')), N(dv(d, 'active_pro')), pctCell(pct(dv(d, 'active_pro'), dv(d, 'active_installs')))]) }) }),
        bars(ctx, { id: 'installs', title: 'Instalaciones nuevas', sub: 'Las que ya usaban la app antes de la analítica cuentan aparte.', big: N(sum(ni, 'new_users')), bigSub: 'nuevas · ' + N(sum(ni, 'installs')) + ' en total', keys: days, series: [{ label: 'Nuevas', c: COL.a, get: (d) => num(nim.get(d) && nim.get(d).new_users) }, { label: 'Ya la usaban', c: COL.mute, get: (d) => num(nim.get(d) && nim.get(d).existing_users_updated) }] }),
        bars(ctx, { id: 'wau', title: 'Activos por semana', sub: 'WAU. La semana empieza el lunes.', meta: '12 semanas', klabel: 'Semana', keys: weeks, xlab: (w) => fd(w), tipFn: (w, v) => 'Semana del ' + fd(w) + ' · ' + N(v[0] + v[1]) + ' activos · ' + N(v[1]) + ' Pro', series: [{ label: 'Gratis', c: COL.ink, get: (w) => { const x = wkm.get(w); return x ? num(x.active_installs) - num(x.active_pro) : 0; } }, { label: 'Pro', c: COL.a, get: (w) => num(wkm.get(w) && wkm.get(w).active_pro) }] }),
        mix({ id: 'sources', title: 'Qué trae a la gente de vuelta', sub: 'Aperturas por origen.', bigSub: 'aperturas en ' + R + ' días', items: items(group(src, (x) => x.source, (x) => x.opens), 'src') }),
        bars(ctx, { id: 'hours', area: true, title: 'Hora de apertura', sub: 'Aperturas por hora, en hora de Lima.', meta: '30 días', big: peak ? peak[0] + ':00' : '', bigSub: 'la hora con más aperturas', klabel: 'Hora', keys: [...Array(24).keys()], xlab: (h) => h + ' h', tipFn: (h, v) => h + ':00 – ' + h + ':59 · ' + N(v[0]) + ' aperturas', series: [{ label: 'Aperturas', c: COL.blue, get: (h) => hours.get(h) || 0 }] }),
      ],
    };
  }

  if (id === 'activacion') {
    const c16 = monday(addD(T, -7 * 15));
    const rc = (D.analytics_retention_cohorts || []).filter((x) => String(x.cohort_week).slice(0, 10) >= c16).sort((a, b) => (a.cohort_week < b.cohort_week ? 1 : -1));
    const w = (k) => { const xs = rc.filter((x) => ok(x[k])); const n = sum(xs, 'installs'); return n ? Math.round((xs.reduce((a, x) => a + num(x[k]) * num(x.installs), 0) / n) * 10) / 10 : null; };
    const fun = inR(D.analytics_onboarding_funnel, monday(st), 'cohort_week');
    const steps = new Map();
    fun.forEach((x) => { const s = steps.get(x.step) || { step: x.step, o: num(x.step_order), n: 0 }; s.n += num(x.installs); steps.set(x.step, s); });
    const first = (steps.get('slide_1') || {}).n || Math.max(0, ...[...steps.values()].map((s) => s.n));
    const fin = (steps.get('finished') || {}).n;
    const stepList = [...steps.values()].sort((a, b) => a.o - b.o);
    const nt = inR(D.analytics_notifications_daily, st);
    const sent = group(nt, (x) => x.type, (x) => x.sent);
    return {
      kpis: [
        kpi('Retención D1', P(w('d1_pct')), 'volvió al día siguiente'),
        kpi('Retención D7', P(w('d7_pct')), 'volvió entre el día 7 y el 13'),
        kpi('Retención D30', P(w('d30_pct')), 'volvió entre el día 30 y el 59'),
        kpi('Terminan el onboarding', first ? P(Math.round((fin / first) * 1000) / 10) : '—', first ? N(fin) + ' de ' + N(first) : '—'),
      ],
      cards: [
        rank({ id: 'funnel', size: 'lg', title: 'Embudo del onboarding', sub: 'Instalaciones nuevas de las cohortes del rango, por paso.', meta: 'desde el lun ' + fd(monday(st)), sort: false, show: 11, max: first, items: stepList.map((s) => ({ label: lab('step', s.step), value: s.n, note: first ? P(Math.round((s.n / first) * 1000) / 10) : '' })) }),
        gauge({ id: 'onb', title: 'Terminan el onboarding', value: first ? (fin / first) * 100 : null, caption: 'de quienes vieron la primera pantalla', rows: [{ label: 'Empezaron', value: N(first), c: '#fff' }, { label: 'Terminaron', value: N(fin), c: COL.gold }],
          detail: table({ id: 'onb-d', show: Infinity, cols: [{ label: 'Paso', align: 'left', w: 'minmax(140px,2fr)' }, { label: 'Instalaciones', bar: true }, { label: '% del inicio', heat: true }], rows: stepList.map((s) => [{ v: lab('step', s.step), fw: 500 }, nc(s.n), pctCell(pct(s.n, first))]) }) }),
        table({ id: 'retention', wide: true, show: 8, title: 'Retención por cohorte', sub: 'Por semana de instalación. Más intenso, más gente volvió. «—» cuando la cohorte aún es muy joven para medirlo.', meta: '16 semanas', cols: [{ label: 'Semana', align: 'left', w: 'minmax(90px,1.4fr)' }, { label: 'Instalaciones', bar: true }, { label: 'D1', heat: true }, { label: 'D7', heat: true }, { label: 'D30', heat: true }], rows: rc.map((x) => [{ v: 'Lun ' + fd(x.cohort_week), fw: 500 }, nc(x.installs), pctCell(x.d1_pct), pctCell(x.d7_pct), pctCell(x.d30_pct)]) }),
        rank({ id: 'milestones', title: 'Hitos de activación', sub: 'Parte de las instalaciones nuevas que llegó a cada hito y en cuánto tiempo (mediana).', meta: 'desde siempre', max: 100, fmt: P, c: COL.blue, items: (D.analytics_activation_milestones || []).map((x) => ({ label: lab('ms', x.milestone), value: num(x.pct_of_new_installs), note: FH(num(x.median_hours)) })) }),
        rank({ id: 'notifs', tone: 'dark', title: 'Notificaciones abiertas', sub: 'Sólo los avisos de importados se cuentan también al enviarse.', items: items(group(nt, (x) => x.type, (x) => x.opened), 'notif', (k) => ({ note: sent.get(k) ? 'de ' + N(sent.get(k)) + ' enviadas' : '' })) }),
      ],
    };
  }

  if (id === 'uso') {
    const sc = inR(D.analytics_screens_daily, st);
    const views = group(sc, (x) => x.screen, (x) => x.views), mins = group(sc, (x) => x.screen, (x) => x.minutes);
    const dauDays = sum(inR(D.analytics_daily_active, st), 'active_installs');
    const mmb = D.analytics_max_months_back_30d || [];
    const mbTot = sum(mmb, 'installs'), mb3 = sum(mmb.filter((x) => num(x.max_months_back) >= 3), 'installs');
    const mbm = new Map(mmb.map((x) => [num(x.max_months_back), num(x.installs)]));
    const mbKeys = [...Array(Math.max(7, ...mmb.map((x) => num(x.max_months_back) + 1))).keys()];
    const fu = inR(D.analytics_feature_usage_daily, st);
    const tapsR = inR(D.analytics_taps_daily, st), nav = inR(D.analytics_navigation_daily, st);
    return {
      kpis: [
        kpi('Visitas a pantallas', N(sum(sc, 'views')), 'sin continuaciones'),
        kpi('Minutos en la app', N0(sum(sc, 'minutes')), 'en ' + R + ' días'),
        kpi('Minutos por persona', dauDays ? N(Math.round((sum(sc, 'minutes') / dauDays) * 10) / 10) : '—', 'por día activo'),
        kpi('Miran ≥ 3 meses atrás', mbTot ? P(Math.round((mb3 / mbTot) * 1000) / 10) : '—', '30 días'),
        kpi('Funciones usadas', N(new Set(fu.map((x) => x.feature)).size), 'distintas'),
      ],
      cards: [
        rank({ id: 'screens', title: 'Pantallas más vistas', sub: 'Visitas, sin contar la vuelta desde segundo plano.', items: items(views, null, (k) => ({ note: MIN(Math.round(mins.get(k) || 0)) })) }),
        rank({ id: 'screen-min', title: 'Tiempo por pantalla', sub: 'Minutos sumados, incluidas las continuaciones.', c: COL.blue, fmt: (v) => MIN(Math.round(v)), items: items(mins) }),
        rank({ id: 'taps', title: 'Dónde se toca más', sub: 'Toques por destino.', items: items(group(tapsR, (x) => x.target, (x) => x.taps), null, (k) => ({ note: N(sum(tapsR.filter((x) => x.target === k), 'installs')) + ' pers·día' })) }),
        rank({ id: 'nav', tone: 'dark', title: 'Pestañas y secciones', sub: 'Cambios de pestaña y de la píldora.', items: items(group(nav, (x) => (x.event === 'tab_select' ? 'Pestaña · ' : 'Sección · ') + x.target, (x) => x.selects)) }),
        rank({ id: 'discovery', title: 'Descubrimiento de funciones', sub: 'Parte de las instalaciones que usó cada función alguna vez, y en cuántos días (mediana).', meta: 'desde siempre', max: 100, fmt: P, c: COL.green, items: (D.analytics_feature_discovery || []).map((x) => ({ label: x.feature, value: num(x.pct_of_installs), note: ok(x.median_days_to_discover) ? N(x.median_days_to_discover) + ' d' : '' })) }),
        rank({ id: 'features', title: 'Uso de funciones', sub: 'Cada uso cuenta.', items: items(group(fu, (x) => x.feature, (x) => x.uses)) }),
        bars(ctx, { id: 'monthsback', title: 'Cuántos meses atrás se mira', sub: 'Lo más lejos que llegó cada persona.', meta: '30 días', klabel: 'Meses atrás', keys: mbKeys, xlab: (m) => (m === 0 ? 'este mes' : m + ' m'), tipFn: (m, v) => (m === 0 ? 'Sólo este mes' : m + (m === 1 ? ' mes' : ' meses') + ' atrás') + ' · ' + N(v[0]) + ' personas', series: [{ label: 'Personas', c: COL.blue, get: (m) => mbm.get(m) || 0 }] }),
        mix({ id: 'chartmode', title: 'Modo del gráfico del Resumen', sub: 'Días, Semanas o Meses.', meta: '30 días', bigSub: 'elecciones', items: (D.analytics_chart_modes_30d || []).map((x) => ({ label: x.mode, value: num(x.choices), note: N(x.installs) + ' personas' })) }),
        table({ id: 'mvcontrols', wide: true, title: 'Controles de Movimientos', sub: 'Mes, Tus cuentas, meses anteriores, pingüino y «Clasificar ›». «Todos» es elegir todos los meses; el % es lo clasificado del mes al tocar el pingüino.', meta: '30 días', cols: [{ label: 'Control', align: 'left', w: 'minmax(110px,1.4fr)' }, { label: 'Toques', bar: true }, { label: 'Personas' }, { label: 'Meses atrás' }, { label: 'Todos' }, { label: 'Ráfagas' }, { label: '% clasificado' }], minW: '600px', rows: (D.analytics_movements_controls_30d || []).slice().sort((a, b) => num(b.taps) - num(a.taps)).map((x) => [{ v: lab('ctrl', x.control), fw: 500 }, nc(x.taps), N(x.installs), N(x.avg_months_back), num(x.all_months) ? N(x.all_months) : '—', num(x.bursts) ? N(x.bursts) : '—', P(x.avg_pct_classified)]) }),
      ],
    };
  }

  if (id === 'correo') {
    const ph = inR(D.analytics_parser_health_daily, st);
    const d3 = addD(T, -2);
    const banks = new Map();
    ph.forEach((x) => { const b = banks.get(x.bank) || { ins: 0, dup: 0, miss: 0, tot: 0, miss3: 0, tot3: 0 }; const e = num(x.emails); b.tot += e; if (x.result === 'inserted') b.ins += e; if (x.result === 'duplicate') b.dup += e; if (x.result === 'amount_missing') b.miss += e; if (String(x.day).slice(0, 10) >= d3) { b.tot3 += e; if (x.result === 'amount_missing') b.miss3 += e; } banks.set(x.bank, b); });
    const bankList = [...banks.entries()].sort((a, b) => b[1].tot - a[1].tot);
    const tot = sum(ph, 'emails'), miss = sum(ph.filter((x) => x.result === 'amount_missing'), 'emails');
    const sr = inR(D.analytics_sync_runs_daily, st);
    const lat = inR(D.analytics_email_latency_daily, st);
    const latDay = new Map(); lat.forEach((x) => { const d = String(x.day).slice(0, 10); const a = latDay.get(d) || []; a.push(x); latDay.set(d, a); });
    const lp = (d, k) => { const xs = latDay.get(d); return xs ? wavg(xs, k, 'movements') : 0; };
    const acc = inR(D.analytics_accounts_daily, st);
    const revoked = sum(acc.filter((x) => x.event === 'account_disconnected' && x.reason === 'revoked'), 'events');
    const ins = perDay(ph.filter((x) => x.result === 'inserted'), (x) => x.emails), dup = perDay(ph.filter((x) => x.result === 'duplicate'), (x) => x.emails), ms = perDay(ph.filter((x) => x.result === 'amount_missing'), (x) => x.emails);
    const pctUnrec = sum(sr, 'checked') ? Math.round((sum(sr, 'unrecognized') / sum(sr, 'checked')) * 1000) / 10 : null;
    const ev = group(acc, (x) => x.event, (x) => x.events);
    const minF = (v) => MIN(r1(v));
    return {
      kpis: [
        kpi('Correos reconocidos', N(tot), 'en ' + R + ' días'),
        kpi('Sin monto', tot ? P(Math.round((miss / tot) * 1000) / 10) : '—', N(miss) + ' correos', tot && miss / tot >= 0.05 ? 'var(--neg)' : null),
        kpi('Sin reconocer', P(pctUnrec), 'de lo revisado en lecturas'),
        kpi('Latencia p50', MIN(lat.length ? Math.round(wavg(lat, 'p50_min', 'movements') * 10) / 10 : null), 'correo → movimiento'),
        kpi('Permisos revocados', N(revoked), 'desconexiones «revoked»', revoked ? 'var(--warn)' : null),
      ],
      cards: [
        tiles({ id: 'banks', wide: true, title: 'Salud de los lectores por banco', sub: 'Si sube «sin monto», ese banco cambió el formato de sus correos. En naranja, los que pasan del 5 %.', meta: N(banks.size) + ' bancos',
          items: bankList.map(([bank, b]) => { const p = b.tot ? (b.miss / b.tot) * 100 : null, p3 = b.tot3 ? (b.miss3 / b.tot3) * 100 : null; const bad = Math.max(num(p), num(p3)) >= 5; return { kicker: (bad ? 'Revisar · ' : '') + 'últimos 3 días ' + P(r1(p3)), title: bank, sub: N(b.dup) + ' duplicados · ' + N(b.miss) + ' sin monto', value: N(b.ins), foot: 'insertados · ' + P(r1(p)) + ' sin monto', tone: bad ? 'orange' : 'dark' }; }),
          detail: table({ id: 'banks-d', show: Infinity, cols: [{ label: 'Banco', align: 'left', w: 'minmax(84px,1.3fr)' }, { label: 'Insertados', bar: true }, { label: 'Duplicados' }, { label: 'Sin monto' }, { label: '% sin monto' }, { label: 'Últimos 3 días' }], minW: '520px', rows: bankList.map(([bank, b]) => [{ v: bank, fw: 500 }, nc(b.ins), N(b.dup), N(b.miss), pctCell(b.tot ? (b.miss / b.tot) * 100 : null, 5), pctCell(b.tot3 ? (b.miss3 / b.tot3) * 100 : null, 5)]) }) }),
        bars(ctx, { id: 'emails', size: 'lg', title: 'Correos por día', sub: 'Por resultado del lector.', big: N(tot), bigSub: 'correos reconocidos', keys: days, series: [{ label: 'Insertados', c: COL.ink, get: ins }, { label: 'Duplicados', c: COL.mute, get: dup }, { label: 'Sin monto', c: COL.a, get: ms }] }),
        rank({ id: 'accounts', size: 'sm', title: 'Conexiones de correo', sub: 'De abrir la ventana de Google o Microsoft a conectar.', sort: false, max: ev.get('account_connect_started'), items: ['account_connect_started', 'account_connected', 'account_connect_failed', 'account_disconnected'].map((k) => ({ label: lab('acct', k), value: ev.get(k) || 0, c: k === 'account_connect_failed' || k === 'account_disconnected' ? COL.a : COL.ink })) }),
        bars(ctx, { id: 'latency', size: 'lg', area: true, title: 'Minutos entre correo y movimiento', sub: 'Sólo lecturas normales, sin rangos pasados.', big: MIN(lat.length ? r1(wavg(lat, 'p50_min', 'movements')) : null), bigSub: 'p50 del rango', keys: days, fmt: minF, tipFn: (d, v) => fd(d) + ' · p50 ' + minF(v[0]) + ' · p90 ' + minF(v[1]), series: [{ label: 'p50', c: COL.a, get: (d) => lp(d, 'p50_min') }, { label: 'p90', c: COL.ink, dash: true, get: (d) => lp(d, 'p90_min') }] }),
        rank({ id: 'acct-reasons', size: 'sm', tone: 'dark', title: 'Por qué falla o se desconecta', sub: '«revoked»: el permiso dejó de valer.', show: 5, items: items(group(acc.filter((x) => x.reason), (x) => lab('acct', x.event) + ' · ' + lab('prov', x.provider) + ' · ' + x.reason, (x) => x.events)) }),
        rank({ id: 'syncruns', wide: true, title: 'Lecturas del correo', sub: 'Lecturas que procesaron algo.', sort: false, items: [{ label: 'Lecturas', value: sum(sr, 'runs') }, { label: 'Correos revisados', value: sum(sr, 'checked'), c: COL.ink }, { label: 'Movimientos nuevos', value: sum(sr, 'new_movements'), c: COL.blue }, { label: 'Sin reconocer', value: sum(sr, 'unrecognized'), c: COL.warn, note: P(pctUnrec) }, { label: 'Descargas fallidas', value: sum(sr, 'failed_fetch'), c: COL.neg }] }),
      ],
    };
  }

  if (id === 'clasificacion') {
    const av = inR(D.analytics_auto_vs_manual_daily, st); const avm = byDay(av);
    const autoOf = (x) => num(x.auto_rule) + num(x.auto_keyword) + num(x.auto_voice) + num(x.auto_recurring);
    const autoT = sum(av, autoOf);
    const man = sum(av, 'manual_from_pending');
    const cl = inR(D.analytics_classification_daily, st);
    const rules = inR(D.analytics_rules_daily, st);
    const pb = inR(D.analytics_pending_backlog_daily, st); const pbm = byDay(pb);
    const pbLast = latest(pb, 'day');
    const sg = D.analytics_suggestions_30d || [];
    const sgA = sum(sg, 'accepted'), sgD = sum(sg, 'dismissed');
    const g = (k) => (d) => num(avm.get(d) && avm.get(d)[k]);
    const mc = inR(D.analytics_movements_created_daily, st);
    const cs = inR(D.analytics_classify_sheet_daily, st);
    const modes = new Map();
    cs.forEach((x) => tally(modes, x.mode, ['sheets', 'installs', 'items', 'classified', 'tagged', 'skipped', 'completed', 'bulk_with_earlier', 'bulk_with_rule'], x));
    const ud = inR(D.analytics_classification_undo_daily, st); const udm = byDay(ud);
    const undone = sum(ud, 'movements_undone'), quick = sum(ud, 'movements_classified');
    const bf = inR(D.analytics_rules_backfill_daily, st); const bfm = byDay(bf);
    return {
      kpis: [
        kpi('Clasificado automático', autoT + man ? P(Math.round((autoT / (autoT + man)) * 1000) / 10) : '—', 'contra lo sacado a mano de Pendientes'),
        kpi('Clasificados a mano', N(sum(cl, 'movements')), N(sum(cl, 'reclassified')) + ' reclasificados'),
        kpi('Reglas creadas', N(sum(rules, 'rules')), 'en ' + R + ' días'),
        kpi('Pendientes del mes', N(pbLast && pbLast.p50_pending_month), pbLast ? 'mediana · ' + fd(pbLast.day) : '—'),
        kpi('Sugerencias aceptadas', sgA + sgD ? P(Math.round((sgA / (sgA + sgD)) * 1000) / 10) : '—', '30 días'),
        kpi('Deshecho tras clasificar', P(pct(undone, quick)), N(sum(ud, 'undos')) + ' veces «Deshacer»', pct(undone, quick) >= 10 ? 'var(--warn)' : null),
      ],
      cards: [
        gauge({ id: 'auto-g', title: 'Clasificado automático', value: autoT + man ? (autoT / (autoT + man)) * 100 : null, caption: 'llegó clasificado, contra lo sacado a mano', rows: [{ label: 'Automático', value: N(autoT), c: COL.gold }, { label: 'A mano desde Pendientes', value: N(man), c: '#fff' }],
          dtitle: 'Día por día', detail: table({ id: 'auto-g-d', show: Infinity, cols: [{ label: 'Día', align: 'left', w: 'minmax(96px,1.3fr)' }, { label: 'Automático', bar: true }, { label: 'A mano' }, { label: '% automático', heat: true }], rows: days.slice().reverse().filter((d) => avm.has(d)).map((d) => { const a = autoOf(avm.get(d)), m = g('manual_from_pending')(d); return [{ v: fd(d), fw: 500 }, nc(a), N(m), pctCell(pct(a, a + m))]; }) }) }),
        bars(ctx, { id: 'automan', size: 'lg', title: 'Automático contra manual', sub: 'Movimientos que llegaron ya clasificados y los que el usuario sacó de Pendientes.', keys: days, series: [{ label: 'Regla de comercio', c: COL.a, get: g('auto_rule') }, { label: 'Palabra clave', c: COL.green, get: g('auto_keyword') }, { label: 'Voz y recurrentes', c: COL.blue, get: (d) => g('auto_voice')(d) + g('auto_recurring')(d) }, { label: 'A mano desde Pendientes', c: COL.ink, get: g('manual_from_pending') }] }),
        rank({ id: 'accuracy', title: 'Precisión de cada motor', sub: 'De lo que clasificó, cuánto no cambió después el usuario.', meta: '30 días', max: 100, fmt: P, c: COL.green, items: (D.analytics_auto_accuracy_30d || []).map((x) => ({ label: lab('engine', x.engine), value: num(x.pct_accuracy), note: N(x.corrected) + ' de ' + N(x.classified) + ' corregidos' })) }),
        table({ id: 'suggestions', title: 'Sugerencias', sub: 'Mostradas una vez al día por comercio y pantalla.', meta: '30 días', cols: [{ label: 'Tipo', align: 'left', w: 'minmax(70px,1.2fr)' }, { label: 'Mostradas', bar: true }, { label: 'Aceptadas' }, { label: 'Descartadas' }, { label: '% aceptadas', heat: true }], minW: '380px', rows: sg.slice().sort((a, b) => num(b.shown) - num(a.shown)).map((x) => [{ v: lab('sugg', x.kind), fw: 500 }, nc(x.shown), N(x.accepted), N(x.dismissed), pctCell(x.pct_accepted)]) }),
        bars(ctx, { id: 'backlog', area: true, title: 'Atasco de Pendientes', sub: 'Pendientes del mes por persona. Si crece, la gente se rinde.', big: N(pbLast && pbLast.avg_pending_month), bigSub: 'promedio del último día', keys: days, tipFn: (d) => { const x = pbm.get(d); return x ? fd(d) + ' · promedio ' + N(x.avg_pending_month) + ' · p50 ' + N(x.p50_pending_month) + ' · p90 ' + N(x.p90_pending_month) : fd(d) + ' · sin datos'; }, series: [{ label: 'Promedio', c: COL.a, get: (d) => num(pbm.get(d) && pbm.get(d).avg_pending_month) }, { label: 'Mediana', c: COL.ink, dash: true, get: (d) => num(pbm.get(d) && pbm.get(d).p50_pending_month) }] }),
        rank({ id: 'via', title: 'Desde dónde se clasifica a mano', sub: 'Movimientos clasificados por vía.', items: items(group(cl, (x) => x.via, (x) => x.movements), 'via') }),
        mix({ id: 'msource', title: 'De dónde salen los movimientos manuales', sub: 'Movimientos que no vinieron del correo.', bigSub: 'movimientos', items: items(group(mc, (x) => x.source, (x) => x.movements), 'msrc') }),
        rank({ id: 'rules', tone: 'dark', title: 'Reglas de comercio creadas', sub: 'Por origen.', items: items(group(rules, (x) => x.origin, (x) => x.rules), 'origin') }),
        table({ id: 'sheet', wide: true, title: 'Hoja de clasificar', sub: 'Cómo terminan la hoja suelta, la ráfaga y el bloque. «Con anteriores» y «con regla» sólo existen en bloque; «saltados», en ráfaga.', cols: [{ label: 'Modo', align: 'left', w: 'minmax(96px,1.3fr)' }, { label: 'Hojas', bar: true }, { label: 'Pers·día' }, { label: 'Movimientos' }, { label: 'Clasificados' }, { label: 'Etiquetados' }, { label: 'Saltados' }, { label: 'Terminadas', heat: true }, { label: 'Con anteriores' }, { label: 'Con regla' }], minW: '760px', rows: [...modes.entries()].sort((a, b) => b[1].sheets - a[1].sheets).map(([m, x]) => [{ v: lab('mode', m), fw: 500 }, nc(x.sheets), N(x.installs), N(x.items), N(x.classified), N(x.tagged), m === 'burst' ? N(x.skipped) : '—', pctLow(pct(x.completed, x.sheets), 50), m === 'bulk' ? N(x.bulk_with_earlier) : '—', m === 'bulk' ? N(x.bulk_with_rule) : '—']) }),
        bars(ctx, { id: 'undo', area: true, title: 'Clasificaciones deshechas', sub: 'Parte de lo clasificado desde la hoja, la ráfaga o la selección que se deshizo con el aviso.', big: P(pct(undone, quick)), bigSub: 'deshecho en el rango', keys: days, fmt: P, tipFn: (d) => { const x = udm.get(d); return x ? fd(d) + ' · ' + P(x.pct_undone) + ' · ' + N(x.movements_undone) + ' de ' + N(x.movements_classified) : fd(d) + ' · sin datos'; }, series: [{ label: '% deshecho', c: COL.a, get: (d) => num(udm.get(d) && udm.get(d).pct_undone) }] }),
        bars(ctx, { id: 'backfill', title: 'Reglas puestas de golpe', sub: 'Movimientos sin categoría que se clasificaron solos al aplicar las reglas (p. ej. tras restaurar).', big: N(sum(bf, 'movements')), bigSub: 'movimientos', keys: days, tipFn: (d) => { const x = bfm.get(d); return x ? fd(d) + ' · ' + N(x.movements) + ' movimientos en ' + N(x.runs) + (num(x.runs) === 1 ? ' vez' : ' veces') : fd(d) + ' · nada'; }, series: [{ label: 'Movimientos', c: COL.green, get: (d) => num(bfm.get(d) && bfm.get(d).movements) }] }),
      ],
    };
  }

  if (id === 'comercios') {
    const md = inR(D.analytics_merchant_daily, st);
    const bySrc = (s) => md.filter((x) => x.source === s);
    const auto = sum(bySrc('auto'), 'movements'), arr = sum(bySrc('arrived'), 'movements'), man = sum(bySrc('manual'), 'movements');
    const rec = sum(bySrc('reclassified'), 'movements'), corr = sum(bySrc('reclassified').filter((x) => x.engine), 'movements');
    const came = auto + arr;
    const people = sum(md.filter((x) => (x.source === 'auto' || x.source === 'arrived') && /(^|_)persona$/.test(x.merchant || '')), 'movements');
    const src = (s) => perDay(bySrc(s), (x) => x.movements);
    const rk = (D.analytics_merchant_ranking_30d || []).slice().sort((a, b) => num(b.arrived) + num(b.manual_from_pending) - num(a.arrived) - num(a.manual_from_pending));
    const rc = (D.analytics_merchant_reclassified_30d || []).slice().sort((a, b) => num(b.movements) - num(a.movements));
    const un = (D.analytics_merchant_unclassified_30d || []).slice().sort((a, b) => num(b.arrived) - num(a.arrived));
    return {
      kpis: [
        kpi('Comercios distintos', N(new Set(md.map((x) => x.merchant)).size), 'en ' + R + ' días'),
        kpi('Llegan ya clasificados', P(pct(auto, came)), N(auto) + ' de ' + N(came) + ' gastos del correo'),
        kpi('Precisión automática', auto ? P(Math.round(1000 * (1 - corr / auto)) / 10) : '—', N(corr) + ' corregidos después', auto && corr / auto >= 0.1 ? 'var(--warn)' : null),
        kpi('Clasificados a mano', N(man), N(rec) + ' reclasificados'),
        kpi('Pagos a personas', P(pct(people, came)), 'Yape, Plin y transferencias'),
      ],
      cards: [
        gauge({ id: 'm-auto', tone: 'green', title: 'Llegan ya clasificados', value: pct(auto, came), caption: 'de los gastos del correo', rows: [{ label: lab('msrcs', 'auto'), value: N(auto), c: COL.gold }, { label: lab('msrcs', 'arrived'), value: N(arr), c: '#fff' }, { label: 'Corregidos después', value: N(corr), c: 'var(--c-orange)' }] }),
        bars(ctx, { id: 'merchant-src', size: 'lg', title: 'Qué pasa con cada gasto por comercio', sub: 'Gastos del correo que llegaron con categoría o sin ella, y lo que después se clasificó o cambió a mano.', keys: days, series: [{ label: lab('msrcs', 'auto'), c: COL.blue, get: src('auto') }, { label: lab('msrcs', 'arrived'), c: COL.mute, get: src('arrived') }, { label: lab('msrcs', 'manual'), c: COL.ink, get: src('manual') }, { label: lab('msrcs', 'reclassified'), c: COL.a, get: src('reclassified') }] }),
        table({ id: 'merchant-rank', wide: true, show: 8, title: 'Comercios', sub: '«Solos»: llegaron con categoría. «Precisión»: de lo que se clasificó solo, cuánto no se corrigió después.', meta: '30 días', cols: [{ label: 'Comercio', align: 'left', w: 'minmax(130px,1.8fr)' }, { label: 'Llegaron', bar: true }, { label: 'Solos' }, { label: '% solos', heat: true }, { label: 'Sin categoría' }, { label: 'A mano' }, { label: 'Reclasificados' }, { label: 'Precisión' }], minW: '700px', rows: rk.map((x) => [{ v: mlab(x.merchant), fw: 500 }, nc(x.arrived), N(x.auto), pctLow(ok(x.pct_auto) ? +x.pct_auto : null, -1), N(x.arrived_unclassified), N(x.manual_from_pending), num(x.reclassified) ? { v: N(x.reclassified), color: 'var(--warn)' } : N(x.reclassified), pctLow(ok(x.pct_auto_kept) ? +x.pct_auto_kept : null, 90)]) }),
        table({ id: 'merchant-reclass', title: 'Los más reclasificados', sub: 'De qué categoría a cuál y quién había puesto la primera.', meta: '30 días', cols: [{ label: 'Comercio', align: 'left', w: 'minmax(110px,1.4fr)' }, { label: 'De → a', align: 'left', w: 'minmax(140px,1.8fr)' }, { label: 'La puso', align: 'left', w: 'minmax(90px,1.1fr)' }, { label: 'Movs.', bar: true }, { label: 'Días' }], minW: '520px', rows: rc.map((x) => [{ v: mlab(x.merchant), fw: 500 }, { v: clab(x.from_category) + ' → ' + clab(x.to_category) }, { v: lab('engine', x.replaced), color: x.replaced === 'usuario' ? 'var(--text2)' : 'var(--warn)' }, nc(x.movements), N(x.days)]) }),
        rank({ id: 'merchant-auto', title: 'Los que se clasifican solos', sub: 'Con el motor y la categoría que les tocó.', meta: '30 días', c: COL.green, items: (D.analytics_merchant_auto_30d || []).map((x) => ({ label: mlab(x.merchant), value: num(x.movements), note: lab('engine', x.engine) + ' · ' + clab(x.category) })) }),
        table({ id: 'merchant-unclassified', wide: true, tone: 'dark', title: 'Llegan sin categoría', sub: 'Y la que la gente termina poniéndoles: candidatos a palabra clave o regla de fábrica.', meta: '30 días', cols: [{ label: 'Comercio', align: 'left', w: 'minmax(130px,1.6fr)' }, { label: 'Sin categoría', bar: true }, { label: 'Clasificados a mano' }, { label: 'Categoría que eligen', align: 'left', w: 'minmax(130px,1.6fr)' }, { label: 'Veces' }], minW: '560px', rows: un.map((x) => [{ v: mlab(x.merchant), fw: 500 }, nc(x.arrived), N(x.classified_by_hand), { v: clab(x.top_category) }, N(x.top_category_movements)]) }),
      ],
    };
  }

  if (id === 'suscripciones') {
    const sd = (D.analytics_subscription_detection_30d || []).map((x) => Object.assign({}, x, { n: num(x.confirmed) + num(x.rejected) }));
    const sm = (D.analytics_subscription_merchants_30d || []).slice().sort((a, b) => num(b.confirmed) + num(b.rejected) - num(a.confirmed) - num(a.rejected));
    const conf = sum(sd, 'confirmed'), tot = sum(sd, 'n');
    const rate = (m) => items(new Map([...m.entries()].map(([k, v]) => [k, pct(v.confirmed, v.n)])), null, (k) => ({ note: N(m.get(k).confirmed) + ' de ' + N(m.get(k).n) }));
    const byLevel = new Map(), byCad = new Map();
    sd.forEach((x) => { tally(byLevel, x.level, ['confirmed', 'n'], x); tally(byCad, x.cadence, ['confirmed', 'n'], x); });
    const withLabels = (list, d) => list.map((x) => Object.assign(x, { label: lab(d, x.key) }));
    return {
      kpis: [
        kpi('Respondidas', N(tot), 'confirmadas o descartadas'),
        kpi('Confirmadas', P(pct(conf, tot)), N(conf) + ' de ' + N(tot), ok(pct(conf, tot)) && pct(conf, tot) < 50 ? 'var(--warn)' : null),
        kpi('Puntaje promedio', N0(wavg(sd, 'avg_score', 'n')), 'de 0 a 100'),
        kpi('Como cuotas', N(sum(sd, 'as_installments')), 'marcadas en cuotas'),
      ],
      cards: [
        gauge({ id: 'sub-g', tone: 'green', title: 'Detecciones confirmadas', value: pct(conf, tot), caption: 'de lo que el usuario respondió', rows: [{ label: 'Confirmadas', value: N(conf), c: COL.gold }, { label: 'Descartadas', value: N(tot - conf), c: '#fff' }] }),
        rank({ id: 'sub-level', size: 'sm', title: 'Acierto por nivel', sub: '«Detectada» se muestra como suscripción; «sugerida» sólo se propone.', max: 100, fmt: P, c: COL.green, items: withLabels(rate(byLevel), 'level') }),
        rank({ id: 'sub-cadence', size: 'sm', title: 'Acierto por ritmo', sub: 'Parte de las detecciones que el usuario confirmó.', max: 100, fmt: P, c: COL.blue, items: withLabels(rate(byCad), 'cadence') }),
        table({ id: 'sub-detection', wide: true, title: 'Detector por nivel y ritmo', sub: 'Si «sugerida» se descarta mucho, el umbral está bajo.', cols: [{ label: 'Nivel', align: 'left', w: 'minmax(90px,1.2fr)' }, { label: 'Ritmo', align: 'left', w: 'minmax(80px,1fr)' }, { label: 'Confirmadas', bar: true }, { label: 'Descartadas' }, { label: '% confirmadas', heat: true }, { label: 'Puntaje' }, { label: 'En cuotas' }], minW: '560px', rows: sd.slice().sort((a, b) => b.n - a.n).map((x) => [{ v: lab('level', x.level), fw: 500 }, { v: lab('cadence', x.cadence) }, nc(x.confirmed), N(x.rejected), pctLow(ok(x.pct_confirmed) ? +x.pct_confirmed : null, 50), N(x.avg_score), N(x.as_installments)]) }),
        table({ id: 'sub-merchants', wide: true, show: 8, title: 'Por comercio', sub: 'Cuáles se confirman y cuáles se descartan.', cols: [{ label: 'Comercio', align: 'left', w: 'minmax(130px,1.6fr)' }, { label: 'Categoría', align: 'left', w: 'minmax(100px,1.2fr)' }, { label: 'Confirmadas', bar: true }, { label: 'Descartadas' }, { label: '% confirmadas', heat: true }, { label: 'Puntaje' }], minW: '560px', rows: sm.map((x) => [{ v: mlab(x.merchant), fw: 500 }, { v: clab(x.category) }, nc(x.confirmed), N(x.rejected), pctLow(pct(x.confirmed, num(x.confirmed) + num(x.rejected)), 50), N(x.avg_score)]) }),
      ],
    };
  }

  if (id === 'pro') {
    const p30 = D.analytics_paywall_30d || [];
    const sh = sum(p30, 'installs_shown'), tr = sum(p30, 'installs_trial');
    const eng = (D.analytics_pro_engagement_30d || [])[0] || {};
    const pd = inR(D.analytics_paywall_daily, st);
    const shown = perDay(pd, (x) => x.shown), trials = perDay(pd, (x) => x.trials);
    const pw = p30.slice().sort((a, b) => num(b.installs_shown) - num(a.installs_shown));
    const best = Math.max(0, ...p30.map((x) => num(x.pct_conversion)));
    return {
      kpis: [
        kpi('Vieron el paywall', N(sh), '30 días'),
        kpi('Iniciaron la prueba', N(tr), '30 días'),
        kpi('Conversión', sh ? P(Math.round((tr / sh) * 1000) / 10) : '—', 'paywall → prueba'),
        kpi('Pro sin usar nada Pro', N(eng.not_using_pro_features), ok(eng.pro_installs) ? 'de ' + N(eng.pro_installs) + ' Pro' : '—', num(eng.not_using_pro_features) ? 'var(--warn)' : null),
        kpi('Funciones Pro por persona', N(eng.avg_features), 'promedio, 30 días'),
      ],
      cards: [
        gauge({ id: 'conv-g', title: 'Paywall → prueba', value: sh ? (tr / sh) * 100 : null, caption: 'de quienes vieron el paywall lo probaron', rows: [{ label: 'Vieron el paywall', value: N(sh), c: '#fff' }, { label: 'Iniciaron la prueba', value: N(tr), c: COL.gold }] }),
        bars(ctx, { id: 'paywall-day', size: 'lg', title: 'Paywall por día', sub: 'Veces mostrado y pruebas iniciadas.', keys: days, tipFn: (d) => fd(d) + ' · ' + N(shown(d)) + ' mostrado · ' + N(trials(d)) + ' pruebas', series: [{ label: 'Mostrado sin prueba', c: COL.ink, get: (d) => Math.max(0, shown(d) - trials(d)) }, { label: 'Pruebas', c: COL.a, get: trials }] }),
        tiles({ id: 'paywall', wide: true, title: 'Qué función vende', sub: 'Personas que vieron el paywall por cada función y cuántas probaron. En naranja, la que mejor convierte.', meta: '30 días',
          items: pw.map((x) => ({ kicker: N(x.installs_shown) + ' vieron', title: lab('pro', x.feature), sub: N(x.installs_trial) + ' probaron', value: P(x.pct_conversion), foot: 'conversión a prueba', tone: best > 0 && num(x.pct_conversion) === best ? 'orange' : 'dark' })),
          detail: table({ id: 'paywall-d', show: Infinity, cols: [{ label: 'Función', align: 'left', w: 'minmax(96px,1.4fr)' }, { label: 'Vieron', bar: true }, { label: 'Probaron' }, { label: 'Conversión', heat: true }], rows: pw.map((x) => [{ v: lab('pro', x.feature), fw: 500 }, nc(x.installs_shown), N(x.installs_trial), pctCell(x.pct_conversion)]) }) }),
        rank({ id: 'prouse', title: 'Uso de funciones Pro', sub: 'Una vez al día por función, sólo siendo Pro. En personas·día.', c: COL.gold, items: items(group(inR(D.analytics_pro_feature_usage_daily, st), (x) => x.feature, (x) => x.installs), 'pro') }),
        mix({ id: 'themes', title: 'Temas elegidos', sub: 'Personas que eligieron cada tema.', meta: '30 días', bigSub: 'personas', items: (D.analytics_themes_30d || []).map((x) => ({ label: x.theme, value: num(x.installs), note: N(x.changes) + ' cambios' })) }),
      ],
    };
  }

  if (id === 'calidad') {
    const lp = inR(D.analytics_launch_perf_daily, st);
    const lpd = new Map(); lp.forEach((x) => { const d = String(x.day).slice(0, 10); (lpd.get(d) || lpd.set(d, []).get(d)).push(x); });
    const lv = (d, k) => { const xs = lpd.get(d); return xs ? wavg(xs, k, 'launches') : 0; };
    const sb = inR(D.analytics_stability_daily, st);
    const er = inR(D.analytics_errors_daily, st);
    const un = inR(D.analytics_unlock_daily, st);
    const unT = sum(un, 'attempts'), unOk = sum(un.filter((x) => x.result === 'ok'), 'attempts');
    const sp = inR(D.analytics_screen_perf_daily, st); const spm = byDay(sp);
    const mk = inR(D.analytics_metrickit_daily, st);
    const mkv = new Map(); mk.forEach((x) => { const a = mkv.get(x.app_version) || []; a.push(x); mkv.set(x.app_version, a); });
    const crashes = sum(sb, 'crashes'), hangs = sum(sb, (x) => num(x.hangs_metrickit) + num(x.main_hangs));
    const erg = new Map(); er.forEach((x) => { const k = x.domain + ' · ' + x.code; const a = erg.get(k) || { e: 0, i: 0 }; a.e += num(x.errors); a.i += num(x.installs); erg.set(k, a); });
    return {
      kpis: [
        kpi('Arranque p50', MS(lp.length ? wavg(lp, 'p50_ms', 'launches') : null), 'toque → primer dibujo'),
        kpi('Arranque p90', MS(lp.length ? wavg(lp, 'p90_ms', 'launches') : null), 'ponderado por arranques'),
        kpi('Crashes', N(crashes), 'MetricKit', crashes ? 'var(--neg)' : null),
        kpi('Cuelgues', N(hangs), 'MetricKit + hilo principal ≥ 2 s', hangs ? 'var(--warn)' : null),
        kpi('Errores', N(sum(er, 'errors')), 'como mucho uno cada 10 min'),
        kpi('Face ID fallido', unT ? P(Math.round(((unT - unOk) / unT) * 1000) / 10) : '—', N(unT) + ' intentos'),
      ],
      cards: [
        bars(ctx, { id: 'launch', size: 'lg', area: true, title: 'Arranque', sub: 'Del toque en el ícono al primer dibujo.', big: MS(lp.length ? wavg(lp, 'p50_ms', 'launches') : null), bigSub: 'p50 del rango', keys: days, fmt: MS, tipFn: (d, v) => fd(d) + ' · p50 ' + MS(v[0]) + ' · p90 ' + MS(v[1]), series: [{ label: 'p50', c: COL.a, get: (d) => lv(d, 'p50_ms') }, { label: 'p90', c: COL.ink, dash: true, get: (d) => lv(d, 'p90_ms') }] }),
        gauge({ id: 'faceid', tone: 'green', title: 'Face ID', value: pct(unOk, unT), caption: 'de los intentos de desbloqueo salen bien', rows: [{ label: 'Correctos', value: N(unOk), c: COL.gold }, { label: 'Fallidos o cancelados', value: N(unT - unOk), c: '#fff' }] }),
        bars(ctx, { id: 'stability', title: 'Crashes y cuelgues', sub: 'Por día, todas las versiones.', big: N(crashes), bigSub: 'crashes · ' + N(hangs) + ' cuelgues', keys: days, series: [{ label: 'Crashes', c: COL.a, get: perDay(sb, (x) => x.crashes) }, { label: 'Cuelgues (MetricKit)', c: COL.gold, get: perDay(sb, (x) => x.hangs_metrickit) }, { label: 'Hilo principal', c: COL.ink, get: perDay(sb, (x) => x.main_hangs) }] }),
        table({ id: 'errors', tone: 'dark', title: 'Errores', sub: 'Por dominio y código.', cols: [{ label: 'Dominio · código', align: 'left', w: 'minmax(150px,2fr)' }, { label: 'Errores', bar: true }, { label: 'Pers·día' }], rows: [...erg.entries()].sort((a, b) => b[1].e - a[1].e).map(([k, a]) => [{ v: k }, nc(a.e), N(a.i)]) }),
        mix({ id: 'unlock', title: 'Face ID por resultado', sub: 'Intentos de desbloqueo.', bigSub: 'intentos', items: items(group(un, (x) => x.result, (x) => x.attempts), 'unlock', (k) => (k === 'ok' ? { c: COL.green } : {})) }),
        bars(ctx, { id: 'screenperf', area: true, title: 'Carga del Resumen', sub: 'Lo más pesado del Resumen (dashboard_catalog), una vez por arranque.', keys: days, fmt: MS, tipFn: (d) => { const x = spm.get(d); return x ? fd(d) + ' · p50 ' + MS(x.p50_ms) + ' · p90 ' + MS(x.p90_ms) : fd(d) + ' · sin datos'; }, series: [{ label: 'p50', c: COL.green, get: (d) => num(spm.get(d) && spm.get(d).p50_ms) }, { label: 'p90', c: COL.ink, dash: true, get: (d) => num(spm.get(d) && spm.get(d).p90_ms) }] }),
        table({ id: 'metrickit', wide: true, title: 'Informe diario de iOS por versión', sub: 'Promedios de MetricKit.', cols: [{ label: 'Versión', align: 'left', w: 'minmax(70px,1fr)' }, { label: 'Informes', bar: true }, { label: 'Arranque' }, { label: 'Reanudar' }, { label: 'Cuelgue' }, { label: 'Memoria pico' }, { label: 'Salidas anómalas' }], minW: '620px', rows: [...mkv.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([v, xs]) => [{ v, fw: 500 }, nc(sum(xs, 'reports')), MS(wavg(xs, 'avg_launch_ms', 'reports')), MS(wavg(xs, 'avg_resume_ms', 'reports')), MS(wavg(xs, 'avg_hang_ms', 'reports')), N0(wavg(xs, 'avg_peak_memory_mb', 'reports')) + ' MB', N(sum(xs, 'fg_abnormal_exits'))]) }),
      ],
    };
  }

  if (id === 'adopcion') {
    const a = (D.analytics_adoption_latest || [])[0] || {};
    const F = [['pct_gmail', 'Gmail conectado'], ['pct_outlook', 'Outlook conectado'], ['pct_notifications', 'Notificaciones'], ['pct_with_rules', 'Con reglas de comercio'], ['pct_budget', 'Presupuesto'], ['pct_app_lock', 'Face ID'], ['pct_with_friends', 'Con amigos'], ['pct_widgets', 'Widgets'], ['pct_pro', 'Pro']];
    const RC = [COL.a, COL.blue, COL.ink, COL.green, COL.gold];
    const list = F.filter(([k]) => a[k] != null).map(([k, l]) => ({ label: l, value: num(a[k]) })).sort((x, y) => y.value - x.value);
    return {
      kpis: [kpi('Instalaciones con foto', N(a.installs), 'últimos 14 días'), kpi('Reglas por persona', N(a.avg_rules), 'promedio'), kpi('Gmail conectado', P(a.pct_gmail), ''), kpi('Pro', P(a.pct_pro), '')],
      cards: [rings({ id: 'adoption', wide: true, title: 'Adopción de ajustes', sub: 'Parte de las instalaciones con cada ajuste activo en su foto diaria más reciente.', items: list.map((x, i) => Object.assign(x, { c: RC[i % RC.length] })),
        detail: table({ id: 'adoption-d', show: Infinity, cols: [{ label: 'Ajuste', align: 'left', w: 'minmax(140px,2fr)' }, { label: '% de instalaciones', heat: true }, { label: 'Instalaciones aprox.' }], rows: list.map((x) => [{ v: x.label, fw: 500 }, pctCell(x.value), ok(a.installs) ? N0((x.value / 100) * num(a.installs)) : '—']) }) })],
    };
  }

  if (id === 'versiones') {
    const v = D.analytics_versions_7d || [];
    const tot = sum(v, 'installs');
    const byV = group(v, (x) => x.app_version, (x) => x.installs);
    const top = [...byV.entries()].sort((a, b) => b[1] - a[1])[0];
    const as = sum(v.filter((x) => x.channel === 'appstore'), 'installs');
    return {
      kpis: [kpi('Versión más usada', top ? top[0] : '—', top && tot ? P(Math.round((top[1] / tot) * 1000) / 10) : ''), kpi('Instalaciones', N(tot), '7 días'), kpi('En App Store', tot ? P(Math.round((as / tot) * 1000) / 10) : '—', 'el resto en TestFlight')],
      cards: [
        mix({ id: 'versions', title: 'Por versión', sub: 'Instalaciones activas en 7 días.', bigSub: 'instalaciones', items: items(byV) }),
        table({ id: 'versions-ch', title: 'Por versión y canal', sub: 'Una instalación puede aparecer en dos versiones si actualizó.', cols: [{ label: 'Versión', align: 'left', w: 'minmax(70px,1fr)' }, { label: 'Canal', align: 'left', w: 'minmax(90px,1fr)' }, { label: 'Instalaciones', bar: true }, { label: '%' }], rows: v.slice().sort((a, b) => num(b.installs) - num(a.installs)).map((x) => [{ v: x.app_version, fw: 500 }, { v: lab('channel', x.channel) }, nc(x.installs), pctCell(tot ? (num(x.installs) / tot) * 100 : null)]) }),
      ],
    };
  }
  return { kpis: [], cards: [] };
}
