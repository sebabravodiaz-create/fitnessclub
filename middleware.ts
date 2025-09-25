// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  const isAdminPath = pathname.startsWith("/admin")
  const isKioskPath = pathname.startsWith("/kiosk")

  if (!isAdminPath && !isKioskPath) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Si no hay sesión, redirige a /login?next=/admin...
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role =
    typeof session.user.app_metadata?.role === "string"
      ? session.user.app_metadata.role.toLowerCase()
      : typeof session.user.user_metadata?.role === "string"
        ? session.user.user_metadata.role.toLowerCase()
        : null;

  if (isAdminPath && role !== "admin") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", "/admin");
    return NextResponse.redirect(loginUrl);
  }

  if (isKioskPath && role !== "admin" && role !== "kiosk") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", "/kiosk");
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/kiosk", "/kiosk/:path*"], // aplica a /admin/* y /kiosk
};
