-- ============================================================
-- AlTanto · Analítica de uso v28: sección Sistema (monitoreo)
-- ============================================================
-- Corre esto DESPUÉS de v27, en el proyecto de analítica
-- (`Agrupay_Analytics`). Idempotente: se puede volver a correr entero.
--
-- Qué añade
-- 1. `analytics_refresh_log`: cada pasada de `analytics_refresh()` que
--    procesó algo (automática o desde el panel), con su duración. Se guarda
--    30 días. La llena un trigger sobre `analytics_cache_state`.
-- 2. `analytics_panel_loads`: cuánto tardó el panel en mostrar datos en el
--    navegador de cada administrador (sin guardar quién). Se guarda 90 días.
--    El panel la llena con `analytics_log_load()`.
-- 3. `analytics_system()` suma `detail`: eventos recibidos por hora y por
--    día, retraso con que llegan los lotes, pasadas recientes, fallas de
--    pg_cron y tiempos de carga del panel. Todo sale de índices; cuesta
--    unos milisegundos por visita.

-- ── 1. Historial de pasadas ──────────────────────────────────────────────

create table if not exists public.analytics_refresh_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  origin      text not null,              -- 'auto' (pg_cron) o 'panel'
  status      text,
  events      integer,
  from_day    date,
  incremental integer,
  full_views  integer,
  ms          integer
);
create index if not exists analytics_refresh_log_at_idx on public.analytics_refresh_log (at);
alter table public.analytics_refresh_log enable row level security;
revoke all on public.analytics_refresh_log from anon, authenticated;

create or replace function public.analytics_refresh_log_add()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.refreshed_at is distinct from old.refreshed_at and new.last_info is not null then
    insert into public.analytics_refresh_log (origin, status, events, from_day, incremental, full_views, ms)
    values (case when auth.uid() is null then 'auto' else 'panel' end,
            new.last_info ->> 'status',
            (new.last_info ->> 'events')::integer,
            (new.last_info ->> 'from_day')::date,
            (new.last_info ->> 'incremental')::integer,
            (new.last_info ->> 'full')::integer,
            (new.last_info ->> 'ms')::integer);
    delete from public.analytics_refresh_log where at < now() - interval '30 days';
  end if;
  return new;
end;
$$;
revoke all on function public.analytics_refresh_log_add() from public, anon, authenticated;

drop trigger if exists analytics_cache_state_log on public.analytics_cache_state;
create trigger analytics_cache_state_log
  after update on public.analytics_cache_state
  for each row execute function public.analytics_refresh_log_add();

-- ── 2. Tiempo de carga del panel ─────────────────────────────────────────

create table if not exists public.analytics_panel_loads (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  source    text,          -- 'cache' (una llamada) o 'views' (vista por vista)
  aud       text,
  first_ms  integer,       -- hasta ver datos (los guardados en el navegador, si había)
  data_ms   integer,       -- hasta ver los datos de Supabase
  total_ms  integer,       -- hasta quedar al día (después de analytics_refresh)
  kb        integer,       -- tamaño de la respuesta, sin comprimir
  refresh   text          -- qué devolvió analytics_refresh: ok, fresh, busy…
);
create index if not exists analytics_panel_loads_at_idx on public.analytics_panel_loads (at);
alter table public.analytics_panel_loads enable row level security;
revoke all on public.analytics_panel_loads from anon, authenticated;

create or replace function public.analytics_log_load(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ms_ok text := '^\d{1,7}$';
begin
  if not public.analytics_is_admin() then
    raise exception 'sólo administradores' using errcode = '42501';
  end if;
  insert into public.analytics_panel_loads (source, aud, first_ms, data_ms, total_ms, kb, refresh)
  values (left(p ->> 'source', 10), left(p ->> 'aud', 10),
          case when p ->> 'first_ms' ~ ms_ok then (p ->> 'first_ms')::integer end,
          case when p ->> 'data_ms'  ~ ms_ok then (p ->> 'data_ms')::integer end,
          case when p ->> 'total_ms' ~ ms_ok then (p ->> 'total_ms')::integer end,
          case when p ->> 'kb'       ~ ms_ok then (p ->> 'kb')::integer end,
          left(p ->> 'refresh', 10));
  delete from public.analytics_panel_loads where at < now() - interval '90 days';
end;
$$;
revoke all on function public.analytics_log_load(jsonb) from public, anon;
grant execute on function public.analytics_log_load(jsonb) to authenticated, service_role;

-- ── 3. Detalle para la sección Sistema ───────────────────────────────────

create or replace function public.analytics_system_detail()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lima as (select (now() at time zone 'America/Lima') as ts)
  select jsonb_build_object(
    -- Eventos recibidos por hora, últimas 48 h (hora de Lima).
    'hourly', (select coalesce(jsonb_agg(jsonb_build_object('h', h, 'events', n, 'installs', i) order by h), '[]'::jsonb)
               from (select to_char(date_trunc('hour', received_at at time zone 'America/Lima'), 'YYYY-MM-DD"T"HH24') as h,
                            count(*) as n, count(distinct install_id) as i
                     from public.analytics_events
                     where received_at > now() - interval '48 hours' and channel <> 'debug'
                     group by 1) x),
    -- Eventos recibidos por día, últimos 30 días.
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'events', n, 'installs', i) order by d), '[]'::jsonb)
              from (select (received_at at time zone 'America/Lima')::date as d,
                           count(*) as n, count(distinct install_id) as i
                    from public.analytics_events
                    where received_at > now() - interval '30 days' and channel <> 'debug'
                    group by 1) x),
    -- Con cuánto retraso llegan los eventos (de que pasan a que llegan), 7 días.
    'latency', (select jsonb_build_object(
                  'p50_min', round((percentile_cont(0.5) within group (order by extract(epoch from received_at - occurred_at)) / 60)::numeric, 1),
                  'p90_min', round((percentile_cont(0.9) within group (order by extract(epoch from received_at - occurred_at)) / 60)::numeric, 1),
                  'pct_over_1h', round(100.0 * count(*) filter (where received_at - occurred_at > interval '1 hour') / nullif(count(*), 0), 1))
                from public.analytics_events
                where received_at > now() - interval '7 days' and channel <> 'debug'),
    'last_event_at', (select max(received_at) from public.analytics_events),
    'today_installs', (select count(distinct install_id) from public.analytics_events
                       where received_at >= ((select ts from lima)::date::timestamp at time zone 'America/Lima')
                         and channel <> 'debug'),
    'today_events', (select count(*) from public.analytics_events
                     where received_at >= ((select ts from lima)::date::timestamp at time zone 'America/Lima')
                       and channel <> 'debug'),
    'refresh_log', (select coalesce(jsonb_agg(to_jsonb(r) - 'id' order by r.at desc), '[]'::jsonb)
                    from (select * from public.analytics_refresh_log order by at desc limit 60) r),
    'cron_24h', (select jsonb_build_object('runs', count(*), 'failed', count(*) filter (where d.status <> 'succeeded'),
                                           'avg_ms', round(avg(extract(epoch from d.end_time - d.start_time) * 1000)))
                 from cron.job_run_details d join cron.job j using (jobid)
                 where j.jobname = 'analytics-refresh' and d.start_time > now() - interval '24 hours'),
    'loads', (select coalesce(jsonb_agg(to_jsonb(l) - 'id' order by l.at desc), '[]'::jsonb)
              from (select * from public.analytics_panel_loads
                    where at > now() - interval '30 days' order by at desc limit 500) l)
  );
$$;
revoke all on function public.analytics_system_detail() from public, anon, authenticated;

-- `analytics_system` (v27) con `detail`.
create or replace function public.analytics_system()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  st        public.analytics_cache_state;
  v_db      bigint := pg_database_size(current_database());
  v_ev_b    bigint := pg_total_relation_size('public.analytics_events');
  v_cache_b bigint := pg_total_relation_size('public.analytics_cache');
  v_ev_n    bigint;
  v_ev_30   bigint;
  v_cache_d integer;
  v_est     numeric;
  v_meas    numeric;
  v_hist    jsonb;
  v_first   public.analytics_db_size_daily;
  v_last    public.analytics_db_size_daily;
  v_grow    numeric;
begin
  if not public.analytics_is_admin() then
    raise exception 'sólo administradores' using errcode = '42501';
  end if;
  select * into st from public.analytics_cache_state where id = 1;

  select count(*) into v_ev_n from public.analytics_events;
  select count(*) into v_ev_30 from public.analytics_events where occurred_at > now() - interval '30 days';
  select greatest(1, (now() at time zone 'America/Lima')::date - min(k)) into v_cache_d
  from public.analytics_cache where k is not null;

  v_est := (v_ev_30 / 30.0) * (v_ev_b::numeric / greatest(v_ev_n, 1))
         + v_cache_b::numeric / greatest(coalesce(v_cache_d, 1), 1);

  select * into v_first from public.analytics_db_size_daily
  where day >= (now() at time zone 'America/Lima')::date - 30 order by day limit 1;
  select * into v_last from public.analytics_db_size_daily order by day desc limit 1;
  if v_first.day is not null and v_last.day - v_first.day >= 7 then
    v_meas := greatest(0, v_last.db_bytes - v_first.db_bytes)::numeric / (v_last.day - v_first.day);
  end if;
  v_grow := coalesce(v_meas, v_est);

  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'db_bytes', db_bytes, 'events', events) order by day), '[]'::jsonb)
    into v_hist
  from public.analytics_db_size_daily
  where day >= (now() at time zone 'America/Lima')::date - 180;

  return jsonb_build_object(
    'schedule_min',      5,
    'checked_at',        st.checked_at,
    'refreshed_at',      st.refreshed_at,
    'full_at',           st.full_at,
    'data_until',        st.last_received,
    'last_events',       st.last_events,
    'last_info',         st.last_info,
    'db_bytes',          v_db,
    'db_limit_bytes',    st.db_limit_bytes,
    'events_bytes',      v_ev_b,
    'cache_bytes',       v_cache_b,
    'events_total',      v_ev_n,
    'events_per_day',    round(v_ev_30 / 30.0),
    'bytes_per_event',   round(v_ev_b::numeric / greatest(v_ev_n, 1)),
    'growth_per_day',    round(v_grow),
    'growth_measured',   v_meas is not null,
    'days_to_full',      case when v_grow > 0 then floor(greatest(0, st.db_limit_bytes - v_db) / v_grow) end,
    'history',           v_hist,
    'cron_failed_24h',   (select count(*) from cron.job_run_details d join cron.job j using (jobid)
                          where j.jobname = 'analytics-refresh' and d.status <> 'succeeded'
                            and d.start_time > now() - interval '24 hours'),
    'cron_last',         (select jsonb_build_object('at', d.start_time, 'status', d.status)
                          from cron.job_run_details d join cron.job j using (jobid)
                          where j.jobname = 'analytics-refresh' order by d.start_time desc limit 1),
    'detail',            public.analytics_system_detail());
end;
$$;
revoke all on function public.analytics_system() from public, anon;
grant execute on function public.analytics_system() to authenticated, service_role;
