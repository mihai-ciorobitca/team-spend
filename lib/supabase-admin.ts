type SupabaseMemberRow = {
  id: string;
  team_id: string;
  email: string;
  full_name: string;
  role: "admin" | "member";
  status: "active" | "invited" | "inactive";
  avatar_color: string;
  password_hash: string | null;
};

type SupabaseTeamRow = {
  id: string;
  name: string;
  currency: string;
  require_proof: boolean;
};

const DEFAULT_ADMIN_EMAIL = "admin@peptikingmedia.com";
const DEFAULT_ADMIN_NAME = "Admin";
const LEGACY_ADMIN_EMAIL = "owner@local.demo";
const SUPPORTED_CURRENCIES = new Set(["EUR", "VND"]);

type SupabaseExpenseRow = {
  id: string;
  merchant: string;
  amount: number | string;
  category: string;
  payment_method: "cash" | "card" | "bank_transfer" | "wallet";
  spent_at: string;
  spender_id: string;
  proof_path: string | null;
  notes: string | null;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "invited" | "inactive";
  avatarColor: string;
  hasPassword: boolean;
};

export type TeamSettings = {
  teamName: string;
  currency: string;
  requireProof: boolean;
};

export type Expense = {
  id: string;
  merchant: string;
  amount: number;
  category: string;
  paymentMethod: "cash" | "card" | "bank_transfer" | "wallet";
  spentAt: string;
  spenderId: string;
  proofUrl: string | null;
  notes: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError("Supabase is not configured", 503);
  return { url, key, bucket: process.env.SUPABASE_STORAGE_BUCKET || "expense-proofs" };
}

export async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = config();
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...(init.body && !(init.body instanceof Blob) ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Supabase request failed", response.status, detail.slice(0, 500));
    throw new ApiError("The team database could not complete that request", 502);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function requestIdentity(request: Request) {
  const siteEmail = request.headers.get("x-peptiking-user-email")?.trim().toLowerCase();
  if (siteEmail && /^\S+@\S+\.\S+$/.test(siteEmail)) {
    return {
      userId: `site-password:${siteEmail}`,
      email: siteEmail,
      fullName: siteEmail.split("@")[0],
    };
  }

  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  let fullName = email ?? "";
  if (encodedName && request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try {
      fullName = decodeURIComponent(encodedName);
    } catch {
      fullName = email ?? "";
    }
  }

  if (userId && email) return { userId, email: email.toLowerCase(), fullName };
  if (process.env.NODE_ENV !== "production") return { userId: "local-owner", email: DEFAULT_ADMIN_EMAIL, fullName: DEFAULT_ADMIN_NAME };
  if (process.env.SITE_PASSWORD) {
    return {
      userId: "shared-password-user",
      email: (process.env.PEPTIKING_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase(),
      fullName: process.env.PEPTIKING_ADMIN_NAME || DEFAULT_ADMIN_NAME,
    };
  }
  throw new ApiError("Sign in to access this team", 401);
}

export async function requireMember(request: Request): Promise<SupabaseMemberRow> {
  const identity = requestIdentity(request);
  const rows = await supabaseRequest<SupabaseMemberRow[]>(
    `/rest/v1/team_members?email=eq.${encodeURIComponent(identity.email)}&select=*&limit=1`,
  );

  if (rows[0]) {
    if (rows[0].status === "inactive") throw new ApiError("Your team access is inactive", 403);
    if ((identity.userId === "shared-password-user" || identity.userId === "local-owner") && rows[0].role === "admin" && rows[0].full_name !== identity.fullName) {
      const renamed = await supabaseRequest<SupabaseMemberRow[]>(
        `/rest/v1/team_members?id=eq.${encodeURIComponent(rows[0].id)}&select=*`,
        { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ full_name: identity.fullName, status: "active", auth_provider_id: identity.userId }) },
      );
      return renamed[0] ?? { ...rows[0], full_name: identity.fullName, status: "active" };
    }
    if (rows[0].status === "invited") {
      const activated = await supabaseRequest<SupabaseMemberRow[]>(
        `/rest/v1/team_members?id=eq.${encodeURIComponent(rows[0].id)}&select=*`,
        { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "active" }) },
      );
      return activated[0] ?? { ...rows[0], status: "active" };
    }
    return rows[0];
  }

  if (identity.userId === "shared-password-user" || identity.userId === "local-owner") {
    const legacyAdmins = await supabaseRequest<SupabaseMemberRow[]>(
      `/rest/v1/team_members?email=eq.${encodeURIComponent(LEGACY_ADMIN_EMAIL)}&role=eq.admin&select=*&limit=1`,
    );
    if (legacyAdmins[0]) {
      const renamed = await supabaseRequest<SupabaseMemberRow[]>(
        `/rest/v1/team_members?id=eq.${encodeURIComponent(legacyAdmins[0].id)}&select=*`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ email: identity.email, full_name: identity.fullName, status: "active", auth_provider_id: identity.userId }),
        },
      );
      if (renamed[0]) return renamed[0];
    }
  }

  const existing = await supabaseRequest<Array<{ id: string }>>("/rest/v1/team_members?select=id&limit=1");
  if (existing.length) throw new ApiError("Ask an admin to add your signed-in email to this team", 403);

  const teams = await supabaseRequest<SupabaseTeamRow[]>("/rest/v1/teams?select=*&limit=1");
  let team = teams[0];
  if (!team) {
    const createdTeams = await supabaseRequest<SupabaseTeamRow[]>("/rest/v1/teams?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: "My Team", currency: "EUR", require_proof: true }),
    });
    team = createdTeams[0];
  }
  if (!team) throw new ApiError("Could not create the first team", 502);

  const members = await supabaseRequest<SupabaseMemberRow[]>("/rest/v1/team_members?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      team_id: team.id,
      email: identity.email,
      full_name: identity.fullName || identity.email.split("@")[0],
      role: "admin",
      status: "active",
      auth_provider_id: identity.userId,
      avatar_color: "#f3bf73",
    }),
  });
  if (!members[0]) throw new ApiError("Could not create the first admin", 502);
  return members[0];
}

export async function requireAdmin(request: Request) {
  const member = await requireMember(request);
  if (member.role !== "admin") throw new ApiError("Admin access is required", 403);
  return member;
}

export function mapMember(row: SupabaseMemberRow): Member {
  return { id: row.id, name: row.full_name, email: row.email, role: row.role, status: row.status, avatarColor: row.avatar_color, hasPassword: Boolean(row.password_hash) };
}

export function mapSettings(row: SupabaseTeamRow): TeamSettings {
  return {
    teamName: row.name,
    currency: row.currency,
    requireProof: row.require_proof,
  };
}

export function mapExpense(row: SupabaseExpenseRow, proofUrl: string | null = row.proof_path ? "attached" : null): Expense {
  return {
    id: row.id,
    merchant: row.merchant,
    amount: Number(row.amount),
    category: row.category,
    paymentMethod: row.payment_method,
    spentAt: row.spent_at,
    spenderId: row.spender_id,
    proofUrl,
    notes: row.notes ?? "",
  };
}

export async function getTeam(teamId: string) {
  const rows = await supabaseRequest<SupabaseTeamRow[]>(`/rest/v1/teams?id=eq.${encodeURIComponent(teamId)}&select=*&limit=1`);
  if (!rows[0]) throw new ApiError("Team settings were not found", 404);
  if (!SUPPORTED_CURRENCIES.has(rows[0].currency)) {
    const normalized = await supabaseRequest<SupabaseTeamRow[]>(
      `/rest/v1/teams?id=eq.${encodeURIComponent(teamId)}&select=*`,
      { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ currency: "EUR" }) },
    );
    return normalized[0] ?? { ...rows[0], currency: "EUR" };
  }
  return rows[0];
}

export async function getMembers(teamId: string) {
  const rows = await supabaseRequest<SupabaseMemberRow[]>(`/rest/v1/team_members?team_id=eq.${encodeURIComponent(teamId)}&select=*&order=created_at.asc`);
  if (!rows.some((member) => member.status === "invited")) return rows;

  const activated = await supabaseRequest<SupabaseMemberRow[]>(
    `/rest/v1/team_members?team_id=eq.${encodeURIComponent(teamId)}&status=eq.invited&select=*`,
    { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "active" }) },
  );
  const activatedById = new Map(activated.map((member) => [member.id, member]));
  return rows.map((member) => activatedById.get(member.id) ?? member);
}

export async function findMemberByEmail(email: string) {
  const rows = await supabaseRequest<SupabaseMemberRow[]>(
    `/rest/v1/team_members?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&select=*&limit=1`,
  );
  return rows[0] ?? null;
}

export async function hasTeamMembers() {
  const rows = await supabaseRequest<Array<{ id: string }>>("/rest/v1/team_members?select=id&limit=1");
  return rows.length > 0;
}

export async function getExpenses(teamId: string) {
  return supabaseRequest<SupabaseExpenseRow[]>(`/rest/v1/expenses?team_id=eq.${encodeURIComponent(teamId)}&select=*&order=spent_at.desc,created_at.desc&limit=200`);
}

export async function uploadProof(path: string, file: File) {
  const { url, key, bucket } = config();
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: file,
  });
  if (!response.ok) {
    console.error("Supabase proof upload failed", response.status, (await response.text()).slice(0, 500));
    throw new ApiError("The receipt proof could not be uploaded", 502);
  }
}

export async function deleteProof(path: string) {
  const { url, key, bucket } = config();
  await fetch(`${url}/storage/v1/object/${bucket}/${path}`, { method: "DELETE", headers: { apikey: key, authorization: `Bearer ${key}` } });
}

export function errorResponse(error: unknown) {
  const status = error instanceof ApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error";
  if (status >= 500) console.error(error);
  return Response.json({ message }, { status });
}
