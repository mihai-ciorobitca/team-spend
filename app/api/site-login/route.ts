import { NextResponse } from "next/server";
import { createSiteAccessToken, SITE_ACCESS_COOKIE, verifySitePassword } from "@/lib/site-password";
import { findMemberByEmail, hasTeamMembers, isSupabaseConfigured } from "@/lib/supabase-admin";

function safeReturnPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const suppliedPassword = String(form.get("password") ?? "");
  const returnTo = safeReturnPath(form.get("next"));
  const configuredPassword = process.env.SITE_PASSWORD;

  if (!configuredPassword) {
    return NextResponse.redirect(new URL("/login?setup=1", request.url), 303);
  }

  if (!/^\S+@\S+\.\S+$/.test(email) || !(await verifySitePassword(suppliedPassword, configuredPassword))) {
    const failureUrl = new URL("/login", request.url);
    failureUrl.searchParams.set("error", "credentials");
    if (returnTo !== "/") failureUrl.searchParams.set("next", returnTo);
    return NextResponse.redirect(failureUrl, 303);
  }

  const adminEmail = (process.env.PEPTIKING_ADMIN_EMAIL || "admin@peptikingmedia.com").trim().toLowerCase();
  let hasAccess = false;
  try {
    if (isSupabaseConfigured()) {
      const member = await findMemberByEmail(email);
      hasAccess = member ? member.status !== "inactive" : !(await hasTeamMembers()) && email === adminEmail;
    } else {
      hasAccess = email === adminEmail;
    }
  } catch {
    const failureUrl = new URL("/login", request.url);
    failureUrl.searchParams.set("error", "service");
    if (returnTo !== "/") failureUrl.searchParams.set("next", returnTo);
    return NextResponse.redirect(failureUrl, 303);
  }

  if (!hasAccess) {
    const failureUrl = new URL("/login", request.url);
    failureUrl.searchParams.set("error", "credentials");
    if (returnTo !== "/") failureUrl.searchParams.set("next", returnTo);
    return NextResponse.redirect(failureUrl, 303);
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set({
    name: SITE_ACCESS_COOKIE,
    value: await createSiteAccessToken(configuredPassword, email),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
