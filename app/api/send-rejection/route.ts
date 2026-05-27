import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check plan — only growth and pro can send emails
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (!profile || !['growth', 'pro'].includes(profile.plan)) {
      return NextResponse.json(
        { error: 'Feature not available on your plan' },
        { status: 403 }
      )
    }

    const { 
      candidateName, 
      candidateEmail, 
      jobTitle, 
      companyName,
      customText
    } = await req.json()

    const defaultText = `Sehr geehrte/r ${candidateName},

vielen Dank für Ihre Bewerbung als ${jobTitle} bei ${companyName}.

Nach sorgfältiger Prüfung aller eingegangenen Bewerbungen müssen wir Ihnen leider mitteilen, dass wir uns für andere Kandidatinnen und Kandidaten entschieden haben, die noch besser zu unserem aktuellen Anforderungsprofil passen.

Wir danken Ihnen für Ihr Interesse an unserem Unternehmen und wünschen Ihnen bei Ihrer Jobsuche viel Erfolg.

Mit freundlichen Grüßen,
${companyName}`

    const emailText = customText || defaultText

    await resend.emails.send({
      from: 'karriere@revetly.ai',
      to: candidateEmail,
      subject: `Ihre Bewerbung als ${jobTitle} bei ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="margin-bottom: 32px;">
            <span style="background: #0d9488; color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;">
              ${companyName}
            </span>
          </div>
          <div style="white-space: pre-line; color: #334155; line-height: 1.7; font-size: 15px;">
            ${emailText}
          </div>
          <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
            Powered by REVETLY — revetly.ai
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending rejection email:', error)
    return NextResponse.json(
      { error: 'Email send failed' }, 
      { status: 500 }
    )
  }
}
