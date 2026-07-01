"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  Briefcase,
  Users,
  CreditCard,
  Settings,
  LogOut,
  HelpCircle,
  Bell,
  Menu,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RvBrandMark } from "@/components/landing/rv-brand-mark"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
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
  
  const getProgressColor = () => {
    if (remainingPercentage <= 0) return "bg-red-500"
    if (remainingPercentage <= 20) return "bg-amber-500"
    return "bg-[var(--rv-green)]"
  }

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
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo & Menu Toggle */}
      <div className="flex items-center justify-between p-5 border-b border-slate-200">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <RvBrandMark />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-snappy", collapsed && "mx-auto")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-snappy",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0 transition-colors",
                isActive ? "text-primary-foreground" : "text-slate-400"
              )} />
              {!collapsed && (
                <span className="flex-1">{item.name}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-sidebar-border space-y-3">
        {/* Match Counter Widget */}
        {!collapsed && user && (
          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Sparkles className="h-4 w-4 text-[var(--rv-green)]" />
                <span>KI-Matches</span>
              </div>
              <span className="font-medium text-slate-900">
                {user.matches_used}/{user.matches_limit}
              </span>
            </div>
            <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={cn("absolute inset-y-0 left-0 rounded-full transition-all", getProgressColor())}
                style={{ width: `${Math.min(matchPercentage, 100)}%` }}
              />
            </div>
            {remainingPercentage <= 20 && (
              <p className="text-xs text-amber-600">
                {remainingPercentage <= 0 
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
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Button>
          </div>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-accent transition-colors",
                collapsed && "justify-center"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
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
