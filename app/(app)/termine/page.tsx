"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { PageHero } from "@/components/app/page-hero"
import { AvailabilityCard } from "@/components/scheduling/availability-card"
import {
  CalendarAccountsCard,
  type CalendarAccount,
  type SchedulingSetup,
} from "@/components/scheduling/calendar-accounts-card"
import { MeetingTypesCard } from "@/components/scheduling/meeting-types-card"
import {
  UpcomingBookingsCard,
  type RecruiterBooking,
} from "@/components/scheduling/upcoming-bookings-card"
import type { MeetingType, SchedulingProfile } from "@/lib/scheduling/types"

const CONNECT_ERRORS: Record<string, string> = {
  "kein-schluessel": "Die Kalenderanbindung ist noch nicht freigeschaltet (SCHEDULING_TOKEN_KEY fehlt).",
  "nicht-eingerichtet": "Für diesen Anbieter sind noch keine Zugangsdaten hinterlegt.",
  "state-ungueltig": "Die Anfrage war nicht mehr gültig. Bitte noch einmal versuchen.",
  unvollstaendig: "Der Anbieter hat die Anfrage abgebrochen.",
  oauth: "Die Verbindung ist beim Anbieter gescheitert.",
  speichern: "Die Verbindung konnte nicht gespeichert werden.",
  access_denied: "Die Freigabe wurde abgelehnt.",
}

export default function TerminePage() {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<SchedulingProfile | null>(null)
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])
  const [accounts, setAccounts] = useState<CalendarAccount[]>([])
  const [setup, setSetup] = useState<SchedulingSetup>({ encryptionReady: false, google: false, microsoft: false })
  const [bookings, setBookings] = useState<RecruiterBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [migrationMissing, setMigrationMissing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [settingsRes, bookingsRes] = await Promise.all([
        fetch("/api/scheduling/settings", { cache: "no-store" }),
        fetch("/api/scheduling/bookings", { cache: "no-store" }),
      ])

      if (settingsRes.status === 503 || bookingsRes.status === 503) {
        setMigrationMissing(true)
        return
      }
      if (!settingsRes.ok) return

      const settings = await settingsRes.json()
      setProfile(settings.profile)
      setMeetingTypes(settings.meetingTypes ?? [])
      setAccounts(settings.accounts ?? [])
      setSetup(settings.setup)

      if (bookingsRes.ok) {
        const data = await bookingsRes.json()
        setBookings(data.bookings ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Rückmeldung nach dem OAuth-Umweg.
  useEffect(() => {
    const error = searchParams.get("fehler")
    if (error) {
      toast.error(CONNECT_ERRORS[error] ?? "Die Kalenderverbindung ist gescheitert.")
      window.history.replaceState({}, "", "/termine")
    }
    if (searchParams.get("verbunden")) {
      toast.success("Kalender verbunden")
      window.history.replaceState({}, "", "/termine")
    }
  }, [searchParams])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (migrationMissing) {
    return (
      <div className="relative min-h-full">
        <div className="flex flex-col gap-8 p-6 lg:p-8">
          <PageHero
            eyebrow="Kalender"
            title="Kalender & Buchungen"
            subtitle="Bewerber buchen selbst einen Termin aus deinen freien Zeiten."
          />
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">Datenbank noch nicht vorbereitet</p>
              <p className="mt-0.5 text-amber-800">
                Führe <code className="rounded bg-amber-100 px-1">scripts/025_scheduling.sql</code> in
                Supabase aus. Danach steht die Terminplanung bereit.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* Bewusst ohne RevealGroup: Der Kalender ist eine Arbeitsfläche, die
          man mehrmals am Tag öffnet. Karten, die beim Scrollen erst
          eingeblendet werden, halten dabei nur auf. */}
      <div className="relative z-[1] flex flex-col gap-8 p-6 lg:p-8">
        <PageHero
          eyebrow="Kalender"
          title="Kalender & Buchungen"
          subtitle="Lege fest, wann du Zeit hast. Bewerber wählen selbst einen Termin, du bekommst ihn in den Kalender."
        />

        <UpcomingBookingsCard
          bookings={bookings}
          timezone={profile?.timezone ?? "Europe/Vienna"}
          onChanged={load}
        />

        <CalendarAccountsCard accounts={accounts} setup={setup} onChanged={load} />

        {profile && <AvailabilityCard profile={profile} onSaved={setProfile} />}

        <MeetingTypesCard
          meetingTypes={meetingTypes}
          hasCalendar={accounts.some((a) => a.write_enabled)}
          onChanged={load}
        />
      </div>
    </div>
  )
}
