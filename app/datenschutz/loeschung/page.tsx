"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, MailCheck } from "lucide-react"

export default function DeletionRequestPage() {
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/public/deletion/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || "Anfrage fehlgeschlagen."); return }
      setSent(true)
    } catch {
      setError("Anfrage fehlgeschlagen.")
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/datenschutz"
          className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--rv-green-deep)]"
        >
          Datenschutz
        </Link>
        <h1 className="mt-2 text-[1.8rem] font-bold leading-tight tracking-tight text-foreground">
          Meine Daten löschen
        </h1>

        {sent ? (
          <div className="mt-6 rounded-[24px] border border-[var(--app-line)] bg-white p-6 text-center shadow-[var(--app-shadow-card)]">
            <MailCheck className="mx-auto h-10 w-10 text-[var(--rv-green-deep)]" strokeWidth={1.75} />
            <p className="mt-3 font-semibold text-foreground">Fast geschafft</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Falls zu dieser Adresse Bewerberdaten vorliegen, haben wir dir einen
              Bestätigungslink geschickt. Erst nach dem Klick darauf werden deine Daten
              gelöscht. Der Link ist 48 Stunden gültig.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
              Gib die E-Mail-Adresse an, mit der du dich beworben hast. Wir senden dir
              einen Bestätigungslink — erst danach werden deine Bewerberdaten
              (Kontaktdaten, Lebenslauf, Anschreiben, Foto und Auswertungen)
              unwiderruflich gelöscht.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                className="w-full rounded-full border border-[var(--app-line)] bg-white px-5 py-3 text-sm outline-none focus:border-[var(--rv-green)] focus:ring-1 focus:ring-[var(--rv-green)]"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--rv-ink)] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1a2b26] disabled:opacity-60"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Löschung anfragen
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
