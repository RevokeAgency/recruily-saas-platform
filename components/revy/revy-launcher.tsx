"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ArrowUp, ChevronDown, Download, FileText, Loader2, ShieldAlert, Sparkles, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"

// ─────────────────────────────────────────────────────────────────────────────
// Revy im App-Layout: ein schwebender Knopf, darüber das Chatfenster.
//
// Geltungsbereich aus der Adresse: In /jobs/<id> arbeitet Revy auf dieser
// Stelle, sonst über den ganzen Pool. Der Server liefert nur Kürzel
// (K-XXXXXXXX). Namen setzt erst diese Komponente ein, über die normale
// Sitzung im Browser. Das Modell sieht sie nie.
// ─────────────────────────────────────────────────────────────────────────────

interface Beleg {
  ref: string
  quelle: "unterlagen" | "profil" | "matching" | "stelle"
  seite: number | null
  zitat: string
}
interface Aussage {
  text: string
  belege: Beleg[]
  belegt: boolean
}
interface Ergebnis {
  schritt: number
  werkzeug: string
  refs: string[]
  data: unknown
}
interface RevyResponse {
  runId: string | null
  status: "fertig" | "gesperrt" | "wartet_auf_kosten" | "kontingent" | "fehler"
  text?: string
  plan: Array<{ schritt: number; klartext: string; wirkung: string }>
  kosten?: { matches: number; frei: number | null }
  ergebnisse: Ergebnis[]
  aussagen: Aussage[]
  hinweise: string[]
  ausCache?: boolean
}

type Message =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "revy"; res: RevyResponse; kostenOffen?: boolean }
  | { id: string; role: "info"; text: string; upgrade?: boolean }

const JOB_PATH = /^\/jobs\/([0-9a-f-]{36})(?:\/|$)/i
const REF_RE = /K-[0-9A-F]{8}/g

const QUELLE: Record<Beleg["quelle"], string> = {
  unterlagen: "Unterlagen",
  profil: "Profil",
  matching: "Matching",
  stelle: "Stelle",
}

const BEISPIELE_STELLE = [
  "Zeig mir die fünf besten Bewerbungen mit Score",
  "Wer erfüllt alle Muss-Skills der Stelle?",
  "Such im Pool nach passenden Leuten für diese Stelle",
]
const BEISPIELE_POOL = [
  "Wer im Pool hat SAP und mindestens fünf Jahre Erfahrung?",
  "Zeig mir Leute mit Führungserfahrung in Graz",
  "Wo steht in den Unterlagen etwas zu Projektleitung?",
]

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random())
}

function sessionKey(): string {
  try {
    const k = sessionStorage.getItem("revy-session")
    if (k) return k
    const n = newId()
    sessionStorage.setItem("revy-session", n)
    return n
  } catch {
    return newId()
  }
}

export function RevyLauncher() {
  const pathname = usePathname() ?? ""
  const stelleId = pathname.match(JOB_PATH)?.[1] ?? null
  const hidden = pathname.startsWith("/onboarding") || pathname.startsWith("/jobs/new")

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [names, setNames] = useState<Record<string, string>>({})
  const sessionRef = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, busy])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  // Namen zu Kürzeln, nur im Browser und nur über die normale Sitzung (RLS).
  const resolveNames = useCallback(async (res: RevyResponse) => {
    const refs = new Set<string>()
    res.ergebnisse.forEach((e) => e.refs.forEach((r) => refs.add(r)))
    res.aussagen.forEach((a) => {
      a.belege.forEach((b) => b.ref.startsWith("K-") && refs.add(b.ref))
      a.text.match(REF_RE)?.forEach((r) => refs.add(r))
    })
    const missing = [...refs].filter((r) => !(r in names))
    if (missing.length === 0) return
    const { data } = await createClient().from("candidates").select("revy_ref, full_name").in("revy_ref", missing)
    const found: Record<string, string> = {}
    for (const row of (data ?? []) as Array<{ revy_ref: string; full_name: string | null }>) {
      found[row.revy_ref] = row.full_name || row.revy_ref
    }
    setNames((prev) => ({ ...prev, ...found }))
  }, [names])

  const push = (m: Message) => setMessages((prev) => [...prev, m])

  const handleResponse = useCallback(async (r: Response) => {
    const body = await r.json().catch(() => null)
    if (!r.ok) {
      if (body?.upgrade) push({ id: newId(), role: "info", text: "Revy gibt es ab dem Plan Growth.", upgrade: true })
      else push({ id: newId(), role: "info", text: body?.error ?? "Revy ist gerade nicht erreichbar." })
      return
    }
    const res = body as RevyResponse
    push({ id: newId(), role: "revy", res, kostenOffen: res.status === "wartet_auf_kosten" })
    void resolveNames(res)
  }, [resolveNames])

  const send = useCallback(async (text: string) => {
    const befehl = text.trim()
    if (!befehl || busy) return
    sessionRef.current ??= sessionKey()
    setInput("")
    push({ id: newId(), role: "user", text: befehl })
    setBusy(true)
    try {
      const r = await fetch("/api/revy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ befehl, sessionId: sessionRef.current, stelleId }),
      })
      await handleResponse(r)
    } catch {
      push({ id: newId(), role: "info", text: "Keine Verbindung zu Revy. Prüf deine Internetverbindung." })
    } finally {
      setBusy(false)
    }
  }, [busy, stelleId, handleResponse])

  const decideCost = useCallback(async (msgId: string, runId: string, aktion: "kosten_bestaetigen" | "abbrechen") => {
    setMessages((prev) => prev.map((m) => (m.id === msgId && m.role === "revy" ? { ...m, kostenOffen: false } : m)))
    setBusy(true)
    try {
      const r = await fetch(`/api/revy/runs/${runId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion }),
      })
      if (aktion === "abbrechen") {
        push({ id: newId(), role: "info", text: r.ok ? "Abgebrochen. Es wurden keine Matches verbraucht." : "Der Plan war nicht mehr offen." })
      } else {
        await handleResponse(r)
      }
    } finally {
      setBusy(false)
    }
  }, [handleResponse])

  if (hidden) return null

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Revy öffnen"
          className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full px-4 font-semibold text-[var(--rv-ink)] shadow-[0_18px_40px_-16px_rgba(0,160,140,.7)] transition-transform duration-150 ease-out [background-image:var(--rv-gradient)] hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rv-ink)] focus-visible:ring-offset-2"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
          Revy
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Revy"
          className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[420px] revy-enter"
        >
          {/* Äußerer Verlaufsschein in den Farben der CI */}
          <div aria-hidden className="pointer-events-none absolute -inset-2 rounded-[34px] opacity-60 blur-xl [background-image:var(--rv-gradient)]" />
          <div className="relative rounded-[30px] p-[1.5px] [background-image:var(--rv-gradient)]">
            <div className="flex h-[min(640px,calc(100vh-6rem))] flex-col overflow-hidden rounded-[28.5px] bg-white">
              <Header stelle={!!stelleId} onClose={() => setOpen(false)} />

              <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
                {messages.length === 0 && (
                  <Empty beispiele={stelleId ? BEISPIELE_STELLE : BEISPIELE_POOL} onPick={(t) => void send(t)} />
                )}
                {messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--rv-mist-2)] px-3.5 py-2 text-sm text-[var(--rv-ink)]">
                      {m.text}
                    </div>
                  ) : m.role === "info" ? (
                    <div key={m.id} className="rounded-2xl border border-[var(--rv-mist-2)] bg-[var(--rv-mist)] px-3.5 py-2.5 text-sm text-[var(--rv-ink-soft)]">
                      {m.text}
                      {m.upgrade && (
                        <Link href="/subscription" className="ml-1 font-semibold text-[var(--rv-green-deep)] underline-offset-2 hover:underline">
                          Pläne ansehen
                        </Link>
                      )}
                    </div>
                  ) : (
                    <RevyAnswer
                      key={m.id}
                      res={m.res}
                      names={names}
                      kostenOffen={!!m.kostenOffen}
                      onCost={(a) => m.res.runId && void decideCost(m.id, m.res.runId, a)}
                    />
                  ),
                )}
                {busy && (
                  <div className="flex items-center gap-2 text-sm text-[var(--rv-muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Revy arbeitet
                  </div>
                )}
              </div>

              <form
                className="border-t border-[var(--rv-mist-2)] p-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void send(input)
                }}
              >
                <div className="flex items-end gap-2 rounded-2xl bg-[var(--rv-mist)] p-1.5 focus-within:ring-2 focus-within:ring-[var(--rv-green)]">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        void send(input)
                      }
                    }}
                    rows={1}
                    maxLength={1000}
                    placeholder={stelleId ? "Frag Revy zu dieser Stelle" : "Frag Revy zu deinem Pool"}
                    aria-label="Befehl an Revy"
                    className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-[var(--rv-ink)] placeholder:text-[var(--rv-muted)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    aria-label="Senden"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--rv-green)] text-[var(--rv-ink)] transition-transform duration-150 ease-out active:scale-[0.95] disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <p className="mt-2 px-1 text-[11px] leading-snug text-[var(--rv-muted)]">
                  Revy arbeitet ohne Namen, Fotos und Kontaktdaten, die Namen siehst nur du. Geschützte Merkmale wertet Revy nicht aus. Jede Aussage hat einen Beleg.
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Header({ stelle, onClose }: { stelle: boolean; onClose: () => void }) {
  const [menu, setMenu] = useState(false)
  return (
    <div className="flex items-center gap-2 border-b border-[var(--rv-mist-2)] px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full [background-image:var(--rv-gradient)]">
        <Sparkles className="h-4 w-4 text-[var(--rv-ink)]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight text-[var(--rv-ink)]">Revy</p>
        <p className="text-[11px] leading-tight text-[var(--rv-muted)]">{stelle ? "Auf diese Stelle bezogen" : "Ganzer Pool"}</p>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-label="Protokoll exportieren"
          aria-expanded={menu}
          className="flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-[var(--rv-ink-soft)] hover:bg-[var(--rv-mist)]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Protokoll
        </button>
        {menu && (
          <div className="absolute right-0 top-9 z-10 w-40 overflow-hidden rounded-xl border border-[var(--rv-mist-2)] bg-white py-1 text-sm shadow-[var(--rv-shadow-sm)]">
            <a href="/api/revy/audit?format=csv" className="block px-3 py-1.5 hover:bg-[var(--rv-mist)]" onClick={() => setMenu(false)}>
              Als CSV
            </a>
            <a href="/api/revy/audit?format=json" className="block px-3 py-1.5 hover:bg-[var(--rv-mist)]" onClick={() => setMenu(false)}>
              Als JSON
            </a>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Revy schließen"
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--rv-ink-soft)] hover:bg-[var(--rv-mist)]"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

function Empty({ beispiele, onPick }: { beispiele: string[]; onPick: (t: string) => void }) {
  return (
    <div className="space-y-3 pt-2">
      <p className="text-sm text-[var(--rv-ink-soft)]">
        Sag Revy, was du suchst. Revy zeigt dir zuerst den Plan und belegt jede Aussage mit einer Stelle aus Profil, Matching oder Unterlagen.
      </p>
      <div className="flex flex-col gap-2">
        {beispiele.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onPick(b)}
            className="rounded-xl border border-[var(--rv-mist-2)] px-3 py-2 text-left text-sm text-[var(--rv-ink)] transition-colors hover:border-[var(--rv-green)] hover:bg-[var(--rv-mist)]"
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  )
}

function withNames(text: string, names: Record<string, string>): string {
  return text.replace(REF_RE, (r) => names[r] ?? r)
}

function RevyAnswer({
  res,
  names,
  kostenOffen,
  onCost,
}: {
  res: RevyResponse
  names: Record<string, string>
  kostenOffen: boolean
  onCost: (a: "kosten_bestaetigen" | "abbrechen") => void
}) {
  if (res.status === "gesperrt") {
    return (
      <div className="flex gap-2.5 rounded-2xl border border-[var(--rv-mist-2)] bg-[var(--rv-mist)] px-3.5 py-3 text-sm text-[var(--rv-ink)]">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rv-green-deep)]" aria-hidden />
        <span>{res.text}</span>
      </div>
    )
  }
  if (res.status === "kontingent" || (res.status === "fehler" && res.plan.length === 0)) {
    return <div className="rounded-2xl bg-[var(--rv-mist)] px-3.5 py-2.5 text-sm text-[var(--rv-ink-soft)]">{res.text}</div>
  }

  return (
    <div className="space-y-3">
      {res.plan.length > 0 && <Plan plan={res.plan} />}

      {res.status === "wartet_auf_kosten" && res.kosten && (
        <div className="rounded-2xl border border-[var(--rv-green)] bg-white px-3.5 py-3 text-sm text-[var(--rv-ink)]">
          <p>
            Dieser Plan verbraucht bis zu <strong>{res.kosten.matches} Matches</strong> aus deinem Kontingent
            {res.kosten.frei != null ? ` (frei: ${res.kosten.frei})` : ""}. Fortfahren?
          </p>
          {kostenOffen ? (
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => onCost("kosten_bestaetigen")}
                className="rounded-full bg-[var(--rv-green)] px-3.5 py-1.5 text-xs font-semibold text-[var(--rv-ink)] active:scale-[0.97]"
              >
                Matches verwenden
              </button>
              <button
                type="button"
                onClick={() => onCost("abbrechen")}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-[var(--rv-ink-soft)] hover:bg-[var(--rv-mist)]"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-[var(--rv-muted)]">Entschieden.</p>
          )}
        </div>
      )}

      {res.ergebnisse.map((e) => (
        <ResultBlock key={e.schritt} e={e} names={names} />
      ))}

      {res.aussagen.length > 0 && (
        <div className="space-y-2">
          {res.aussagen.map((a, i) => (
            <AussageView key={i} a={a} names={names} />
          ))}
        </div>
      )}

      {res.hinweise.map((h) => (
        <div key={h} className="flex gap-2 rounded-xl bg-[var(--rv-mist)] px-3 py-2 text-xs text-[var(--rv-ink-soft)]">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {h}
        </div>
      ))}
      {res.status === "fehler" && res.text && <p className="text-xs text-[var(--rv-muted)]">{res.text}</p>}
      {res.ausCache && <p className="text-[11px] text-[var(--rv-muted)]">Gleiche Frage auf unverändertem Datenstand, ohne neuen KI-Aufruf beantwortet.</p>}
    </div>
  )
}

function Plan({ plan }: { plan: RevyResponse["plan"] }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-2xl border border-[var(--rv-mist-2)] px-3.5 py-2.5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-[var(--rv-muted)]">
        Plan
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <ol className="mt-1.5 space-y-1 text-sm text-[var(--rv-ink)]">
          {plan.map((s) => (
            <li key={s.schritt} className="flex gap-2">
              <span className="font-mono text-xs leading-5 text-[var(--rv-muted)]">{s.schritt}.</span>
              <span className="flex-1">{s.klartext}</span>
              <span className="self-start rounded-full bg-[var(--rv-mist)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--rv-ink-soft)]">
                {s.wirkung === "LESEND" ? "liest" : s.wirkung === "INTERN" ? "ändert intern" : "nach außen"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

interface ListItem {
  ref: string
  position?: string | null
  ort?: string | null
  berufsjahre?: number | null
  score?: number | null
  status?: string
}

function ResultBlock({ e, names }: { e: Ergebnis; names: Record<string, string> }) {
  const items = useMemo<ListItem[]>(() => {
    const d = e.data as { liste?: ListItem[] } | ListItem[] | null
    if (e.werkzeug === "pool_suchen" && d && !Array.isArray(d)) return d.liste ?? []
    if (e.werkzeug === "kandidat_details" && Array.isArray(d)) return d
    return []
  }, [e])

  if (e.werkzeug === "gegen_stelle_matchen") {
    const d = e.data as { gestartet: number; uebersprungen: Array<{ ref: string; grund: string }>; hinweis: string }
    return (
      <div className="rounded-2xl bg-[var(--rv-mist)] px-3.5 py-2.5 text-sm text-[var(--rv-ink)]">
        Matching gestartet für {d.gestartet} {d.gestartet === 1 ? "Kandidat" : "Kandidaten"}. {d.hinweis}
        {d.uebersprungen.length > 0 && (
          <ul className="mt-1 text-xs text-[var(--rv-ink-soft)]">
            {d.uebersprungen.map((u) => (
              <li key={u.ref}>
                {names[u.ref] ?? u.ref}: {u.grund}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  if (items.length === 0) return null
  const gefunden = !Array.isArray(e.data) ? (e.data as { gefunden?: number })?.gefunden : undefined

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--rv-mist-2)]">
      {gefunden != null && (
        <p className="border-b border-[var(--rv-mist-2)] px-3.5 py-1.5 text-xs text-[var(--rv-muted)]">
          {gefunden} Treffer
          {gefunden > items.length ? `, die ersten ${items.length}` : ""}
        </p>
      )}
      <ul className="divide-y divide-[var(--rv-mist-2)]">
        {items.map((c) => (
          <li key={c.ref} className="flex items-center gap-3 px-3.5 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--rv-ink)]">{names[c.ref] ?? c.ref}</p>
              <p className="truncate text-xs text-[var(--rv-muted)]">
                {[c.position, c.ort, c.berufsjahre != null ? `${c.berufsjahre} Jahre` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            {c.score != null && <span className="text-sm font-bold tabular-nums text-[var(--rv-ink)]">{c.score} %</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AussageView({ a, names }: { a: Aussage; names: Record<string, string> }) {
  const [open, setOpen] = useState(false)
  if (!a.belegt) return <p className="text-sm italic text-[var(--rv-ink-soft)]">{a.text}</p>
  return (
    <div className="text-sm text-[var(--rv-ink)]">
      <p>{withNames(a.text, names)}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--rv-green-deep)] hover:underline"
      >
        <FileText className="h-3 w-3" aria-hidden />
        {a.belege.length === 1 ? "Beleg" : `${a.belege.length} Belege`}
      </button>
      {open && (
        <ul className="mt-1 space-y-1">
          {a.belege.map((b, i) => (
            <li key={i} className="rounded-lg bg-[var(--rv-mist)] px-2.5 py-1.5 text-xs text-[var(--rv-ink-soft)]">
              <span className="font-semibold">
                {b.ref.startsWith("K-") ? names[b.ref] ?? b.ref : "Stelle"}, {QUELLE[b.quelle]}
                {b.seite ? `, Seite ${b.seite}` : ""}:
              </span>{" "}
              „{b.zitat}“
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
