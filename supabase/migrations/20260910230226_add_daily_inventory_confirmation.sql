alter table public.vehicles
  add column if not exists inventory_confirmed_at timestamptz;

create index if not exists idx_vehicles_dealership_inventory_confirmed
  on public.vehicles (dealership_id, status, inventory_confirmed_at);
