import { errorResponse, getExpenses, getMembers, getTeam, isSupabaseConfigured, mapExpense, mapMember, mapSettings, requireMember } from "@/lib/supabase-admin";
import { requireSiteAccess } from "@/lib/site-password";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireSiteAccess(request);
    if (!isSupabaseConfigured()) return Response.json({ configured: false });
    const current = await requireMember(request);
    const [team, members, expenses] = await Promise.all([
      getTeam(current.team_id),
      getMembers(current.team_id),
      getExpenses(current.team_id),
    ]);
    return Response.json({
      configured: true,
      currentMember: mapMember(current),
      members: members.map(mapMember),
      expenses: expenses.map((expense) => mapExpense(expense)),
      settings: mapSettings(team),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
