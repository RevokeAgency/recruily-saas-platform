"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Inbox,
  CreditCard,
  Settings,
  LogOut,
  HelpCircle,
  Menu,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SidebarNavItem } from "@/components/dashboard/sidebar-nav-item"
import { ActivityBell } from "@/components/app/activity-bell"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Stellenangebote", href: "/jobs", icon: Briefcase },
  { name: "Kandidaten", href: "/candidates", icon: Users },
  { name: "Posteingang", href: "/inbox", icon: Inbox },
  { name: "Abonnement", href: "/subscription", icon: CreditCard },
  { name: "Einstellungen", href: "/settings", icon: Settings },
]

interface UserProfile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  plan: string
  matches_used: number
  matches_limit: number
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()

      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        setUser({
          id: authUser.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: authUser.email || '',
          plan: profile.plan,
          matches_used: profile.matches_used,
          matches_limit: profile.matches_limit,
        })
      } else {
        // Fallback if profile doesn't exist yet
        setUser({
          id: authUser.id,
          first_name: authUser.user_metadata?.first_name || null,
          last_name: authUser.user_metadata?.last_name || null,
          email: authUser.email || '',
          plan: 'free',
          matches_used: 0,
          matches_limit: 10,
        })
      }

      setLoading(false)
    }

    loadUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("Erfolgreich abgemeldet")
    router.push("/")
    router.refresh()
  }

  // Calculate match usage percentage and color
  const matchPercentage = user ? (user.matches_used / user.matches_limit) * 100 : 0
  const remainingPercentage = 100 - matchPercentage
  const isLow = remainingPercentage <= 20
  const isExhausted = remainingPercentage <= 0

  // Get user display name and initials
  const displayName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Benutzer'
    : 'Benutzer'

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : 'U'

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo & Menu Toggle */}
      <div className="flex items-center justify-between p-5 border-b border-border">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center">
            <Image src="/revetly/LogoEntwurf-trim.png" alt="Revetly" width={97} height={24} className="h-6 w-auto" priority />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("text-muted-foreground", collapsed && "mx-auto")}
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <SidebarNavItem
              key={item.name}
              href={item.href}
              label={item.name}
              icon={item.icon}
              active={isActive}
              collapsed={collapsed}
            />
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-sidebar-border space-y-3">
        {/* Match Counter Widget */}
        {!collapsed && user && (
          <div className="rounded-[10px] bg-[var(--rv-mist)] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-[var(--rv-green)]" strokeWidth={1.75} />
                <span className="font-medium">KI-Matches</span>
              </div>
              <span className="font-semibold text-foreground tabular-nums">
                {user.matches_used}/{user.matches_limit}
              </span>
            </div>
            <div className="relative h-1.5 bg-[rgba(12,26,22,.08)] rounded-full overflow-hidden">
              <div
                className={cn(
                  "absolute inset-0 w-full rounded-full transition-transform duration-200 ease-out",
                  isExhausted ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-[image:var(--rv-gradient)]",
                )}
                style={{ transform: `scaleX(${Math.min(matchPercentage, 100) / 100})`, transformOrigin: "left" }}
              />
            </div>
            {isLow && (
              <p className="text-[0.7rem] text-amber-600">
                {isExhausted
                  ? "Limit erreicht - Upgrade erforderlich"
                  : `Nur noch ${user.matches_limit - user.matches_used} Matches übrig`
                }
              </p>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {!collapsed && (
          <div className="flex items-center justify-center gap-1 pb-2">
            <Button asChild variant="ghost" size="icon" className="text-muted-foreground h-8 w-8" aria-label="Hilfe">
              <Link href="/help">
                <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Button>
            <ActivityBell />
          </div>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-3 w-full p-2 rounded-[10px] hover:bg-[var(--rv-mist)] transition-colors duration-150 ease-out",
                collapsed && "justify-center"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className="text-[#0C1A16] text-xs font-semibold"
                  style={{ backgroundImage: "var(--rv-gradient)" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {loading ? "Lädt..." : displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || ""}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Einstellungen
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              Hilfe & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
