import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/stripe") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  function redirectWithCookies(url: string) {
    const r = NextResponse.redirect(new URL(url, request.url));
    response.cookies.getAll().forEach(c => r.cookies.set(c.name, c.value));
    return r;
  }

  if (pathname === "/" || pathname === "/login") {
    if (user) return redirectWithCookies("/hub");
    return response;
  }

  if (pathname.startsWith("/auth/")) return response;

  if (pathname.startsWith("/api/")) {
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return response;
  }

  if (!user) return redirectWithCookies("/login");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
