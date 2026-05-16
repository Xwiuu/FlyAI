"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EnrollData = {
  factorId: string;
  qrSvg: string;
  secret: string;
};

export function EnrollForm() {
  const router = useRouter();
  const supabase = createClient();
  const [enroll, setEnroll] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `flyai-${Date.now()}`,
      });
      if (!active) return;
      if (enrollError || !data) {
        setError(enrollError?.message ?? "Falha ao iniciar 2FA.");
        return;
      }
      setEnroll({
        factorId: data.id,
        qrSvg: data.totp.qr_code,
        secret: data.totp.secret,
      });
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!enroll) return;
    setBusy(true);
    setError(null);
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "Falha no challenge.");
      setBusy(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enroll.factorId,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) {
      setError("Código inválido.");
      setBusy(false);
      return;
    }
    router.replace("/overview");
    router.refresh();
  }

  if (!enroll) {
    return <p className="text-sm text-muted-foreground">Gerando QR...</p>;
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-md border bg-white p-4"
        dangerouslySetInnerHTML={{ __html: enroll.qrSvg }}
      />
      <p className="text-xs text-muted-foreground break-all">
        Secret: <span className="font-mono">{enroll.secret}</span>
      </p>
      <form onSubmit={onVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Código de 6 dígitos</Label>
          <Input
            id="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive-foreground bg-destructive/80 px-3 py-2 rounded-md">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Verificando..." : "Confirmar"}
        </Button>
      </form>
    </div>
  );
}
