import { VerifyForm } from "./verify-form";

export default function VerifyPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Fly.AI
        </p>
        <h1 className="text-xl font-semibold">Verificação 2FA</h1>
        <p className="text-sm text-muted-foreground">
          Informe o código do seu autenticador.
        </p>
      </header>
      <VerifyForm />
    </div>
  );
}
