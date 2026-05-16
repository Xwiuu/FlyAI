import { cn } from "@/lib/utils"

interface EmptyModuleProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function EmptyModule({
  title = "Nenhum dado",
  description = "Nenhum registro encontrado ainda.",
  icon,
  className,
  children,
}: EmptyModuleProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      {icon && <div className="text-muted-foreground/40">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      {children}
    </div>
  )
}
