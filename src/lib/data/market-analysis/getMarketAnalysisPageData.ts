import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MarketAnalysis,
  MarketAnalysisPageData,
  MarketAnalysisProvince,
} from "./types";

type RpcPayload = {
  provinces?: MarketAnalysisProvince[];
  analysis?: MarketAnalysis;
};

export async function getMarketAnalysisPageData(supabase: SupabaseClient): Promise<MarketAnalysisPageData> {

  const { data, error } = await supabase.rpc("get_market_analysis_page_data");

  if (error) {
    throw new Error(
      `Failed to load market analysis page data: ${error.message}`
    );
  }

  const payload = (data ?? {}) as RpcPayload;

  if (!payload.analysis) {
    throw new Error("Market analysis data is missing.");
  }

  return {
    provinces: Array.isArray(payload.provinces) ? payload.provinces : [],
    analysis: payload.analysis,
  };
}
