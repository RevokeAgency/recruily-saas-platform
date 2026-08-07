"use client"

import { useState } from "react"
import { Clock, Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { HourBlock, SchedulingProfile, WeeklyHours } from "@/lib/scheduling/types"
import { WEEKDAY_KEYS, type WeekdayKey } from "@/lib/scheduling/timezone"

const DAY_LABELS: Record<WeekdayKey, string> = {
  mon: "Montag",
  tue: "Dienstag",
  wed: "Mittwoch",
  thu: "Donnerstag",
  fri: "Freitag",
  sat: "Samstag",
  sun: "Sonntag",
}

// Woche beginnt am Montag, nicht am Sonntag wie im Datumsstandard.
const DAY_ORDER: WeekdayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

const TIMEZONES = [
  "Europe/Vienna",
  "Europe/Berlin",
  "Europe/Zurich",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Warsaw",
  "Europe/Bucharest",
  "UTC",
]

const NOTICE_OPTIONS = [
  { value: 60, label: "1 Stunde" },
  { value: 240, label: "4 Stunden" },
  { value: 720, label: "12 Stunden" },
  { value: 1440, label: "1 Tag" },
  { value: 2880, label: "2 Tage" },
  { value: 4320, label: "3 Tage" },
]

export function AvailabilityCard({
  profile,
  onSaved,
}: {
  profile: SchedulingProfile
  onSaved: (p: SchedulingProfile) => void
}) {
  const [draft, setDraft] = useState<SchedulingProfile>(profile)
  const [saving, setSaving] = useState(false)

  const hours: WeeklyHours = draft.weeklyHours ?? {}

  const setDay = (day: WeekdayKey, blocks: HourBlock[]) =>
    setDraft((d) => ({ ...d, weeklyHours: { ...d.weeklyHours, [day]: blocks } }))

  const toggleDay = (day: WeekdayKey) => {
    const current = hours[day] ?? []
    setDay(day, current.length > 0 ? [] : [{ start: "09:00", end: "17:00" }])
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/scheduling/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen")
      onSaved(data.profile)
      toast.success("Verfügbarkeit gespeichert")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="reveal s2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Verfügbarkeit
        </CardTitle>
        <CardDescription>
          Wann dürfen Bewerber Termine legen? Alles außerhalb dieser Zeiten wird gar nicht erst
          angeboten.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium">Zeitzone</Label>
            <Select
              value={draft.timezone}
              onValueChange={(v) => setDraft((d) => ({ ...d, timezone: v }))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(TIMEZONES.includes(draft.timezone) ? TIMEZONES : [draft.timezone, ...TIMEZONES]).map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Frühestens buchbar in</Label>
            <Select
              value={String(draft.minNoticeMinutes)}
              onValueChange={(v) => setDraft((d) => ({ ...d, minNoticeMinutes: Number(v) }))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTICE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2.5">
          <Label className="text-sm font-medium">Wochenzeiten</Label>
          {DAY_ORDER.map((day) => {
            const blocks = hours[day] ?? []
            const open = blocks.length > 0
            return (
              <div
                key={day}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--app-line)] px-3.5 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-[104px] shrink-0 text-left text-sm font-medium transition-colors ${
                    open ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {DAY_LABELS[day]}
                </button>

                {!open && (
                  <span className="text-sm text-muted-foreground">Geschlossen</span>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {blocks.map((block, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Input
                        type="time"
                        value={block.start}
                        onChange={(e) => {
                          const next = [...blocks]
                          next[i] = { ...next[i], start: e.target.value }
                          setDay(day, next)
                        }}
                        className="h-9 w-[112px]"
                      />
                      <span className="text-muted-foreground">bis</span>
                      <Input
                        type="time"
                        value={block.end}
                        onChange={(e) => {
                          const next = [...blocks]
                          next[i] = { ...next[i], end: e.target.value }
                          setDay(day, next)
                        }}
                        className="h-9 w-[112px]"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDay(day, blocks.filter((_, j) => j !== i))}
                        aria-label="Zeitfenster entfernen"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {open && blocks.length < 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setDay(day, [...blocks, { start: "13:00", end: "17:00" }])}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Fenster
                  </Button>
                )}
              </div>
            )
          })}
          <p className="text-xs text-muted-foreground">
            Zwei Fenster an einem Tag ergeben eine Mittagspause: etwa 09:00 bis 12:00 und 13:00 bis 17:00.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-sm font-medium">Puffer danach</Label>
            <Select
              value={String(draft.bufferAfterMinutes)}
              onValueChange={(v) => setDraft((d) => ({ ...d, bufferAfterMinutes: Number(v) }))}
            >
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 5, 10, 15, 30, 60].map((m) => (
                  <SelectItem key={m} value={String(m)}>{m === 0 ? "Kein Puffer" : `${m} Minuten`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Termine pro Tag</Label>
            <Select
              value={String(draft.maxPerDay)}
              onValueChange={(v) => setDraft((d) => ({ ...d, maxPerDay: Number(v) }))}
            >
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 2, 3, 4, 6, 8, 10].map((m) => (
                  <SelectItem key={m} value={String(m)}>{m === 0 ? "Unbegrenzt" : `Höchstens ${m}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Vorausplanung</Label>
            <Select
              value={String(draft.maxDaysAhead)}
              onValueChange={(v) => setDraft((d) => ({ ...d, maxDaysAhead: Number(v) }))}
            >
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[7, 14, 21, 30, 60, 90].map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} Tage</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Verfügbarkeit speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { WEEKDAY_KEYS }
