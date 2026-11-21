-- ============================================================
-- AlTanto · Analítica de uso v25: bitácora
-- ============================================================
-- Corre esto DESPUÉS de v22, en el proyecto de analítica
-- (`Agrupay_Analytics`). Idempotente: se puede volver a correr entero.
--
-- Qué añade
-- 1. `analytics_milestones`: los hitos que el equipo anota en la sección
--    Bitácora (inicio de un grupo de testers, una conversación con ellos,
--    una encuesta, un cambio en la app…). Sólo los administradores la leen
--    y la escriben. `created_by` se llena solo con el correo de quien anota.
-- 2. `analytics_app_releases`: cada versión de la app por canal (TestFlight
--    o App Store) con el primer día en que alguien la usó. El panel la pone
--    sola en la bitácora como «versión publicada», sin que nadie la anote.

create table if not exists public.analytics_milestones (
  id          uuid primary key default gen_random_uuid(),
  day         date not null,
  end_day     date,                 -- para algo que dura varios días (una ronda de entrevistas)
  kind        text not null default 'other',
  title       text not null,
  notes       text,
  cohort      text,                 -- grupo de testers al que se refiere, si aplica
  version     text,                 -- versión de la app a la que se refiere, si aplica
  link        text,                 -- Miro, Notion, Drive, el PR…
  created_by  text default (auth.jwt() ->> 'email'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_day is null or end_day >= day),
  check (char_length(title) between 1 and 200)
);

alter table public.analytics_milestones enable row level security;
revoke all on public.analytics_milestones from anon, authenticated;
grant select, insert, update, delete on public.analytics_milestones to authenticated;

drop policy if exists analytics_milestones_admin_all on public.analytics_milestones;
create policy analytics_milestones_admin_all on public.analytics_milestones
  for all to authenticated
  using ((select public.analytics_is_admin()))
  with check ((select public.analytics_is_admin()));

-- Primer y último día de cada versión por canal. Lee `analytics_events`
-- directo a propósito: una versión sale para todos, así que no cambia con
-- el filtro de audiencia. Los builds de Xcode (development) no cuentan.
create or replace view public.analytics_app_releases
with (security_invoker = true) as
select e.app_version                                          as version,
       e.channel,
       (min(e.occurred_at) at time zone 'America/Lima')::date as first_day,
       (max(e.occurred_at) at time zone 'America/Lima')::date as last_day,
       count(distinct e.install_id)                           as installs
from public.analytics_events e
where e.channel in ('testflight', 'appstore')
  and nullif(e.app_version, '') is not null
group by e.app_version, e.channel;

revoke all on public.analytics_app_releases from anon;
grant select on public.analytics_app_releases to authenticated, service_role;
