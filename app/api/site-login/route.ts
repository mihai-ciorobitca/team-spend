import { NextResponse } from "next/server";
import { createSiteAccessToken, SITE_ACCESS_COOKIE, verifySitePassword } from "@/lib/site-password";
import { findMemberByEmail, hasTeamMembers, isSupabaseConfigured } from "@/lib/supabase-admin";
import { verifyMemberPassword } from "@/lib/member-password";

const LAST_LOGIN_EMAIL_COOKIE = "peptiking_last_login_email";

function failedLoginResponse(request: Request, returnTo: string, error: "credentials" | "service", email: string) {
  const failureUrl = new URL("/login", request.url);
  failureUrl.searchParams.set("error", error);
  if (returnTo !== "/") failureUrl.searchParams.set("next", returnTo);
  const response = NextResponse.redirect(failureUrl, 303);
  if (/^\S+@\S+\.\S+$/.test(email)) {
    response.cookies.set({
      name: LAST_LOGIN_EMAIL_COOKIE,
      value: email,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/login",
      maxAge: 60 * 10,
    });
  }
  return response;
}

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

  if (!/^\S+@\S+\.\S+$/.test(email) || !suppliedPassword || suppliedPassword.length > 128) {
    return failedLoginResponse(request, returnTo, "credentials", email);
  }

  const adminEmail = (process.env.PEPTIKING_ADMIN_EMAIL || "admin@peptikingmedia.com").trim().toLowerCase();
  let hasAccess = false;
  try {
    if (isSupabaseConfigured()) {
      const member = await findMemberByEmail(email);
      if (member && member.status !== "inactive") {
        hasAccess = member.role === "admin"
          ? await verifySitePassword(suppliedPassword, configuredPassword)
          : await verifyMemberPassword(suppliedPassword, member.password_hash);
      } else if (!member && !(await hasTeamMembers()) && email === adminEmail) {
        hasAccess = await verifySitePassword(suppliedPassword, configuredPassword);
      }
    } else {
      hasAccess = email === adminEmail && await verifySitePassword(suppliedPassword, configuredPassword);
    }
  } catch {
    return failedLoginResponse(request, returnTo, "service", email);
  }

  if (!hasAccess) {
    return failedLoginResponse(request, returnTo, "credentials", email);
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
  response.cookies.set({ name: LAST_LOGIN_EMAIL_COOKIE, value: "", path: "/login", maxAge: 0 });
  return response;
}
