import { NextResponse } from 'next/server'

import { mailProvider } from '@/lib/email/client'
import { sendFixedInterviewInvite } from '@/lib/email/scheduling'
import { createBooking, refreshNextInterview } from '@/lib/scheduling/booking'
import { adminClient } from '@/lib/scheduling/store'
import { createClient } from '@/lib/supabase/server'
import { isoDateTimeToUtc } from '@/lib/scheduling/timezone'
import type { MeetingType } from '@/lib/scheduling/types'

// Feste Interview-Einladung aus dem Kandidatenfenster: Der Recruiter wählt
// Datum und Uhrzeit selbst. Der Termin läuft denselben Weg wie eine
// Selbstbuchung: Er wird als Buchung gespeichert (Termine-Seite, absagbar,
// blockiert die Zeit für Buchungslinks) und in den Kalender der einladenden
// Person eingetragen, bei "Remote" mit Meet- oder Teams-Link. Ohne
// verbundenen Kalender bleibt es bei Buchung und Mail.

const DURATION_MINUTES = 60

const DEFAULT_ZONE = 'Europe/Vienna'

function validZone(zone: unknown): string {
  if (typeof zone !== 'string' || !zone) return DEFAULT_ZONE
  try {
    new Intl.DateTimeFormat('de-DE', { timeZone: zone })
    return zone
  } catch {
    return DEFAULT_ZONE
  }
}

export async function POST(req: Request) {
  try {
    if (!mailProvider()) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { candidateName, candidateEmail, jobTitle, companyName, date, time, format, note, jobCandidateId } = body

    if (typeof candidateEmail !== 'string' || !candidateEmail.includes('@')) {
      return NextResponse.json({ error: 'Keine gültige Adresse' }, { status: 400 })
    }
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Datum oder Uhrzeit fehlt' }, { status: 400 })
    }

    const timezone = validZone(body.timezone)
    const start = isoDateTimeToUtc(date, time, timezone)
    const end = new Date(start.getTime() + DURATION_MINUTES * 60000)
    const remote = format === 'remote'
    const title = typeof jobTitle === 'string' && jobTitle.trim() ? jobTitle.trim() : 'Ihre Bewerbung'
    const name = typeof candidateName === 'string' ? candidateName : null

    // Buchung nur zu einer Bewerbung, die diese Person sehen darf. Die Abfrage
    // läuft mit ihrer Sitzung, die Zugriffsregeln (Team, private Stellen)
    // entscheiden also mit.
    let bookingId: string | null = null
    let meetingUrl: string | null = null
    let calendar: 'eingetragen' | 'nicht-verbunden' | 'fehler' | 'ohne-buchung' = 'ohne-buchung'
    if (typeof jobCandidateId === 'string' && jobCandidateId) {
      const { data: link } = await supabase
        .from('job_candidates')
        .select('id, job_id, candidate_id')
        .eq('id', jobCandidateId)
        .maybeSingle()

      if (link) {
        const meetingType: MeetingType = {
          id: '',
          userId: user.id,
          name: 'Vorstellungsgespräch',
          description: null,
          durationMinutes: DURATION_MINUTES,
          locationKind: remote ? 'video_auto' : 'onsite',
          locationValue: null,
          isDefault: false,
          active: true,
        }
        const db = adminClient()
        const result = await createBooking(db, {
          userId: user.id,
          meetingType,
          start,
          end,
          timezone,
          jobCandidateId: link.id,
          jobId: link.job_id,
          candidateId: link.candidate_id,
          attendeeName: name,
          attendeeEmail: candidateEmail,
          jobTitle: title,
          companyName: typeof companyName === 'string' ? companyName : null,
        })
        if ('booking' in result) {
          bookingId = result.booking.id
          meetingUrl = result.booking.meeting_url
          calendar = result.booking.external_event_id ? 'eingetragen' : 'nicht-verbunden'
          await refreshNextInterview(db, link.id)
          // Verbunden, aber der Eintrag ist gescheitert: createBooking hat den
          // Grund am Kalenderkonto vermerkt.
          if (!result.booking.external_event_id) {
            const { count } = await db
              .from('calendar_accounts')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
            if (count) calendar = 'fehler'
          }
        }
      }
    }

    const sent = await sendFixedInterviewInvite({
      to: candidateEmail,
      candidateName: name,
      jobTitle: title,
      companyName: typeof companyName === 'string' ? companyName : null,
      start,
      durationMinutes: DURATION_MINUTES,
      timezone,
      format: remote ? 'remote' : 'onsite',
      note: typeof note === 'string' ? note : null,
      // Antworten des Bewerbers gehen an den Recruiter, nicht an die Absenderadresse.
      replyTo: user.email ?? null,
      meetingUrl,
      bookingId,
    })

    if (!sent) return NextResponse.json({ error: 'Email send failed', calendar }, { status: 502 })
    return NextResponse.json({ success: true, calendar, meetingUrl })
  } catch (error) {
    console.error('[interview-invite] Versand fehlgeschlagen:', error)
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
  }
}
