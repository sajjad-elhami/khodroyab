create or replace function public.get_dealership_detail_page_data(
  p_dealership_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'dealership',
    to_jsonb(d),
    'province_name',
    p.name,
    'city_name',
    c.name
  )
  from public.dealerships d
  left join public.provinces p
    on p.id = d.province_id
  left join public.cities c
    on c.id = d.city_id
  where d.id = p_dealership_id;
$$;

revoke all on function public.get_dealership_detail_page_data(uuid) from public;
grant execute on function public.get_dealership_detail_page_data(uuid) to authenticated;
