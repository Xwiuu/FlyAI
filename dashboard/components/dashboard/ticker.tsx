"use client"

import Marquee from "react-fast-marquee"
import { cn } from "@/lib/utils"

export interface TickerItem {
  label: string
  value: string
  status?: "ok" | "warn" | "error"
}

interface TickerProps {
  items: TickerItem[]
  className?: string
}

export function Ticker({ items, className }: TickerProps) {
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-border bg-muted/40 py-2",
        className,
      )}
    >
      {/* Gradient masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />

      <Marquee pauseOnHover speed={40} gradient={false}>
        {items.map((item, i) => (
          <TickerSegment key={i} item={item} />
        ))}
      </Marquee>
    </div>
  )
}

function TickerSegment({ item }: { item: TickerItem }) {
  return (
    <span className="mx-8 inline-flex items-center gap-2 text-xs">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          item.status === "ok" && "bg-emerald-400",
          item.status === "warn" && "bg-amber-400",
          item.status === "error" && "bg-red-400",
          !item.status && "bg-muted-foreground/50",
        )}
      />
      <span className="text-muted-foreground">{item.label}</span>
      <span className="font-medium tabular-nums">{item.value}</span>
    </span>
  )
}
