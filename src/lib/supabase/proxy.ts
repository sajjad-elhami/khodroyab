import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Verify the JWT locally when possible instead of making
  // a network request to the Auth server on every request.
  const claimsStart = performance.now();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claimsMs = performance.now() - claimsStart;

  console.log(
    `[PROXY_TIMING] ${request.method} ${request.nextUrl.pathname} getClaims=${claimsMs.toFixed(1)}ms`
  );

  const userId = claimsData?.claims?.sub;
  const isAuthenticated = Boolean(userId);

  const pathname = request.nextUrl.pathname;

  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/auth");

  if (!isAuthenticated && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname);

    return NextResponse.redirect(url);
  }

  // Authenticated users entering the login page should return to
  // the vehicle inventory, which is now the app's default landing page.
  if (isAuthenticated && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/vehicles";
    url.search = "";

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
