import { redirect } from "next/navigation"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if ((aalData?.currentLevel ?? "aal1") !== "aal2") {
    redirect(aalData?.nextLevel === "aal2" ? "/2fa/verify" : "/2fa/enroll")
  }

  const { data: authorized } = await supabase
    .from("authorized_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!authorized) {
    await supabase.auth.signOut()
    redirect("/login?error=unauthorized")
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-border bg-background">
        {/* Brand */}
        <div className="flex h-14 items-center border-b border-border px-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Fly.AI</p>
            <p className="mt-0.5 text-sm font-medium leading-none">Control Plane</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav />
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-4 py-4">
          <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
          <form action="/api/auth/signout" method="POST" className="mt-2">
            <button
              type="submit"
              className="flex items-center gap-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-3 w-3" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="ml-56 min-w-0 flex-1 overflow-x-hidden px-10 py-8">{children}</main>
    </div>
  )
}
