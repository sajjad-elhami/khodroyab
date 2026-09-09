do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vehicle_duplicate_members'
      and policyname = 'Admins can read vehicle duplicate members'
  ) then
    create policy "Admins can read vehicle duplicate members"
      on public.vehicle_duplicate_members
      for select
      to authenticated
      using ((select private.is_admin()));
  end if;
end
$$;

create or replace function public.get_market_analysis(
  p_brand text default null,
  p_model text default null,
  p_province_id uuid default null,
  p_status text default 'available'
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
with normalized as (
  select
    v.id,
    v.brand,
    v.model,
    v.trim,
    v.model_year,
    v.mileage,
    v.price,
    v.status,
    v.created_at,
    d.province_id,
    p.name as province_name,
    lower(translate(coalesce(v.brand, ''), 'يىك٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', 'ییک01234567890123456789')) as brand_key,
    lower(translate(coalesce(v.model, ''), 'يىك٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', 'ییک01234567890123456789')) as model_key
  from public.vehicles v
  join public.dealerships d on d.id = v.dealership_id
  left join public.provinces p on p.id = d.province_id
),
filtered_base as (
  select n.*, dm.group_id as duplicate_group_id
  from normalized n
  left join public.vehicle_duplicate_members dm on dm.vehicle_id = n.id
  where (
    nullif(btrim(p_brand), '') is null
    or n.brand_key = lower(translate(btrim(p_brand), 'يىك٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', 'ییک01234567890123456789'))
    or (lower(btrim(p_brand)) = 'peugeot' and n.brand_key in ('پژو', 'peugeot'))
    or (lower(btrim(p_brand)) = 'پژو' and n.brand_key in ('پژو', 'peugeot'))
  )
  and (
    nullif(btrim(p_model), '') is null
    or n.model_key = lower(translate(btrim(p_model), 'يىك٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', 'ییک01234567890123456789'))
  )
  and (p_province_id is null or n.province_id = p_province_id)
  and (nullif(btrim(p_status), '') is null or n.status = btrim(p_status))
),
filtered as (
  select *
  from (
    select
      fb.*,
      row_number() over (
        partition by fb.duplicate_group_id
        order by fb.created_at asc nulls last, fb.id
      ) as duplicate_rank
    from filtered_base fb
  ) ranked
  where duplicate_group_id is null or duplicate_rank = 1
),
price_stats as (
  select
    count(*) filter (where price is not null)::int as priced_count,
    avg(price)::numeric(20,2) as avg_price,
    min(price) as min_price,
    percentile_cont(0.25) within group (order by price) as q1_price,
    percentile_cont(0.50) within group (order by price) as median_price,
    percentile_cont(0.75) within group (order by price) as q3_price,
    max(price) as max_price
  from filtered
  where price is not null
),
year_stats as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'year', model_year,
    'count', vehicle_count,
    'avg_price', avg_price
  ) order by model_year desc), '[]'::jsonb) as data
  from (
    select model_year, count(*)::int as vehicle_count, avg(price)::numeric(20,2) as avg_price
    from filtered
    where model_year is not null and price is not null
    group by model_year
  ) y
),
trim_stats as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'trim', trim_label,
    'count', vehicle_count,
    'avg_price', avg_price
  ) order by avg_price desc nulls last), '[]'::jsonb) as data
  from (
    select coalesce(nullif(btrim(trim), ''), 'بدون تیپ') as trim_label,
           count(*)::int as vehicle_count,
           avg(price)::numeric(20,2) as avg_price
    from filtered
    where price is not null
    group by coalesce(nullif(btrim(trim), ''), 'بدون تیپ')
  ) t
),
province_stats as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'province_id', province_id,
    'province', province_name,
    'count', vehicle_count,
    'avg_price', avg_price,
    'min_price', min_price,
    'max_price', max_price
  ) order by avg_price desc nulls last), '[]'::jsonb) as data
  from (
    select province_id,
           province_name,
           count(*) filter (where price is not null)::int as vehicle_count,
           avg(price)::numeric(20,2) as avg_price,
           min(price) as min_price,
           max(price) as max_price
    from filtered
    where province_id is not null and price is not null
    group by province_id, province_name
  ) ps
)
select jsonb_build_object(
  'vehicle_count', (select count(*)::int from filtered),
  'priced_count', coalesce((select priced_count from price_stats), 0),
  'avg_price', (select avg_price from price_stats),
  'min_price', (select min_price from price_stats),
  'q1_price', (select q1_price from price_stats),
  'median_price', (select median_price from price_stats),
  'q3_price', (select q3_price from price_stats),
  'max_price', (select max_price from price_stats),
  'avg_mileage', (select avg(mileage)::numeric(20,0) from filtered where mileage is not null),
  'year_stats', (select data from year_stats),
  'trim_stats', (select data from trim_stats),
  'province_stats', (select data from province_stats)
);
$function$;

revoke all on function public.get_market_analysis(text, text, uuid, text) from public;
grant execute on function public.get_market_analysis(text, text, uuid, text) to authenticated;

create or replace function public.get_market_analysis_page_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
select jsonb_build_object(
  'provinces', coalesce((
    select jsonb_agg(
      jsonb_build_object('id', p.id, 'name', p.name)
      order by p.name
    )
    from public.provinces p
  ), '[]'::jsonb),
  'brands', coalesce((
    select jsonb_agg(
      jsonb_build_object('id', b.id, 'name_fa', b.name_fa, 'name_en', b.name_en)
      order by b.sort_order, b.name_fa
    )
    from public.vehicle_brands b
    where b.is_active = true
  ), '[]'::jsonb),
  'models', coalesce((
    select jsonb_agg(
      jsonb_build_object('id', m.id, 'brand_id', m.brand_id, 'name_fa', m.name_fa, 'name_en', m.name_en)
      order by m.sort_order, m.name_fa
    )
    from public.vehicle_models m
    where m.is_active = true
  ), '[]'::jsonb),
  'trims', coalesce((
    select jsonb_agg(
      jsonb_build_object('id', t.id, 'model_id', t.model_id, 'name_fa', t.name_fa, 'name_en', t.name_en)
      order by t.sort_order, t.name_fa
    )
    from public.vehicle_trims t
    where t.is_active = true
  ), '[]'::jsonb),
  'analysis', public.get_market_analysis(null, null, null, 'available')
);
$function$;

revoke all on function public.get_market_analysis_page_data() from public;
grant execute on function public.get_market_analysis_page_data() to authenticated;
