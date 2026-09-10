import MyDealershipClient from "./MyDealershipClient";
import { requireAuth } from "@/lib/auth/guards";
import { getMyDealershipPageData } from "@/lib/data/dealerships/getMyDealershipPageData";

export default async function DealershipsPage() {
  const { supabase } = await requireAuth();

  const initialData = await getMyDealershipPageData(supabase, 30, 0);

  return <MyDealershipClient initialData={initialData} />;
}
