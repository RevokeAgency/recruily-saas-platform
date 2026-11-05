"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { Loader2, MailCheck } from "lucide-react"

import { RvButton } from "@/components/landing/rv-button"
import { CONTACT_LIMITS, CONTACT_TOPICS, type ContactTopic } from "@/lib/contact"

const FIELD =
  "w-full rounded-2xl border border-[var(--app-line)] bg-white px-4 py-3 text-[.95rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-[var(--rv-green-deep)] focus-visible:ring-2 focus-visible:ring-[var(--rv-green)]/30"
const LABEL = "mb-1.5 block text-sm font-medium text-foreground"

// Kontaktformular für /kontakt und die Hilfeseite in der App. Schickt an
// /api/contact, dort wird nach Anliegen an hallo@ oder support@ verteilt.
export function ContactForm({
  defaultTopic = "frage",
  defaultName = "",
  defaultEmail = "",
}: {
  defaultTopic?: ContactTopic
  defaultName?: string
  defaultEmail?: string
}) {
  const id = useId()
  const [topic, setTopic] = useState<ContactTopic>(defaultTopic)
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [company, setCompany] = useState("")
  const [message, setMessage] = useState("")
  const [trap, setTrap] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState("sending")
    setError(null)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, name, email, company, message, rv_check: trap }),
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
      <div role="status" className="flex items-start gap-3.5 rounded-2xl border border-[var(--app-line)] bg-white p-5">
        <MailCheck className="mt-0.5 h-6 w-6 flex-none text-[var(--rv-green-deep)]" strokeWidth={2} />
        <div>
          <p className="font-semibold text-foreground">Danke, deine Nachricht ist angekommen</p>
          <p className="mt-1 text-[.92rem] leading-relaxed text-muted-foreground">
            Wir antworten an <span className="font-medium text-foreground">{email}</span>. Eine Bestätigung ist
            unterwegs. Nichts angekommen? Schau im Spam-Ordner nach.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={`${id}-topic`} className={LABEL}>Worum geht es?</label>
        <select
          id={`${id}-topic`}
          value={topic}
          onChange={(e) => setTopic(e.target.value as ContactTopic)}
          className={FIELD}
        >
          {(Object.keys(CONTACT_TOPICS) as ContactTopic[]).map((key) => (
            <option key={key} value={key}>{CONTACT_TOPICS[key].label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className={LABEL}>Name</label>
          <input
            id={`${id}-name`}
            required
            autoComplete="name"
            maxLength={CONTACT_LIMITS.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className={LABEL}>E-Mail</label>
          <input
            id={`${id}-email`}
            type="email"
            required
            autoComplete="email"
            maxLength={CONTACT_LIMITS.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-company`} className={LABEL}>
          Firma <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id={`${id}-company`}
          autoComplete="organization"
          maxLength={CONTACT_LIMITS.company}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor={`${id}-message`} className={LABEL}>Nachricht</label>
        <textarea
          id={`${id}-message`}
          required
          rows={6}
          maxLength={CONTACT_LIMITS.message}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${FIELD} resize-y leading-relaxed`}
        />
      </div>

      {/* Unsichtbar für Menschen, Bots füllen es aus. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-check`}>Bitte leer lassen</label>
        <input id={`${id}-check`} tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">{error}</p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Wir verwenden deine Angaben nur für die Antwort.{" "}
          <Link href="/datenschutz#kontaktformular" className="underline hover:text-foreground">Datenschutz</Link>
        </p>
        <RvButton type="submit" variant="light" disabled={state === "sending"} className="sm:flex-none">
          {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Nachricht senden
        </RvButton>
      </div>
    </form>
  )
}
