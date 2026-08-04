import { errorResponse, mapSettings, requireAdmin, supabaseRequest } from "@/lib/supabase-admin";
import { requireSiteAccess } from "@/lib/site-password";

const CURRENCIES = new Set(["THB", "VND", "EUR", "USD", "GBP", "SGD"]);

export async function PATCH(request: Request) {
  try {
    await requireSiteAccess(request);
    const admin = await requireAdmin(request);
    const body = (await request.json()) as { teamName?: string; currency?: string; requireProof?: boolean };
    const teamName = body.teamName?.trim();
    if (!teamName || teamName.length > 100) return Response.json({ message: "Add a valid team name" }, { status: 400 });
    if (!body.currency || !CURRENCIES.has(body.currency)) return Response.json({ message: "Choose a supported currency" }, { status: 400 });

    const rows = await supabaseRequest<Array<Parameters<typeof mapSettings>[0]>>(`/rest/v1/teams?id=eq.${encodeURIComponent(admin.team_id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: teamName, currency: body.currency, require_proof: Boolean(body.requireProof) }),
    });
    return Response.json({ settings: rows[0] ? mapSettings(rows[0]) : undefined });
  } catch (error) {
    return errorResponse(error);
  }
}
