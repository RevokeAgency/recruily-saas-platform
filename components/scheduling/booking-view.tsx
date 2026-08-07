"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CalendarCheck,
  CalendarX,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Video,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { LocationKind } from "@/lib/scheduling/types"

interface Slot {
  start: string
  end: string
}
interface Day {
  date: string
  slots: Slot[]
}
interface Booking {
  id: string
  startsAt: string
  endsAt: string
  timezone: string
  status: string
  meetingUrl: string | null
  locationKind: LocationKind
  locationValue: string | null
}
interface Context {
  meetingType: {
    name: string
    description: string | null
    durationMinutes: number
    locationKind: LocationKind
    locationValue: string | null
  }
  candidateName: string | null
  jobTitle: string | null
  companyName: string | null
  personalNote: string | null
  timezone: string
  needsPhone: boolean
  booking: Booking | null
  days: Day[]
  degraded?: boolean
  error?: string
}

const LOCATION_ICON: Record<LocationKind, React.ElementType> = {
  video_auto: Video,
  custom_link: Video,
  phone: Phone,
  onsite: MapPin,
}

function locationText(kind: LocationKind, value: string | null, url: string | null): string {
  if (kind === "phone") return "Telefonisch, wir rufen an"
  if (kind === "onsite") return value || "Vor Ort"
  if (url) return "Videocall"
  return "Videocall, Link folgt per E-Mail"
}

function dayLabel(dateKey: string, timezone: string): string {
  // Mittag nehmen, damit der Tag in keiner Zeitzone kippt.
  const d = new Date(`${dateKey}T12:00:00Z`)
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d)
}

function timeLabel(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function fullLabel(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function BookingView({ token }: { token: string }) {
  const [ctx, setCtx] = useState<Context | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Slot | null>(null)
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/booking/${token}`, { cache: "no-store" })
      const data = (await res.json()) as Context
      if (!res.ok) {
        setError(data.error || "Dieser Link funktioniert nicht.")
        return
      }
      setCtx(data)
      setError(null)
    } catch {
      setError("Die Termine konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const days = useMemo(() => ctx?.days ?? [], [ctx])

  const book = async () => {
    if (!selected || !ctx) return
    if (ctx.needsPhone && !phone.trim()) {
      toast.error("Bitte geben Sie eine Telefonnummer an.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/public/booking/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "book", start: selected.start, phone, note }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Der Termin konnte nicht gebucht werden.")
        // Bei einer Kollision die Liste neu holen, damit der vergebene Slot
        // verschwindet statt weiter zum Klicken einzuladen.
        if (res.status === 409) {
          setSelected(null)
          await load()
        }
        return
      }
      setCtx((c) => (c ? { ...c, booking: data.booking, days: [] } : c))
      setSelected(null)
    } catch {
      toast.error("Der Termin konnte nicht gebucht werden.")
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/public/booking/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Der Termin konnte nicht abgesagt werden.")
        return
      }
      toast.success("Termin abgesagt")
      setLoading(true)
      await load()
    } catch {
      toast.error("Der Termin konnte nicht abgesagt werden.")
    } finally {
      setBusy(false)
    }
  }

  // ── Zustände ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !ctx) {
    return (
      <div className="mx-auto max-w-[520px] px-4 py-16 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--rv-mist)]">
          <CalendarX className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <h1 className="text-xl font-bold text-foreground">Link nicht verfügbar</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{error}</p>
      </div>
    )
  }

  const Icon = LOCATION_ICON[ctx.meetingType.locationKind]

  // Bereits gebucht: Übersicht plus Absagen.
  if (ctx.booking) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-12 sm:px-6">
        <div className="rounded-[var(--rv-radius-lg)] border border-[var(--app-line)] bg-white p-7 shadow-[var(--rv-shadow-sm)]">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--rv-green)]">
            <CalendarCheck className="h-5 w-5 text-[#0C1A16]" strokeWidth={2.2} />
          </div>
          <h1 className="text-[1.4rem] font-bold leading-tight tracking-tight text-foreground">
            Ihr Termin steht
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Eine Bestätigung ist unterwegs, samt Eintrag für Ihren Kalender.
          </p>

          <dl className="mt-6 space-y-3 border-t border-[var(--app-line)] pt-5 text-sm">
            <div className="flex gap-4">
              <dt className="w-20 flex-none text-muted-foreground">Wann</dt>
              <dd className="font-medium text-foreground">
                {fullLabel(ctx.booking.startsAt, ctx.booking.timezone)} Uhr
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-20 flex-none text-muted-foreground">Dauer</dt>
              <dd className="text-foreground">{ctx.meetingType.durationMinutes} Minuten</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-20 flex-none text-muted-foreground">Was</dt>
              <dd className="text-foreground">
                {ctx.meetingType.name}
                {ctx.jobTitle ? ` zur Stelle ${ctx.jobTitle}` : ""}
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-20 flex-none text-muted-foreground">Wo</dt>
              <dd className="text-foreground">
                {locationText(ctx.booking.locationKind, ctx.booking.locationValue, ctx.booking.meetingUrl)}
              </dd>
            </div>
          </dl>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {ctx.booking.meetingUrl && (
              <Button asChild>
                <a href={ctx.booking.meetingUrl} target="_blank" rel="noopener">
                  Zum Videocall
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={cancel} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Termin absagen
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Nach einer Absage können Sie über denselben Link direkt einen neuen Termin wählen.
          </p>
        </div>
      </div>
    )
  }

  // ── Auswahl ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[880px] px-4 py-10 sm:px-6 lg:py-14">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:gap-8">
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <div className="rounded-[var(--rv-radius-lg)] border border-[var(--app-line)] bg-white p-6 shadow-[var(--rv-shadow-sm)]">
            {ctx.companyName && (
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--rv-green-deep)]">
                {ctx.companyName}
              </p>
            )}
            <h1 className="mt-2 text-[1.3rem] font-bold leading-tight tracking-tight text-foreground">
              {ctx.meetingType.name}
            </h1>
            {ctx.jobTitle && (
              <p className="mt-1 text-sm text-muted-foreground">zur Stelle {ctx.jobTitle}</p>
            )}

            <div className="mt-5 space-y-2.5 border-t border-[var(--app-line)] pt-5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 flex-none" />
                {ctx.meetingType.durationMinutes} Minuten
              </p>
              <p className="flex items-center gap-2">
                <Icon className="h-4 w-4 flex-none" />
                {locationText(ctx.meetingType.locationKind, ctx.meetingType.locationValue, null)}
              </p>
            </div>

            {ctx.meetingType.description && (
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {ctx.meetingType.description}
              </p>
            )}

            {ctx.personalNote && (
              <p className="mt-5 rounded-xl bg-[var(--app-green-wash)] px-4 py-3 text-sm leading-relaxed text-foreground">
                {ctx.personalNote}
              </p>
            )}

            <p className="mt-5 text-xs text-muted-foreground">
              Zeiten in {ctx.timezone.replace("_", " ")}
            </p>
          </div>
        </aside>

        <div>
          {selected ? (
            <div className="rounded-[var(--rv-radius-lg)] border border-[var(--app-line)] bg-white p-6 shadow-[var(--rv-shadow-sm)]">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Andere Zeit wählen
              </button>

              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {fullLabel(selected.start, ctx.timezone)} Uhr
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {ctx.meetingType.name}, {ctx.meetingType.durationMinutes} Minuten
              </p>

              <div className="mt-6 space-y-4">
                {ctx.needsPhone && (
                  <div>
                    <Label htmlFor="bk-phone" className="text-sm font-medium">
                      Telefonnummer
                    </Label>
                    <Input
                      id="bk-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+43 660 1234567"
                      className="mt-1.5"
                      inputMode="tel"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Unter dieser Nummer rufen wir zur vereinbarten Zeit an.
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="bk-note" className="text-sm font-medium">
                    Möchten Sie uns etwas mitgeben? (freiwillig)
                  </Label>
                  <Textarea
                    id="bk-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Zum Beispiel eine Frage, die Sie im Gespräch klären möchten."
                    className="mt-1.5 resize-none"
                  />
                </div>

                <Button onClick={book} disabled={busy} className="w-full">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Termin verbindlich buchen
                </Button>
              </div>
            </div>
          ) : days.length === 0 ? (
            <div className="rounded-[var(--rv-radius-lg)] border border-[var(--app-line)] bg-white px-6 py-14 text-center shadow-[var(--rv-shadow-sm)]">
              <CalendarX className="mx-auto h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="mt-3 font-medium text-foreground">Gerade sind keine Termine frei</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                Antworten Sie einfach auf die E-Mail mit der Einladung, dann finden wir gemeinsam
                einen Zeitpunkt.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {days.map((day) => (
                <div key={day.date}>
                  <p className="mb-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {dayLabel(day.date, ctx.timezone)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map((slot) => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setSelected(slot)}
                        className="rounded-full border border-[var(--app-line)] bg-white px-4 py-2 text-sm font-medium text-foreground transition-all hover:-translate-y-px hover:border-[var(--rv-green)] hover:shadow-[0_8px_20px_-14px_rgba(22,199,124,.6)]"
                      >
                        {timeLabel(slot.start, ctx.timezone)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
