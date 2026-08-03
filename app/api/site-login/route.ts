import { NextResponse } from "next/server";
import { createSiteAccessToken, SITE_ACCESS_COOKIE, verifySitePassword } from "@/lib/site-password";

function safeReturnPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const suppliedPassword = String(form.get("password") ?? "");
  const returnTo = safeReturnPath(form.get("next"));
  const configuredPassword = process.env.SITE_PASSWORD;

  if (!configuredPassword) {
    return NextResponse.redirect(new URL("/login?setup=1", request.url), 303);
  }

  if (!(await verifySitePassword(suppliedPassword, configuredPassword))) {
    const failureUrl = new URL("/login", request.url);
    failureUrl.searchParams.set("error", "1");
    if (returnTo !== "/") failureUrl.searchParams.set("next", returnTo);
    return NextResponse.redirect(failureUrl, 303);
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set({
    name: SITE_ACCESS_COOKIE,
    value: await createSiteAccessToken(configuredPassword),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
