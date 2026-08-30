import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const hits = new Map<string, { count: number; reset: number }>();

function rateLimit(key: string, max = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now > entry.reset) hits.delete(key);
  }
}, 60_000);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/stripe") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!rateLimit(`mw:${ip}:${pathname}`)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente em instantes." },
        { status: 429 }
      );
    }
    return new NextResponse(
      "<html><body><h1>429 - Muitas requisições</h1><p>Tente novamente em instantes.</p></body></html>",
      { status: 429, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  function redirectWithCookies(url: string) {
    const r = NextResponse.redirect(new URL(url, request.url));
    response.cookies.getAll().forEach((c) => r.cookies.set(c.name, c.value));
    return r;
  }

  if (pathname === "/" || pathname === "/login") {
    if (user) return redirectWithCookies("/hub");
    return response;
  }

  if (pathname.startsWith("/auth/")) return response;

  if (pathname.startsWith("/api/")) {
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return response;
  }

  if (!user) return redirectWithCookies("/login");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
