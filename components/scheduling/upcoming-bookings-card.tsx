"use client"

import { useState } from "react"
import { CalendarDays, ExternalLink, Loader2, MapPin, Phone, Video, X } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatInZone } from "@/lib/scheduling/timezone"
import type { LocationKind } from "@/lib/scheduling/types"

export interface RecruiterBooking {
  id: string
  starts_at: string
  ends_at: string
  timezone: string
  status: string
  attendee_name: string | null
  attendee_email: string | null
  attendee_phone: string | null
  attendee_note: string | null
  location_kind: LocationKind
  location_value: string | null
  meeting_url: string | null
  meetingTypeName: string
  job: { id: string; title: string; company: string | null } | null
}

const ICONS: Record<LocationKind, React.ElementType> = {
  video_auto: Video,
  custom_link: Video,
  phone: Phone,
  onsite: MapPin,
}

function groupByDay(bookings: RecruiterBooking[], timezone: string) {
  const groups = new Map<string, RecruiterBooking[]>()
  for (const b of bookings) {
    const key = new Intl.DateTimeFormat("de-DE", {
      timeZone: b.timezone || timezone,
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(b.starts_at))
    const list = groups.get(key) ?? []
    list.push(b)
    groups.set(key, list)
  }
  return [...groups.entries()]
}

export function UpcomingBookingsCard({
  bookings,
  timezone,
  onChanged,
}: {
  bookings: RecruiterBooking[]
  timezone: string
  onChanged: () => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)

  const cancel = async (booking: RecruiterBooking) => {
    setBusyId(booking.id)
    try {
      const res = await fetch(`/api/scheduling/bookings?id=${booking.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Termin abgesagt", {
        description: "Der Bewerber wurde benachrichtigt und kann einen neuen Termin wählen.",
      })
      onChanged()
    } catch {
      toast.error("Termin konnte nicht abgesagt werden")
    } finally {
      setBusyId(null)
    }
  }

  const groups = groupByDay(bookings, timezone)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Kommende Termine
        </CardTitle>
        <CardDescription>
          {bookings.length === 0
            ? "Sobald ein Bewerber bucht, steht der Termin hier."
            : `${bookings.length} ${bookings.length === 1 ? "Termin" : "Termine"} in den nächsten Wochen.`}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">Noch keine Termine gebucht.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Lade Bewerber aus dem Job-Container heraus ein. Sie bekommen einen Link und wählen
              selbst einen Termin aus deinen freien Zeiten.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([day, items]) => (
              <div key={day}>
                <p className="mb-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {day}
                </p>
                <div className="space-y-2.5">
                  {items.map((booking) => {
                    const Icon = ICONS[booking.location_kind]
                    const start = new Date(booking.starts_at)
                    const end = new Date(booking.ends_at)
                    const tz = booking.timezone || timezone
                    const time = new Intl.DateTimeFormat("de-DE", {
                      timeZone: tz, hour: "2-digit", minute: "2-digit",
                    })
                    return (
                      <div
                        key={booking.id}
                        className="flex flex-wrap items-start gap-3 rounded-xl border border-[var(--app-line)] p-4"
                      >
                        <div className="w-[104px] flex-none">
                          <p className="font-semibold text-foreground">{time.format(start)}</p>
                          <p className="text-xs text-muted-foreground">bis {time.format(end)}</p>
                        </div>

                        <div className="min-w-[180px] flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">
                              {booking.attendee_name || booking.attendee_email || "Bewerber"}
                            </span>
                            <Badge variant="outline">{booking.meetingTypeName}</Badge>
                          </div>
                          {booking.job && (
                            <p className="mt-0.5 text-sm text-muted-foreground">{booking.job.title}</p>
                          )}
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" />
                            {booking.location_kind === "phone"
                              ? booking.attendee_phone || "Telefonisch"
                              : booking.location_kind === "onsite"
                                ? booking.location_value || "Vor Ort"
                                : "Videocall"}
                          </p>
                          {booking.attendee_note && (
                            <p className="mt-2 rounded-lg bg-[var(--app-green-wash)] px-3 py-2 text-xs text-muted-foreground">
                              {booking.attendee_note}
                            </p>
                          )}
                        </div>

                        <div className="ml-auto flex items-center gap-1.5">
                          {booking.meeting_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={booking.meeting_url} target="_blank" rel="noopener">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Beitreten
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancel(booking)}
                            disabled={busyId === booking.id}
                          >
                            {busyId === booking.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                            Absagen
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { formatInZone }
