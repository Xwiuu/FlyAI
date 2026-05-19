"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[dashboard] page error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <div className="h-8 w-8 rounded-full bg-destructive/20" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Erro ao carregar dados</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Não foi possível buscar os dados do banco. Verifique a conexão e tente novamente.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
