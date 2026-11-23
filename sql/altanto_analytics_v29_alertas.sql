-- AlTanto Analytics v29: alertas por correo.
-- Correr después de v28. Cada 10 minutos pg_cron corre `analytics_alerts_run()`, que revisa lo mismo
-- que la sección Sistema y manda un correo cuando algo empieza a fallar, un recordatorio cada 24 h
-- mientras siga y otro cuando se resuelve.
--
-- El correo sale por Resend (https://resend.com, gratis hasta 3.000 correos al mes) con pg_net.
-- Para activarlo, una sola vez, en el editor SQL de Supabase:
--   select vault.create_secret('re_...tu llave de Resend...', 'analytics_alert_key');
-- Sin dominio propio verificado en Resend sólo se puede escribir al correo de la cuenta de Resend:
--   update public.analytics_alert_config set recipients = array['correo-de-la-cuenta@ejemplo.com'];
-- Con dominio verificado:
--   update public.analytics_alert_config set from_addr = 'AlTanto Analytics <alertas@tu-dominio>',
--                                            recipients = '{}';   -- vacío = todos los administradores

create extension if not exists pg_net with schema extensions;

-- ── 1. Configuración, alertas y envíos ───────────────────────────────────

create table if not exists public.analytics_alert_config (
  id              boolean primary key default true check (id),
  enabled         boolean not null default true,
  from_addr       text    not null default 'AlTanto Analytics <onboarding@resend.dev>',
  recipients      text[]  not null default '{}',     -- vacío = correos de analytics_admins
  panel_url       text    not null default 'https://clmil0.github.io/agrupay-analytics/',
  stale_minutes   integer not null default 30,       -- sin revisar eventos nuevos
  ingest_hours    integer not null default 18,       -- sin recibir ningún evento (máximo visto en 30 días: 14,5 h)
  space_pct       integer not null default 80,       -- base llena
  reminder_hours  integer not null default 24
);
insert into public.analytics_alert_config (id) values (true) on conflict do nothing;
alter table public.analytics_alert_config enable row level security;
revoke all on public.analytics_alert_config from anon, authenticated;

-- Una fila por problema: se abre cuando aparece y se cierra cuando desaparece.
create table if not exists public.analytics_alerts (
  id            bigint generated always as identity primary key,
  code          text        not null,
  title         text        not null,
  detail        text,
  opened_at     timestamptz not null default now(),
  closed_at     timestamptz,
  last_sent_at  timestamptz,
  sent_count    integer     not null default 0
);
create unique index if not exists analytics_alerts_open_idx on public.analytics_alerts (code) where closed_at is null;
alter table public.analytics_alerts enable row level security;
revoke all on public.analytics_alerts from anon, authenticated;

-- Cada correo pedido a Resend y lo que respondió.
create table if not exists public.analytics_alert_sends (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  kind        text        not null,    -- open, reminder, resolved, test
  codes       text[]      not null default '{}',
  recipient   text        not null,
  request_id  bigint,
  status      integer,
  error       text
);
alter table public.analytics_alert_sends enable row level security;
revoke all on public.analytics_alert_sends from anon, authenticated;

-- ── 2. Qué está fallando ahora ───────────────────────────────────────────

create or replace function public.analytics_alert_ago(p interval)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p < interval '1 hour'  then greatest(1, floor(extract(epoch from p) / 60))::int || ' min'
    when p < interval '48 hours' then floor(extract(epoch from p) / 3600)::int || ' h'
                                      || coalesce(nullif(' ' || (floor(extract(epoch from p) / 60)::int % 60) || ' min', ' 0 min'), '')
    else floor(extract(epoch from p) / 86400)::int || ' días'
  end;
$$;

create or replace function public.analytics_alert_checks()
returns table (code text, title text, detail text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cfg     public.analytics_alert_config;
  st      public.analytics_cache_state;
  v_chk   timestamptz;
  v_fail  integer;
  v_msg   text;
  v_last  timestamptz;
  v_db    bigint := pg_database_size(current_database());
  v_pct   numeric;
  lima    text := 'America/Lima';
begin
  select * into cfg from public.analytics_alert_config where id;
  select * into st  from public.analytics_cache_state where id = 1;

  v_chk := coalesce(st.checked_at, st.refreshed_at);
  if v_chk is null or v_chk < now() - make_interval(mins => cfg.stale_minutes) then
    code := 'refresh_stale';
    title := 'La actualización automática está detenida';
    detail := 'Supabase no revisa si llegaron eventos nuevos desde hace '
              || coalesce(public.analytics_alert_ago(now() - v_chk), 'mucho')
              || ' (debería hacerlo cada 5 min). El panel muestra datos viejos. Revisa en Supabase que el job '
              || '«analytics-refresh» de pg_cron siga activo (cron.job y cron.job_run_details).';
    return next;
  end if;

  select count(*), (array_agg(left(d.return_message, 200) order by d.start_time desc))[1]
    into v_fail, v_msg
  from cron.job_run_details d join cron.job j using (jobid)
  where j.jobname = 'analytics-refresh' and d.status = 'failed' and d.start_time > now() - interval '1 hour';
  if v_fail >= 2 then
    code := 'refresh_failed';
    title := 'La actualización automática está fallando';
    detail := v_fail || ' pasadas fallaron en la última hora. Último error: ' || coalesce(v_msg, 'sin mensaje') || '.';
    return next;
  end if;

  select max(received_at) into v_last from public.analytics_events where channel <> 'debug';
  if v_last is null or v_last < now() - make_interval(hours => cfg.ingest_hours) then
    code := 'ingest';
    title := 'No llegan eventos de la app';
    detail := 'El último evento llegó hace ' || coalesce(public.analytics_alert_ago(now() - v_last), 'mucho')
              || ' (' || coalesce(to_char(v_last at time zone lima, 'DD/MM HH24:MI'), '—') || ', hora de Lima). '
              || 'Lo normal es que no pase de ' || cfg.ingest_hours || ' h. Puede que la última versión de la app '
              || 'no esté enviando o que ingest_analytics esté rechazando los envíos.';
    return next;
  end if;

  v_pct := 100.0 * v_db / nullif(st.db_limit_bytes, 0);
  if v_pct >= cfg.space_pct then
    code := 'space';
    title := 'La base de analítica se está llenando';
    detail := 'Usa ' || round(v_pct, 1) || ' % del límite (' || round(v_db / 1048576.0, 1) || ' MB de '
              || round(st.db_limit_bytes / 1048576.0) || ' MB). Al llegar al 100 % Supabase la deja sólo de lectura '
              || 'y se dejan de guardar eventos. Opciones: pasar a Pro o borrar eventos viejos.';
    return next;
  end if;
end;
$$;
revoke all on function public.analytics_alert_checks() from public, anon, authenticated;

-- ── 3. Envío ─────────────────────────────────────────────────────────────

-- Correos de destino: los de la configuración o, si está vacía, los de los administradores.
create or replace function public.analytics_alert_recipients()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case when cardinality(c.recipients) > 0 then c.recipients
              else coalesce((select array_agg(u.email::text order by u.email)
                             from public.analytics_admins a join auth.users u on u.id = a.user_id
                             where u.email is not null), '{}') end
  from public.analytics_alert_config c where c.id;
$$;
revoke all on function public.analytics_alert_recipients() from public, anon, authenticated;

-- Pide el correo a Resend, uno por destinatario (si uno falla, los demás igual salen).
-- Devuelve cuántos pidió; 0 si falta la llave o está apagado.
create or replace function public.analytics_alert_send(p_kind text, p_codes text[], p_subject text, p_html text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg   public.analytics_alert_config;
  v_key text;
  v_to  text;
  v_req bigint;
  n     integer := 0;
begin
  select * into cfg from public.analytics_alert_config where id;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'analytics_alert_key' limit 1;
  if v_key is null or not cfg.enabled then
    return 0;
  end if;
  foreach v_to in array public.analytics_alert_recipients() loop
    v_req := net.http_post(
      url     := 'https://api.resend.com/emails',
      body    := jsonb_build_object('from', cfg.from_addr, 'to', jsonb_build_array(v_to),
                                    'subject', p_subject, 'html', p_html),
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
      timeout_milliseconds := 10000);
    insert into public.analytics_alert_sends (kind, codes, recipient, request_id)
    values (p_kind, p_codes, v_to, v_req);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.analytics_alert_send(text, text[], text, text) from public, anon, authenticated;

create or replace function public.analytics_alert_html(p_intro text, p_groups jsonb, p_url text)
returns text
language sql
immutable
set search_path = public
as $$
  select '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#1d1d1f;max-width:560px">'
      || '<p style="margin:0 0 16px">' || p_intro || '</p>'
      || coalesce((select string_agg(
            '<p style="margin:20px 0 6px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:'
            || (g->>'color') || '">' || (g->>'label') || '</p>'
            || (select string_agg('<p style="margin:0 0 10px"><b>' || (i->>'title') || '</b><br>'
                                  || coalesce(i->>'detail', '') || '</p>', '')
                from jsonb_array_elements(g->'items') i), '')
          from jsonb_array_elements(p_groups) g where jsonb_array_length(g->'items') > 0), '')
      || '<p style="margin:24px 0 0"><a href="' || p_url || '?s=sistema" style="color:#0a66c2">Abrir Sistema en el panel</a></p>'
      || '<p style="margin:16px 0 0;font-size:12px;color:#86868b">AlTanto Analytics · revisa cada 10 min. '
      || 'Para dejar de recibirlas: update analytics_alert_config set enabled = false;</p></div>';
$$;

-- ── 4. La pasada de cada 10 minutos ──────────────────────────────────────

create or replace function public.analytics_alerts_run()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg      public.analytics_alert_config;
  c        record;
  v_codes  text[] := '{}';
  v_open   jsonb := '[]';
  v_remind jsonb := '[]';
  v_closed jsonb := '[]';
  v_ids    bigint[] := '{}';
  v_subj   text;
  v_sent   integer := 0;
  v_has_key boolean;
begin
  if not pg_try_advisory_xact_lock(hashtext('analytics_alerts_run')) then
    return jsonb_build_object('status', 'busy');
  end if;
  select * into cfg from public.analytics_alert_config where id;
  v_has_key := exists (select 1 from vault.secrets where name = 'analytics_alert_key');

  -- Lo que respondió Resend a los correos anteriores (pg_net guarda las respuestas unas horas).
  update public.analytics_alert_sends s
     set status = r.status_code,
         error  = coalesce(r.error_msg, case when r.status_code >= 300 then left(r.content, 300) end)
    from net._http_response r
   where s.request_id = r.id and s.status is null;
  update public.analytics_alert_sends
     set status = 0, error = 'sin respuesta de Resend'
   where status is null and at < now() - interval '1 hour';

  for c in select * from public.analytics_alert_checks() loop
    v_codes := v_codes || c.code;
    insert into public.analytics_alerts (code, title, detail)
    values (c.code, c.title, c.detail)
    on conflict (code) where closed_at is null do update set title = excluded.title, detail = excluded.detail;
  end loop;

  -- Lo que ya no falla.
  with closed as (
    update public.analytics_alerts set closed_at = now()
     where closed_at is null and not (code = any (v_codes))
    returning *)
  select coalesce(jsonb_agg(jsonb_build_object('title', title,
           'detail', 'Duró ' || public.analytics_alert_ago(closed_at - opened_at) || '.') order by opened_at), '[]')
    into v_closed
  from closed where sent_count > 0;

  if v_has_key and cfg.enabled then
    -- Nuevas (o que nunca se pudieron mandar) y recordatorios.
    select coalesce(jsonb_agg(jsonb_build_object('title', title, 'detail', detail) order by opened_at)
                      filter (where sent_count = 0), '[]'),
           coalesce(jsonb_agg(jsonb_build_object('title', title,
                      'detail', detail || ' Empezó hace ' || public.analytics_alert_ago(now() - opened_at) || '.') order by opened_at)
                      filter (where sent_count > 0), '[]'),
           coalesce(array_agg(id), '{}')
      into v_open, v_remind, v_ids
    from public.analytics_alerts
    where closed_at is null
      and (last_sent_at is null or last_sent_at < now() - make_interval(hours => cfg.reminder_hours));

    if jsonb_array_length(v_open) + jsonb_array_length(v_remind) + jsonb_array_length(v_closed) > 0 then
      v_subj := case
        when jsonb_array_length(v_open) > 0 then 'Falla en AlTanto Analytics: ' || (v_open->0->>'title')
        when jsonb_array_length(v_remind) > 0 then 'Sigue pendiente: ' || (v_remind->0->>'title')
        else 'Resuelto: ' || (v_closed->0->>'title') end;
      v_sent := public.analytics_alert_send(
        case when jsonb_array_length(v_open) > 0 then 'open' when jsonb_array_length(v_remind) > 0 then 'reminder' else 'resolved' end,
        v_codes, v_subj,
        public.analytics_alert_html(
          case when jsonb_array_length(v_open) + jsonb_array_length(v_remind) > 0
               then 'El panel de analítica detectó algo que hay que mirar.'
               else 'Todo volvió a la normalidad.' end,
          jsonb_build_array(
            jsonb_build_object('label', 'Nuevo', 'color', '#d70015', 'items', v_open),
            jsonb_build_object('label', 'Sigue pendiente', 'color', '#c93400', 'items', v_remind),
            jsonb_build_object('label', 'Resuelto', 'color', '#248a3d', 'items', v_closed)),
          cfg.panel_url));
      if v_sent > 0 then
        update public.analytics_alerts set last_sent_at = now(), sent_count = sent_count + 1 where id = any (v_ids);
      end if;
    end if;
  end if;

  delete from public.analytics_alerts where closed_at < now() - interval '180 days';
  delete from public.analytics_alert_sends where at < now() - interval '90 days';
  return jsonb_build_object('status', 'ok', 'failing', v_codes, 'sent', v_sent, 'key', v_has_key);
end;
$$;
revoke all on function public.analytics_alerts_run() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'analytics-alerts';
select cron.schedule('analytics-alerts', '*/10 * * * *', 'select public.analytics_alerts_run()');

-- ── 5. Desde el panel ────────────────────────────────────────────────────

-- Correo de prueba (como mucho uno por minuto).
create or replace function public.analytics_alert_test()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.analytics_alert_config;
  v_n integer;
  v_items jsonb;
begin
  if not public.analytics_is_admin() then
    raise exception 'sólo administradores' using errcode = '42501';
  end if;
  select * into cfg from public.analytics_alert_config where id;
  if not exists (select 1 from vault.secrets where name = 'analytics_alert_key') then
    return jsonb_build_object('status', 'no_key');
  end if;
  if exists (select 1 from public.analytics_alert_sends where kind = 'test' and at > now() - interval '1 minute') then
    return jsonb_build_object('status', 'wait');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('title', title, 'detail', detail)), '[]') into v_items
  from public.analytics_alert_checks();
  v_n := public.analytics_alert_send('test', '{}', 'Prueba de alertas de AlTanto Analytics',
    public.analytics_alert_html(
      'Este es un correo de prueba: así se van a ver las alertas. '
      || case when jsonb_array_length(v_items) = 0 then 'Ahora mismo no hay nada fallando.'
              else 'Ahora mismo esto está fallando:' end,
      jsonb_build_array(jsonb_build_object('label', 'Fallando ahora', 'color', '#d70015', 'items', v_items)),
      cfg.panel_url));
  return jsonb_build_object('status', case when v_n > 0 then 'sent' else 'off' end, 'sent', v_n);
end;
$$;
revoke all on function public.analytics_alert_test() from public, anon;
grant execute on function public.analytics_alert_test() to authenticated, service_role;

create or replace function public.analytics_alert_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'key',            exists (select 1 from vault.secrets where name = 'analytics_alert_key'),
    'enabled',        c.enabled,
    'from',           c.from_addr,
    'recipients',     to_jsonb(public.analytics_alert_recipients()),
    'to_admins',      cardinality(c.recipients) = 0,
    'thresholds',     jsonb_build_object('stale_minutes', c.stale_minutes, 'ingest_hours', c.ingest_hours,
                                         'space_pct', c.space_pct, 'reminder_hours', c.reminder_hours),
    'cron_last',      (select jsonb_build_object('at', d.start_time, 'status', d.status)
                       from cron.job_run_details d join cron.job j using (jobid)
                       where j.jobname = 'analytics-alerts' order by d.start_time desc limit 1),
    'alerts',         (select coalesce(jsonb_agg(to_jsonb(a) order by a.opened_at desc), '[]')
                       from (select code, title, detail, opened_at, closed_at, last_sent_at, sent_count
                             from public.analytics_alerts order by opened_at desc limit 30) a),
    'sends',          (select coalesce(jsonb_agg(to_jsonb(s) order by s.at desc), '[]')
                       from (select at, kind, codes, recipient, status, error
                             from public.analytics_alert_sends order by at desc limit 30) s))
  from public.analytics_alert_config c where c.id;
$$;
revoke all on function public.analytics_alert_status() from public, anon, authenticated;

-- `analytics_system_detail` (v28) con `alerts`.
create or replace function public.analytics_system_detail()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lima as (select (now() at time zone 'America/Lima') as ts)
  select jsonb_build_object(
    'hourly', (select coalesce(jsonb_agg(jsonb_build_object('h', h, 'events', n, 'installs', i) order by h), '[]'::jsonb)
               from (select to_char(date_trunc('hour', received_at at time zone 'America/Lima'), 'YYYY-MM-DD"T"HH24') as h,
                            count(*) as n, count(distinct install_id) as i
                     from public.analytics_events
                     where received_at > now() - interval '48 hours' and channel <> 'debug'
                     group by 1) x),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'events', n, 'installs', i) order by d), '[]'::jsonb)
              from (select (received_at at time zone 'America/Lima')::date as d,
                           count(*) as n, count(distinct install_id) as i
                    from public.analytics_events
                    where received_at > now() - interval '30 days' and channel <> 'debug'
                    group by 1) x),
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
                    where at > now() - interval '30 days' order by at desc limit 500) l),
    'alerts', public.analytics_alert_status()
  );
$$;
revoke all on function public.analytics_system_detail() from public, anon, authenticated;
