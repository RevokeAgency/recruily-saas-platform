"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Stellenangebote", href: "/jobs", icon: Briefcase },
  { name: "Kandidaten", href: "/candidates", icon: Users },
  { name: "Abonnement", href: "/subscription", icon: CreditCard },
  { name: "Einstellungen", href: "/settings", icon: Settings },
]

const mockUser = {
  name: "Max Mustermann",
  email: "max@recruily.de",
  initials: "MM",
}

export function AppSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

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
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-base">R</span>
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">Recruily</span>
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
      <div className="p-3 border-t border-sidebar-border space-y-2">
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
                  {mockUser.initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{mockUser.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{mockUser.email}</p>
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
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
