-- ============================================================
-- AlTanto · Analítica de uso v22: testers, audiencia e hipótesis
-- ============================================================
-- Corre esto DESPUÉS de v16 y v21, en el proyecto de analítica
-- (`Agrupay_Analytics`). Idempotente: se puede volver a correr entero.
--
-- Qué añade
-- 1. `analytics_testers`: una fila por instalación que el panel marca como
--    tester (o no), con su perfil (edad, género, iPhone, user persona) y lo
--    que respondió en la encuesta o la entrevista. La escribe el panel con la
--    sesión de un administrador.
-- 2. Audiencia: el panel manda el encabezado `x-audience` (`testers`,
--    `others` o nada) y `analytics_ev`, la vista de la que salen todas las
--    demás, se queda sólo con esas instalaciones. Así cada sección del panel
--    se puede ver para testers, para el resto o para todos sin otra vista.
--    También se rehacen las cuatro vistas de v16 que cuentan instalaciones
--    desde `analytics_installs` (nuevas, descubrimiento, hitos y retención).
--    Si alguna vista de v21 lee `analytics_events` directo en lugar de
--    `analytics_ev`, esa no se filtra: cámbiala para que lea `analytics_ev`.
-- 3. `analytics_install_daily`: una fila por instalación y día, con lo que
--    piden las hipótesis (sesiones con acción, acciones de valor, conexión
--    del correo, metas, clasificación de consumos con tarjeta…).
-- 4. `analytics_install_profile`: una fila por instalación, con el canal, el
--    dispositivo y hasta dónde llegó en el onboarding.
--
-- Privacidad
-- - El `install_id` sigue siendo aleatorio. Lo único que lo une a una
--   persona es el alias que escribe el administrador en `analytics_testers`:
--   usa un alias (no el nombre completo) y pide permiso al tester.
-- - Cada tester encuentra el inicio de su `install_id` en la app:
--   Configuración › Ayuda › «Enviar estadísticas ahora».

-- ── Testers ────────────────────────────────────────────────────────────

create table if not exists public.analytics_testers (
  install_id     uuid primary key,
  alias          text not null default '',
  is_tester      boolean not null default true,
  cohort         text,            -- grupo de prueba, p. ej. «Prueba 1»
  test_start     date,            -- día 1 de su prueba; null = su primer día en la app
  age            integer check (age is null or age between 10 and 100),
  gender         text,            -- 'f', 'm', 'otro'
  iphone         text,            -- si se deja vacío, el panel usa el modelo que manda la app
  persona        text,            -- tipo de user persona
  notes          text,
  -- Encuesta y entrevista. Null = todavía no respondió.
  s_min_before   numeric,         -- minutos por semana revisando gastos, al empezar
  s_min_after    numeric,         -- lo mismo, el día 14
  s_matches      boolean,         -- los gastos de la app cuadran con los suyos
  s_tool_before  text,            -- qué usaba antes (Excel, cuaderno, app del banco, nada…)
  s_tool_after   text,            -- qué usa ahora
  s_replaced     boolean,         -- dejó su herramienta por AlTanto
  s_pay          text,            -- 'si', 'tal_vez', 'no'
  s_pay_amount   numeric,         -- cuánto pagaría al mes (S/)
  s_fatal        text,            -- si la app dejara de existir: 'muy', 'algo', 'nada'
  s_recommended  boolean,         -- habló de la app o la recomendó
  updated_at     timestamptz not null default now()
);

alter table public.analytics_testers enable row level security;
revoke all on public.analytics_testers from anon, authenticated;
grant select, insert, update, delete on public.analytics_testers to authenticated;

drop policy if exists analytics_testers_admin_all on public.analytics_testers;
create policy analytics_testers_admin_all on public.analytics_testers
  for all to authenticated
  using ((select public.analytics_is_admin()))
  with check ((select public.analytics_is_admin()));

-- ── Audiencia ──────────────────────────────────────────────────────────

-- `testers`, `others` o `all`, según el encabezado `x-audience` de la
-- petición. Fuera de PostgREST (editor SQL) no hay encabezados: `all`.
create or replace function public.analytics_audience()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-audience', 'all');
$$;

create or replace function public.analytics_in_audience(p_install uuid)
returns boolean
language sql
stable
as $$
  select case public.analytics_audience()
           when 'testers' then exists (select 1 from public.analytics_testers t
                                       where t.install_id = p_install and t.is_tester)
           when 'others'  then not exists (select 1 from public.analytics_testers t
                                           where t.install_id = p_install and t.is_tester)
           else true
         end;
$$;

grant execute on function public.analytics_audience() to authenticated, service_role;
grant execute on function public.analytics_in_audience(uuid) to authenticated, service_role;

-- Base: la misma de v16 (sin `debug`, con día y semana de Lima), ahora
-- también con la audiencia. Mismas columnas, así que las vistas que
-- dependen de ella no cambian.
create or replace view public.analytics_ev
with (security_invoker = true) as
select e.*,
       (e.occurred_at at time zone 'America/Lima')                          as local_ts,
       (e.occurred_at at time zone 'America/Lima')::date                    as day,
       date_trunc('week',  e.occurred_at at time zone 'America/Lima')::date as week,
       date_trunc('month', e.occurred_at at time zone 'America/Lima')::date as month
from public.analytics_events e
where e.channel <> 'debug'
  and public.analytics_in_audience(e.install_id);

-- Las cuatro de v16 que cuentan desde `analytics_installs`: iguales, con
-- la audiencia.
create or replace view public.analytics_new_installs_daily
with (security_invoker = true) as
select (first_seen at time zone 'America/Lima')::date as day,
       count(*)                                    as installs,
       count(*) filter (where not preexisting)     as new_users,
       count(*) filter (where preexisting)         as existing_users_updated
from public.analytics_installs
where channel <> 'debug' and public.analytics_in_audience(install_id)
group by 1;

create or replace view public.analytics_feature_discovery
with (security_invoker = true) as
with total as (
  select count(*)::numeric as installs
  from public.analytics_installs
  where channel <> 'debug' and public.analytics_in_audience(install_id)
)
select props ->> 'feature'                                          as feature,
       count(distinct install_id)                                   as installs,
       round(100 * count(distinct install_id) / nullif((select installs from total), 0), 1) as pct_of_installs,
       percentile_cont(0.5) within group
         (order by public.analytics_num(props, 'days_since_install')) as median_days_to_discover
from public.analytics_ev
where event = 'feature_first_use'
group by props ->> 'feature';

create or replace view public.analytics_activation_milestones
with (security_invoker = true) as
with total as (
  select count(*)::numeric as installs
  from public.analytics_installs
  where channel <> 'debug' and not preexisting and public.analytics_in_audience(install_id)
)
select e.props ->> 'name'                                              as milestone,
       count(distinct e.install_id)                                    as installs,
       round(100 * count(distinct e.install_id) / nullif((select installs from total), 0), 1) as pct_of_new_installs,
       percentile_cont(0.5) within group
         (order by public.analytics_num(e.props, 'hours_since_install')) as median_hours
from public.analytics_ev e
join public.analytics_installs i on i.install_id = e.install_id
where e.event = 'milestone' and not i.preexisting
group by 1;

create or replace view public.analytics_retention_cohorts
with (security_invoker = true) as
with installs as (
  select install_id,
         (first_seen at time zone 'America/Lima')::date as first_day
  from public.analytics_installs
  where channel <> 'debug' and not preexisting and public.analytics_in_audience(install_id)
), flags as (
  select i.install_id, i.first_day,
         bool_or(e.day - i.first_day = 1)                    as d1,
         bool_or(e.day - i.first_day between 7 and 13)       as d7,
         bool_or(e.day - i.first_day between 30 and 59)      as d30
  from installs i
  left join public.analytics_ev e on e.install_id = i.install_id
  group by i.install_id, i.first_day
)
select date_trunc('week', first_day)::date as cohort_week,
       count(*) as installs,
       case when max(first_day) <= current_date - 1 then
         round(100.0 * count(*) filter (where d1) / count(*), 1) end  as d1_pct,
       case when max(first_day) <= current_date - 13 then
         round(100.0 * count(*) filter (where d7) / count(*), 1) end  as d7_pct,
       case when max(first_day) <= current_date - 59 then
         round(100.0 * count(*) filter (where d30) / count(*), 1) end as d30_pct
from flags
group by 1;

-- ── Por instalación y día ──────────────────────────────────────────────
-- Lo que miden las hipótesis, persona por persona. El panel la pide sin
-- `x-audience` y separa testers del resto él mismo.
--
-- action_sessions (H0, «registra o revisa»): sesiones con un movimiento
--   creado o clasificado, una regla, un cambio de periodo, o una pantalla de
--   Resumen, Movimientos o detalle mirada 5 s o más.
-- value_actions (H3, «abrir no cuenta»): crear, clasificar o confirmar
--   movimientos, reglas, sugerencias aceptadas, suscripciones respondidas,
--   metas, y el uso de funciones (sin ocultar montos, Face ID, temas,
--   widgets ni el toque largo del micrófono), Metas o el asistente.
-- card_*: consumos con tarjeta = gastos del correo con comercio que no son
--   a una persona (Yape, Plin, transferencias). card_auto llegó con
--   categoría; card_corrected es lo que el usuario cambió después de un
--   motor automático.
-- goals_created cuenta el evento `goal_created` cuando la app lo mande;
--   mientras tanto, goals_views (visitas a Metas) sirve de aproximación.
create or replace view public.analytics_install_daily
with (security_invoker = true) as
select e.install_id,
       e.day,
       max(e.channel)                                         as channel,
       max(e.app_version)                                     as app_version,
       count(*)                                               as events,
       count(distinct e.session_id)                           as sessions,
       count(*) filter (where e.event = 'app_open')           as opens,
       count(distinct e.session_id) filter (where
           e.event in ('movement_created', 'movement_classified', 'classification_confirmed',
                       'rule_created', 'period_change')
        or (e.event = 'screen_view'
            and coalesce(e.props ->> 'cont', 'false') <> 'true'
            and coalesce(public.analytics_num(e.props, 'seconds'), 0) >= 5
            and (e.props ->> 'screen' like 'summary%'
                 or e.props ->> 'screen' like 'movements%'
                 or e.props ->> 'screen' in ('category_detail', 'expense_detail', 'income_detail',
                                             'stat_sheet', 'add_movement')))
       )                                                      as action_sessions,
       count(*) filter (where
           e.event in ('movement_created', 'movement_classified', 'classification_confirmed',
                       'rule_created', 'suggestion_accepted', 'subscription_detection', 'goal_created')
        or (e.event = 'feature_used'
            and coalesce(e.props ->> 'feature', '') not in ('hide_amounts', 'app_lock', 'pro_theme',
                                                             'widget', 'mic_hold'))
        or (e.event = 'screen_view'
            and coalesce(e.props ->> 'cont', 'false') <> 'true'
            and e.props ->> 'screen' in ('goals', 'assistant'))
       )                                                      as value_actions,
       count(*) filter (where e.event = 'movement_created')   as movements_created,
       coalesce(sum(public.analytics_num(e.props, 'count'))
                filter (where e.event = 'movement_classified'), 0) as classified,
       coalesce(sum(public.analytics_num(e.props, 'count'))
                filter (where e.event = 'rule_created'), 0)   as rules,
       count(*) filter (where e.event = 'email_parse'
                          and e.props ->> 'kind' = 'expense'
                          and e.props ->> 'result' = 'inserted') as email_movements,
       count(*) filter (where e.event = 'email_parse'
                          and e.props ->> 'kind' = 'expense'
                          and e.props ->> 'result' = 'inserted'
                          and coalesce(e.props ->> 'reversal', 'false') <> 'true'
                          and e.props ->> 'merchant' is not null
                          and e.props ->> 'merchant' not like '%persona') as card_movements,
       count(*) filter (where e.event = 'email_parse'
                          and e.props ->> 'kind' = 'expense'
                          and e.props ->> 'result' = 'inserted'
                          and coalesce(e.props ->> 'reversal', 'false') <> 'true'
                          and e.props ->> 'merchant' is not null
                          and e.props ->> 'merchant' not like '%persona'
                          and coalesce(e.props ->> 'auto', 'none') <> 'none') as card_auto,
       coalesce(sum(public.analytics_num(e.props, 'count'))
                filter (where e.event = 'merchant_classified'
                          and e.props ->> 'reclassified' = 'true'
                          and e.props ->> 'engine' is not null
                          and e.props ->> 'merchant' not like '%persona'), 0) as card_corrected,
       count(*) filter (where e.event = 'account_connected'
                           or (e.event = 'onboarding_step' and e.props ->> 'step' = 'connected')) as connected,
       count(*) filter (where e.event = 'onboarding_completed'
                           or (e.event = 'onboarding_step' and e.props ->> 'step' = 'finished')) as onboarding_finished,
       count(*) filter (where e.event = 'goal_created')       as goals_created,
       count(*) filter (where (e.event = 'screen_view' and e.props ->> 'screen' = 'goals')
                           or (e.event = 'tab_select' and e.props ->> 'tab' = 'goals')) as goals_views,
       count(*) filter (where e.event = 'feature_used' and e.props ->> 'feature' = 'invite') as invites,
       count(*) filter (where e.event = 'feature_used' and e.props ->> 'feature' = 'assistant') as assistant,
       count(*) filter (where e.event = 'metrickit_diagnostic' and e.props ->> 'kind' = 'crash') as crashes,
       count(*) filter (where e.event = 'app_error')          as errors,
       round(coalesce(sum(public.analytics_num(e.props, 'seconds'))
                      filter (where e.event = 'screen_view'), 0) / 60.0, 1) as minutes
from public.analytics_ev e
group by e.install_id, e.day;

-- ── Por instalación ────────────────────────────────────────────────────
create or replace view public.analytics_install_profile
with (security_invoker = true) as
with steps(step, step_order) as (
  values ('slide_1', 1), ('slide_2', 2), ('slide_3', 3), ('login', 4),
         ('connect_tapped', 5), ('connected', 6), ('restore_offered', 7),
         ('history', 8), ('reading', 9), ('no_account', 10), ('finished', 11)
), onb as (
  select e.install_id,
         max(s.step_order)                                    as onboarding_step_order,
         (array_agg(s.step order by s.step_order desc))[1]    as onboarding_last_step
  from public.analytics_ev e
  join steps s on s.step = e.props ->> 'step'
  where e.event = 'onboarding_step'
  group by e.install_id
)
select i.install_id,
       (i.first_seen at time zone 'America/Lima')::date as first_day,
       (i.last_seen  at time zone 'America/Lima')::date as last_day,
       i.first_version, i.last_version, i.channel, i.device, i.os, i.preexisting,
       o.onboarding_step_order, o.onboarding_last_step
from public.analytics_installs i
left join onb o on o.install_id = i.install_id
where i.channel <> 'debug' and public.analytics_in_audience(i.install_id);

-- ── Permisos de las vistas ─────────────────────────────────────────────

do $$
declare
  v record;
begin
  for v in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' and c.relname like 'analytics\_%'
  loop
    execute format('revoke all on public.%I from anon', v.relname);
    execute format('grant select on public.%I to authenticated, service_role', v.relname);
  end loop;
end $$;
