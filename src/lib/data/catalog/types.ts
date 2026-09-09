export type CatalogBrand = {
  id: string;
  name_fa: string;
  name_en: string | null;
};

export type CatalogModel = {
  id: string;
  brand_id: string;
  name_fa: string;
  name_en: string | null;
  slug?: string | null;
  vehicle_class?: string | null;
  body_type?: string | null;
};

export type CatalogTrim = {
  id: string;
  model_id: string;
  name_fa: string;
  name_en: string | null;
  slug?: string | null;
  model_year_from?: number | null;
  model_year_to?: number | null;
  engine?: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  drivetrain?: string | null;
};

export type CatalogProvince = {
  id: string;
  name: string;
};

export type CatalogCity = {
  id: string;
  province_id: string;
  name: string;
};
