import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-muted text-muted-foreground",
        pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        approved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        rejected: "bg-destructive/10 text-destructive border border-destructive/20",
        published: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
        draft: "bg-muted text-muted-foreground border border-border",
        success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        error: "bg-red-500/10 text-red-400 border border-red-500/20",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
