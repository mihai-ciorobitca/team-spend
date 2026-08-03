import { NextRequest, NextResponse } from "next/server";
import { constantTimeEqual, createSiteAccessToken, SITE_ACCESS_COOKIE } from "@/lib/site-password";

const PUBLIC_PATHS = new Set(["/login", "/api/site-login"]);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const password = process.env.SITE_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Site password is not configured" }, { status: 503 });
    }
    const setupUrl = new URL("/login", request.url);
    setupUrl.searchParams.set("setup", "1");
    return NextResponse.redirect(setupUrl);
  }

  const suppliedToken = request.cookies.get(SITE_ACCESS_COOKIE)?.value;
  const expectedToken = await createSiteAccessToken(password);
  if (suppliedToken && constantTimeEqual(suppliedToken, expectedToken)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Unlock the site to continue" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  const returnTo = `${pathname}${request.nextUrl.search}`;
  if (returnTo !== "/") loginUrl.searchParams.set("next", returnTo);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$).*)"],
};
