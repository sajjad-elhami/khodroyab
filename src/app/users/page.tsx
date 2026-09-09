import UsersClient from "./UsersClient";
import { requireAdmin } from "@/lib/auth/guards";
import { getUsersPageData } from "@/lib/data/users/getUsersPageData";

export default async function UsersPage() {
  const { supabase } = await requireAdmin();

  const initialData = await getUsersPageData(supabase);

  return <UsersClient initialData={initialData} />;
}
