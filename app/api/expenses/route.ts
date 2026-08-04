import { deleteProof, errorResponse, getMembers, getTeam, mapExpense, requireMember, supabaseRequest, uploadProof } from "@/lib/supabase-admin";
import { requireSiteAccess } from "@/lib/site-password";

const METHODS = new Set(["cash", "card", "bank_transfer", "wallet"]);
const DEFAULT_CATEGORIES = ["Meals", "Transport", "Software", "Supplies", "Utilities", "Travel", "Other"];

function normalizeCategory(value: unknown) {
  const category = String(value ?? "").trim().replace(/\s+/g, " ");
  return category.length > 0 && category.length <= 50 ? category : null;
}

async function ensureTeamCategory(teamId: string, categories: string[] | null | undefined, category: string) {
  const current = categories?.length ? categories : DEFAULT_CATEGORIES;
  if (current.some((candidate) => candidate.toLocaleLowerCase() === category.toLocaleLowerCase())) return;
  if (current.length >= 50) throw new Error("This workspace already has the maximum number of categories");
  await supabaseRequest(`/rest/v1/teams?id=eq.${encodeURIComponent(teamId)}`, {
    method: "PATCH",
    body: JSON.stringify({ categories: [...current, category] }),
  });
}

async function ensureSavedPlace(teamId: string, savedPlaces: string[] | null | undefined, place: string) {
  const normalized = place.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > 160) throw new Error("Add a valid place name");
  const current = savedPlaces ?? [];
  if (current.some((candidate) => candidate.toLocaleLowerCase() === normalized.toLocaleLowerCase())) return;
  if (current.length >= 50) throw new Error("This workspace already has the maximum number of saved places");
  await supabaseRequest(`/rest/v1/teams?id=eq.${encodeURIComponent(teamId)}`, {
    method: "PATCH",
    body: JSON.stringify({ saved_places: [...current, normalized] }),
  });
}

function safeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(-80) || "proof.jpg";
}

export async function POST(request: Request) {
  let uploadedPath: string | null = null;
  try {
    await requireSiteAccess(request);
    const current = await requireMember(request);
    if (current.role === "admin") return Response.json({ message: "Admins review expenses; team members record them" }, { status: 403 });
    const form = await request.formData();
    const merchant = String(form.get("merchant") ?? "").trim();
    const amount = Number(form.get("amount"));
    const currency = String(form.get("currency") ?? "");
    const category = normalizeCategory(form.get("category"));
    const paymentMethod = String(form.get("paymentMethod") ?? "");
    const spentAt = String(form.get("spentAt") ?? "");
    const spenderId = String(form.get("spenderId") ?? "");
    const notes = String(form.get("notes") ?? "").trim().slice(0, 1000);
    const savePlace = String(form.get("savePlace") ?? "") === "true";
    const clientId = String(form.get("clientId") ?? "").trim().slice(0, 100) || null;
    const proof = form.get("proof");
    const proofPath = String(form.get("proofPath") ?? "").trim();
    const proofName = String(form.get("proofName") ?? "").trim().slice(0, 180);
    const proofType = String(form.get("proofType") ?? "").trim();

    if (!merchant || merchant.length > 160) return Response.json({ message: "Add a shorter merchant or reason" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999_999) return Response.json({ message: "Enter a valid amount" }, { status: 400 });
    if (!category) return Response.json({ message: "Choose or add a valid category" }, { status: 400 });
    if (!METHODS.has(paymentMethod)) return Response.json({ message: "Choose a valid payment method" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spentAt)) return Response.json({ message: "Choose a valid spending date" }, { status: 400 });

    const [team, teamMembers] = await Promise.all([getTeam(current.team_id), getMembers(current.team_id)]);
    if (!(team.allowed_currencies ?? [team.currency]).includes(currency)) return Response.json({ message: "Choose an enabled currency" }, { status: 400 });
    if (!teamMembers.some((member) => member.id === spenderId && member.status === "active" && member.role === "member")) return Response.json({ message: "Choose an active team member" }, { status: 400 });
    if (spenderId !== current.id) return Response.json({ message: "Members can only submit their own spending" }, { status: 403 });

    const file = proof instanceof File && proof.size > 0 ? proof : null;
    const directProof = Boolean(proofPath);
    if (directProof && !proofPath.startsWith(`${current.team_id}/`)) return Response.json({ message: "Invalid proof upload" }, { status: 400 });
    if (directProof && (!proofName || !(proofType.startsWith("image/") || proofType === "application/pdf"))) return Response.json({ message: "Invalid proof upload" }, { status: 400 });
    if (team.require_proof && !file && !directProof) return Response.json({ message: "Proof of spending is required" }, { status: 400 });
    if (file && file.size > 10 * 1024 * 1024) return Response.json({ message: "Proof must be smaller than 10 MB" }, { status: 400 });
    if (file && !(file.type.startsWith("image/") || file.type === "application/pdf")) return Response.json({ message: "Proof must be an image or PDF" }, { status: 400 });

    if (directProof) uploadedPath = proofPath;
    else if (file) uploadedPath = `${current.team_id}/${spentAt.slice(0, 7)}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

    const createExpense = supabaseRequest<Array<Parameters<typeof mapExpense>[0]>>("/rest/v1/expenses?on_conflict=team_id,client_id&select=*", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        team_id: current.team_id,
        client_id: clientId,
        spender_id: spenderId,
        created_by: current.id,
        merchant,
        amount,
        currency,
        category,
        payment_method: paymentMethod,
        spent_at: spentAt,
        notes: notes || null,
        proof_path: uploadedPath,
        proof_name: directProof ? proofName : file?.name ?? null,
        proof_type: directProof ? proofType : file?.type ?? null,
        status: "logged",
      }),
    });
    const [expenseResult, uploadResult, categoryResult, placeResult] = await Promise.allSettled([
      createExpense,
      file && uploadedPath && !directProof ? uploadProof(uploadedPath, file) : Promise.resolve(),
      ensureTeamCategory(current.team_id, team.categories, category),
      savePlace ? ensureSavedPlace(current.team_id, team.saved_places, merchant) : Promise.resolve(),
    ]);
    if (expenseResult.status === "rejected" || uploadResult.status === "rejected" || categoryResult.status === "rejected" || placeResult.status === "rejected") {
      if (expenseResult.status === "fulfilled" && expenseResult.value[0]) {
        await supabaseRequest(`/rest/v1/expenses?id=eq.${encodeURIComponent(expenseResult.value[0].id)}`, { method: "DELETE" }).catch(() => undefined);
      }
      if (uploadedPath) await deleteProof(uploadedPath).catch(() => undefined);
      if (expenseResult.status === "rejected") throw expenseResult.reason;
      if (uploadResult.status === "rejected") throw uploadResult.reason;
      if (categoryResult.status === "rejected") throw categoryResult.reason;
      if (placeResult.status === "rejected") throw placeResult.reason;
      throw new Error("Expense could not be saved");
    }
    const rows = expenseResult.value;
    if (!rows[0]) throw new Error("Expense was not returned after saving");
    return Response.json({ expense: mapExpense(rows[0], uploadedPath ? "attached" : null) }, { status: 201 });
  } catch (error) {
    if (uploadedPath) await deleteProof(uploadedPath).catch(() => undefined);
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSiteAccess(request);
    const current = await requireMember(request);
    if (current.role === "admin") return Response.json({ message: "Only team members can change their own expenses" }, { status: 403 });
    const body = (await request.json()) as { action?: "report" | "edit"; expenseId?: string; amount?: number; currency?: string; category?: string; proofPath?: string; proofName?: string; proofType?: string };
    if (!body.expenseId) return Response.json({ message: "Choose an expense" }, { status: 400 });

    const existingRows = await supabaseRequest<Array<Parameters<typeof mapExpense>[0]>>(
      `/rest/v1/expenses?id=eq.${encodeURIComponent(body.expenseId)}&team_id=eq.${encodeURIComponent(current.team_id)}&spender_id=eq.${encodeURIComponent(current.id)}&select=*&limit=1`,
    );
    const existing = existingRows[0];
    if (!existing) return Response.json({ message: "You can only edit your own expenses" }, { status: 404 });

    if (body.action !== "edit") {
      const rows = await supabaseRequest<Array<Parameters<typeof mapExpense>[0]>>(
        `/rest/v1/expenses?id=eq.${encodeURIComponent(body.expenseId)}&team_id=eq.${encodeURIComponent(current.team_id)}&spender_id=eq.${encodeURIComponent(current.id)}&select=*`,
        { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "issue" }) },
      );
      if (!rows[0]) return Response.json({ message: "Expense not found" }, { status: 404 });
      return Response.json({ expense: mapExpense(rows[0]) });
    }

    const amount = Number(body.amount);
    const currency = String(body.currency ?? "");
    const category = normalizeCategory(body.category);
    const proofPath = String(body.proofPath ?? "").trim();
    const proofName = String(body.proofName ?? "").trim().slice(0, 180);
    const proofType = String(body.proofType ?? "").trim();
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999_999_999_999) return Response.json({ message: "Enter a valid amount" }, { status: 400 });
    if (!category) return Response.json({ message: "Choose or add a valid category" }, { status: 400 });
    const team = await getTeam(current.team_id);
    if (!(team.allowed_currencies ?? [team.currency]).includes(currency)) return Response.json({ message: "Choose an enabled currency" }, { status: 400 });
    if (proofPath && !proofPath.startsWith(`${current.team_id}/`)) return Response.json({ message: "Invalid proof upload" }, { status: 400 });
    if (proofPath && (!proofName || !(proofType.startsWith("image/") || proofType === "application/pdf"))) return Response.json({ message: "Invalid proof upload" }, { status: 400 });
    if (team.require_proof && !existing.proof_path && !proofPath) return Response.json({ message: "Proof of spending is required" }, { status: 400 });
    await ensureTeamCategory(current.team_id, team.categories, category);

    const updates: Record<string, unknown> = { amount, currency, category };
    if (proofPath) {
      updates.proof_path = proofPath;
      updates.proof_name = proofName;
      updates.proof_type = proofType;
    }

    const rows = await supabaseRequest<Array<Parameters<typeof mapExpense>[0]>>(
      `/rest/v1/expenses?id=eq.${encodeURIComponent(body.expenseId)}&team_id=eq.${encodeURIComponent(current.team_id)}&spender_id=eq.${encodeURIComponent(current.id)}&select=*`,
      { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(updates) },
    );
    if (!rows[0]) return Response.json({ message: "Expense not found" }, { status: 404 });
    if (proofPath && existing.proof_path && existing.proof_path !== proofPath) await deleteProof(existing.proof_path).catch(() => undefined);
    return Response.json({ expense: mapExpense(rows[0]) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireSiteAccess(request);
    const current = await requireMember(request);
    if (current.role !== "admin") return Response.json({ message: "Only admins can delete expenses" }, { status: 403 });
    const expenseId = new URL(request.url).searchParams.get("expenseId");
    if (!expenseId) return Response.json({ message: "Choose an expense to delete" }, { status: 400 });

    const rows = await supabaseRequest<Array<Parameters<typeof mapExpense>[0]>>(
      `/rest/v1/expenses?id=eq.${encodeURIComponent(expenseId)}&team_id=eq.${encodeURIComponent(current.team_id)}&select=*`,
      { method: "DELETE", headers: { Prefer: "return=representation" } },
    );
    if (!rows[0]) return Response.json({ message: "Expense not found" }, { status: 404 });
    if (rows[0].proof_path) await deleteProof(rows[0].proof_path).catch(() => undefined);
    return Response.json({ expenseId });
  } catch (error) {
    return errorResponse(error);
  }
}
