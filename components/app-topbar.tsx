"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { HelpCircle, LogOut, Settings, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { ActivityBell } from "@/components/app/activity-bell"
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
  { name: "Dashboard", href: "/dashboard" },
  { name: "Stellenangebote", href: "/jobs" },
  { name: "Kandidaten", href: "/candidates" },
  { name: "Posteingang", href: "/inbox" },
  { name: "Abonnement", href: "/subscription" },
  { name: "Einstellungen", href: "/settings" },
]

interface UserProfile {
  first_name: string | null
  last_name: string | null
  email: string
  matches_used: number
  matches_limit: number
}

const pillShadow = "shadow-[0_1px_2px_rgba(12,26,22,.06),0_6px_16px_-8px_rgba(12,26,22,.10)]"

function NavPills({ pathname, className }: { pathname: string; className?: string }) {
  return (
    <div
      className={cn(
        "no-scrollbar flex items-center gap-1 overflow-x-auto rounded-full bg-white p-1",
        pillShadow,
        className,
      )}
    >
      {navigation.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-9 flex-none items-center whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-[var(--rv-ink)] text-white"
                : "text-muted-foreground hover:bg-[var(--muted)] hover:text-foreground",
            )}
          >
            {item.name}
          </Link>
        )
      })}
    </div>
  )
}

/**
 * Top pill navigation inside the floating app shell (reference look): logo pill
 * left, centered nav pills (active = black pill), quota pill + help/activity +
 * avatar menu right. Replaces the sidebar; on mobile the nav wraps to a second
 * scrollable row.
 */
export function AppTopbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, matches_used, matches_limit")
        .eq("id", authUser.id)
        .single()
      setUser({
        first_name: profile?.first_name ?? authUser.user_metadata?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        email: authUser.email || "",
        matches_used: profile?.matches_used ?? 0,
        matches_limit: profile?.matches_limit ?? 5,
      })
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

  const displayName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Benutzer"
    : "Benutzer"
  const initials = user
    ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "U"
    : "U"
  const low = user && user.matches_limit > 0 && user.matches_limit - user.matches_used <= user.matches_limit * 0.2

  return (
    <header className="flex-none px-4 pt-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        {/* Logo pill */}
        <Link
          href="/dashboard"
          className={cn("flex h-11 flex-none items-center rounded-full bg-white px-4", pillShadow)}
        >
          <Image
            src="/revetly/LogoEntwurf-trim.png"
            alt="Revetly"
            width={97}
            height={24}
            className="h-5 w-auto"
            priority
          />
        </Link>

        {/* Nav pills (desktop, centered) */}
        <nav className="hidden min-w-0 lg:block">
          <NavPills pathname={pathname} />
        </nav>

        {/* Right cluster */}
        <div className="flex flex-none items-center gap-2">
          {user && (
            <Link
              href="/subscription"
              className={cn(
                "hidden h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold tabular-nums sm:flex",
                pillShadow,
                low ? "text-amber-600" : "text-foreground",
              )}
              title="KI-Matches diesen Monat"
            >
              <Sparkles className="h-4 w-4 text-[var(--rv-green)]" strokeWidth={2} />
              {user.matches_used}/{user.matches_limit}
            </Link>
          )}

          <div className={cn("flex h-11 items-center gap-0.5 rounded-full bg-white px-1.5", pillShadow)}>
            <Link
              href="/help"
              aria-label="Hilfe"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[var(--muted)] hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <ActivityBell />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-white", pillShadow)}
                aria-label="Benutzermenü"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className="text-[#0C1A16] text-xs font-semibold"
                    style={{ backgroundImage: "var(--rv-gradient)" }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Einstellungen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/help">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Hilfe & Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Nav pills (mobile/tablet row) */}
      <nav className="mt-3 lg:hidden">
        <NavPills pathname={pathname} />
      </nav>
    </header>
  )
}
