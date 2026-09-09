CREATE OR REPLACE FUNCTION public.get_market_analysis_page_data()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
select jsonb_build_object(
  'provinces', coalesce((
    select jsonb_agg(
      jsonb_build_object('id', p.id, 'name', p.name)
      order by p.name
    )
    from public.provinces p
  ), '[]'::jsonb),
  'analysis', public.get_market_analysis(null, null, null, 'available')
);
$function$;
