import { NextResponse } from 'next/server'

import { mailProvider } from '@/lib/email/client'
import { sendFixedInterviewInvite } from '@/lib/email/scheduling'
import { createClient } from '@/lib/supabase/server'
import { isoDateTimeToUtc } from '@/lib/scheduling/timezone'

// Feste Interview-Einladung aus dem Kandidatenfenster: Der Recruiter wählt
// Datum und Uhrzeit selbst. Mail und Kalendereintrag kommen aus
// lib/email/scheduling.ts, im selben Layout wie alle anderen Mails.

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
    const { candidateName, candidateEmail, jobTitle, companyName, date, time, format, note } = body

    if (typeof candidateEmail !== 'string' || !candidateEmail.includes('@')) {
      return NextResponse.json({ error: 'Keine gültige Adresse' }, { status: 400 })
    }
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Datum oder Uhrzeit fehlt' }, { status: 400 })
    }

    const timezone = validZone(body.timezone)
    const sent = await sendFixedInterviewInvite({
      to: candidateEmail,
      candidateName: typeof candidateName === 'string' ? candidateName : null,
      jobTitle: typeof jobTitle === 'string' && jobTitle.trim() ? jobTitle.trim() : 'Ihre Bewerbung',
      companyName: typeof companyName === 'string' ? companyName : null,
      start: isoDateTimeToUtc(date, time, timezone),
      durationMinutes: 60,
      timezone,
      format: format === 'remote' ? 'remote' : 'onsite',
      note: typeof note === 'string' ? note : null,
      // Antworten des Bewerbers gehen an den Recruiter, nicht an die Absenderadresse.
      replyTo: user.email ?? null,
    })

    if (!sent) return NextResponse.json({ error: 'Email send failed' }, { status: 502 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[interview-invite] Versand fehlgeschlagen:', error)
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
  }
}
