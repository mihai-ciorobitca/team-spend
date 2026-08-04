import { ApiError } from "./supabase-admin";

export const SITE_ACCESS_COOKIE = "teamspend_access";
export const SITE_IDENTITY_HEADER = "x-peptiking-user-email";
const TOKEN_CONTEXT = "teamspend-site-access-v1:";

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function createSiteAccessToken(password: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const encodedEmail = encodeURIComponent(normalizedEmail);
  const signature = await sha256(`${TOKEN_CONTEXT}${password}:${normalizedEmail}`);
  return `${encodedEmail}.${signature}`;
}

export async function readSiteAccessToken(token: string, password: string) {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  let email: string;
  try {
    email = normalizeEmail(decodeURIComponent(token.slice(0, separator)));
  } catch {
    return null;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return null;

  const suppliedSignature = token.slice(separator + 1);
  const expectedSignature = await sha256(`${TOKEN_CONTEXT}${password}:${email}`);
  return constantTimeEqual(suppliedSignature, expectedSignature) ? email : null;
}

export async function verifySitePassword(candidate: string, expected: string) {
  const [candidateHash, expectedHash] = await Promise.all([
    sha256(`${TOKEN_CONTEXT}${candidate}`),
    sha256(`${TOKEN_CONTEXT}${expected}`),
  ]);
  return constantTimeEqual(candidateHash, expectedHash);
}

export function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const [cookieName, ...rest] = item.trim().split("=");
    if (cookieName === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function requireSiteAccess(request: Request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production") return null;
    throw new ApiError("Site password is not configured", 503);
  }

  const actual = cookieValue(request, SITE_ACCESS_COOKIE);
  const email = actual ? await readSiteAccessToken(actual, password) : null;
  if (!email) {
    throw new ApiError("Unlock the site to continue", 401);
  }
  return { email };
}
