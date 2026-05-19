import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const reqOrigin = request.headers.get("origin")
  const appOrigin = request.nextUrl.origin
  if (reqOrigin && reqOrigin !== appOrigin) {
    return new NextResponse("Forbidden", { status: 403 })
  }
  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL("/login", appOrigin))
}
