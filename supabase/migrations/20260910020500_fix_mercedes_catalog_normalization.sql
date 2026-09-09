-- Follow-up normalization for the Mercedes batch. The app/catalog convention keeps normalized_name aligned with the canonical Persian model label.
BEGIN;

UPDATE public.vehicle_models
SET normalized_name = name_fa, updated_at = now()
WHERE brand_id = (SELECT id FROM public.vehicle_brands WHERE normalized_name='بنز')
  AND name_fa IN ('کلاس A','کلاس B','کلاس C','کلاس C کوپه','کلاس CE','کلاس CL','کلاس CLA','کلاس CLK کروک','کلاس CLK کوپه','کلاس CLS','کلاس E','کلاس E کروک','کلاس E کوپه','کلاس E مونتاژ','کلاس G','کلاس GL','کلاس GLA','کلاس GLB','کلاس GLC','کلاس GLE','کلاس GLK','کلاس GLS','کلاس ML','کلاس S','کلاس SL','کلاس SLC','کلاس SLK','کلاس SLR','کلاس SLS','کلاس کلاسیک','ویانو','یونیماگ','EQA','EQB','EQE SUV','GTS');

INSERT INTO public.vehicle_trims (model_id,name_fa,name_en,slug,normalized_name,is_active,sort_order)
SELECT m.id,'AMG EQE SUV','AMG EQE SUV','amg-eqe-suv','AMG EQE SUV',true,20
FROM public.vehicle_models m
JOIN public.vehicle_brands b ON b.id=m.brand_id
WHERE b.normalized_name='بنز' AND m.name_fa='EQE SUV'
ON CONFLICT (model_id,normalized_name) DO UPDATE SET name_fa=EXCLUDED.name_fa,name_en=EXCLUDED.name_en,slug=EXCLUDED.slug,is_active=true,updated_at=now();

COMMIT;
