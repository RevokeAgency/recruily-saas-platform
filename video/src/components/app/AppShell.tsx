import React from "react"
import { Img, staticFile } from "remotion"
import { HelpCircle, Bell, Sparkles } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

/** Wie components/app-topbar.tsx */
const pillShadow = "shadow-[0_1px_2px_rgba(12,26,22,.06),0_6px_16px_-8px_rgba(12,26,22,.10)]"
const NAV = ["Dashboard", "Stellenangebote", "Kandidaten", "Posteingang", "Kalender", "Abonnement", "Einstellungen"]

/**
 * Die schwebende App-Hülle aus app/(app)/layout.tsx mit der Pill-Navigation
 * aus components/app-topbar.tsx. Klassen 1:1 übernommen; nur Link/Image der
 * App sind durch statische Elemente ersetzt (kein Next im Video).
 */
export const AppShell: React.FC<{
  active: string
  width: number
  height: number
  children: React.ReactNode
}> = ({ active, width, height, children }) => (
  <div
    className="flex flex-col overflow-hidden rounded-[28px] [background:var(--app-canvas)] shadow-[0_40px_90px_-40px_rgba(15,23,32,.5)]"
    style={{ width, height, boxShadow: "0 60px 120px -40px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.12)" }}
  >
    <header className="flex-none px-6 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-11 flex-none items-center rounded-full bg-white px-4 ${pillShadow}`}>
          <Img src={staticFile("logo-positiv.png")} style={{ height: 20, width: "auto" }} />
        </div>
        <div className={`flex items-center gap-1 rounded-full bg-white p-1 ${pillShadow}`}>
          {NAV.map((name) => (
            <span
              key={name}
              className={`flex h-9 flex-none items-center whitespace-nowrap rounded-full px-3.5 text-sm font-medium ${
                name === active ? "bg-[var(--rv-ink)] text-white" : "text-muted-foreground"
              }`}
            >
              {name}
            </span>
          ))}
        </div>
        <div className="flex flex-none items-center gap-2">
          <span className={`flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold tabular-nums text-foreground ${pillShadow}`}>
            <Sparkles className="h-4 w-4 text-[var(--rv-green)]" strokeWidth={2} />
            12/50
          </span>
          <div className={`flex h-11 items-center gap-0.5 rounded-full bg-white px-1.5 ${pillShadow}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground">
              <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground">
              <Bell className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </div>
          <span className={`flex h-11 w-11 items-center justify-center rounded-full bg-white ${pillShadow}`}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[#0C1A16] text-xs font-semibold" style={{ backgroundImage: "var(--rv-gradient)" }}>
                RK
              </AvatarFallback>
            </Avatar>
          </span>
        </div>
      </div>
    </header>
    <div className="relative min-h-0 flex-1">{children}</div>
  </div>
)
