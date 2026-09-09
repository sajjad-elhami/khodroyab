import DealershipsClient from "./DealershipsClient";
import { requireAuth } from "@/lib/auth/guards";
import { getDealershipPageData } from "@/lib/data/dealerships/getDealershipPageData";

export default async function DealershipsPage() {
  const { supabase } = await requireAuth();

  const initialData = await getDealershipPageData(supabase);

  return <DealershipsClient initialData={initialData} />;
}
