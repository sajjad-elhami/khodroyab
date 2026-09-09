import MarketAnalysisClient from "./MarketAnalysisClient";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdmin } from "@/lib/auth/guards";
import { getMarketAnalysisPageData } from "@/lib/data/market-analysis/getMarketAnalysisPageData";

export default async function MarketAnalysisPage() {
  const { supabase } = await requireAdmin();

  const initialData = await getMarketAnalysisPageData(supabase);

  return (
    <AdminLayout
      title="تحلیل بازار خودرو"
      description="بررسی قیمت و وضعیت خودروها در بازار"
    >
      <MarketAnalysisClient initialData={initialData} />
    </AdminLayout>
  );
}
