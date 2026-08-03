import { errorResponse, getExpenses, getMembers, getTeam, isSupabaseConfigured, mapExpense, mapMember, mapSettings, requireMember } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ configured: false });
  try {
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
