create or replace function public.get_vehicle_edit_page_data(p_vehicle_id uuid)
returns jsonb
language sql
stable
set search_path to 'pg_catalog, public'
as $function$
with vehicle_row as (
  select v.id,v.brand,v.model,v.trim,v.model_year,v.mileage,v.color,v.price,v.description,v.status,v.dealership_id,v.transmission,v.fuel_type,
         v.chassis_condition,v.engine_condition,v.insurance_expiry_date,v.gearbox_condition
  from public.vehicles v where v.id = p_vehicle_id
),
profile_row as (select p.id,p.full_name,p.dealership_id,p.role from public.profiles p where p.id = (select auth.uid())),
image_rows as (select vi.id,vi.storage_path,vi.thumbnail_path,vi.sort_order from public.vehicle_images vi join vehicle_row v on v.id=vi.vehicle_id order by vi.sort_order asc,vi.id asc),
body_part_rows as (select bp.code,bp.name_fa,bp.section,bp.position,bp.display_order,bp.is_active from public.vehicle_body_parts bp where bp.is_active=true order by bp.display_order asc nulls last,bp.code asc),
inspection_rows as (select bi.part_code,bi.condition,bi.paint_thickness_microns,bi.notes from public.vehicle_body_inspections bi join vehicle_row v on v.id=bi.vehicle_id order by bi.part_code asc),
brand_rows as (select b.id,b.name_fa,b.name_en,b.slug from public.vehicle_brands b where b.is_active=true order by b.name_fa asc,b.id asc),
selected_brand as (select b.id from public.vehicle_brands b join vehicle_row v on true where b.is_active=true and (lower(trim(b.name_fa))=lower(trim(v.brand)) or lower(trim(coalesce(b.name_en,'')))=lower(trim(v.brand))) order by case when lower(trim(b.name_fa))=lower(trim(v.brand)) then 0 else 1 end,b.id limit 1),
model_rows as (select m.id,m.brand_id,m.name_fa,m.name_en,m.slug,m.vehicle_class,m.body_type from public.vehicle_models m join selected_brand sb on sb.id=m.brand_id where m.is_active=true order by m.name_fa asc,m.id asc),
selected_model as (select m.id from model_rows m join vehicle_row v on true where lower(trim(m.name_fa))=lower(trim(v.model)) or lower(trim(coalesce(m.name_en,'')))=lower(trim(v.model)) order by case when lower(trim(m.name_fa))=lower(trim(v.model)) then 0 else 1 end,m.id limit 1),
trim_rows as (select t.id,t.model_id,t.name_fa,t.name_en,t.slug,t.model_year_from,t.model_year_to,t.engine,t.transmission,t.fuel_type,t.drivetrain from public.vehicle_trims t join selected_model sm on sm.id=t.model_id where t.is_active=true order by t.name_fa asc,t.id asc)
select jsonb_build_object('vehicle',coalesce((select to_jsonb(v) from vehicle_row v),'null'::jsonb),'profile',coalesce((select to_jsonb(p) from profile_row p),'null'::jsonb),'images',coalesce((select jsonb_agg(to_jsonb(i) order by i.sort_order,i.id) from image_rows i),'[]'::jsonb),'body_parts',coalesce((select jsonb_agg(to_jsonb(bp) order by bp.display_order nulls last,bp.code) from body_part_rows bp),'[]'::jsonb),'inspections',coalesce((select jsonb_agg(to_jsonb(i) order by i.part_code) from inspection_rows i),'[]'::jsonb),'brands',coalesce((select jsonb_agg(to_jsonb(b) order by b.name_fa,b.id) from brand_rows b),'[]'::jsonb),'models',coalesce((select jsonb_agg(to_jsonb(m) order by m.name_fa,m.id) from model_rows m),'[]'::jsonb),'trims',coalesce((select jsonb_agg(to_jsonb(t) order by t.name_fa,t.id) from trim_rows t),'[]'::jsonb),'selected_brand_id',coalesce((select id from selected_brand),null),'selected_model_id',coalesce((select id from selected_model),null));
$function$;
