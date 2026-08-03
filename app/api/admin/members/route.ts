import { errorResponse, mapMember, requireAdmin, supabaseRequest } from "@/lib/supabase-admin";

const COLORS = ["#a9d9c7", "#f5a98c", "#c5b8e8", "#f3bf73", "#9fc5dc"];

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = (await request.json()) as { name?: string; email?: string; role?: string };
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = body.role === "admin" ? "admin" : "member";
    if (!name || name.length > 120) return Response.json({ message: "Add a valid member name" }, { status: 400 });
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ message: "Add a valid member email" }, { status: 400 });

    const rows = await supabaseRequest<Array<Parameters<typeof mapMember>[0]>>("/rest/v1/team_members?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ team_id: admin.team_id, full_name: name, email, role, status: "invited", avatar_color: COLORS[Math.floor(Math.random() * COLORS.length)] }),
    });
    if (!rows[0]) throw new Error("Member was not returned after saving");
    return Response.json({ member: mapMember(rows[0]) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
