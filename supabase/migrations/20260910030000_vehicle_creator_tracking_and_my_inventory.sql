alter table public.vehicles
  add column if not exists created_by uuid references auth.users(id) on delete set null;

comment on column public.vehicles.created_by is 'Authenticated user who originally registered this vehicle in Khodroyab. Null is allowed for legacy vehicles created before creator tracking.';

create or replace function public.set_vehicle_created_by()
returns trigger
language plpgsql
stable
as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

revoke all on function public.set_vehicle_created_by() from public;

drop trigger if exists vehicles_set_created_by_on_insert on public.vehicles;

create trigger vehicles_set_created_by_on_insert
before insert on public.vehicles
for each row
execute function public.set_vehicle_created_by();

create index if not exists vehicles_created_by_created_at_id_idx
  on public.vehicles (created_by, created_at desc, id desc)
  where created_by is not null;

create index if not exists vehicles_dealership_created_at_id_idx
  on public.vehicles (dealership_id, created_at desc, id desc);

update public.vehicles v
set created_by = a.actor_user_id
from public.audit_logs a
where a.entity_type = 'vehicle'
  and a.action = 'INSERT'
  and a.entity_id = v.id
  and a.actor_user_id is not null
  and v.created_by is null;

create or replace function public.get_my_dealership_inventory(
  p_limit integer default 30,
  p_offset integer default 0
)
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
    where ctx.role = 'admin'
       or v.created_by = ctx.user_id
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
    'vehicles', coalesce(
      (select jsonb_agg(to_jsonb(paged) order by paged.created_at desc, paged.id desc) from paged),
      '[]'::jsonb
    )
  )
  from ctx, counts;
$$;

revoke all on function public.get_my_dealership_inventory(integer, integer) from public;
grant execute on function public.get_my_dealership_inventory(integer, integer) to authenticated;
