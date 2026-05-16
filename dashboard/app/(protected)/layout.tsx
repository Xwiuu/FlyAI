import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const MODULES = [
  { label: "Overview", href: "/overview" },
  { label: "Financeiro", href: "/financeiro" },
  { label: "Comercial", href: "/comercial" },
  { label: "Clientes", href: "/clientes" },
  { label: "Marketing", href: "/marketing" },
  { label: "OKRs", href: "/okrs" },
  { label: "Agentes", href: "/agentes" },
] as const;

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if ((aalData?.currentLevel ?? "aal1") !== "aal2") {
    redirect(aalData?.nextLevel === "aal2" ? "/2fa/verify" : "/2fa/enroll");
  }

  const { data: authorized } = await supabase
    .from("authorized_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!authorized) {
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-border bg-background px-5 py-8">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Fly.AI
          </p>
          <p className="mt-1 text-sm font-medium">Control plane</p>
        </div>
        <nav className="flex flex-col gap-1">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {m.label}
            </Link>
          ))}
        </nav>
        <footer className="mt-10 text-xs text-muted-foreground">
          <p className="truncate">{user.email}</p>
        </footer>
      </aside>
      <main className="flex-1 px-10 py-8">{children}</main>
    </div>
  );
}
