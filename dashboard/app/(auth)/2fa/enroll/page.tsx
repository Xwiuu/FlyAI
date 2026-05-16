import { EnrollForm } from "./enroll-form";

export default function EnrollPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Fly.AI — Setup
        </p>
        <h1 className="text-xl font-semibold">Configurar 2FA</h1>
        <p className="text-sm text-muted-foreground">
          Escaneie o QR code com seu autenticador. Acesso bloqueado até confirmar.
        </p>
      </header>
      <EnrollForm />
    </div>
  );
}
