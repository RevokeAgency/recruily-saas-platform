'use client'
import { useState } from 'react'
import { X, Send, Lock } from 'lucide-react'
import { useProfile } from '@/lib/hooks/useProfile'

interface Props {
  isOpen: boolean
  onClose: () => void
  candidateName: string
  candidateEmail: string
  jobTitle: string
  companyName: string
  onSuccess: () => void
}

export function RejectionModal({
  isOpen, 
  onClose, 
  candidateName, 
  candidateEmail, 
  jobTitle, 
  companyName, 
  onSuccess
}: Props) {
  const { profile } = useProfile()
  const [text, setText] = useState('')
  const [notify, setNotify] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailed, setEmailed] = useState(false)

  const canSendEmail = profile?.plan === 'growth' || profile?.plan === 'pro'
  // The e-mail is only actually sent when the plan allows it, the toggle is on,
  // and we have an address. Otherwise the candidate is simply set to "Abgesagt".
  const willEmail = canSendEmail && notify && !!candidateEmail

  if (!isOpen) return null

  const defaultText = `Sehr geehrte/r ${candidateName},

vielen Dank für Ihre Bewerbung als ${jobTitle} bei ${companyName}.

Nach sorgfältiger Prüfung aller eingegangenen Bewerbungen müssen wir Ihnen leider mitteilen, dass wir uns für andere Kandidatinnen und Kandidaten entschieden haben.

Wir danken Ihnen für Ihr Interesse und wünschen Ihnen alles Gute.

Mit freundlichen Grüßen,
${companyName}`

  const handleConfirm = async () => {
    setSending(true)
    try {
      if (willEmail) {
        await fetch('/api/send-rejection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateName,
            candidateEmail,
            jobTitle,
            companyName,
            customText: text || defaultText,
          }),
        })
      }
      setEmailed(willEmail)
      setSending(false)
      setSent(true)
      setTimeout(() => {
        setSent(false)
        onSuccess()
        onClose()
      }, willEmail ? 1500 : 700)
    } catch (error) {
      setSending(false)
      console.error('Error sending rejection:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Absage senden</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Candidate info */}
          <div className="bg-slate-50 rounded-lg px-4 py-3 mb-4 text-sm">
            <p className="font-medium text-slate-900">{candidateName}</p>
            <p className="text-slate-500">{candidateEmail}</p>
            <p className="text-slate-500">Bewerbung: {jobTitle}</p>
          </div>

          {sent ? (
            /* Success state */
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6 text-green-500" />
              </div>
              <p className="font-semibold text-slate-900">
                {emailed ? 'Absage wurde gesendet' : 'Kandidat wurde abgesagt'}
              </p>
            </div>
          ) : (
            <>
              {/* Notify toggle — rejecting always works; the e-mail is optional */}
              <label
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 mb-4 ${
                  canSendEmail ? 'border-slate-200 cursor-pointer' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={willEmail}
                  disabled={!canSendEmail}
                  onChange={(e) => setNotify(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--rv-green)]"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900">
                    Bewerber per E-Mail benachrichtigen
                  </span>
                  {canSendEmail ? (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Der Kandidat erhält eine gebrandete Absage. Ohne Haken wird er nur
                      still auf „Abgesagt" gesetzt.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-[var(--rv-green)]" />
                      Gebrandete Absage-Mails ab Growth.{' '}
                      <a href="/subscription" className="text-[var(--rv-green-deep)] font-medium underline">
                        Upgraden
                      </a>
                    </p>
                  )}
                </div>
              </label>

              {willEmail && (
                <>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                    E-Mail Text
                  </label>
                  <textarea
                    value={text || defaultText}
                    onChange={(e) => setText(e.target.value)}
                    rows={10}
                    className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 leading-relaxed resize-none focus:border-[var(--rv-green)] focus:ring-1 focus:ring-[var(--rv-green)] outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Von: karriere@revetly.ai · An: {candidateEmail}
                  </p>
                </>
              )}

              {!willEmail && (
                <p className="text-sm text-slate-500">
                  Der Kandidat wird auf „Abgesagt" gesetzt, ohne benachrichtigt zu werden.
                </p>
              )}

              <button
                onClick={handleConfirm}
                disabled={sending}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-[var(--rv-green)] hover:bg-[var(--rv-green-deep)] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                {sending
                  ? 'Wird verarbeitet...'
                  : willEmail
                    ? 'Absage senden'
                    : 'Absage bestätigen'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
