"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, CheckCircle2, ShieldAlert } from "lucide-react"

function Confirm() {
  const token = useSearchParams().get("token") || ""
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/public/deletion/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || "Löschung fehlgeschlagen."); return }
      setDone(true)
    } catch {
      setError("Löschung fehlgeschlagen.")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-[24px] border border-[var(--app-line)] bg-white p-6 text-center shadow-[var(--app-shadow-card)]">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--rv-green-deep)]" strokeWidth={1.75} />
        <p className="mt-3 font-semibold text-foreground">Deine Daten wurden gelöscht</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Alle zu deiner E-Mail-Adresse gespeicherten Bewerberdaten inklusive Lebenslauf,
          Anschreiben und Foto wurden unwiderruflich entfernt.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[24px] border border-[var(--app-line)] bg-white p-6 shadow-[var(--app-shadow-card)]">
      <ShieldAlert className="h-9 w-9 text-amber-500" strokeWidth={1.75} />
      <p className="mt-3 font-semibold text-foreground">Löschung endgültig bestätigen</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Mit einem Klick werden alle zu deiner Adresse gespeicherten Bewerberdaten
        unwiderruflich gelöscht. Dies kann nicht rückgängig gemacht werden.
      </p>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <button
        onClick={confirm}
        disabled={busy || !token}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-destructive py-3 text-sm font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Endgültig löschen
      </button>
      {!token && (
        <p className="mt-3 text-xs text-muted-foreground">
          Kein gültiger Link — bitte fordere die Löschung erneut an.
        </p>
      )}
    </div>
  )
}

export default function DeletionConfirmPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/datenschutz"
          className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--rv-green-deep)]"
        >
          Datenschutz
        </Link>
        <h1 className="mt-2 mb-6 text-[1.8rem] font-bold leading-tight tracking-tight text-foreground">
          Löschung bestätigen
        </h1>
        <Suspense fallback={<div className="text-sm text-muted-foreground">Lädt…</div>}>
          <Confirm />
        </Suspense>
      </div>
    </main>
  )
}
