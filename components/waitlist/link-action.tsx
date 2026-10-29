"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react"

import { RvButton } from "@/components/landing/rv-button"

// Bestätigen und Austragen aus den Mails der Warteliste. Der Klick in der Mail
// öffnet nur diese Seite, erst der Knopf schickt die Anfrage (POST). So lösen
// Linkprüfer in Mailprogrammen nichts aus.

type Kind = "confirm" | "unsubscribe"

const TEXT: Record<Kind, { title: string; intro: string; action: string; endpoint: string }> = {
  confirm: {
    title: "Bestätige deinen Eintrag",
    intro: "Ein Klick noch, dann stehst du auf der Warteliste von Revetly.",
    action: "Eintrag bestätigen",
    endpoint: "/api/waitlist/confirm",
  },
  unsubscribe: {
    title: "Von der Warteliste austragen",
    intro: "Mit einem Klick löschen wir deine Adresse von der Warteliste.",
    action: "Austragen",
    endpoint: "/api/waitlist/unsubscribe",
  },
}

const RESULT: Record<string, { ok: boolean; title: string; body: string }> = {
  confirmed: {
    ok: true,
    title: "Du stehst auf der Warteliste",
    body: "Danke. Wir schreiben dir, sobald du Revetly nutzen kannst. In der Mail, die gleich kommt, steht auch der Link zum Austragen.",
  },
  already: {
    ok: true,
    title: "Du stehst schon auf der Warteliste",
    body: "Diese Adresse ist bereits bestätigt. Du musst nichts weiter tun.",
  },
  done: {
    ok: true,
    title: "Du bist ausgetragen",
    body: "Wir haben deine Adresse gelöscht. Von der Warteliste bekommst du keine Mails mehr.",
  },
  expired: {
    ok: false,
    title: "Der Link ist abgelaufen",
    body: "Bestätigungslinks gelten sieben Tage. Trag dich auf der Startseite einfach noch einmal ein.",
  },
  invalid: {
    ok: false,
    title: "Der Link funktioniert nicht",
    body: "Vielleicht ist er unvollständig angekommen. Trag dich auf der Startseite noch einmal ein oder schreib uns an hallo@revetly.ai.",
  },
}

export function WaitlistLinkAction({ kind, token }: { kind: Kind; token: string }) {
  const t = TEXT[kind]
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(t.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (typeof data.status === "string" && RESULT[data.status]) setStatus(data.status)
      else setError(data.error || "Das hat nicht geklappt. Bitte versuche es später noch einmal.")
    } catch {
      setError("Keine Verbindung. Bitte versuche es noch einmal.")
    } finally {
      setBusy(false)
    }
  }

  const result = status ? RESULT[status] : null

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--rv-mist)] px-4 py-16">
      <div className="w-full max-w-md">
        <Link href="/" aria-label="Revetly Startseite" className="mb-8 flex justify-center">
          <Image src="/revetly/logo-520.webp" alt="Revetly" width={129} height={32} className="h-8 w-auto" priority />
        </Link>
        <div
          className="border border-[rgba(12,26,22,.10)] bg-white p-7 shadow-[var(--rv-shadow)]"
          style={{ borderRadius: "var(--rv-radius-lg)" }}
        >
          <p className="text-[.72rem] font-bold tracking-[.14em] text-[var(--rv-green-deep)] uppercase">Warteliste</p>
          {result ? (
            <div role="status">
              {result.ok ? (
                <CheckCircle2 className="mt-4 h-9 w-9 text-[var(--rv-green-deep)]" strokeWidth={1.75} />
              ) : (
                <TriangleAlert className="mt-4 h-9 w-9 text-amber-500" strokeWidth={1.75} />
              )}
              <h1 className="mt-3 text-[1.45rem] leading-[1.25] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">
                {result.title}
              </h1>
              <p className="mt-2 text-[.95rem] leading-[1.62] text-[var(--rv-muted)]">{result.body}</p>
              <RvButton variant="ghost" className="mt-6" asChild>
                <Link href="/">Zur Startseite</Link>
              </RvButton>
            </div>
          ) : (
            <>
              <h1 className="mt-2 text-[1.45rem] leading-[1.25] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">{t.title}</h1>
              <p className="mt-2 text-[.95rem] leading-[1.62] text-[var(--rv-muted)]">{t.intro}</p>
              <RvButton
                variant={kind === "confirm" ? "primary" : "light"}
                className="mt-6 w-full"
                onClick={run}
                disabled={busy || !token}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.action}
              </RvButton>
              <div aria-live="polite">{error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}</div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
