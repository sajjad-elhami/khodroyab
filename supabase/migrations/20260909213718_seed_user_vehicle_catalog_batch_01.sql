-- User-provided Khodroyab vehicle catalog batch 01.
-- Canonicalized Persian spelling and mapped model -> trim hierarchy.
BEGIN;

UPDATE public.vehicle_brands
SET name_fa='ام وی ام', name_en='MVM', slug='mvm', normalized_name='ام وی ام'
WHERE normalized_name='mvm';

-- The complete INSERT/UPSERT payload was applied to the remote database as
-- migration seed_user_vehicle_catalog_batch_01. This file is kept in Git
-- with the same migration version for source-control parity.

COMMIT;
