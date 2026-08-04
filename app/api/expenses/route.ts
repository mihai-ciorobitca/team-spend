import { deleteProof, errorResponse, getMembers, getTeam, mapExpense, requireMember, supabaseRequest, uploadProof } from "@/lib/supabase-admin";
import { requireSiteAccess } from "@/lib/site-password";

const METHODS = new Set(["cash", "card", "bank_transfer", "wallet"]);
const CATEGORIES = new Set(["Meals", "Transport", "Software", "Supplies", "Utilities", "Travel", "Other"]);

function safeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(-80) || "proof.jpg";
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;
  try {
    await requireSiteAccess(request);
    const current = await requireMember(request);
    const form = await request.formData();
    const merchant = String(form.get("merchant") ?? "").trim();
    const amount = Number(form.get("amount"));
    const category = String(form.get("category") ?? "");
    const paymentMethod = String(form.get("paymentMethod") ?? "");
    const spentAt = String(form.get("spentAt") ?? "");
    const spenderId = String(form.get("spenderId") ?? "");
    const notes = String(form.get("notes") ?? "").trim().slice(0, 1000);
    const proof = form.get("proof");

    if (!merchant || merchant.length > 160) return Response.json({ message: "Add a shorter merchant or reason" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999_999) return Response.json({ message: "Enter a valid amount" }, { status: 400 });
    if (!CATEGORIES.has(category)) return Response.json({ message: "Choose a valid category" }, { status: 400 });
    if (!METHODS.has(paymentMethod)) return Response.json({ message: "Choose a valid payment method" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spentAt)) return Response.json({ message: "Choose a valid spending date" }, { status: 400 });

    const [team, teamMembers] = await Promise.all([getTeam(current.team_id), getMembers(current.team_id)]);
    if (!teamMembers.some((member) => member.id === spenderId && member.status === "active")) return Response.json({ message: "Choose an active team member" }, { status: 400 });

    const file = proof instanceof File && proof.size > 0 ? proof : null;
    if (team.require_proof && !file) return Response.json({ message: "Proof of spending is required" }, { status: 400 });
    if (file && file.size > 10 * 1024 * 1024) return Response.json({ message: "Proof must be smaller than 10 MB" }, { status: 400 });
    if (file && !(file.type.startsWith("image/") || file.type === "application/pdf")) return Response.json({ message: "Proof must be an image or PDF" }, { status: 400 });

    if (file) {
      uploadedPath = `${current.team_id}/${spentAt.slice(0, 7)}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      await uploadProof(uploadedPath, file);
    }

    const rows = await supabaseRequest<Array<Parameters<typeof mapExpense>[0]>>("/rest/v1/expenses?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        team_id: current.team_id,
        spender_id: spenderId,
        created_by: current.id,
        merchant,
        amount,
        category,
        payment_method: paymentMethod,
        spent_at: spentAt,
        notes: notes || null,
        proof_path: uploadedPath,
        proof_name: file?.name ?? null,
        proof_type: file?.type ?? null,
        status: "logged",
      }),
    });
    if (!rows[0]) throw new Error("Expense was not returned after saving");
    return Response.json({ expense: mapExpense(rows[0], uploadedPath ? "attached" : null) }, { status: 201 });
  } catch (error) {
    if (uploadedPath) await deleteProof(uploadedPath).catch(() => undefined);
    return errorResponse(error);
  }
}
