// Lógica del panel: datos de ejemplo, lectura de Supabase y armado de cada sección.
// Sale del diseño «Panel de Analítica»; la vista está en app.js.

const SB_URL = 'https://zxfeixwrruclypwjuhnl.supabase.co';
const SB_KEY = 'sb_publishable_wJE6quWd2Lu_4rgYvF39CA_iur9-VeT';
const LS_SESSION = 'agrupay-panel-session';
const LS_UI = 'agrupay-panel-ui';
const COL = { a: 'var(--accent)', gold: 'var(--gold)', pur: 'var(--purple)', cyan: 'var(--cyan)', pos: 'var(--pos)', org: 'var(--orange)', neg: 'var(--neg)', warn: 'var(--warn)', mute: 'var(--sep2)' };

const SECTIONS = [
  { id: 'resumen', label: 'Resumen', desc: 'Usuarios activos, instalaciones nuevas y qué trae a la gente de vuelta.' },
  { id: 'activacion', label: 'Activación y retención', desc: 'Onboarding por cohorte, hitos y retención D1 / D7 / D30.' },
  { id: 'uso', label: 'Uso', desc: 'Pantallas, toques, navegación y funciones.' },
  { id: 'correo', label: 'Motor de correo', desc: 'Lectores por banco, lecturas, latencia y cuentas conectadas.' },
  { id: 'clasificacion', label: 'Clasificación', desc: 'Automático contra manual, precisión de cada motor, sugerencias y Pendientes.' },
  { id: 'pro', label: 'Pro y paywall', desc: 'Qué función vende y cuánto se usa lo Pro.' },
  { id: 'calidad', label: 'Calidad', desc: 'Arranque, crashes, cuelgues, errores y Face ID.' },
  { id: 'adopcion', label: 'Adopción de ajustes', desc: 'Última foto diaria de cada instalación en los últimos 14 días.', fixed: true },
  { id: 'versiones', label: 'Versiones', desc: 'Versiones en uso en los últimos 7 días.', fixed: true },
];

const LBL = {
  src: { icon: 'Ícono', notification: 'Notificación', link: 'Widget / Atajos', invite: 'Invitación' },
  step: { slide_1: 'Pantalla 1', slide_2: 'Pantalla 2', slide_3: 'Pantalla 3', login: 'Inicio de sesión', connect_tapped: 'Tocó conectar', connected: 'Conectó el correo', restore_offered: 'Se ofreció restaurar', history: 'Historial', reading: 'Leyendo', no_account: 'Sin cuenta', finished: 'Terminó' },
  ms: { first_movement: 'Primer movimiento', first_email_movement: 'Primer movimiento del correo', first_classification: 'Primera clasificación', first_rule: 'Primera regla', first_friend: 'Primer amigo' },
  engine: { rule: 'Regla de comercio', keyword: 'Palabra clave', voice: 'Voz', recurring: 'Recurrente' },
  sugg: { rule: 'Regla', root: 'Raíz', catalog: 'Catálogo' },
  pro: { history: 'Historial', ai: 'Asistente IA', alerts: 'Alertas', cloud: 'Nube', sync: 'Sincronización', themes: 'Temas', profile: 'Perfil', general: 'General' },
  acct: { account_connect_started: 'Abrió la ventana', account_connected: 'Conectó', account_connect_failed: 'Falló', account_disconnected: 'Desconectó' },
  prov: { google: 'Google', microsoft: 'Microsoft', gmail: 'Gmail', outlook: 'Outlook' },
  msrc: { form: 'Formulario', form_locked: 'Formulario (bloqueado)', quick: 'Rápido', voice: 'Voz', siri: 'Siri', recurring: 'Recurrente' },
  via: { detail: 'Detalle', pending_suggestion: 'Sugerencia en Pendientes', pending_sheet: 'Hoja en Pendientes', bulk: 'En bloque', bulk_suggestions: 'Sugerencias en bloque', selection: 'Selección' },
  origin: { pending: 'Pendientes', bulk: 'En bloque', detail: 'Detalle', add_form: 'Formulario' },
  notif: { imported: 'Importados', payment_reminder: 'Recordatorio de pago', debt_reminder: 'Recordatorio de deuda', recurring: 'Recurrente', budget: 'Presupuesto', category_limit: 'Límite de categoría', other: 'Otro' },
  unlock: { ok: 'Correcto', cancelled: 'Cancelado', not_recognized: 'No reconocido', lockout: 'Bloqueado' },
  channel: { testflight: 'TestFlight', appstore: 'App Store' },
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
const inR = (rows, start, key) => (rows || []).filter((x) => String(x[key || 'day']).slice(0, 10) >= start);
const group = (rows, kf, vf) => { const m = new Map(); (rows || []).forEach((x) => { const k = kf(x); m.set(k, (m.get(k) || 0) + num(vf(x))); }); return m; };
const sum = (rows, f) => (rows || []).reduce((a, x) => a + num(typeof f === 'function' ? f(x) : x[f]), 0);
const byDay = (rows) => { const m = new Map(); (rows || []).forEach((x) => m.set(String(x.day).slice(0, 10), x)); return m; };
const latest = (rows, key) => (rows || []).slice().sort((a, b) => (a[key] < b[key] ? 1 : -1))[0];
const wavg = (rows, k, w) => { const xs = (rows || []).filter((x) => ok(x[k])); const n = sum(xs, w); return n ? xs.reduce((a, x) => a + num(x[k]) * num(x[w]), 0) / n : null; };
const items = (m, d, extra) => [...m.entries()].map(([k, v]) => Object.assign({ label: d ? lab(d, k) : (k == null ? '—' : String(k)), value: v, key: k }, extra ? extra(k, v) : {}));
const pctCell = (v, bad) => (!ok(v) ? { v: '—', color: 'var(--text3)' } : { v: P(Math.round(v * 10) / 10), color: bad != null && v >= bad ? 'var(--neg)' : 'var(--text)', fw: bad != null && v >= bad ? 600 : 400 });

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
  return D;
}

const DAILY = ['analytics_daily_active', 'analytics_new_installs_daily', 'analytics_open_sources_daily', 'analytics_notifications_daily', 'analytics_screens_daily', 'analytics_taps_daily', 'analytics_navigation_daily', 'analytics_feature_usage_daily', 'analytics_parser_health_daily', 'analytics_sync_runs_daily', 'analytics_email_latency_daily', 'analytics_accounts_daily', 'analytics_classification_daily', 'analytics_auto_vs_manual_daily', 'analytics_pending_backlog_daily', 'analytics_movements_created_daily', 'analytics_rules_daily', 'analytics_paywall_daily', 'analytics_pro_feature_usage_daily', 'analytics_launch_perf_daily', 'analytics_screen_perf_daily', 'analytics_stability_daily', 'analytics_metrickit_daily', 'analytics_errors_daily', 'analytics_unlock_daily'];
const FLAT = ['analytics_open_hours_30d', 'analytics_max_months_back_30d', 'analytics_chart_modes_30d', 'analytics_feature_discovery', 'analytics_activation_milestones', 'analytics_auto_accuracy_30d', 'analytics_suggestions_30d', 'analytics_paywall_30d', 'analytics_pro_engagement_30d', 'analytics_themes_30d', 'analytics_adoption_latest', 'analytics_versions_7d'];

async function fetchView(view, filter, token) {
  let out = [];
  for (let off = 0; off < 50000; off += 1000) {
    const res = await fetch(SB_URL + '/rest/v1/' + view + '?select=*' + (filter ? '&' + filter : '') + '&limit=1000&offset=' + off, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token } });
    if (res.status === 401) { const e = new Error('Sesión vencida'); e.code = 401; throw e; }
    if (!res.ok) throw new Error(view + ' respondió ' + res.status);
    const rows = await res.json();
    out = out.concat(rows);
    if (rows.length < 1000) break;
  }
  return out;
}

function base(o) { return { id: o.id, title: o.title, sub: o.sub || '', meta: o.meta || '', span: o.wide ? '1 / -1' : 'auto', isBars: false, isRank: false, isTable: false, empty: false, bars: [], rows: [], trs: [], cols: [], axis: [], legend: [], tip: '', gap: '2px', grid: '1fr', minW: '0px', clear: null }; }

function bars(ctx, o) {
  const vals = o.keys.map((k) => o.series.map((s) => Math.max(0, num(s.get(k)))));
  const tots = vals.map((v) => v.reduce((a, b) => a + b, 0));
  const max = Math.max(0, ...tots);
  const empty = max === 0;
  const sel = ctx.tip && ctx.tip.id === o.id ? ctx.tip.i : null;
  const fmt = o.fmt || N;
  const xl = o.xlab || fd;
  const n = o.keys.length;
  const list = o.keys.map((k, i) => ({ h: tots[i] > 0 ? Math.max(2, (tots[i] / max) * 100) + '%' : '0%', op: sel == null || sel === i ? 1 : 0.4, on: () => ctx.setTip(o.id, i), segs: o.series.map((s, j) => ({ f: vals[i][j], c: s.c })).filter((x) => x.f > 0) }));
  const tipAt = (i) => { const k = o.keys[i]; return o.tipFn ? o.tipFn(k, vals[i]) : xl(k) + ' · ' + o.series.map((s, j) => (o.series.length > 1 ? s.label + ' ' : '') + fmt(vals[i][j])).join(' · '); };
  const hint = ctx.wide ? 'Pasa el cursor por una barra para ver el detalle' : 'Toca o desliza sobre las barras';
  list.forEach((b, i) => { b.tip = tipAt(i); });
  const tip = sel != null && sel < n ? list[sel].tip : hint;
  return Object.assign(base(o), { isBars: !empty, empty, bars: list, tip, hint, clear: ctx.clearTip, axis: n ? [xl(o.keys[0]), xl(o.keys[Math.floor((n - 1) / 2)]), xl(o.keys[n - 1])] : [], gap: n > 45 ? '1px' : n > 20 ? '2px' : '4px', legend: o.series.length > 1 ? o.series.map((s) => ({ label: s.label, c: s.c })) : [] });
}

function rank(o) {
  let it = (o.items || []).filter((x) => ok(x.value));
  if (o.sort !== false) it.sort((a, b) => b.value - a.value);
  if (o.limit) it = it.slice(0, o.limit);
  const max = o.max || Math.max(0, ...it.map((x) => x.value));
  const fmt = o.fmt || N;
  const empty = !it.length || max === 0;
  return Object.assign(base(o), { isRank: !empty, empty, rows: it.map((x) => ({ label: x.label, value: fmt(x.value), note: x.note || '', tone: x.tone || 'var(--text)', w: (max ? Math.min(100, (x.value / max) * 100) : 0) + '%', c: x.c || o.c || COL.a })) });
}

function table(o) {
  const grid = o.cols.map((c) => c.w || 'minmax(64px,1fr)').join(' ');
  const trs = (o.rows || []).map((row) => ({ grid, cells: row.map((c, j) => { const x = c && typeof c === 'object' ? c : { v: c }; return { v: x.v == null ? '—' : x.v, align: o.cols[j].align || 'right', color: x.color || 'var(--text)', fw: x.fw || 400 }; }) }));
  const empty = !trs.length;
  return Object.assign(base(o), { isTable: !empty, empty, trs, grid, minW: o.minW || '0px', cols: o.cols.map((c) => ({ label: c.label, align: c.align || 'right' })) });
}

const kpi = (label, value, sub, color) => ({ label, value, sub: sub || '', color: color || 'var(--text)' });

function build(id, ctx) {
  const D = ctx.D, st = ctx.start, days = ctx.days, R = ctx.range, T = ctx.today;
  const perDay = (rows, f) => { const m = group(rows, (x) => String(x.day).slice(0, 10), f); return (d) => m.get(d) || 0; };

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
        bars(ctx, { id: 'dau', wide: true, title: 'Usuarios activos por día', sub: 'Instalaciones distintas con al menos un evento.', meta: 'promedio ' + N0(avg), keys: days, series: [{ label: 'Gratis', c: COL.a, get: (d) => { const x = dam.get(d); return x ? num(x.active_installs) - num(x.active_pro) : 0; } }, { label: 'Pro', c: COL.gold, get: (d) => num(dam.get(d) && dam.get(d).active_pro) }] }),
        bars(ctx, { id: 'installs', title: 'Instalaciones nuevas', sub: 'Las que ya usaban la app antes de la analítica cuentan aparte.', meta: N(sum(ni, 'installs')) + ' en total', keys: days, series: [{ label: 'Nuevas', c: COL.a, get: (d) => num(nim.get(d) && nim.get(d).new_users) }, { label: 'Ya la usaban', c: COL.mute, get: (d) => num(nim.get(d) && nim.get(d).existing_users_updated) }] }),
        bars(ctx, { id: 'wau', title: 'Activos por semana', sub: 'WAU. La semana empieza el lunes.', meta: '12 semanas', keys: weeks, xlab: (w) => fd(w), tipFn: (w, v) => 'Semana del ' + fd(w) + ' · ' + N(v[0] + v[1]) + ' activos · ' + N(v[1]) + ' Pro', series: [{ label: 'Gratis', c: COL.a, get: (w) => { const x = wkm.get(w); return x ? num(x.active_installs) - num(x.active_pro) : 0; } }, { label: 'Pro', c: COL.gold, get: (w) => num(wkm.get(w) && wkm.get(w).active_pro) }] }),
        rank({ id: 'sources', title: 'Qué trae a la gente de vuelta', sub: 'Aperturas por origen.', items: items(group(src, (x) => x.source, (x) => x.opens), 'src') }),
        bars(ctx, { id: 'hours', title: 'Hora de apertura', sub: 'Aperturas por hora, en hora de Lima.', meta: '30 días', keys: [...Array(24).keys()], xlab: (h) => h + ' h', tipFn: (h, v) => h + ':00 – ' + h + ':59 · ' + N(v[0]) + ' aperturas', series: [{ label: 'Aperturas', c: COL.a, get: (h) => hours.get(h) || 0 }] }),
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
        rank({ id: 'funnel', title: 'Embudo del onboarding', sub: 'Instalaciones nuevas de las cohortes del rango, por paso.', meta: 'desde el lun ' + fd(monday(st)), sort: false, max: first, items: [...steps.values()].sort((a, b) => a.o - b.o).map((s) => ({ label: lab('step', s.step), value: s.n, note: first ? P(Math.round((s.n / first) * 1000) / 10) : '' })) }),
        rank({ id: 'milestones', title: 'Hitos de activación', sub: 'Parte de las instalaciones nuevas que llegó a cada hito y en cuánto tiempo (mediana).', meta: 'desde siempre', max: 100, fmt: P, items: (D.analytics_activation_milestones || []).map((x) => ({ label: lab('ms', x.milestone), value: num(x.pct_of_new_installs), note: FH(num(x.median_hours)) })) }),
        table({ id: 'retention', wide: true, title: 'Retención por cohorte', sub: 'Por semana de instalación. «—» cuando la cohorte aún es muy joven para medirlo.', meta: '16 semanas', cols: [{ label: 'Semana', align: 'left', w: 'minmax(90px,1.4fr)' }, { label: 'Instalaciones' }, { label: 'D1' }, { label: 'D7' }, { label: 'D30' }], rows: rc.map((x) => [{ v: 'Lun ' + fd(x.cohort_week) }, N(x.installs), pctCell(x.d1_pct), pctCell(x.d7_pct), pctCell(x.d30_pct)]) }),
        rank({ id: 'notifs', title: 'Notificaciones abiertas', sub: 'Sólo los avisos de importados se cuentan también al enviarse.', items: items(group(nt, (x) => x.type, (x) => x.opened), 'notif', (k) => ({ note: sent.get(k) ? 'de ' + N(sent.get(k)) + ' enviadas' : '' })) }),
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
        rank({ id: 'screens', title: 'Pantallas más vistas', sub: 'Visitas, sin contar la vuelta desde segundo plano.', limit: 12, items: items(views, null, (k) => ({ note: MIN(Math.round(mins.get(k) || 0)) })) }),
        rank({ id: 'screen-min', title: 'Tiempo por pantalla', sub: 'Minutos sumados, incluidas las continuaciones.', limit: 12, c: COL.pur, fmt: (v) => MIN(Math.round(v)), items: items(mins) }),
        rank({ id: 'taps', title: 'Dónde se toca más', sub: 'Toques por destino.', items: items(group(tapsR, (x) => x.target, (x) => x.taps), null, (k) => ({ note: N(sum(tapsR.filter((x) => x.target === k), 'installs')) + ' pers·día' })) }),
        rank({ id: 'nav', title: 'Pestañas y secciones', sub: 'Cambios de pestaña y de la píldora.', c: COL.cyan, items: items(group(nav, (x) => (x.event === 'tab_select' ? 'Pestaña · ' : 'Sección · ') + x.target, (x) => x.selects)) }),
        rank({ id: 'discovery', title: 'Descubrimiento de funciones', sub: 'Parte de las instalaciones que usó cada función alguna vez, y en cuántos días (mediana).', meta: 'desde siempre', max: 100, fmt: P, c: COL.pos, items: (D.analytics_feature_discovery || []).map((x) => ({ label: x.feature, value: num(x.pct_of_installs), note: ok(x.median_days_to_discover) ? N(x.median_days_to_discover) + ' d' : '' })) }),
        rank({ id: 'features', title: 'Uso de funciones', sub: 'Cada uso cuenta.', limit: 16, items: items(group(fu, (x) => x.feature, (x) => x.uses)) }),
        bars(ctx, { id: 'monthsback', title: 'Cuántos meses atrás se mira', sub: 'Lo más lejos que llegó cada persona.', meta: '30 días', keys: mbKeys, xlab: (m) => (m === 0 ? 'este mes' : m + ' m'), tipFn: (m, v) => (m === 0 ? 'Sólo este mes' : m + (m === 1 ? ' mes' : ' meses') + ' atrás') + ' · ' + N(v[0]) + ' personas', series: [{ label: 'Personas', c: COL.a, get: (m) => mbm.get(m) || 0 }] }),
        rank({ id: 'chartmode', title: 'Modo del gráfico del Resumen', sub: 'Días, Semanas o Meses.', meta: '30 días', items: (D.analytics_chart_modes_30d || []).map((x) => ({ label: x.mode, value: num(x.choices), note: N(x.installs) + ' personas' })) }),
      ],
    };
  }

  if (id === 'correo') {
    const ph = inR(D.analytics_parser_health_daily, st);
    const d3 = addD(T, -2);
    const banks = new Map();
    ph.forEach((x) => { const b = banks.get(x.bank) || { ins: 0, dup: 0, miss: 0, tot: 0, miss3: 0, tot3: 0 }; const e = num(x.emails); b.tot += e; if (x.result === 'inserted') b.ins += e; if (x.result === 'duplicate') b.dup += e; if (x.result === 'amount_missing') b.miss += e; if (String(x.day).slice(0, 10) >= d3) { b.tot3 += e; if (x.result === 'amount_missing') b.miss3 += e; } banks.set(x.bank, b); });
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
    return {
      kpis: [
        kpi('Correos reconocidos', N(tot), 'en ' + R + ' días'),
        kpi('Sin monto', tot ? P(Math.round((miss / tot) * 1000) / 10) : '—', N(miss) + ' correos', tot && miss / tot >= 0.05 ? 'var(--neg)' : null),
        kpi('Sin reconocer', P(pctUnrec), 'de lo revisado en lecturas'),
        kpi('Latencia p50', MIN(lat.length ? Math.round(wavg(lat, 'p50_min', 'movements') * 10) / 10 : null), 'correo → movimiento'),
        kpi('Permisos revocados', N(revoked), 'desconexiones «revoked»', revoked ? 'var(--warn)' : null),
      ],
      cards: [
        table({ id: 'banks', wide: true, title: 'Salud de los lectores por banco', sub: 'Si sube «sin monto», ese banco cambió el formato de sus correos.', cols: [{ label: 'Banco', align: 'left', w: 'minmax(84px,1.3fr)' }, { label: 'Insertados' }, { label: 'Duplicados' }, { label: 'Sin monto' }, { label: '% sin monto' }, { label: 'Últimos 3 días' }], minW: '520px', rows: [...banks.entries()].sort((a, b) => b[1].tot - a[1].tot).map(([bank, b]) => [{ v: bank, fw: 500 }, N(b.ins), N(b.dup), N(b.miss), pctCell(b.tot ? (b.miss / b.tot) * 100 : null, 5), pctCell(b.tot3 ? (b.miss3 / b.tot3) * 100 : null, 5)]) }),
        bars(ctx, { id: 'emails', title: 'Correos por día', sub: 'Por resultado del lector.', keys: days, series: [{ label: 'Insertados', c: COL.a, get: ins }, { label: 'Duplicados', c: COL.mute, get: dup }, { label: 'Sin monto', c: COL.neg, get: ms }] }),
        bars(ctx, { id: 'latency', title: 'Minutos entre correo y movimiento', sub: 'Sólo lecturas normales, sin rangos pasados.', keys: days, tipFn: (d, v) => fd(d) + ' · p50 ' + MIN(Math.round(v[0] * 10) / 10) + ' · p90 ' + MIN(Math.round((v[0] + v[1]) * 10) / 10), series: [{ label: 'p50', c: COL.a, get: (d) => lp(d, 'p50_min') }, { label: 'p90', c: COL.mute, get: (d) => Math.max(0, lp(d, 'p90_min') - lp(d, 'p50_min')) }] }),
        rank({ id: 'accounts', title: 'Conexiones de correo', sub: 'De abrir la ventana de Google o Microsoft a conectar.', sort: false, max: ev.get('account_connect_started'), items: ['account_connect_started', 'account_connected', 'account_connect_failed', 'account_disconnected'].map((k) => ({ label: lab('acct', k), value: ev.get(k) || 0, c: k === 'account_connect_failed' || k === 'account_disconnected' ? COL.warn : COL.a })) }),
        rank({ id: 'acct-reasons', title: 'Por qué falla o se desconecta', sub: '«revoked»: el permiso dejó de valer.', c: COL.warn, items: items(group(acc.filter((x) => x.reason), (x) => lab('acct', x.event) + ' · ' + lab('prov', x.provider) + ' · ' + x.reason, (x) => x.events)) }),
        rank({ id: 'syncruns', title: 'Lecturas del correo', sub: 'Lecturas que procesaron algo.', sort: false, items: [{ label: 'Lecturas', value: sum(sr, 'runs') }, { label: 'Correos revisados', value: sum(sr, 'checked') }, { label: 'Movimientos nuevos', value: sum(sr, 'new_movements') }, { label: 'Sin reconocer', value: sum(sr, 'unrecognized'), c: COL.warn, note: P(pctUnrec) }, { label: 'Descargas fallidas', value: sum(sr, 'failed_fetch'), c: COL.neg }] }),
      ],
    };
  }

  if (id === 'clasificacion') {
    const av = inR(D.analytics_auto_vs_manual_daily, st); const avm = byDay(av);
    const autoT = sum(av, (x) => num(x.auto_rule) + num(x.auto_keyword) + num(x.auto_voice) + num(x.auto_recurring));
    const man = sum(av, 'manual_from_pending');
    const cl = inR(D.analytics_classification_daily, st);
    const rules = inR(D.analytics_rules_daily, st);
    const pb = inR(D.analytics_pending_backlog_daily, st); const pbm = byDay(pb);
    const pbLast = latest(pb, 'day');
    const sg = D.analytics_suggestions_30d || [];
    const sgA = sum(sg, 'accepted'), sgD = sum(sg, 'dismissed');
    const g = (k) => (d) => num(avm.get(d) && avm.get(d)[k]);
    const mc = inR(D.analytics_movements_created_daily, st);
    return {
      kpis: [
        kpi('Clasificado automático', autoT + man ? P(Math.round((autoT / (autoT + man)) * 1000) / 10) : '—', 'contra lo sacado a mano de Pendientes'),
        kpi('Clasificados a mano', N(sum(cl, 'movements')), N(sum(cl, 'reclassified')) + ' reclasificados'),
        kpi('Reglas creadas', N(sum(rules, 'rules')), 'en ' + R + ' días'),
        kpi('Pendientes del mes', N(pbLast && pbLast.p50_pending_month), pbLast ? 'mediana · ' + fd(pbLast.day) : '—'),
        kpi('Sugerencias aceptadas', sgA + sgD ? P(Math.round((sgA / (sgA + sgD)) * 1000) / 10) : '—', '30 días'),
      ],
      cards: [
        bars(ctx, { id: 'automan', wide: true, title: 'Automático contra manual', sub: 'Movimientos que llegaron ya clasificados y los que el usuario sacó de Pendientes.', keys: days, series: [{ label: 'Regla de comercio', c: COL.a, get: g('auto_rule') }, { label: 'Palabra clave', c: COL.cyan, get: g('auto_keyword') }, { label: 'Voz y recurrentes', c: COL.pur, get: (d) => g('auto_voice')(d) + g('auto_recurring')(d) }, { label: 'A mano desde Pendientes', c: COL.org, get: g('manual_from_pending') }] }),
        rank({ id: 'accuracy', title: 'Precisión de cada motor', sub: 'De lo que clasificó, cuánto no cambió después el usuario.', meta: '30 días', max: 100, fmt: P, c: COL.pos, items: (D.analytics_auto_accuracy_30d || []).map((x) => ({ label: lab('engine', x.engine), value: num(x.pct_accuracy), note: N(x.corrected) + ' de ' + N(x.classified) + ' corregidos' })) }),
        table({ id: 'suggestions', title: 'Sugerencias', sub: 'Mostradas una vez al día por comercio y pantalla.', meta: '30 días', cols: [{ label: 'Tipo', align: 'left', w: 'minmax(70px,1.2fr)' }, { label: 'Mostradas' }, { label: 'Aceptadas' }, { label: 'Descartadas' }, { label: '% aceptadas' }], minW: '380px', rows: sg.slice().sort((a, b) => num(b.shown) - num(a.shown)).map((x) => [{ v: lab('sugg', x.kind), fw: 500 }, N(x.shown), N(x.accepted), N(x.dismissed), pctCell(x.pct_accepted)]) }),
        bars(ctx, { id: 'backlog', title: 'Atasco de Pendientes', sub: 'Pendientes del mes por persona (promedio). Si crece, la gente se rinde.', keys: days, tipFn: (d) => { const x = pbm.get(d); return x ? fd(d) + ' · promedio ' + N(x.avg_pending_month) + ' · p50 ' + N(x.p50_pending_month) + ' · p90 ' + N(x.p90_pending_month) : fd(d); }, series: [{ label: 'Promedio', c: COL.org, get: (d) => num(pbm.get(d) && pbm.get(d).avg_pending_month) }] }),
        rank({ id: 'via', title: 'Desde dónde se clasifica a mano', sub: 'Movimientos clasificados por vía.', items: items(group(cl, (x) => x.via, (x) => x.movements), 'via') }),
        rank({ id: 'msource', title: 'De dónde salen los movimientos manuales', sub: 'Movimientos que no vinieron del correo.', c: COL.pur, items: items(group(mc, (x) => x.source, (x) => x.movements), 'msrc') }),
        rank({ id: 'rules', title: 'Reglas de comercio creadas', sub: 'Por origen.', c: COL.cyan, items: items(group(rules, (x) => x.origin, (x) => x.rules), 'origin') }),
      ],
    };
  }

  if (id === 'pro') {
    const p30 = D.analytics_paywall_30d || [];
    const sh = sum(p30, 'installs_shown'), tr = sum(p30, 'installs_trial');
    const eng = (D.analytics_pro_engagement_30d || [])[0] || {};
    const pd = inR(D.analytics_paywall_daily, st);
    const shown = perDay(pd, (x) => x.shown), trials = perDay(pd, (x) => x.trials);
    return {
      kpis: [
        kpi('Vieron el paywall', N(sh), '30 días'),
        kpi('Iniciaron la prueba', N(tr), '30 días'),
        kpi('Conversión', sh ? P(Math.round((tr / sh) * 1000) / 10) : '—', 'paywall → prueba'),
        kpi('Pro sin usar nada Pro', N(eng.not_using_pro_features), ok(eng.pro_installs) ? 'de ' + N(eng.pro_installs) + ' Pro' : '—', num(eng.not_using_pro_features) ? 'var(--warn)' : null),
        kpi('Funciones Pro por persona', N(eng.avg_features), 'promedio, 30 días'),
      ],
      cards: [
        table({ id: 'paywall', title: 'Qué función vende', sub: 'Personas que vieron el paywall por cada función y cuántas probaron.', meta: '30 días', cols: [{ label: 'Función', align: 'left', w: 'minmax(96px,1.4fr)' }, { label: 'Vieron' }, { label: 'Probaron' }, { label: 'Conversión' }], rows: p30.slice().sort((a, b) => num(b.installs_shown) - num(a.installs_shown)).map((x) => [{ v: lab('pro', x.feature), fw: 500 }, N(x.installs_shown), N(x.installs_trial), pctCell(x.pct_conversion)]) }),
        bars(ctx, { id: 'paywall-day', title: 'Paywall por día', sub: 'Veces mostrado y pruebas iniciadas.', keys: days, tipFn: (d) => fd(d) + ' · ' + N(shown(d)) + ' mostrado · ' + N(trials(d)) + ' pruebas', series: [{ label: 'Mostrado sin prueba', c: COL.a, get: (d) => Math.max(0, shown(d) - trials(d)) }, { label: 'Pruebas', c: COL.gold, get: trials }] }),
        rank({ id: 'prouse', title: 'Uso de funciones Pro', sub: 'Una vez al día por función, sólo siendo Pro. En personas·día.', c: COL.gold, items: items(group(inR(D.analytics_pro_feature_usage_daily, st), (x) => x.feature, (x) => x.installs), 'pro') }),
        rank({ id: 'themes', title: 'Temas elegidos', sub: 'Personas que eligieron cada tema.', meta: '30 días', c: COL.pur, items: (D.analytics_themes_30d || []).map((x) => ({ label: x.theme, value: num(x.installs), note: N(x.changes) + ' cambios' })) }),
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
        bars(ctx, { id: 'launch', title: 'Arranque', sub: 'Del toque en el ícono al primer dibujo.', keys: days, tipFn: (d, v) => fd(d) + ' · p50 ' + MS(v[0]) + ' · p90 ' + MS(v[0] + v[1]), series: [{ label: 'p50', c: COL.a, get: (d) => lv(d, 'p50_ms') }, { label: 'p90', c: COL.mute, get: (d) => Math.max(0, lv(d, 'p90_ms') - lv(d, 'p50_ms')) }] }),
        bars(ctx, { id: 'stability', title: 'Crashes y cuelgues', sub: 'Por día, todas las versiones.', keys: days, series: [{ label: 'Crashes', c: COL.neg, get: perDay(sb, (x) => x.crashes) }, { label: 'Cuelgues (MetricKit)', c: COL.warn, get: perDay(sb, (x) => x.hangs_metrickit) }, { label: 'Hilo principal', c: COL.org, get: perDay(sb, (x) => x.main_hangs) }] }),
        table({ id: 'errors', title: 'Errores', sub: 'Por dominio y código.', cols: [{ label: 'Dominio · código', align: 'left', w: 'minmax(150px,2fr)' }, { label: 'Errores' }, { label: 'Pers·día' }], rows: [...erg.entries()].sort((a, b) => b[1].e - a[1].e).map(([k, a]) => [{ v: k }, N(a.e), N(a.i)]) }),
        rank({ id: 'unlock', title: 'Face ID', sub: 'Intentos de desbloqueo por resultado.', items: items(group(un, (x) => x.result, (x) => x.attempts), 'unlock', (k) => ({ c: k === 'ok' ? COL.pos : COL.warn })) }),
        table({ id: 'metrickit', wide: true, title: 'Informe diario de iOS por versión', sub: 'Promedios de MetricKit.', cols: [{ label: 'Versión', align: 'left', w: 'minmax(70px,1fr)' }, { label: 'Informes' }, { label: 'Arranque' }, { label: 'Reanudar' }, { label: 'Cuelgue' }, { label: 'Memoria pico' }, { label: 'Salidas anómalas' }], minW: '620px', rows: [...mkv.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([v, xs]) => [{ v, fw: 500 }, N(sum(xs, 'reports')), MS(wavg(xs, 'avg_launch_ms', 'reports')), MS(wavg(xs, 'avg_resume_ms', 'reports')), MS(wavg(xs, 'avg_hang_ms', 'reports')), N0(wavg(xs, 'avg_peak_memory_mb', 'reports')) + ' MB', N(sum(xs, 'fg_abnormal_exits'))]) }),
        bars(ctx, { id: 'screenperf', title: 'Carga del Resumen', sub: 'Lo más pesado del Resumen (dashboard_catalog), una vez por arranque.', keys: days, tipFn: (d) => { const x = spm.get(d); return x ? fd(d) + ' · p50 ' + MS(x.p50_ms) + ' · p90 ' + MS(x.p90_ms) : fd(d); }, series: [{ label: 'p50', c: COL.cyan, get: (d) => num(spm.get(d) && spm.get(d).p50_ms) }] }),
      ],
    };
  }

  if (id === 'adopcion') {
    const a = (D.analytics_adoption_latest || [])[0] || {};
    const F = [['pct_gmail', 'Gmail conectado'], ['pct_outlook', 'Outlook conectado'], ['pct_notifications', 'Notificaciones'], ['pct_with_rules', 'Con reglas de comercio'], ['pct_budget', 'Presupuesto'], ['pct_app_lock', 'Face ID'], ['pct_with_friends', 'Con amigos'], ['pct_widgets', 'Widgets'], ['pct_pro', 'Pro']];
    return {
      kpis: [kpi('Instalaciones con foto', N(a.installs), 'últimos 14 días'), kpi('Reglas por persona', N(a.avg_rules), 'promedio'), kpi('Gmail conectado', P(a.pct_gmail), ''), kpi('Pro', P(a.pct_pro), '')],
      cards: [rank({ id: 'adoption', wide: true, title: 'Adopción de ajustes', sub: 'Parte de las instalaciones con cada ajuste activo en su foto diaria más reciente.', max: 100, fmt: P, items: F.map(([k, l]) => ({ label: l, value: a[k] == null ? null : num(a[k]), c: k === 'pct_pro' ? COL.gold : COL.a })) })],
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
        rank({ id: 'versions', title: 'Por versión', sub: 'Instalaciones activas en 7 días.', fmt: N, items: items(byV, null, (k, val) => ({ note: tot ? P(Math.round((val / tot) * 1000) / 10) : '' })) }),
        table({ id: 'versions-ch', title: 'Por versión y canal', sub: 'Una instalación puede aparecer en dos versiones si actualizó.', cols: [{ label: 'Versión', align: 'left', w: 'minmax(70px,1fr)' }, { label: 'Canal', align: 'left', w: 'minmax(90px,1fr)' }, { label: 'Instalaciones' }, { label: '%' }], rows: v.slice().sort((a, b) => num(b.installs) - num(a.installs)).map((x) => [{ v: x.app_version, fw: 500 }, { v: lab('channel', x.channel) }, N(x.installs), pctCell(tot ? (num(x.installs) / tot) * 100 : null)]) }),
      ],
    };
  }
  return { kpis: [], cards: [] };
}

