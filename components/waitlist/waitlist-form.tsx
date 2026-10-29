"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, MailCheck } from "lucide-react"

import { RvArrowIcon, RvButton } from "@/components/landing/rv-button"

// Eintragen auf die Warteliste. Glas-Pille wie Badge und Navigation im Hero:
// ab sm Feld und Knopf in einer Zeile, darunter gestapelt.
export function WaitlistForm() {
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState("sending")
    setError(null)
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, rv_check: website, source: "coming-soon" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Das hat nicht geklappt. Bitte versuche es später noch einmal.")
        setState("idle")
        return
      }
      setState("sent")
    } catch {
      setError("Keine Verbindung. Bitte versuche es noch einmal.")
      setState("idle")
    }
  }

  if (state === "sent") {
    return (
      <div
        role="status"
        className="flex max-w-[520px] items-start gap-3.5 rounded-[22px] border border-white/20 bg-white/10 p-5 text-white backdrop-blur-[10px]"
      >
        <MailCheck className="mt-0.5 h-6 w-6 flex-none text-[var(--rv-green)]" strokeWidth={2} />
        <div>
          <p className="font-bold">Fast geschafft</p>
          <p className="mt-1 text-[.92rem] leading-[1.6] text-white/74">
            Wir haben dir einen Link an <span className="font-semibold text-white">{email}</span> geschickt.
            Bestätige ihn, dann stehst du auf der Warteliste. Nichts angekommen? Schau im Spam-Ordner nach.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="max-w-[520px]">
      <div className="flex flex-col gap-2 rounded-[26px] border border-white/22 bg-white/10 p-1.5 backdrop-blur-[10px] focus-within:border-white/45 sm:flex-row sm:items-center sm:rounded-full">
        <label htmlFor="waitlist-email" className="sr-only">
          E-Mail-Adresse
        </label>
        <input
          id="waitlist-email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="deine@firma.at"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "waitlist-error" : "waitlist-hint"}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[1rem] text-white outline-none placeholder:text-white/45"
        />
        {/* Für Menschen unsichtbar, für einfache Bots ein Feld wie jedes andere. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Bitte leer lassen
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="rv_check" />
          </label>
        </div>
        <RvButton type="submit" variant="grad" size="lg" disabled={state === "sending"} className="w-full sm:w-auto">
          {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Auf die Warteliste
          {state !== "sending" && <RvArrowIcon />}
        </RvButton>
      </div>
      <div aria-live="polite">
        {error && (
          <p id="waitlist-error" className="mt-3 pl-4 text-[.86rem] font-semibold text-[#FFB4A8]">
            {error}
          </p>
        )}
      </div>
      <p id="waitlist-hint" className="mt-3 pl-4 text-[.8rem] leading-[1.6] text-white/60">
        Wir schreiben dir nur, wenn du starten kannst. Austragen geht mit einem Klick.{" "}
        <Link href="/datenschutz#warteliste" className="underline decoration-white/30 underline-offset-2 hover:text-white">
          Datenschutz
        </Link>
      </p>
    </form>
  )
}
