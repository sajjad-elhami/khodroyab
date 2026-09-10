alter table public.vehicles
  add column if not exists created_by uuid references auth.users(id) on delete set null;

comment on column public.vehicles.created_by is 'Authenticated user who originally registered this vehicle in Khodroyab. Null is allowed for legacy vehicles created before creator tracking.';

create index if not exists vehicles_created_by_created_at_idx
  on public.vehicles (created_by, created_at desc)
  where created_by is not null;
