import { NextResponse, type NextRequest } from "next/server";
import { evaluateAuth } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/2fa/enroll", "/2fa/verify"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { response, state } = await evaluateAuth(request);
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    if (state.kind === "ok") {
      return NextResponse.redirect(new URL("/overview", request.url));
    }
    return response;
  }

  switch (state.kind) {
    case "unauthenticated":
      return NextResponse.redirect(new URL("/login", request.url));
    case "needs_enroll":
      return NextResponse.redirect(new URL("/2fa/enroll", request.url));
    case "needs_verify":
      return NextResponse.redirect(new URL("/2fa/verify", request.url));
    case "unauthorized":
      return NextResponse.redirect(
        new URL("/login?error=unauthorized", request.url),
      );
    case "ok":
      return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health).*)",
  ],
};
