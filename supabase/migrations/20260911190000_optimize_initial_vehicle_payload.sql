-- Initial vehicles bootstrap now returns only one image per vehicle and
-- pre-aggregated inspection summaries. Search RPC behavior remains unchanged.
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
language sql stable
set search_path to 'pg_catalog, public'
as $$
with current_user_row as (select (select auth.uid()) as id),
profile_row as (select p.dealership_id, p.role from public.profiles p where p.id=(select id from current_user_row)),
inventory_stats as (
  select count(*)::integer total_available,
    count(*) filter (where v.inventory_confirmed_at >= ((date_trunc('day',now() at time zone 'Asia/Tehran')+interval '7 hours') at time zone 'Asia/Tehran'))::integer confirmed_today
  from public.vehicles v cross join profile_row pr
  where pr.role <> 'admin' and pr.dealership_id is not null and v.dealership_id=pr.dealership_id and v.status='available'
),
gate as (
  select case when coalesce((select role from profile_row),'')='admin' then false when (select dealership_id from profile_row) is null then false when (now() at time zone 'Asia/Tehran') < date_trunc('day',now() at time zone 'Asia/Tehran')+interval '7 hours' then false else coalesce((select total_available from inventory_stats),0)>0 and coalesce((select confirmed_today from inventory_stats),0)<coalesce((select total_available from inventory_stats),0) end requires_update,
    case when coalesce((select role from profile_row),'')='admin' or (select dealership_id from profile_row) is null then 0 else coalesce((select total_available from inventory_stats),0) end total_available,
    case when coalesce((select role from profile_row),'')='admin' then 0 when (select dealership_id from profile_row) is null then 0 when (now() at time zone 'Asia/Tehran') < date_trunc('day',now() at time zone 'Asia/Tehran')+interval '7 hours' then coalesce((select total_available from inventory_stats),0) else coalesce((select confirmed_today from inventory_stats),0) end confirmed_today
),
search_rows as (
  select * from public.search_vehicles_multi(p_search,p_brand,p_model,p_year_from,p_year_to,p_price_from,p_price_to,p_mileage_from,p_mileage_to,p_color,p_status,p_province_id,p_city_ids,p_dealership_id,p_sort,p_limit,p_offset,p_chassis_condition,p_body_condition,p_origin,p_fuel_type,p_transmission)
  where not (select requires_update from gate)
),
first_images as (
  select distinct on (vi.vehicle_id) vi.vehicle_id,vi.storage_path,vi.thumbnail_path,vi.sort_order
  from public.vehicle_images vi join (select id from search_rows) sr on sr.id=vi.vehicle_id
  order by vi.vehicle_id,vi.sort_order asc,vi.id asc
),
inspection_aggregates as (
  select vbi.vehicle_id,
    count(*) filter (where vbi.condition <> 'intact')::integer affected_count,
    count(*) filter (where vbi.condition <> 'intact' and vbi.part_code in ('hood','front_left_fender','front_right_fender','rear_left_fender','rear_right_fender','front_left_door','front_right_door','rear_left_door','rear_right_door','trunk','roof','front_bumper','rear_bumper'))::integer body_affected_count,
    count(*) filter (where vbi.condition <> 'intact' and vbi.part_code in ('front_left_chassis','front_right_chassis','rear_left_chassis','rear_right_chassis','front_left_pillar','front_right_pillar','rear_left_pillar','rear_right_pillar','floor','roof_structure'))::integer structure_affected_count
  from public.vehicle_body_inspections vbi join (select id from search_rows) sr on sr.id=vbi.vehicle_id
  group by vbi.vehicle_id
),
condition_aggregates as (
  select x.vehicle_id,jsonb_object_agg(x.condition,x.condition_count order by x.condition) condition_counts
  from (select vbi.vehicle_id,vbi.condition,count(*)::integer condition_count from public.vehicle_body_inspections vbi join (select id from search_rows) sr on sr.id=vbi.vehicle_id where vbi.condition <> 'intact' group by vbi.vehicle_id,vbi.condition) x
  group by x.vehicle_id
),
inspection_summaries as (
  select sr.id vehicle_id,coalesce(ia.affected_count,0) affected_count,coalesce(ia.body_affected_count,0) body_affected_count,coalesce(ia.structure_affected_count,0) structure_affected_count,coalesce(ca.condition_counts,'{}'::jsonb) condition_counts
  from search_rows sr left join inspection_aggregates ia on ia.vehicle_id=sr.id left join condition_aggregates ca on ca.vehicle_id=sr.id
),
search_data as (
  select jsonb_build_object('vehicles',coalesce((select jsonb_agg(to_jsonb(sr) order by sr.created_at desc,sr.id desc) from search_rows sr),'[]'::jsonb),'images',coalesce((select jsonb_agg(to_jsonb(fi) order by fi.vehicle_id,fi.sort_order) from first_images fi),'[]'::jsonb),'inspection_summaries',coalesce((select jsonb_object_agg(isum.vehicle_id,jsonb_build_object('affectedCount',isum.affected_count,'bodyAffectedCount',isum.body_affected_count,'structureAffectedCount',isum.structure_affected_count,'conditionCounts',isum.condition_counts)) from inspection_summaries isum),'{}'::jsonb),'total_count',coalesce((select max(sr.total_count) from search_rows sr),0)) value
),
province_rows as (select p.id,p.name from public.provinces p order by p.name asc),
dealership_rows as (select d.id,d.name,d.province_id,d.city_id from public.dealerships d where d.is_active=true order by d.name asc),
favorite_rows as (select vf.vehicle_id from public.vehicle_favorites vf where vf.user_id=(select id from current_user_row)),
listing_count as (select count(*)::integer value from public.vehicles)
select jsonb_build_object('search',(select value from search_data),'user_id',(select id from current_user_row),'profile',coalesce((select to_jsonb(p) from profile_row p),'null'::jsonb),'provinces',coalesce((select jsonb_agg(to_jsonb(p) order by p.name) from province_rows p),'[]'::jsonb),'dealerships',coalesce((select jsonb_agg(to_jsonb(d) order by d.name) from dealership_rows d),'[]'::jsonb),'favorite_vehicle_ids',coalesce((select jsonb_agg(f.vehicle_id order by f.vehicle_id) from favorite_rows f),'[]'::jsonb),'all_listings_count',(select value from listing_count),'inventory_gate',jsonb_build_object('requires_update',(select requires_update from gate),'total_available',(select total_available from gate),'confirmed_today',(select confirmed_today from gate)));
$$;
