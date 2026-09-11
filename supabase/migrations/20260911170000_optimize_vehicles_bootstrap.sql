-- Keep the daily inventory gate in the same database round trip as the
-- vehicles bootstrap payload. The page can then authenticate once and make
-- one Supabase RPC request instead of auth -> gate -> data waterfalls.

create or replace function public.get_vehicles_initial_page_data(
  p_search text default null,
  p_brand text default null,
  p_model text default null,
  p_year_from integer default null,
  p_year_to integer default null,
  p_price_from bigint default null,
  p_price_to bigint default null,
  p_mileage_from integer default null,
  p_mileage_to integer default null,
  p_color text default null,
  p_status text default null,
  p_province_id uuid default null,
  p_city_ids uuid[] default '{}',
  p_dealership_id uuid default null,
  p_sort text default 'newest',
  p_limit integer default 12,
  p_offset integer default 0,
  p_chassis_condition text default null,
  p_body_condition text default null,
  p_origin text default null,
  p_fuel_type text default null,
  p_transmission text default null
)
returns jsonb
language sql
stable
set search_path to 'pg_catalog, public'
as $$
with current_user_row as (
  select (select auth.uid()) as id
),
profile_row as (
  select p.dealership_id, p.role
  from public.profiles p
  where p.id = (select id from current_user_row)
),
inventory_stats as (
  select
    count(*)::integer as total_available,
    count(*) filter (
      where v.inventory_confirmed_at >= (
        (
          date_trunc('day', now() at time zone 'Asia/Tehran') + interval '7 hours'
        ) at time zone 'Asia/Tehran'
      )
    )::integer as confirmed_today
  from public.vehicles v
  cross join profile_row pr
  where pr.role <> 'admin'
    and pr.dealership_id is not null
    and v.dealership_id = pr.dealership_id
    and v.status = 'available'
),
gate as (
  select
    case
      when coalesce((select role from profile_row), '') = 'admin' then false
      when (select dealership_id from profile_row) is null then false
      when (now() at time zone 'Asia/Tehran') < date_trunc('day', now() at time zone 'Asia/Tehran') + interval '7 hours' then false
      else coalesce((select total_available from inventory_stats), 0) > 0
        and coalesce((select confirmed_today from inventory_stats), 0) < coalesce((select total_available from inventory_stats), 0)
    end as requires_update,
    case
      when coalesce((select role from profile_row), '') = 'admin' then 0
      when (select dealership_id from profile_row) is null then 0
      else coalesce((select total_available from inventory_stats), 0)
    end as total_available,
    case
      when coalesce((select role from profile_row), '') = 'admin' then 0
      when (select dealership_id from profile_row) is null then 0
      when (now() at time zone 'Asia/Tehran') < date_trunc('day', now() at time zone 'Asia/Tehran') + interval '7 hours' then coalesce((select total_available from inventory_stats), 0)
      else coalesce((select confirmed_today from inventory_stats), 0)
    end as confirmed_today
),
search_data as (
  select case
    when (select requires_update from gate) then '{}'::jsonb
    else public.get_vehicles_search_page_data(
      p_search,
      p_brand,
      p_model,
      p_year_from,
      p_year_to,
      p_price_from,
      p_price_to,
      p_mileage_from,
      p_mileage_to,
      p_color,
      p_status,
      p_province_id,
      p_city_ids,
      p_dealership_id,
      p_sort,
      p_limit,
      p_offset,
      p_chassis_condition,
      p_body_condition,
      p_origin,
      p_fuel_type,
      p_transmission
    )
  end as value
),
province_rows as (
  select p.id, p.name
  from public.provinces p
  order by p.name asc
),
dealership_rows as (
  select d.id, d.name, d.province_id, d.city_id
  from public.dealerships d
  where d.is_active = true
  order by d.name asc
),
favorite_rows as (
  select vf.vehicle_id
  from public.vehicle_favorites vf
  where vf.user_id = (select id from current_user_row)
),
listing_count as (
  select count(*)::integer as value
  from public.vehicles v
)
select jsonb_build_object(
  'search', coalesce((select value from search_data), '{}'::jsonb),
  'user_id', (select id from current_user_row),
  'profile', coalesce((select to_jsonb(p) from profile_row p), 'null'::jsonb),
  'provinces', coalesce((select jsonb_agg(to_jsonb(p) order by p.name) from province_rows p), '[]'::jsonb),
  'dealerships', coalesce((select jsonb_agg(to_jsonb(d) order by d.name) from dealership_rows d), '[]'::jsonb),
  'favorite_vehicle_ids', coalesce((select jsonb_agg(f.vehicle_id order by f.vehicle_id) from favorite_rows f), '[]'::jsonb),
  'all_listings_count', (select value from listing_count),
  'inventory_gate', jsonb_build_object(
    'requires_update', (select requires_update from gate),
    'total_available', (select total_available from gate),
    'confirmed_today', (select confirmed_today from gate)
  )
);
$$;

create or replace function public.get_my_dealership_inventory(
  p_limit integer default 30,
  p_offset integer default 0
)
returns jsonb
language sql
stable
set search_path to 'pg_catalog, public'
as $$
with ctx as (
  select
    p.id as user_id,
    p.role,
    p.dealership_id,
    d.name as dealership_name,
    d.is_active as dealership_is_active
  from public.profiles p
  left join public.dealerships d on d.id = p.dealership_id
  where p.id = (select auth.uid())
  limit 1
),
filtered as (
  select v.*
  from public.vehicles v
  cross join ctx
  where (ctx.role = 'admin' or v.created_by = ctx.user_id)
    and v.status = 'available'
),
paged as (
  select
    v.id,
    v.dealership_id,
    v.created_by,
    v.brand,
    v.model,
    v.trim,
    v.model_year,
    v.mileage,
    v.color,
    v.body_condition,
    v.chassis_condition,
    v.price,
    v.status,
    v.created_at,
    v.updated_at,
    v.inventory_confirmed_at,
    d.name as dealership_name,
    (select coalesce(vi.thumbnail_path, vi.storage_path)
     from public.vehicle_images vi
     where vi.vehicle_id = v.id
     order by vi.sort_order asc, vi.created_at asc
     limit 1) as image_path
  from filtered v
  left join public.dealerships d on d.id = v.dealership_id
  order by v.created_at desc, v.id desc
  limit greatest(1, least(coalesce(p_limit, 30), 100))
  offset greatest(0, coalesce(p_offset, 0))
),
counts as (
  select count(*)::integer as total_count
  from filtered
)
select jsonb_build_object(
  'role', ctx.role,
  'dealership_id', ctx.dealership_id,
  'dealership_name', ctx.dealership_name,
  'dealership_is_active', ctx.dealership_is_active,
  'total_count', counts.total_count,
  'vehicles', coalesce((select jsonb_agg(to_jsonb(paged) order by paged.created_at desc, paged.id desc) from paged), '[]'::jsonb)
)
from ctx, counts;
$$;
