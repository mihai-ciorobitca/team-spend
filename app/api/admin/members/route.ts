import { errorResponse, mapMember, requireAdmin, supabaseRequest } from "@/lib/supabase-admin";
import { requireSiteAccess } from "@/lib/site-password";
import { hashMemberPassword, isValidMemberPassword } from "@/lib/member-password";

const COLORS = ["#a9d9c7", "#f5a98c", "#c5b8e8", "#f3bf73", "#9fc5dc"];

export async function POST(request: Request) {
  try {
    await requireSiteAccess(request);
    const admin = await requireAdmin(request);
    const body = (await request.json()) as { name?: string; email?: string; role?: string; password?: string };
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = body.role === "admin" ? "admin" : "member";
    const password = String(body.password ?? "");
    if (!name || name.length > 120) return Response.json({ message: "Add a valid member name" }, { status: 400 });
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ message: "Add a valid member email" }, { status: 400 });
    if (role === "member" && !isValidMemberPassword(password)) return Response.json({ message: "Set a member password with 8 to 128 characters" }, { status: 400 });
    const passwordHash = role === "member" ? await hashMemberPassword(password) : null;

    const rows = await supabaseRequest<Array<Parameters<typeof mapMember>[0]>>("/rest/v1/team_members?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ team_id: admin.team_id, full_name: name, email, role, status: "active", password_hash: passwordHash, avatar_color: COLORS[Math.floor(Math.random() * COLORS.length)] }),
    });
    if (!rows[0]) throw new Error("Member was not returned after saving");
    return Response.json({ member: mapMember(rows[0]) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSiteAccess(request);
    const admin = await requireAdmin(request);
    const body = (await request.json()) as { memberId?: string; password?: string };
    const memberId = String(body.memberId ?? "");
    const password = String(body.password ?? "");
    if (!memberId) return Response.json({ message: "Choose a member" }, { status: 400 });
    if (!isValidMemberPassword(password)) return Response.json({ message: "Set a member password with 8 to 128 characters" }, { status: 400 });

    const targets = await supabaseRequest<Array<Parameters<typeof mapMember>[0]>>(
      `/rest/v1/team_members?id=eq.${encodeURIComponent(memberId)}&team_id=eq.${encodeURIComponent(admin.team_id)}&role=eq.member&select=*&limit=1`,
    );
    if (!targets[0]) return Response.json({ message: "That member was not found" }, { status: 404 });

    const rows = await supabaseRequest<Array<Parameters<typeof mapMember>[0]>>(
      `/rest/v1/team_members?id=eq.${encodeURIComponent(memberId)}&team_id=eq.${encodeURIComponent(admin.team_id)}&select=*`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ password_hash: await hashMemberPassword(password) }),
      },
    );
    if (!rows[0]) throw new Error("Member was not returned after updating the password");
    return Response.json({ member: mapMember(rows[0]) });
  } catch (error) {
    return errorResponse(error);
  }
}
