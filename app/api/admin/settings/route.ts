import { errorResponse, mapSettings, requireAdmin, supabaseRequest } from "@/lib/supabase-admin";

const CURRENCIES = new Set(["THB", "USD", "EUR", "GBP", "SGD"]);

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = (await request.json()) as { teamName?: string; currency?: string; monthlyBudget?: number; requireProof?: boolean; approvalThreshold?: number };
    const teamName = body.teamName?.trim();
    if (!teamName || teamName.length > 100) return Response.json({ message: "Add a valid team name" }, { status: 400 });
    if (!body.currency || !CURRENCIES.has(body.currency)) return Response.json({ message: "Choose a supported currency" }, { status: 400 });
    if (!Number.isFinite(body.monthlyBudget) || Number(body.monthlyBudget) < 0) return Response.json({ message: "Add a valid monthly budget" }, { status: 400 });
    if (!Number.isFinite(body.approvalThreshold) || Number(body.approvalThreshold) < 0) return Response.json({ message: "Add a valid approval threshold" }, { status: 400 });

    const rows = await supabaseRequest<Array<Parameters<typeof mapSettings>[0]>>(`/rest/v1/teams?id=eq.${encodeURIComponent(admin.team_id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: teamName, currency: body.currency, monthly_budget: body.monthlyBudget, require_proof: Boolean(body.requireProof), approval_threshold: body.approvalThreshold }),
    });
    return Response.json({ settings: rows[0] ? mapSettings(rows[0]) : undefined });
  } catch (error) {
    return errorResponse(error);
  }
}
