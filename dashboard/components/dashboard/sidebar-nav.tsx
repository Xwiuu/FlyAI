"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  Users,
  Megaphone,
  Target,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"

const MODULES = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign },
  { label: "Comercial", href: "/comercial", icon: TrendingUp },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Marketing", href: "/marketing", icon: Megaphone },
  { label: "OKRs", href: "/okrs", icon: Target },
  { label: "Agentes", href: "/agentes", icon: Bot },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-0.5">
      {MODULES.map((m) => {
        const Icon = m.icon
        const isActive = pathname === m.href || pathname.startsWith(m.href + "/")
        return (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Link
            key={m.href}
            href={m.href as any}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {m.label}
          </Link>
        )
      })}
    </div>
  )
}
