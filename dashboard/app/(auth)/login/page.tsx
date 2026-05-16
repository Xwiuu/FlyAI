import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Fly.AI
        </p>
        <h1 className="text-xl font-semibold">Acesso restrito.</h1>
        <p className="text-sm text-muted-foreground">
          Operações internas. Apenas diretoria autorizada.
        </p>
      </header>
      <LoginForm initialError={searchParams.error} />
    </div>
  );
}
