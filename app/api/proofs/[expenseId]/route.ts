import { ApiError, createProofSignedUrl, errorResponse, requireMember, supabaseRequest } from "@/lib/supabase-admin";
import { requireSiteAccess } from "@/lib/site-password";

export async function GET(request: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  try {
    await requireSiteAccess(request);
    const current = await requireMember(request);
    const { expenseId } = await params;
    const rows = await supabaseRequest<Array<{ proof_path: string | null; proof_type: string | null }>>(
      `/rest/v1/expenses?id=eq.${encodeURIComponent(expenseId)}&team_id=eq.${encodeURIComponent(current.team_id)}&select=proof_path,proof_type&limit=1`,
    );
    const expense = rows[0];
    if (!expense?.proof_path) throw new ApiError("Proof was not found", 404);
    return Response.json({ url: await createProofSignedUrl(expense.proof_path), contentType: expense.proof_type ?? "image/*" });
  } catch (error) {
    return errorResponse(error);
  }
}
