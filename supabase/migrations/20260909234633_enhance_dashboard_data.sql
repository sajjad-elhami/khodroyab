create or replace function public.get_dashboard_data(
  p_vehicle_limit integer default 20
)
returns jsonb
language sql
stable
set search_path to 'pg_catalog, public'
as $function$

with current_profile as (
  select
    p.id,
    p.dealership_id,
    p.role,
    d.name as dealership_name
  from public.profiles p
  left join public.dealerships d
    on d.id = p.dealership_id
  where p.id = (select auth.uid())
),

vehicle_rows as (
  select
    v.id,
    v.dealership_id,
    v.brand,
    v.model,
    v.trim,
    v.model_year,
    v.mileage,
    v.color,
    v.price,
    v.status,
    v.created_at,
    d.name as dealership_name,
    d.city_id,
    c.name as city_name,
    d.province_id,
    p.name as province_name
  from public.vehicles v
  left join public.dealerships d
    on d.id = v.dealership_id
  left join public.cities c
    on c.id = d.city_id
  left join public.provinces p
    on p.id = d.province_id
  order by v.created_at desc, v.id desc
  limit greatest(0, least(coalesce(p_vehicle_limit, 20), 50))
),

first_image_rows as (
  select distinct on (vi.vehicle_id)
    vi.vehicle_id,
    vi.storage_path,
    vi.thumbnail_path,
    vi.sort_order
  from public.vehicle_images vi
  join vehicle_rows vr
    on vr.id = vi.vehicle_id
  order by vi.vehicle_id, vi.sort_order asc, vi.id asc
),

favorite_rows as (
  select vf.vehicle_id
  from public.vehicle_favorites vf
  join vehicle_rows vr
    on vr.id = vf.vehicle_id
  where vf.user_id = (select auth.uid())
),

stats as (
  select
    count(*)::integer as total_vehicle_count,
    count(*) filter (
      where v.status = 'available'
    )::integer as available_vehicle_count,
    count(*) filter (
      where v.dealership_id = (select dealership_id from current_profile)
    )::integer as my_vehicle_count,
    count(*) filter (
      where v.dealership_id = (select dealership_id from current_profile)
        and v.status = 'available'
    )::integer as my_available_vehicle_count
  from public.vehicles v
),

network_stats as (
  select
    count(*)::integer as dealership_count
  from public.dealerships
  where is_active = true
),

user_stats as (
  select
    count(*)::integer as user_count
  from public.profiles
)

select jsonb_build_object(
  'current_user_id', (select id from current_profile),
  'role', (select role from current_profile),
  'dealership_id', (select dealership_id from current_profile),
  'dealership_name', (select dealership_name from current_profile),

  'vehicles',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(vr)
          order by vr.created_at desc, vr.id desc
        )
        from vehicle_rows vr
      ),
      '[]'::jsonb
    ),

  'images',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(ir)
          order by ir.vehicle_id
        )
        from first_image_rows ir
      ),
      '[]'::jsonb
    ),

  'favorite_vehicle_ids',
    coalesce(
      (
        select jsonb_agg(fr.vehicle_id)
        from favorite_rows fr
      ),
      '[]'::jsonb
    ),

  'stats',
    jsonb_build_object(
      'total_vehicle_count',
        (select total_vehicle_count from stats),
      'available_vehicle_count',
        (select available_vehicle_count from stats),
      'my_vehicle_count',
        (select my_vehicle_count from stats),
      'my_available_vehicle_count',
        (select my_available_vehicle_count from stats),
      'favorite_count',
        (
          select count(*)::integer
          from public.vehicle_favorites
          where user_id = (select auth.uid())
        ),
      'dealership_count',
        (select dealership_count from network_stats),
      'user_count',
        (select user_count from user_stats)
    )
);

$function$;
