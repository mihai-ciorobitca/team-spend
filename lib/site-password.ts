import { ApiError } from "./supabase-admin";

export const SITE_ACCESS_COOKIE = "teamspend_access";
const TOKEN_CONTEXT = "teamspend-site-access-v1:";

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createSiteAccessToken(password: string) {
  return sha256(`${TOKEN_CONTEXT}${password}`);
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
    if (process.env.NODE_ENV !== "production") return;
    throw new ApiError("Site password is not configured", 503);
  }

  const actual = cookieValue(request, SITE_ACCESS_COOKIE);
  const expected = await createSiteAccessToken(password);
  if (!actual || !constantTimeEqual(actual, expected)) {
    throw new ApiError("Unlock the site to continue", 401);
  }
}
