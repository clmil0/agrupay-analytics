-- ============================================================
-- AlTanto · Analítica de uso v24: filtro por personas
-- ============================================================
-- Corre esto DESPUÉS de v22 (y v23), en el proyecto de analítica
-- (`Agrupay_Analytics`). Idempotente: se puede volver a correr entero.
--
-- Además de `testers` y `others`, la audiencia acepta `ids`: el panel manda
-- `x-audience: ids` y, en `x-audience-ids`, los install_id elegidos separados
-- por comas. Así cualquier sección se puede ver para una persona o para
-- varias, elegidas por su ID o su correo. Lo que no parezca un UUID se ignora.

create or replace function public.analytics_audience_ids()
returns uuid[]
language sql
stable
as $$
  select coalesce(array_agg(btrim(x)::uuid), '{}')
  from unnest(string_to_array(
         nullif(current_setting('request.headers', true), '')::json ->> 'x-audience-ids', ',')) as x
  where btrim(x) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
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
           when 'ids'     then p_install = any (public.analytics_audience_ids())
           else true
         end;
$$;

grant execute on function public.analytics_audience_ids() to authenticated, service_role;
grant execute on function public.analytics_in_audience(uuid) to authenticated, service_role;
