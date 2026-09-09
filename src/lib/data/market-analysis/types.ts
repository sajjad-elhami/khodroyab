export type MarketAnalysisProvince = {
  id: string;
  name: string;
};

export type MarketAnalysisBrand = {
  id: string;
  name_fa: string;
  name_en: string | null;
};

export type MarketAnalysisModel = {
  id: string;
  brand_id: string;
  name_fa: string;
  name_en: string | null;
};

export type MarketAnalysisTrim = {
  id: string;
  model_id: string;
  name_fa: string;
  name_en: string | null;
};

export type MarketAnalysis = {
  vehicle_count: number;
  priced_count: number;
  avg_price: number | null;
  min_price: number | null;
  q1_price: number | null;
  median_price: number | null;
  q3_price: number | null;
  max_price: number | null;
  avg_mileage: number | null;
  year_stats: {
    year: number;
    count: number;
    avg_price: number | null;
  }[];
  trim_stats: {
    trim: string;
    count: number;
    avg_price: number | null;
  }[];
  province_stats: {
    province_id: string;
    province: string | null;
    count: number;
    avg_price: number | null;
    min_price: number | null;
    max_price: number | null;
  }[];
};

export type MarketAnalysisPageData = {
  provinces: MarketAnalysisProvince[];
  analysis: MarketAnalysis;
};
