import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that require an authenticated session at all.
const PROTECTED_PREFIXES = ["/dashboard", "/officer", "/admin"];

// Routes that require a specific minimum role.
const ROLE_GATES: { prefix: string; roles: string[] }[] = [
  { prefix: "/officer", roles: ["officer", "admin", "super_admin"] },
  { prefix: "/admin", roles: ["admin", "super_admin"] },
];

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return response;

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const gate = ROLE_GATES.find((g) => pathname.startsWith(g.prefix));
  if (gate) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !gate.roles.includes(profile.role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/officer/:path*", "/admin/:path*"],
};
