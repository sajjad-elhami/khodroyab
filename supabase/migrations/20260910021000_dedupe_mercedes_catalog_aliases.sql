-- Remove duplicate aliases that were listed twice by the source catalog.
BEGIN;
DELETE FROM public.vehicle_trims t
USING public.vehicle_models m, public.vehicle_brands b
WHERE t.model_id=m.id AND m.brand_id=b.id AND b.normalized_name='بنز'
  AND ((m.name_fa='کلاس GLB' AND t.normalized_name='GLB 180')
    OR (m.name_fa='کلاس CLA' AND t.normalized_name='CLA 180'));
COMMIT;
