import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // DEV: skip auth check — usar SKIP_AUTH (server-side only, sin prefijo NEXT_PUBLIC_)
  // NEVER habilitar esto en producción
  if (process.env.SKIP_AUTH === "true" && process.env.NODE_ENV !== "production") {
    return NextResponse.next({ request });
  }

  // RO-APPSEC-MW-001: fail-closed when Supabase env vars are missing.
  // In development/static-export we tolerate missing vars so `next build`
  // can run without a live backend. In production this is a deployment
  // misconfiguration and we must NOT silently skip auth — redirect to /login.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === "production") {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname.startsWith("/login") ||
        pathname.startsWith("/callback") ||
        pathname.startsWith("/auth") ||
        pathname.startsWith("/landing") ||
        pathname.startsWith("/blog") ||
        pathname === "/robots.txt" ||
        pathname === "/sitemap.xml";
      if (!isPublic) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/callback") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/landing") ||
    pathname.startsWith("/blog") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect new users (no membership) to onboarding
  if (user && !isPublic && !pathname.startsWith("/onboarding") && !pathname.startsWith("/api/")) {
    const onboarded = request.cookies.get("ro_onboarded")?.value;
    if (!onboarded) {
      // Check if user has any active membership
      const { data: membership } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!membership) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }

      // User has membership — set cookie to skip this check next time
      supabaseResponse.cookies.set("ro_onboarded", "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }
  }

  return supabaseResponse;
}
