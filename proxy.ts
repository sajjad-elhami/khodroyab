import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/auth/:path*",
    "/dashboard/:path*",
    "/dealerships/:path*",
    "/favorites/:path*",
    "/market-analysis/:path*",
    "/users/:path*",
    "/vehicles/:path*",
  ],
};
