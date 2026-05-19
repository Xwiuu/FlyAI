import { AlignLeft, Layers, Zap } from "lucide-react"

export const FORMAT_ICON: Record<string, React.ElementType> = {
  carousel: AlignLeft,
  stories: Zap,
  post_unico: Layers,
}

export const FORMAT_LABEL: Record<string, string> = {
  carousel: "Carrossel",
  stories: "Stories",
  post_unico: "Post Único",
}

export function FormatChip({ format }: { format: string }) {
  const Icon = FORMAT_ICON[format] ?? AlignLeft
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Icon className="h-2.5 w-2.5" />
      {FORMAT_LABEL[format] ?? format}
    </span>
  )
}
