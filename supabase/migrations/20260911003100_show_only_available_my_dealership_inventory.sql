create or replace function public.get_my_dealership_inventory(p_limit integer default 30, p_offset integer default 0)
returns jsonb
language sql
stable
as $$
  with ctx as (
    select
      p.id as user_id,
      p.role,
      p.dealership_id,
      d.name as dealership_name
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
      d.name as dealership_name,
      (
        select coalesce(vi.thumbnail_path, vi.storage_path)
        from public.vehicle_images vi
        where vi.vehicle_id = v.id
        order by vi.sort_order asc, vi.created_at asc
        limit 1
      ) as image_path
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
    'total_count', counts.total_count,
    'vehicles', coalesce((select jsonb_agg(to_jsonb(paged) order by paged.created_at desc, paged.id desc) from paged), '[]'::jsonb)
  )
  from ctx, counts;
$$;
