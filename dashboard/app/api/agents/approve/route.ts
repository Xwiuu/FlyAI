import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  kind: z.enum(["post", "brief"]),
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { kind, id, decision } = parsed.data;

  const supabase = createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (kind === "post") {
    const patch =
      decision === "approved"
        ? { status: "approved" as const, approved_at: new Date().toISOString(), approved_by: user.id }
        : { status: "rejected" as const };
    const { error } = await supabase.from("posts").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ ok: true });
  }

  // brief: only 'approved' is meaningful; rejection just leaves it pending.
  if (decision === "rejected") {
    return NextResponse.json({ error: "briefs cannot be rejected" }, { status: 400 });
  }
  const { error } = await supabase
    .from("briefs")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
