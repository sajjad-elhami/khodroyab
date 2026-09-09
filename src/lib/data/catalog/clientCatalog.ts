import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CatalogBrand,
  CatalogCity,
  CatalogModel,
  CatalogProvince,
  CatalogTrim,
} from "./types";

type ClientSupabase = SupabaseClient;

const modelsByBrandCache = new Map<string, Promise<CatalogModel[]>>();
const trimsByModelCache = new Map<string, Promise<CatalogTrim[]>>();

let vehicleCatalogPromise:
  | Promise<{
      brands: CatalogBrand[];
      models: CatalogModel[];
      trims: CatalogTrim[];
    }>
  | null = null;

let locationCatalogPromise:
  | Promise<{
      provinces: CatalogProvince[];
      cities: CatalogCity[];
    }>
  | null = null;

export function getVehicleModelsByBrand(
  supabase: ClientSupabase,
  brandId: string,
): Promise<CatalogModel[]> {
  const cached = modelsByBrandCache.get(brandId);
  if (cached) return cached;

  const promise = Promise.resolve(
    supabase
      .from("vehicle_models")
      .select(
        "id, brand_id, name_fa, name_en, slug, vehicle_class, body_type",
      )
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name_fa", { ascending: true }),
  )
    .then(({ data, error }) => {
      if (error) throw error;
      return (data ?? []) as CatalogModel[];
    })
    .catch((error: unknown) => {
      modelsByBrandCache.delete(brandId);
      throw error;
    });

  modelsByBrandCache.set(brandId, promise);
  return promise;
}

export function getVehicleTrimsByModel(
  supabase: ClientSupabase,
  modelId: string,
): Promise<CatalogTrim[]> {
  const cached = trimsByModelCache.get(modelId);
  if (cached) return cached;

  const promise = Promise.resolve(
    supabase
      .from("vehicle_trims")
      .select(
        "id, model_id, name_fa, name_en, slug, model_year_from, model_year_to, engine, transmission, fuel_type, drivetrain",
      )
      .eq("model_id", modelId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name_fa", { ascending: true }),
  )
    .then(({ data, error }) => {
      if (error) throw error;
      return (data ?? []) as CatalogTrim[];
    })
    .catch((error: unknown) => {
      trimsByModelCache.delete(modelId);
      throw error;
    });

  trimsByModelCache.set(modelId, promise);
  return promise;
}

export function getVehicleCatalog(
  supabase: ClientSupabase,
): Promise<{
  brands: CatalogBrand[];
  models: CatalogModel[];
  trims: CatalogTrim[];
}> {
  if (vehicleCatalogPromise) return vehicleCatalogPromise;

  vehicleCatalogPromise = Promise.all([
    supabase
      .from("vehicle_brands")
      .select("id, name_fa, name_en")
      .eq("is_active", true)
      .order("sort_order")
      .order("name_fa"),

    supabase
      .from("vehicle_models")
      .select("id, brand_id, name_fa, name_en")
      .eq("is_active", true)
      .order("sort_order")
      .order("name_fa"),

    supabase
      .from("vehicle_trims")
      .select("id, model_id, name_fa, name_en")
      .eq("is_active", true)
      .order("sort_order")
      .order("name_fa"),
  ])
    .then(([brandsResult, modelsResult, trimsResult]) => {
      if (brandsResult.error) throw brandsResult.error;
      if (modelsResult.error) throw modelsResult.error;
      if (trimsResult.error) throw trimsResult.error;

      return {
        brands: (brandsResult.data ?? []) as CatalogBrand[],
        models: (modelsResult.data ?? []) as CatalogModel[],
        trims: (trimsResult.data ?? []) as CatalogTrim[],
      };
    })
    .catch((error) => {
      vehicleCatalogPromise = null;
      throw error;
    });

  return vehicleCatalogPromise;
}

const citiesByProvinceCache = new Map<
  string,
  Promise<CatalogCity[]>
>();

export function getCitiesByProvince(
  supabase: ClientSupabase,
  provinceId: string,
): Promise<CatalogCity[]> {
  if (!provinceId) return Promise.resolve([]);

  const cached = citiesByProvinceCache.get(provinceId);
  if (cached) return cached;

  const promise = Promise.resolve(
    supabase
      .from("cities")
      .select("id, province_id, name")
      .eq("province_id", provinceId)
      .order("name", { ascending: true }),
  )
    .then(({ data, error }) => {
      if (error) throw error;
      return (data ?? []) as CatalogCity[];
    })
    .catch((error: unknown) => {
      citiesByProvinceCache.delete(provinceId);
      throw error;
    });

  citiesByProvinceCache.set(provinceId, promise);
  return promise;
}

export function getLocationCatalog(
  supabase: ClientSupabase,
): Promise<{
  provinces: CatalogProvince[];
  cities: CatalogCity[];
}> {
  if (locationCatalogPromise) return locationCatalogPromise;

  locationCatalogPromise = Promise.all([
    supabase
      .from("provinces")
      .select("id, name")
      .order("name", { ascending: true }),

    supabase
      .from("cities")
      .select("id, province_id, name")
      .order("name", { ascending: true }),
  ])
    .then(([provincesResult, citiesResult]) => {
      if (provincesResult.error) throw provincesResult.error;
      if (citiesResult.error) throw citiesResult.error;

      return {
        provinces: (provincesResult.data ?? []) as CatalogProvince[],
        cities: (citiesResult.data ?? []) as CatalogCity[],
      };
    })
    .catch((error) => {
      locationCatalogPromise = null;
      throw error;
    });

  return locationCatalogPromise;
}

export function clearClientCatalogCache() {
  modelsByBrandCache.clear();
  trimsByModelCache.clear();
  citiesByProvinceCache.clear();
  vehicleCatalogPromise = null;
  locationCatalogPromise = null;
}
