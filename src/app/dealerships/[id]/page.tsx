import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/guards";
import DealershipInventoryClient from "./DealershipInventoryClient";
import { getDealershipDetailPageData } from "@/lib/data/dealerships/getDealershipDetailPageData";

type DealershipPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DealershipPage({
  params,
}: DealershipPageProps) {
  const { supabase } = await requireAuth();

  const { id } = await params;

  const data = await getDealershipDetailPageData(supabase, id);

  if (!data) {
    notFound();
  }

  return (
    <DealershipInventoryClient
      dealership={data.dealership}
      initialVehicles={data.vehicles}
      initialTotalCount={data.totalCount}
    />
  );
}
