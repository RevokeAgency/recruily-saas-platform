import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

function generateICS(
  title: string,
  date: string,
  time: string,
  location: string,
  description: string
): string {
  // date: "YYYY-MM-DD", time: "HH:MM"
  const [year, month, day] = date.split('-')
  const [hour, minute] = time.split(':')

  const pad = (n: string) => n.padStart(2, '0')

  const startDT = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`
  // End = start + 60 min
  const endHour = String(parseInt(hour) + 1).padStart(2, '0')
  const endDT = `${year}${pad(month)}${pad(day)}T${endHour}${pad(minute)}00`

  const now = new Date()
  const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//REVETLY//Recruily//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${stamp}-recruily@revetly.ai`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${startDT}`,
    `DTEND:${endDT}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function googleCalendarUrl(
  title: string,
  date: string,
  time: string,
  location: string,
  description: string
): string {
  const [year, month, day] = date.split('-')
  const [hour, minute] = time.split(':')
  const pad = (n: string) => n.padStart(2, '0')
  const startDT = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`
  const endHour = String(parseInt(hour) + 1).padStart(2, '0')
  const endDT = `${year}${pad(month)}${pad(day)}T${endHour}${pad(minute)}00`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startDT}/${endDT}`,
    details: description,
    location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      candidateName,
      candidateEmail,
      jobTitle,
      companyName,
      date,
      time,
      format,
      note,
    } = await req.json()

    const formatLabel = format === 'remote' ? 'Remote' : 'Vor Ort'
    const eventTitle = `Interview: ${jobTitle} bei ${companyName}`
    const eventDescription = [
      `Interview fuer: ${candidateName}`,
      `Position: ${jobTitle}`,
      `Unternehmen: ${companyName}`,
      `Format: ${formatLabel}`,
      note ? `Notiz: ${note}` : '',
    ].filter(Boolean).join('\n')

    const icsContent = generateICS(eventTitle, date, time, formatLabel, eventDescription)
    const icsBase64 = Buffer.from(icsContent).toString('base64')
    const googleUrl = googleCalendarUrl(eventTitle, date, time, formatLabel, eventDescription)

    // Format date for display in email
    const [year, month, day] = date.split('-')
    const displayDate = `${day}.${month}.${year}`

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'karriere@revetly.ai',
      to: candidateEmail,
      subject: `Einladung zum Interview: ${jobTitle} bei ${companyName}`,
      attachments: [
        {
          filename: 'interview-einladung.ics',
          content: icsBase64,
        },
      ],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #334155;">
          <div style="margin-bottom: 32px;">
            <span style="background: #0d9488; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;">
              ${companyName}
            </span>
          </div>

          <h2 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 8px;">
            Einladung zum Vorstellungsgesprach
          </h2>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 32px;">
            ${jobTitle} &mdash; ${companyName}
          </p>

          <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
            Sehr geehrte/r ${candidateName},
          </p>
          <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
            wir freuen uns, Sie zu einem Vorstellungsgesprach fur die Position <strong>${jobTitle}</strong> bei <strong>${companyName}</strong> einzuladen.
          </p>

          <!-- Details Box -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;">Datum</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 15px;">${displayDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Uhrzeit</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 15px;">${time} Uhr</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Format</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 15px;">${formatLabel}</td>
              </tr>
              ${note ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; vertical-align: top;">Notiz</td>
                <td style="padding: 8px 0; color: #334155; font-size: 14px;">${note}</td>
              </tr>` : ''}
            </table>
          </div>

          <p style="font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
            Bitte bestatigen Sie Ihre Teilnahme per E-Mail. Bei Fragen stehen wir Ihnen gerne zur Verfugung.
          </p>

          <!-- Calendar Links -->
          <div style="background: #f0fdf9; border: 1px solid #ccfbf1; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <p style="font-size: 13px; font-weight: 600; color: #0d9488; margin: 0 0 14px; text-transform: uppercase; letter-spacing: 0.5px;">
              Termin speichern
            </p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <a href="${googleUrl}" target="_blank"
                 style="display: inline-block; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; font-size: 14px; color: #0d9488; font-weight: 500; text-decoration: none; margin-bottom: 8px;">
                &#128197; Zu Google Calendar hinzufuegen
              </a>
              <a href="cid:interview-einladung.ics"
                 style="display: inline-block; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; font-size: 14px; color: #0d9488; font-weight: 500; text-decoration: none; margin-bottom: 8px;">
                &#128197; Zu Outlook hinzufuegen (.ics)
              </a>
              <a href="cid:interview-einladung.ics"
                 style="display: inline-block; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; font-size: 14px; color: #0d9488; font-weight: 500; text-decoration: none;">
                &#128197; Zu Apple Calendar hinzufuegen
              </a>
            </div>
          </div>

          <p style="font-size: 15px; line-height: 1.7; margin: 0 0 8px;">
            Mit freundlichen Gruen,
          </p>
          <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 0 0 48px;">
            ${companyName}
          </p>

          <div style="padding-top: 24px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
            Powered by REVETLY &mdash; revetly.ai
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error sending interview invite:', error)
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
  }
}
