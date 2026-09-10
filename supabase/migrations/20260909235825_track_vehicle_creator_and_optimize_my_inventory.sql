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
