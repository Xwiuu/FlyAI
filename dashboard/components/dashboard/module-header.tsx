import { cn } from "@/lib/utils"

interface ModuleHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  className?: string
  actions?: React.ReactNode
}

export function ModuleHeader({ eyebrow, title, description, className, actions }: ModuleHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground max-w-prose">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 pt-1">{actions}</div>}
    </header>
  )
}
