import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

type CookieToSet = Parameters<SetAllCookies>[0][number];

type AuthState =
  | { kind: "unauthenticated" }
  | { kind: "needs_enroll"; userId: string }
  | { kind: "needs_verify"; userId: string }
  | { kind: "unauthorized"; userId: string }
  | { kind: "ok"; userId: string };

export async function evaluateAuth(
  request: NextRequest,
): Promise<{ response: NextResponse; state: AuthState }> {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response, state: { kind: "unauthenticated" } };
  }

  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentLevel = aalData?.currentLevel ?? "aal1";
  const nextLevel = aalData?.nextLevel ?? "aal1";

  if (currentLevel !== "aal2") {
    if (nextLevel === "aal2") {
      return { response, state: { kind: "needs_verify", userId: user.id } };
    }
    return { response, state: { kind: "needs_enroll", userId: user.id } };
  }

  const { data: authorized } = await supabase
    .from("authorized_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!authorized) {
    await supabase.auth.signOut();
    return { response, state: { kind: "unauthorized", userId: user.id } };
  }

  return { response, state: { kind: "ok", userId: user.id } };
}
