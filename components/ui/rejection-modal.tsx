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
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const canSendEmail = profile?.plan === 'growth' || profile?.plan === 'pro'

  if (!isOpen) return null

  const defaultText = `Sehr geehrte/r ${candidateName},

vielen Dank für Ihre Bewerbung als ${jobTitle} bei ${companyName}.

Nach sorgfältiger Prüfung aller eingegangenen Bewerbungen müssen wir Ihnen leider mitteilen, dass wir uns für andere Kandidatinnen und Kandidaten entschieden haben.

Wir danken Ihnen für Ihr Interesse und wünschen Ihnen alles Gute.

Mit freundlichen Grüßen,
${companyName}`

  const handleSend = async () => {
    setSending(true)
    try {
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
      setSending(false)
      setSent(true)
      setTimeout(() => {
        setSent(false)
        onSuccess()
        onClose()
      }, 1500)
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

          {!canSendEmail ? (
            /* Upsell for free/starter */
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-[rgba(22,199,124,.1)] flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-[var(--rv-green)]" />
              </div>
              <p className="font-semibold text-slate-900 mb-1">
                Branded Emails ab Growth Plan
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Schicke professionelle, gebrandete Absage-Emails direkt aus Revetly heraus.
              </p>
              <a 
                href="/subscription"
                className="inline-block bg-[var(--rv-green)] hover:bg-[var(--rv-green-deep)] text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                Auf Growth upgraden
              </a>
            </div>
          ) : sent ? (
            /* Success state */
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6 text-green-500" />
              </div>
              <p className="font-semibold text-slate-900">Absage wurde gesendet</p>
            </div>
          ) : (
            /* Email editor */
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

              <button
                onClick={handleSend}
                disabled={sending}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-[var(--rv-green)] hover:bg-[var(--rv-green-deep)] disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Wird gesendet...' : 'Absage senden'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
