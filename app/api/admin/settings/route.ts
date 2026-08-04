import { errorResponse, mapSettings, requireAdmin, supabaseRequest } from "@/lib/supabase-admin";
import { requireSiteAccess } from "@/lib/site-password";

const CURRENCIES = new Set(["EUR", "VND"]);

export async function PATCH(request: Request) {
  try {
    await requireSiteAccess(request);
    const admin = await requireAdmin(request);
    const body = (await request.json()) as { teamName?: string; currencies?: string[]; requireProof?: boolean; requiredAppVersion?: string };
    const teamName = body.teamName?.trim();
    if (!teamName || teamName.length > 100) return Response.json({ message: "Add a valid team name" }, { status: 400 });
    const currencies = Array.from(new Set((body.currencies ?? []).filter((currency): currency is string => typeof currency === "string" && CURRENCIES.has(currency))));
    if (!currencies.length) return Response.json({ message: "Choose at least one supported currency" }, { status: 400 });
    const requiredAppVersion = body.requiredAppVersion?.trim();
    if (!requiredAppVersion || !/^\d+(\.\d+){0,2}$/.test(requiredAppVersion)) return Response.json({ message: "Use an app version such as 1.0.1" }, { status: 400 });

    const rows = await supabaseRequest<Array<Parameters<typeof mapSettings>[0]>>(`/rest/v1/teams?id=eq.${encodeURIComponent(admin.team_id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: teamName, currency: currencies[0], allowed_currencies: currencies, require_proof: Boolean(body.requireProof), required_app_version: requiredAppVersion }),
    });
    return Response.json({ settings: rows[0] ? mapSettings(rows[0]) : undefined });
  } catch (error) {
    return errorResponse(error);
  }
}
