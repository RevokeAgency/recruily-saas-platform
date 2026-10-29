"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"

import { RvButton } from "@/components/landing/rv-button"

type Stats = { confirmed: number; pending: number; waitlistMode: boolean }

// Bedienung der Warteliste zum Start: Zahlen, Testmail, Versand in Paketen,
// unbestätigte Einträge löschen. Der Versand läuft in Paketen zu 25 Mails,
// bis niemand mehr übrig ist oder ein Fehler den Durchgang stoppt.
export function WaitlistAdmin({ email }: { email: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [busy, setBusy] = useState<null | "test" | "send" | "purge">(null)
  const [log, setLog] = useState<string[]>([])
  const note = (line: string) => setLog((l) => [...l, line])

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/waitlist")
    const data = await res.json().catch(() => ({}))
    if (res.ok) setStats(data)
    else note(data.error || "Zahlen nicht abrufbar")
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const post = async (action: string) => {
    const res = await fetch("/api/admin/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    return { ok: res.ok, data: await res.json().catch(() => ({})) }
  }

  const test = async () => {
    setBusy("test")
    const { ok, data } = await post("test")
    note(ok ? `Testmail an ${data.to} verschickt.` : data.error || "Testmail fehlgeschlagen.")
    setBusy(null)
  }

  const send = async () => {
    if (!stats) return
    if (!window.confirm(`Launch-Mail jetzt an ${stats.confirmed} bestätigte Adressen schicken? Jede Adresse wird danach gelöscht.`)) return
    setBusy("send")
    let total = 0
    for (;;) {
      const { ok, data } = await post("send")
      if (!ok) {
        note(data.error || "Versand abgebrochen.")
        break
      }
      total += data.sent
      note(`${data.sent} verschickt${data.failed ? `, ${data.failed} fehlgeschlagen` : ""}, noch ${data.remaining} offen.`)
      if (data.stopped) {
        note("Abgebrochen nach drei Fehlern in Folge. Ursache im Vercel-Log unter [mail] prüfen, dann erneut starten.")
        break
      }
      if (data.remaining === 0 || data.sent === 0) break
    }
    note(`Fertig: ${total} Mails verschickt.`)
    await load()
    setBusy(null)
  }

  const purge = async () => {
    if (!window.confirm("Alle unbestätigten Einträge löschen?")) return
    setBusy("purge")
    const { ok, data } = await post("purge")
    note(ok ? `${data.deleted} unbestätigte Einträge gelöscht.` : data.error || "Löschen fehlgeschlagen.")
    await load()
    setBusy(null)
  }

  return (
    <main className="min-h-screen bg-[var(--rv-mist)] px-4 py-14">
      <div className="mx-auto w-full max-w-xl">
        <Image src="/revetly/logo-520.webp" alt="Revetly" width={129} height={32} className="h-8 w-auto" priority />
        <h1 className="mt-8 text-[1.8rem] leading-tight font-bold tracking-[-0.02em] text-[var(--rv-ink)]">Warteliste</h1>
        <p className="mt-1 text-sm text-[var(--rv-muted)]">Angemeldet als {email}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            ["Bestätigt", stats?.confirmed],
            ["Unbestätigt", stats?.pending],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-[20px] border border-[rgba(12,26,22,.10)] bg-white p-5">
              <p className="text-[.72rem] font-bold tracking-[.12em] text-[var(--rv-muted)] uppercase">{label}</p>
              <p className="mt-1 text-[2rem] font-bold text-[var(--rv-ink)] tabular-nums">{value ?? "…"}</p>
            </div>
          ))}
        </div>

        <section className="mt-6 rounded-[20px] border border-[rgba(12,26,22,.10)] bg-white p-6">
          <h2 className="font-bold text-[var(--rv-ink)]">Mail zum Start</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--rv-muted)]">
            Erst die Testmail an dich prüfen. Der Versand an alle geht erst, wenn die Coming-Soon-Seite abgeschaltet ist.
            Jede Adresse wird nach dem Versand gelöscht, ein abgebrochener Versand lässt sich einfach neu starten.
          </p>
          {stats?.waitlistMode && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Wartelisten-Modus ist aktiv. Versand an alle ist gesperrt.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <RvButton variant="ghost" size="sm" onClick={test} disabled={!!busy}>
              {busy === "test" && <Loader2 className="h-4 w-4 animate-spin" />}
              Testmail an mich
            </RvButton>
            <RvButton
              variant="primary"
              size="sm"
              onClick={send}
              disabled={!!busy || !stats || stats.waitlistMode || stats.confirmed === 0}
            >
              {busy === "send" && <Loader2 className="h-4 w-4 animate-spin" />}
              An alle Bestätigten senden
            </RvButton>
          </div>
        </section>

        <section className="mt-4 rounded-[20px] border border-[rgba(12,26,22,.10)] bg-white p-6">
          <h2 className="font-bold text-[var(--rv-ink)]">Aufräumen</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--rv-muted)]">
            Unbestätigte Einträge löschen. Nach dem Versand zum Start ist die Liste damit leer, wie in der
            Datenschutzerklärung zugesagt.
          </p>
          <RvButton variant="ghost" size="sm" className="mt-4" onClick={purge} disabled={!!busy || !stats?.pending}>
            {busy === "purge" && <Loader2 className="h-4 w-4 animate-spin" />}
            Unbestätigte löschen
          </RvButton>
        </section>

        {log.length > 0 && (
          <ol aria-live="polite" className="mt-4 space-y-1 rounded-[20px] bg-[var(--rv-ink)] p-5 font-mono text-[.8rem] text-white/80">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        )}
      </div>
    </main>
  )
}
