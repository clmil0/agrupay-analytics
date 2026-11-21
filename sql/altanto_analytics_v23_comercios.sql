-- ============================================================
-- AlTanto · Analítica de uso v23: monitoreo de comercios
-- ============================================================
-- Corre esto DESPUÉS de v22, en el proyecto de analítica
-- (`Agrupay_Analytics`). Idempotente: se puede volver a correr entero.
--
-- Qué añade
-- 1. Cadenas: el banco escribe el mismo comercio de muchas formas
--    («037 PVEA JOCKEY», «048 PVEA HIGUERETA»…). `analytics_merchant_chain`
--    quita el número de tienda y el procesador de pago («PAG*», «PYU*»…) y
--    busca la cadena en `analytics_merchant_chains`, una tabla de patrones que
--    el equipo puede ampliar desde el editor SQL o el Table Editor.
-- 2. `analytics_merchant_person_daily`: una fila por instalación, día y
--    comercio con lo que llegó del correo (con o sin categoría, y qué motor la
--    puso) y lo que la persona clasificó o cambió después. Sin pagos a
--    personas (Yape, Plin, transferencias) ni retiros. El panel la pide sin
--    `x-audience` y separa testers del resto él mismo.
-- 3. `analytics_install_profile` suma `login_email`, el correo con el que la
--    persona entra a la app (lo mandan las versiones nuevas). Sólo lo ven los
--    administradores, como todo lo demás.

-- ── Cadenas ────────────────────────────────────────────────────────────

create table if not exists public.analytics_merchant_chains (
  pattern text primary key,   -- expresión regular, sin distinguir mayúsculas, sobre el nombre ya limpio
  chain   text not null,      -- nombre de la cadena que se muestra en el panel
  note    text
);

alter table public.analytics_merchant_chains enable row level security;
revoke all on public.analytics_merchant_chains from anon, authenticated;
grant select, insert, update, delete on public.analytics_merchant_chains to authenticated;

drop policy if exists analytics_merchant_chains_admin_all on public.analytics_merchant_chains;
create policy analytics_merchant_chains_admin_all on public.analytics_merchant_chains
  for all to authenticated
  using ((select public.analytics_is_admin()))
  with check ((select public.analytics_is_admin()));

-- Si dos patrones coinciden, gana el más largo («UBER ?EATS» antes que «UBER»).
insert into public.analytics_merchant_chains (pattern, chain) values
  ('^PVEA|PLAZA ?VEA', 'PLAZA VEA'), ('TAMBO', 'TAMBO'), ('^MASS\M', 'MASS'), ('WONG', 'WONG'),
  ('^METRO\M|CENCOSUD ?METRO', 'METRO'), ('TOTTUS', 'TOTTUS'), ('OXXO', 'OXXO'), ('MAKRO', 'MAKRO'),
  ('VIVANDA', 'VIVANDA'), ('LISTO\M', 'LISTO'), ('REPSHOP|REPSOL SHOP', 'REPSHOP'),
  ('INKAFARMA', 'INKAFARMA'), ('MIFARMA', 'MIFARMA'), ('BOTICAS? ?Y ?SALUD', 'BOTICAS Y SALUD'),
  ('RAPPI', 'RAPPI'), ('PEDIDOS ?YA', 'PEDIDOSYA'), ('UBER ?EATS', 'UBER EATS'), ('UBER', 'UBER'),
  ('DIDI', 'DIDI'), ('CABIFY', 'CABIFY'), ('INDRIVE', 'INDRIVE'),
  ('STARBUCKS', 'STARBUCKS'), ('^KFC|KENTUCKY', 'KFC'), ('BEMBOS', 'BEMBOS'), ('PAPA ?JOHN', 'PAPA JOHNS'),
  ('PIZZA ?HUT', 'PIZZA HUT'), ('MC ?DONALD', 'MCDONALDS'), ('BURGER ?KING', 'BURGER KING'),
  ('POPEYES', 'POPEYES'), ('CHINAWOK|CHINA WOK', 'CHINAWOK'), ('NORKY', 'NORKYS'), ('PARDOS', 'PARDOS CHICKEN'),
  ('PRIMAX', 'PRIMAX'), ('^REPSOL', 'REPSOL'), ('PECSA', 'PECSA'), ('PETRO ?PERU', 'PETROPERU'),
  ('NETFLIX', 'NETFLIX'), ('SPOTIFY', 'SPOTIFY'), ('APPLE|ICLOUD|ITUNES', 'APPLE'), ('GOOGLE|YOUTUBE', 'GOOGLE'),
  ('AMAZON|AMZN|PRIME ?VIDEO', 'AMAZON'), ('DISNEY', 'DISNEY+'), ('HBO|^MAX\M', 'MAX'), ('CHATGPT|OPENAI', 'OPENAI'),
  ('MOVISTAR|TELEFONICA', 'MOVISTAR'), ('CLARO', 'CLARO'), ('ENTEL', 'ENTEL'), ('BITEL', 'BITEL'),
  ('SODIMAC', 'SODIMAC'), ('PROMART', 'PROMART'), ('SAGA|FALABELLA', 'FALABELLA'), ('RIPLEY', 'RIPLEY'),
  ('OECHSLE', 'OECHSLE'), ('ZARA', 'ZARA'), ('CINEPLANET', 'CINEPLANET'), ('CINEMARK', 'CINEMARK'),
  ('SMART ?FIT', 'SMART FIT'), ('MERCADO ?PAGO', 'MERCADO PAGO'), ('SUNAT', 'SUNAT'), ('SUNARP', 'SUNARP'),
  ('PAGALO', 'PAGALO.PE'), ('SEDAPAL', 'SEDAPAL'), ('LUZ DEL SUR', 'LUZ DEL SUR'), ('^ENEL', 'ENEL'),
  ('CALIDDA', 'CALIDDA'), ('VENDOMATICA', 'VENDOMATICA'), ('PROBOCA', 'PROBOCA'), ('BETANO', 'BETANO')
on conflict (pattern) do nothing;

-- El nombre sin número de tienda, sin procesador de pago y sin espacios de más.
create or replace function public.analytics_merchant_clean(p_raw text)
returns text
language sql
immutable
as $$
  select nullif(btrim(regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(upper(coalesce(p_raw, '')), '^[0-9]{1,4}\s+', ''),
               '^(PAG|PYU|DLC|OPENPAY|MDOPAGO|MERPAGO|MP|IZI|IZIPAY|NIUBIZ|PAYU|CULQI|DLOCAL|SUMUP|VENDEMAS|PP|SQ|EBANX|KUSHKI|OKT)\s*\*\s*', ''),
             '^[0-9]{1,4}\s+', ''),
           '\s+', ' ', 'g')), '');
$$;

create or replace function public.analytics_merchant_chain(p_raw text)
returns text
language sql
stable
as $$
  select coalesce(
    (select c.chain
       from public.analytics_merchant_chains c
      where public.analytics_merchant_clean(p_raw) ~* c.pattern
      order by length(c.pattern) desc
      limit 1),
    public.analytics_merchant_clean(p_raw));
$$;

grant execute on function public.analytics_merchant_clean(text) to authenticated, service_role;
grant execute on function public.analytics_merchant_chain(text) to authenticated, service_role;

-- ── Por persona, día y comercio ────────────────────────────────────────
-- source: `auto` (llegó con categoría), `arrived` (llegó sin categoría),
--   `manual` (la persona lo sacó de Pendientes), `reclassified` (le cambió
--   una categoría que ya tenía).
-- engine: en `auto`, el motor que la puso; en `reclassified`, el motor que
--   había puesto la que se corrigió (null = la había puesto la persona).
create or replace view public.analytics_merchant_person_daily
with (security_invoker = true) as
with base as (
  select e.install_id, e.day, e.props ->> 'merchant' as merchant,
         case when coalesce(e.props ->> 'auto', 'none') = 'none' then 'arrived' else 'auto' end as source,
         nullif(e.props ->> 'auto', 'none') as engine,
         'sin_clasificar'::text as from_category,
         e.props ->> 'category' as to_category,
         count(*)::int as movements,
         0 as rules
  from public.analytics_ev e
  where e.event = 'email_parse'
    and e.props ->> 'kind' = 'expense'
    and e.props ->> 'result' = 'inserted'
    and coalesce(e.props ->> 'reversal', 'false') <> 'true'
    and e.props ? 'merchant'
  group by 1, 2, 3, 4, 5, 6, 7
  union all
  select e.install_id, e.day, e.props ->> 'merchant',
         case when (e.props ->> 'reclassified')::boolean then 'reclassified' else 'manual' end,
         e.props ->> 'engine',
         e.props ->> 'from',
         e.props ->> 'to',
         coalesce(sum(public.analytics_num(e.props, 'count')), count(*))::int,
         count(*) filter (where e.props ->> 'rule_created' = 'true')::int
  from public.analytics_ev e
  where e.event = 'merchant_classified'
    and e.props ? 'merchant'
  group by 1, 2, 3, 4, 5, 6, 7
)
select b.install_id, b.day, b.merchant, public.analytics_merchant_chain(b.merchant) as chain,
       b.source, b.engine, b.from_category, b.to_category, b.movements, b.rules
from base b
where b.merchant not like '%persona' and b.merchant <> 'retiro';

-- ── Perfil con correo ──────────────────────────────────────────────────
-- La misma de v22, más `login_email` al final.
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
       o.onboarding_step_order, o.onboarding_last_step,
       nullif(lower(btrim(i.login_email)), '') as login_email
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
