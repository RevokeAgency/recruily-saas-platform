"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell, Globe, Mail, UserPlus, Inbox } from "lucide-react"

type Activity = {
  id: string
  candidateName: string
  jobTitle: string
  status: string
  matchScore: number | null
  source: string
  createdAt: string
}

const LAST_SEEN_KEY = "revetly:activities:lastSeen"

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return "gerade eben"
  if (min < 60) return `vor ${min} Min.`
  const h = Math.floor(min / 60)
  if (h < 24) return `vor ${h} Std.`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} ${d === 1 ? "Tag" : "Tagen"}`
  return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short" })
}

function sourceMeta(source: string): { icon: typeof Globe; label: string } {
  switch (source) {
    case "public_page": return { icon: Globe, label: "über die Job-Page" }
    case "email": return { icon: Mail, label: "per E-Mail" }
    default: return { icon: UserPlus, label: "manuell hinzugefügt" }
  }
}

export function ActivityBell() {
  const [items, setItems] = useState<Activity[]>([])
  const [open, setOpen] = useState(false)
  const [lastSeen, setLastSeen] = useState<number>(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/activities")
      const data = await res.json()
      setItems(Array.isArray(data.activities) ? data.activities : [])
    } catch {
      /* keep previous */
    }
  }, [])

  useEffect(() => {
    setLastSeen(Number(localStorage.getItem(LAST_SEEN_KEY) || 0))
    load()
    const t = setInterval(load, 60_000)
    const onMatch = () => load()
    window.addEventListener("match-completed", onMatch)
    return () => { clearInterval(t); window.removeEventListener("match-completed", onMatch) }
  }, [load])

  const hasUnseen = items.some((a) => new Date(a.createdAt).getTime() > lastSeen)

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      load()
      const now = Date.now()
      localStorage.setItem(LAST_SEEN_KEY, String(now))
      setLastSeen(now)
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 relative" aria-label="Aktivitäten">
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {hasUnseen && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-destructive" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Aktivitäten</p>
          <span className="text-xs text-muted-foreground">Letzte Bewerbungen</span>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Inbox className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Noch keine Aktivitäten.</p>
            <p className="text-xs text-muted-foreground">Neue Bewerbungen über deine Job-Page oder per E-Mail erscheinen hier.</p>
          </div>
        ) : (
          <ul className="max-h-[22rem] divide-y divide-border overflow-y-auto">
            {items.map((a) => {
              const { icon: Icon, label } = sourceMeta(a.source)
              const isNew = new Date(a.createdAt).getTime() > lastSeen
              return (
                <li key={a.id}>
                  <Link
                    href="/candidates"
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-[var(--rv-mist)]"
                  >
                    <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--app-green-wash)]">
                      <Icon className="h-4 w-4 text-[var(--rv-green-deep)]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {a.candidateName}
                        {isNew && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-destructive align-middle" />}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Bewerbung {label}{a.jobTitle ? ` · ${a.jobTitle}` : ""}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[0.7rem] text-muted-foreground">{relativeTime(a.createdAt)}</span>
                        {a.matchScore != null && a.status === "scored" && (
                          <span className="rounded-full bg-[var(--app-green-wash)] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[var(--rv-green-deep)]">
                            {a.matchScore}% Match
                          </span>
                        )}
                        {a.status === "queued" && (
                          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-600">
                            wartet auf Kontingent
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        <div className="border-t border-border px-4 py-2.5 text-center">
          <Link href="/candidates" className="text-xs font-medium text-[var(--rv-green-deep)] hover:underline">
            Alle Kandidaten ansehen
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
