import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface SidebarNavItemProps {
  href: string
  label: string
  icon: LucideIcon
  active?: boolean
  collapsed?: boolean
}

/**
 * Sidebar nav row per DASHBOARD_AUTH_REDESIGN.md §4: active state is a
 * green-wash background + green-deep text + 3px gradient bar on the left —
 * deliberately NOT a solid green pill fill.
 */
export function SidebarNavItem({ href, label, icon: Icon, active, collapsed }: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-[10px] px-4 py-2.5 text-sm font-medium transition-colors duration-150 ease-out",
        active
          ? "bg-[var(--app-green-wash)] text-[var(--rv-green-deep)]"
          : "text-[var(--rv-ink-soft)] hover:bg-[var(--rv-mist)] hover:text-foreground",
      )}
    >
      {active && (
        <span
          className="absolute inset-y-1.5 left-0 w-[3px] rounded-full"
          style={{ backgroundImage: "var(--rv-gradient)" }}
          aria-hidden="true"
        />
      )}
      <Icon className={cn("h-5 w-5 flex-none", active ? "text-[var(--rv-green-deep)]" : "text-muted-foreground")} strokeWidth={1.75} />
      {!collapsed && <span className="flex-1">{label}</span>}
    </Link>
  )
}
