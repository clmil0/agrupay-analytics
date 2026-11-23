-- ============================================================
-- AlTanto · Analítica de uso v26: rendimiento (caché incremental)
-- ============================================================
-- Corre esto DESPUÉS de v25, en el proyecto de analítica
-- (`Agrupay_Analytics`). Idempotente: se puede volver a correr entero.
--
-- Antes: cada visita al panel pedía ~48 vistas y cada una recorría TODOS los
-- eventos desde cero (≈1 s por vista, 4 s `analytics_install_daily`).
--
-- Ahora
-- 1. `analytics_ev` filtra la audiencia una sola vez por consulta (antes se
--    evaluaba una función por cada evento: ~90 % del tiempo de cada vista).
-- 2. `analytics_cache`: el resultado de cada vista ya calculado, para
--    Todos, Testers y No testers. `analytics_refresh()` lo pone al día
--    procesando SÓLO lo nuevo: mira los eventos que llegaron desde la última
--    vez (`received_at`) y recalcula sólo los días a los que pertenecen. Las
--    vistas «de los últimos 30 días» y las cohortes, que cambian con el paso
--    del tiempo, se rehacen enteras cada 15 minutos como mucho.
-- 3. `analytics_dashboard(aud)`: devuelve todo el panel en UNA llamada.
-- 4. pg_cron corre `analytics_refresh()` cada 5 minutos; el botón
--    Actualizar del panel también la llama.
--
-- Con personas elegidas («Elegir personas») el panel sigue leyendo las vistas
-- en vivo: son combinaciones libres y no se pueden precalcular, pero ahora
-- también son mucho más rápidas por el punto 1.
--
-- Para agregar una vista nueva al panel: créala como siempre y agrégala a
-- `analytics_cache_views` (abajo), luego `select analytics_refresh(true);`.

-- ── 1. Audiencia sin costo por fila ──────────────────────────────────────

-- Las instalaciones que definen la audiencia: los testers (para `testers` y
-- `others`) o las personas elegidas (para `ids`).
create or replace function public.analytics_audience_list()
returns uuid[]
language sql
stable
set search_path = public
as $$
  select case public.analytics_audience()
           when 'ids' then public.analytics_audience_ids()
           when 'all' then '{}'::uuid[]
           else coalesce((select array_agg(t.install_id) from public.analytics_testers t
                          where t.is_tester), '{}'::uuid[])
         end;
$$;
grant execute on function public.analytics_audience_list() to authenticated, service_role;

-- Mismas columnas y mismo resultado que en v22/v24. Los `(select …)` hacen
-- que Postgres calcule la audiencia y la lista una vez por consulta (InitPlan)
-- y no una vez por evento.
create or replace view public.analytics_ev
with (security_invoker = true) as
select e.*,
       (e.occurred_at at time zone 'America/Lima')                          as local_ts,
       (e.occurred_at at time zone 'America/Lima')::date                    as day,
       date_trunc('week',  e.occurred_at at time zone 'America/Lima')::date as week,
       date_trunc('month', e.occurred_at at time zone 'America/Lima')::date as month
from public.analytics_events e
where e.channel <> 'debug'
  and case (select public.analytics_audience())
        when 'others'  then e.install_id <> all (coalesce((select public.analytics_audience_list()), '{}'::uuid[]))
        when 'testers' then e.install_id =  any (coalesce((select public.analytics_audience_list()), '{}'::uuid[]))
        when 'ids'     then e.install_id =  any (coalesce((select public.analytics_audience_list()), '{}'::uuid[]))
        else true
      end;

-- Índices para leer sólo los días que cambiaron y los eventos recién llegados.
create index if not exists analytics_events_lima_day_idx
  on public.analytics_events (((occurred_at at time zone 'America/Lima')::date));
create index if not exists analytics_events_received_idx
  on public.analytics_events (received_at);

-- ── 2. Caché ─────────────────────────────────────────────────────────────

-- Qué vistas se guardan y cómo.
--   mode = 'inc'  : cada fila pertenece a un día/semana/mes (key_col) y sólo
--                   depende de los eventos de ese periodo → se recalculan
--                   sólo los periodos con eventos nuevos.
--   mode = 'full' : depende de «hoy» o de toda la historia (últimos 30 días,
--                   cohortes, perfiles) → se rehace entera.
--   aud_free      : el panel la pide sin audiencia (separa testers él mismo).
--   chains        : usa `analytics_merchant_chains`; si cambian, se rehace.
--   win_days / win_week : la ventana que devuelve `analytics_dashboard`
--                   (la misma que pedía el panel a cada vista).
create table if not exists public.analytics_cache_views (
  view      text primary key,
  key_col   text,
  gran      text check (gran in ('day', 'week', 'month')),
  mode      text not null check (mode in ('inc', 'full')),
  aud_free  boolean not null default false,
  chains    boolean not null default false,
  win_days  integer,
  win_week  boolean not null default false
);

insert into public.analytics_cache_views (view, key_col, gran, mode, aud_free, chains, win_days, win_week)
select v, 'day', 'day', 'inc', false, false, 89, false
from unnest(array[
  'analytics_daily_active', 'analytics_open_sources_daily', 'analytics_notifications_daily',
  'analytics_screens_daily', 'analytics_taps_daily', 'analytics_navigation_daily',
  'analytics_feature_usage_daily', 'analytics_parser_health_daily', 'analytics_sync_runs_daily',
  'analytics_email_latency_daily', 'analytics_accounts_daily', 'analytics_classification_daily',
  'analytics_auto_vs_manual_daily', 'analytics_pending_backlog_daily', 'analytics_movements_created_daily',
  'analytics_rules_daily', 'analytics_paywall_daily', 'analytics_pro_feature_usage_daily',
  'analytics_launch_perf_daily', 'analytics_screen_perf_daily', 'analytics_stability_daily',
  'analytics_metrickit_daily', 'analytics_errors_daily', 'analytics_unlock_daily',
  'analytics_merchant_daily', 'analytics_classify_sheet_daily', 'analytics_classification_undo_daily',
  'analytics_rules_backfill_daily']) as v
union all values
  ('analytics_new_installs_daily',   'day',         null,    'full', false, false, 89,  false),
  ('analytics_weekly_active',        'week',        'week',  'inc',  false, false, 84,  true),
  ('analytics_monthly_active',       'month',       'month', 'inc',  false, false, 100, false),
  ('analytics_onboarding_funnel',    'cohort_week', null,    'full', false, false, 112, true),
  ('analytics_retention_cohorts',    'cohort_week', null,    'full', false, false, 112, true),
  ('analytics_install_daily',        'day',         'day',   'inc',  true,  false, 89,  false),
  ('analytics_merchant_person_daily','day',         'day',   'inc',  true,  true,  89,  false),
  ('analytics_install_profile',      null,          null,    'full', true,  false, null, false),
  ('analytics_app_releases',         null,          null,    'full', true,  false, null, false)
union all
select v, null, null, 'full', false, false, null, false
from unnest(array[
  'analytics_open_hours_30d', 'analytics_max_months_back_30d', 'analytics_chart_modes_30d',
  'analytics_feature_discovery', 'analytics_activation_milestones', 'analytics_auto_accuracy_30d',
  'analytics_suggestions_30d', 'analytics_paywall_30d', 'analytics_pro_engagement_30d',
  'analytics_themes_30d', 'analytics_adoption_latest', 'analytics_versions_7d',
  'analytics_merchant_ranking_30d', 'analytics_merchant_reclassified_30d', 'analytics_merchant_auto_30d',
  'analytics_merchant_unclassified_30d', 'analytics_movements_controls_30d',
  'analytics_subscription_detection_30d', 'analytics_subscription_merchants_30d']) as v
on conflict (view) do update set
  key_col = excluded.key_col, gran = excluded.gran, mode = excluded.mode, aud_free = excluded.aud_free,
  chains = excluded.chains, win_days = excluded.win_days, win_week = excluded.win_week;

-- Una fila por fila de cada vista, por audiencia. `k` es su día/semana/mes.
create table if not exists public.analytics_cache (
  view  text    not null,
  aud   text    not null check (aud in ('all', 'testers', 'others')),
  k     date,
  ord   integer not null,
  data  jsonb   not null
);
create index if not exists analytics_cache_view_idx on public.analytics_cache (view, aud, k);

-- Hasta dónde se procesó.
create table if not exists public.analytics_cache_state (
  id            integer primary key default 1 check (id = 1),
  last_received timestamptz not null default '-infinity',
  full_at       timestamptz,
  dirty_aud     boolean not null default true,
  dirty_chains  boolean not null default true,
  refreshed_at  timestamptz,
  last_ms       integer,
  last_info     jsonb
);
insert into public.analytics_cache_state (id) values (1) on conflict (id) do nothing;

-- Sólo se leen a través de las funciones de abajo.
alter table public.analytics_cache_views enable row level security;
alter table public.analytics_cache       enable row level security;
alter table public.analytics_cache_state enable row level security;
revoke all on public.analytics_cache_views, public.analytics_cache, public.analytics_cache_state
  from anon, authenticated;

-- Si cambian los testers, Testers y No testers se rehacen; si cambian las
-- cadenas de comercios, Monitoreo de comercios se rehace.
create or replace function public.analytics_cache_mark_dirty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'analytics_testers' then
    update public.analytics_cache_state set dirty_aud = true where id = 1;
  else
    update public.analytics_cache_state set dirty_chains = true where id = 1;
  end if;
  return null;
end;
$$;
revoke all on function public.analytics_cache_mark_dirty() from public, anon, authenticated;

drop trigger if exists analytics_testers_cache_dirty on public.analytics_testers;
create trigger analytics_testers_cache_dirty
  after insert or update or delete on public.analytics_testers
  for each statement execute function public.analytics_cache_mark_dirty();

drop trigger if exists analytics_chains_cache_dirty on public.analytics_merchant_chains;
create trigger analytics_chains_cache_dirty
  after insert or update or delete on public.analytics_merchant_chains
  for each statement execute function public.analytics_cache_mark_dirty();

-- ── 3. Actualizar la caché (sólo lo nuevo) ───────────────────────────────

-- p_force = true rehace todo desde los eventos que existen.
-- Devuelve qué hizo: fresh (nada nuevo), busy (otra actualización en curso) u ok.
create or replace function public.analytics_refresh(p_force boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  st         public.analytics_cache_state;
  t0         timestamptz := clock_timestamp();
  v_maxrec   timestamptz;
  v_start    date;
  v_min_day  date;
  v_full_due boolean;
  v_from     date;
  v_rebuild  boolean;
  a          text;
  c          public.analytics_cache_views;
  n_inc      integer := 0;
  n_full     integer := 0;
  v_info     jsonb;
begin
  -- Desde el panel, sólo administradores. pg_cron no tiene sesión (auth.uid() null).
  if auth.uid() is not null and not public.analytics_is_admin() then
    raise exception 'sólo administradores' using errcode = '42501';
  end if;
  if not pg_try_advisory_xact_lock(hashtext('analytics_refresh')) then
    return jsonb_build_object('status', 'busy');
  end if;

  select * into st from public.analytics_cache_state where id = 1 for update;

  -- ¿Llegó algo desde la última vez? Si sí, desde qué día hay que recalcular.
  -- Se mira 10 min hacia atrás por si un lote se guardó mientras corría la anterior.
  select max(received_at) into v_maxrec
  from public.analytics_events where received_at > st.last_received;
  if v_maxrec is not null then
    select min((occurred_at at time zone 'America/Lima')::date) into v_start
    from public.analytics_events
    where received_at > st.last_received - interval '10 minutes' and channel <> 'debug';
  end if;

  v_full_due := p_force or st.dirty_aud or st.dirty_chains or st.full_at is null
             or st.full_at < now() - interval '1 hour'
             or (v_maxrec is not null and st.full_at < now() - interval '15 minutes');

  if v_maxrec is null and not v_full_due then
    return jsonb_build_object('status', 'fresh', 'refreshed_at', st.refreshed_at);
  end if;

  -- El día más viejo que todavía tiene eventos (lo anterior ya se podó y su
  -- caché se conserva).
  select min((occurred_at at time zone 'America/Lima')::date) into v_min_day
  from public.analytics_events where channel <> 'debug';

  foreach a in array array['all', 'testers', 'others'] loop
    -- Las vistas leen la audiencia del encabezado x-audience (v22).
    perform set_config('request.headers', json_build_object('x-audience', a)::text, true);
    for c in select * from public.analytics_cache_views order by view loop
      continue when c.aud_free and a <> 'all';

      if c.mode = 'inc' then
        v_rebuild := p_force or (st.dirty_aud and a <> 'all') or (st.dirty_chains and c.chains);
        v_from := case when v_rebuild then v_min_day else v_start end;
        continue when v_from is null or (not v_rebuild and v_maxrec is null);
        v_from := case c.gran when 'week'  then date_trunc('week',  v_from)::date
                              when 'month' then date_trunc('month', v_from)::date
                              else v_from end;
        delete from public.analytics_cache where view = c.view and aud = a and k >= v_from;
        execute format(
          'insert into public.analytics_cache (view, aud, k, ord, data)
           select %L, %L, (r.%I)::date, row_number() over (), to_jsonb(r)
           from (select * from public.%I where %I >= %L order by %I) r',
          c.view, a, c.key_col, c.view, c.key_col, v_from, c.key_col);
        n_inc := n_inc + 1;

      elsif v_full_due then
        delete from public.analytics_cache where view = c.view and aud = a;
        execute format(
          'insert into public.analytics_cache (view, aud, k, ord, data)
           select %L, %L, %s, row_number() over (), to_jsonb(r)
           from public.%I r',
          c.view, a,
          case when c.key_col is null then 'null::date' else format('(r.%I)::date', c.key_col) end,
          c.view);
        n_full := n_full + 1;
      end if;
    end loop;
  end loop;

  v_info := jsonb_build_object(
    'status', 'ok',
    'from_day', v_start,
    'incremental', n_inc,
    'full', n_full,
    'ms', round(extract(epoch from clock_timestamp() - t0) * 1000));

  update public.analytics_cache_state set
    last_received = coalesce(v_maxrec, st.last_received),
    full_at       = case when v_full_due then now() else st.full_at end,
    dirty_aud     = false,
    dirty_chains  = false,
    refreshed_at  = now(),
    last_ms       = (v_info ->> 'ms')::integer,
    last_info     = v_info
  where id = 1;

  return v_info || jsonb_build_object('refreshed_at', now());
end;
$$;
revoke all on function public.analytics_refresh(boolean) from public, anon;
grant execute on function public.analytics_refresh(boolean) to authenticated, service_role;

-- ── 4. Todo el panel en una llamada ──────────────────────────────────────

-- p_aud: 'all', 'testers' u 'others'. Devuelve { views: {vista: [filas]},
-- refreshed_at, data_until }, con las mismas ventanas que pedía el panel.
create or replace function public.analytics_dashboard(p_aud text default 'all')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Lima')::date;
  v_aud   text := case when p_aud in ('testers', 'others') then p_aud else 'all' end;
  v_views jsonb;
  st      public.analytics_cache_state;
begin
  if not public.analytics_is_admin() then
    raise exception 'sólo administradores' using errcode = '42501';
  end if;

  select coalesce(jsonb_object_agg(v.view, coalesce(x.rows, '[]'::jsonb)), '{}'::jsonb) into v_views
  from public.analytics_cache_views v
  left join lateral (
    select jsonb_agg(c.data order by c.k nulls first, c.ord) as rows
    from public.analytics_cache c
    where c.view = v.view
      and c.aud = case when v.aud_free then 'all' else v_aud end
      and (v.win_days is null
           or c.k >= case when v.win_week then date_trunc('week', v_today - v.win_days)::date
                          else v_today - v.win_days end)
  ) x on true;

  v_views := v_views || jsonb_build_object(
    'analytics_testers',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.analytics_testers t),
    'analytics_milestones',
      (select coalesce(jsonb_agg(to_jsonb(m) order by m.day), '[]'::jsonb) from public.analytics_milestones m));

  select * into st from public.analytics_cache_state where id = 1;
  return jsonb_build_object('views', v_views, 'refreshed_at', st.refreshed_at, 'data_until', st.last_received);
end;
$$;
revoke all on function public.analytics_dashboard(text) from public, anon;
grant execute on function public.analytics_dashboard(text) to authenticated, service_role;

-- ── 5. Cada 5 minutos ────────────────────────────────────────────────────

create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'analytics-refresh';
select cron.schedule('analytics-refresh', '*/5 * * * *', 'select public.analytics_refresh()');

-- Primera carga completa.
select public.analytics_refresh(true);
