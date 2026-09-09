create or replace function public.get_users_page_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
select jsonb_build_object(
  'current_user_id', (select auth.uid()),
  'profiles', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'phone', p.phone,
        'role', p.role,
        'dealership_id', p.dealership_id,
        'created_at', p.created_at
      ) order by p.created_at asc
    )
    from public.profiles p
  ), '[]'::jsonb),
  'dealerships', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'is_active', d.is_active
      ) order by d.name asc
    )
    from public.dealerships d
  ), '[]'::jsonb),
  'emails', coalesce((
    select jsonb_agg(
      jsonb_build_object('id', x.id, 'email', x.email)
      order by x.id
    )
    from private.get_admin_user_list() x
  ), '[]'::jsonb)
);
$function$;

revoke all on function public.get_users_page_data() from public;
grant execute on function public.get_users_page_data() to authenticated;
