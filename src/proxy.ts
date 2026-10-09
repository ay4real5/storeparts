import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Redirects requests without a valid session to the login page. Pages and
// actions still call requireAdmin() themselves; this is the first gate, not
// the only one.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const token = request.cookies.get("admin_session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (token && secret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
      return NextResponse.next();
    } catch {}
  }
  const res = NextResponse.redirect(new URL("/admin/login", request.url));
  if (token) res.cookies.delete("admin_session");
  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
