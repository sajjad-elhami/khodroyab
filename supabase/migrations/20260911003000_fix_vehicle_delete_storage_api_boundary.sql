create or replace function public.delete_vehicle_completely(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_dealership_id uuid;
  v_vehicle_dealership_id uuid;
  v_image_count integer;
  v_request_count integer;
  v_favorite_count integer;
begin
  if auth.uid() is null then
    raise exception 'کاربر وارد سیستم نشده است.';
  end if;

  select p.role, p.dealership_id
    into v_role, v_dealership_id
  from public.profiles p
  where p.id = auth.uid();

  select v.dealership_id
    into v_vehicle_dealership_id
  from public.vehicles v
  where v.id = p_vehicle_id;

  if v_vehicle_dealership_id is null then
    raise exception 'خودرو پیدا نشد.';
  end if;

  if coalesce(v_role, '') <> 'admin' and v_vehicle_dealership_id <> v_dealership_id then
    raise exception 'اجازه حذف این خودرو را ندارید.';
  end if;

  select count(*) into v_image_count
  from public.vehicle_images
  where vehicle_id = p_vehicle_id;

  select count(*) into v_request_count
  from public.vehicle_requests
  where vehicle_id = p_vehicle_id;

  select count(*) into v_favorite_count
  from public.vehicle_favorites
  where vehicle_id = p_vehicle_id;

  delete from public.vehicle_requests where vehicle_id = p_vehicle_id;
  delete from public.vehicle_favorites where vehicle_id = p_vehicle_id;
  delete from public.vehicle_images where vehicle_id = p_vehicle_id;
  delete from public.vehicles where id = p_vehicle_id;

  if not found then
    raise exception 'حذف خودرو انجام نشد.';
  end if;

  return jsonb_build_object(
    'deleted', true,
    'image_count', v_image_count,
    'request_count', v_request_count,
    'favorite_count', v_favorite_count
  );
end;
$$;

revoke execute on function public.delete_vehicle_completely(uuid) from public;
grant execute on function public.delete_vehicle_completely(uuid) to authenticated;
