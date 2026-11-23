-- ============================================================
-- AlTanto · Analítica de uso v27: estado de los datos y espacio
-- ============================================================
-- Corre esto DESPUÉS de v26, en el proyecto de analítica
-- (`Agrupay_Analytics`). Idempotente: se puede volver a correr entero.
--
-- Qué añade
-- 1. `analytics_cache_state` anota también cuándo se revisó por última vez
--    (aunque no hubiera nada nuevo) y cuántos eventos nuevos procesó.
-- 2. `analytics_db_size_daily`: el tamaño de la base, día por día, para ver
--    cómo se va llenando. Lo anota `analytics_refresh()` (cada 5 minutos,
--    se queda con el último valor del día). Medirlo cuesta milisegundos:
--    Postgres sólo suma el tamaño de sus archivos, no lee los datos.
-- 3. `analytics_system()`: cómo se están leyendo los datos, cuánto ocupa la
--    base, a qué ritmo crece y cuándo se llenaría. `analytics_dashboard()`
--    la incluye en su respuesta (`system`).
-- 4. Tipo de hito `analytics` en la Bitácora: cambios en el panel o en la
--    analítica (no hace falta nada en la base: `kind` es texto libre).
--
-- El límite (500 MB, plan Free de Supabase) está en
-- `analytics_cache_state.db_limit_bytes`. Si pasan a Pro (8 GB):
--   update analytics_cache_state set db_limit_bytes = 8 * 1024^3;

-- ── 1. Más estado ────────────────────────────────────────────────────────

alter table public.analytics_cache_state
  add column if not exists checked_at     timestamptz,
  add column if not exists last_events    integer,
  add column if not exists db_limit_bytes bigint not null default 500 * 1024 * 1024;

-- ── 2. Tamaño día por día ────────────────────────────────────────────────

create table if not exists public.analytics_db_size_daily (
  day          date primary key,
  db_bytes     bigint not null,
  events_bytes bigint not null,
  cache_bytes  bigint not null,
  events       bigint not null,
  recorded_at  timestamptz not null default now()
);
alter table public.analytics_db_size_daily enable row level security;
revoke all on public.analytics_db_size_daily from anon, authenticated;

create or replace function public.analytics_record_size()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.analytics_db_size_daily (day, db_bytes, events_bytes, cache_bytes, events, recorded_at)
  values ((now() at time zone 'America/Lima')::date,
          pg_database_size(current_database()),
          pg_total_relation_size('public.analytics_events'),
          pg_total_relation_size('public.analytics_cache'),
          (select count(*) from public.analytics_events),
          now())
  on conflict (day) do update set
    db_bytes = excluded.db_bytes, events_bytes = excluded.events_bytes,
    cache_bytes = excluded.cache_bytes, events = excluded.events, recorded_at = excluded.recorded_at;
$$;
revoke all on function public.analytics_record_size() from public, anon, authenticated;

-- ── Actualizar la caché (igual que v26, más lo de arriba) ────────────────

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
  v_new      integer;
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
  select max(received_at), count(*) into v_maxrec, v_new
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
    update public.analytics_cache_state set checked_at = now() where id = 1;
    perform public.analytics_record_size();
    return jsonb_build_object('status', 'fresh', 'refreshed_at', st.refreshed_at, 'checked_at', now());
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
    'events', coalesce(v_new, 0),
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
    checked_at    = now(),
    last_events   = coalesce(v_new, 0),
    last_ms       = (v_info ->> 'ms')::integer,
    last_info     = v_info
  where id = 1;
  perform public.analytics_record_size();

  return v_info || jsonb_build_object('refreshed_at', now(), 'checked_at', now());
end;
$$;
revoke all on function public.analytics_refresh(boolean) from public, anon;
grant execute on function public.analytics_refresh(boolean) to authenticated, service_role;

-- ── 3. Estado de los datos y espacio ─────────────────────────────────────

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
  v_est     numeric;   -- crecimiento estimado por día: eventos/día × bytes por evento + caché
  v_meas    numeric;   -- crecimiento medido por día (con 7 días o más de historia)
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
                          where j.jobname = 'analytics-refresh' order by d.start_time desc limit 1));
end;
$$;
revoke all on function public.analytics_system() from public, anon;
grant execute on function public.analytics_system() to authenticated, service_role;

-- `analytics_dashboard` (v26) con `system` en la respuesta.
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
  return jsonb_build_object('views', v_views, 'refreshed_at', st.refreshed_at, 'data_until', st.last_received,
                            'system', public.analytics_system());
end;
$$;
revoke all on function public.analytics_dashboard(text) from public, anon;
grant execute on function public.analytics_dashboard(text) to authenticated, service_role;

-- Primer registro del tamaño.
select public.analytics_record_size();
