"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface DisabledCtaProps {
  label: string
  tooltip: string
  icon?: React.ReactNode
  className?: string
}

export function DisabledCta({ label, tooltip, icon, className }: DisabledCtaProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* span wrapper is needed so the tooltip fires even on a disabled button */}
          <span className={cn("inline-flex cursor-not-allowed", className)}>
            <Button
              disabled
              variant="outline"
              size="sm"
              className="pointer-events-none gap-2 text-xs"
            >
              {icon ?? <Lock className="h-3 w-3" />}
              {label}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-center leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
