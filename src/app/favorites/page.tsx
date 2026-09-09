import FavoritesClient from "./FavoritesClient";
import { requireAuth } from "@/lib/auth/guards";
import { getFavoritesPageData } from "@/lib/data/favorites/getFavoritesPageData";

export default async function FavoritesPage() {
  const { supabase } = await requireAuth();

  const initialData = await getFavoritesPageData(supabase);

  return (
    <FavoritesClient
      initialVehicles={initialData.vehicles}
    />
  );
}
