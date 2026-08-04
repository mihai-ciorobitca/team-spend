import { ApiError, createProofUploadUrl, errorResponse, getTeam, requireMember } from "@/lib/supabase-admin";
import { requireSiteAccess } from "@/lib/site-password";

const MAX_PROOF_SIZE = 10 * 1024 * 1024;

function safeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(-80) || "proof.jpg";
}

export async function POST(request: Request) {
  try {
    await requireSiteAccess(request);
    const current = await requireMember(request);
    if (current.role === "admin") throw new ApiError("Admins do not upload expense proofs", 403);
    const body = (await request.json()) as { name?: string; type?: string; size?: number; spentAt?: string };
    const name = String(body.name ?? "");
    const type = String(body.type ?? "");
    const size = Number(body.size);
    const spentAt = String(body.spentAt ?? "");
    if (!name || !Number.isFinite(size) || size <= 0 || size > MAX_PROOF_SIZE) throw new ApiError("Proof must be smaller than 10 MB", 400);
    if (!(type.startsWith("image/") || type === "application/pdf")) throw new ApiError("Proof must be an image or PDF", 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spentAt)) throw new ApiError("Choose a valid spending date", 400);
    const team = await getTeam(current.team_id);
    const path = `${current.team_id}/${spentAt.slice(0, 7)}/${crypto.randomUUID()}-${safeFileName(name)}`;
    const upload = await createProofUploadUrl(path);
    return Response.json({ ...upload, path, requireProof: team.require_proof });
  } catch (error) {
    return errorResponse(error);
  }
}
