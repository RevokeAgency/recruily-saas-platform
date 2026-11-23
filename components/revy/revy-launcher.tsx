"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowUp, ChevronDown, Download, FileText, History, Loader2, Mail, RotateCcw, ShieldAlert, Sparkles, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { renderDraft } from "@/lib/revy/vorlagen"

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
  art?: "zusammenfassung" | "hilfe"
}
interface Ergebnis {
  schritt: number
  werkzeug: string
  refs: string[]
  data: unknown
}
interface RevyResponse {
  runId: string | null
  status: "fertig" | "gesperrt" | "wartet_auf_kosten" | "wartet_auf_bestaetigung" | "kontingent" | "fehler"
  text?: string
  plan: Array<{ schritt: number; klartext: string; wirkung: string }>
  kosten?: { matches: number; frei: number | null }
  bestaetigung?: { kandidaten: number }
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
  "Such im Pool nach passenden Leuten für diese Stelle",
  "Lad die zwei besten zum Videogespräch ein",
]
const BEISPIELE_POOL = [
  "Was ist offen? Gib mir einen Überblick",
  "Wer im Pool hat SAP und mindestens fünf Jahre Erfahrung?",
  "Sag allen ab, die unter 40 % liegen",
]

/** Kurztexte für die Änderungen von Revy. */
const WERKZEUG_TEXT: Record<string, string> = {
  status_setzen: "Status",
  tag_setzen: "Tag gesetzt",
  tag_entfernen: "Tag entfernt",
  notiz_anlegen: "Notiz angelegt",
  korrektur_melden: "Korrektur festgehalten",
}

type Aktion = "kosten_bestaetigen" | "bestaetigen" | "abbrechen"

interface SetupStatus {
  bereit: boolean
  punkte: Array<{ name: string; ok: boolean; hinweis?: string }>
}

/** Eine Änderung zurücknehmen. Gibt null zurück, wenn es geklappt hat, sonst den Grund. */
async function undo(id: string): Promise<string | null> {
  try {
    const r = await fetch(`/api/revy/actions/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktion: "zuruecknehmen" }),
    })
    if (r.ok) return null
    const b = await r.json().catch(() => null)
    return b?.error ?? "Zurücknehmen ging gerade nicht."
  } catch {
    return "Keine Verbindung."
  }
}

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
  const [view, setView] = useState<"chat" | "aenderungen">("chat")
  const [freigabe, setFreigabe] = useState<string | null>(null)
  const [setup, setSetup] = useState<SetupStatus | null>(null)
  const sessionRef = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Beim ersten Öffnen prüfen, ob Revy eingerichtet ist. Fehlt etwas, sagt
  // das Fenster genau was, statt später "nichts gefunden" zu melden.
  useEffect(() => {
    if (!open || setup) return
    let cancelled = false
    fetch("/api/revy/status", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => null)
        if (cancelled) return
        if (r.ok && b) setSetup(b as SetupStatus)
        else if (b?.upgrade) setSetup({ bereit: false, punkte: [{ name: "Plan", ok: false, hinweis: "Revy gibt es ab dem Plan Growth." }] })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, setup])

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
  // Bekannte Namen als Ref, damit resolveRefs stabil bleibt (sonst lädt die
  // Änderungsansicht bei jedem neuen Namen neu).
  const namesRef = useRef(names)
  useEffect(() => {
    namesRef.current = names
  }, [names])

  const resolveRefs = useCallback(async (list: string[]) => {
    const missing = [...new Set(list)].filter((r) => /^K-[0-9A-F]{8}$/.test(r) && !(r in namesRef.current))
    if (missing.length === 0) return
    const { data } = await createClient().from("candidates").select("revy_ref, full_name").in("revy_ref", missing)
    const found: Record<string, string> = {}
    for (const row of (data ?? []) as Array<{ revy_ref: string; full_name: string | null }>) {
      found[row.revy_ref] = row.full_name || row.revy_ref
    }
    setNames((prev) => ({ ...prev, ...found }))
  }, [])

  const resolveNames = useCallback(async (res: RevyResponse) => {
    const refs = new Set<string>()
    res.ergebnisse.forEach((e) => {
      e.refs.forEach((r) => refs.add(r))
      const u = (e.data as { uebersprungen?: Array<{ ref: string }> } | null)?.uebersprungen
      if (Array.isArray(u)) u.forEach((x) => refs.add(x.ref))
    })
    res.plan.forEach((s) => s.klartext.match(REF_RE)?.forEach((r) => refs.add(r)))
    res.aussagen.forEach((a) => {
      a.belege.forEach((b) => b.ref.startsWith("K-") && refs.add(b.ref))
      a.text.match(REF_RE)?.forEach((r) => refs.add(r))
    })
    await resolveRefs([...refs])
  }, [resolveRefs])

  const push = (m: Message) => setMessages((prev) => [...prev, m])

  const handleResponse = useCallback(async (r: Response) => {
    const body = await r.json().catch(() => null)
    if (!r.ok) {
      if (body?.upgrade) push({ id: newId(), role: "info", text: "Revy gibt es ab dem Plan Growth.", upgrade: true })
      else push({ id: newId(), role: "info", text: body?.error ?? "Revy ist gerade nicht erreichbar." })
      return
    }
    const res = body as RevyResponse
    push({ id: newId(), role: "revy", res, kostenOffen: res.status === "wartet_auf_kosten" || res.status === "wartet_auf_bestaetigung" })
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

  const decideCost = useCallback(async (msgId: string, runId: string, aktion: Aktion) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId && m.role === "revy" ? { ...m, kostenOffen: false } : m)))
    setBusy(true)
    try {
      const r = await fetch(`/api/revy/runs/${runId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion }),
      })
      if (aktion === "abbrechen") {
        push({ id: newId(), role: "info", text: r.ok ? "Abgebrochen. Revy hat nichts ausgeführt." : "Der Plan war nicht mehr offen." })
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
              <Header stelle={!!stelleId} view={view} onView={setView} onClose={() => setOpen(false)} />

              {freigabe ? (
                <FreigabeView batchId={freigabe} names={names} resolveRefs={resolveRefs} onBack={() => setFreigabe(null)} />
              ) : view === "aenderungen" ? (
                <ChangesView names={names} resolveRefs={resolveRefs} />
              ) : (
              <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
                {setup && !setup.bereit && <SetupCard setup={setup} />}
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
                      onFreigabe={setFreigabe}
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
              )}

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

function Header({
  stelle,
  view,
  onView,
  onClose,
}: {
  stelle: boolean
  view: "chat" | "aenderungen"
  onView: (v: "chat" | "aenderungen") => void
  onClose: () => void
}) {
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
      <button
        type="button"
        onClick={() => onView(view === "chat" ? "aenderungen" : "chat")}
        aria-pressed={view === "aenderungen"}
        className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium hover:bg-[var(--rv-mist)] ${view === "aenderungen" ? "bg-[var(--rv-mist)] text-[var(--rv-ink)]" : "text-[var(--rv-ink-soft)]"}`}
      >
        <History className="h-3.5 w-3.5" aria-hidden />
        {view === "aenderungen" ? "Chat" : "Änderungen"}
      </button>
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
  onFreigabe,
}: {
  res: RevyResponse
  names: Record<string, string>
  kostenOffen: boolean
  onCost: (a: Aktion) => void
  onFreigabe: (batchId: string) => void
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
      {res.plan.length > 0 && <Plan plan={res.plan} names={names} />}

      {(res.status === "wartet_auf_kosten" || res.status === "wartet_auf_bestaetigung") && (
        <div className="rounded-2xl border border-[var(--rv-green)] bg-white px-3.5 py-3 text-sm text-[var(--rv-ink)]">
          {res.kosten && (
            <p>
              Dieser Plan verbraucht bis zu <strong>{res.kosten.matches} Matches</strong> aus deinem Kontingent
              {res.kosten.frei != null ? ` (frei: ${res.kosten.frei})` : ""}.
            </p>
          )}
          {res.bestaetigung && (
            <p className={res.kosten ? "mt-1" : ""}>
              Dieser Plan ändert bis zu <strong>{res.bestaetigung.kandidaten} Kandidaten</strong>. Jede Änderung lässt sich danach einzeln zurücknehmen.
            </p>
          )}
          <p className="mt-1">Fortfahren?</p>
          {kostenOffen ? (
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => onCost(res.status === "wartet_auf_kosten" ? "kosten_bestaetigen" : "bestaetigen")}
                className="rounded-full bg-[var(--rv-green)] px-3.5 py-1.5 text-xs font-semibold text-[var(--rv-ink)] active:scale-[0.97]"
              >
                {res.status === "wartet_auf_kosten" ? "Matches verwenden" : "Ausführen"}
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

      {res.ergebnisse.map((e) =>
        e.werkzeug === "absage_entwerfen" || e.werkzeug === "einladung_entwerfen" ? (
          <DraftResult key={e.schritt} e={e} names={names} onOpen={onFreigabe} />
        ) : (
          <ResultBlock key={e.schritt} e={e} names={names} />
        ),
      )}

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

function Plan({ plan, names }: { plan: RevyResponse["plan"]; names: Record<string, string> }) {
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
              <span className="flex-1">{withNames(s.klartext, names)}</span>
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
  berufsjahre_unbekannt?: boolean
  score?: number | null
  status?: string
  treffer?: string[]
  tags?: string[]
}

interface Aenderungen {
  geaendert: Array<{ ref: string; aktion_id: string | null; vorher: unknown; nachher: unknown }>
  uebersprungen: Array<{ ref: string; grund: string }>
}

function ChangeResult({ e, names }: { e: Ergebnis; names: Record<string, string> }) {
  const d = e.data as Aenderungen
  const [state, setState] = useState<Record<string, string>>({})
  const label = WERKZEUG_TEXT[e.werkzeug] ?? e.werkzeug
  if (d.geaendert.length === 0 && d.uebersprungen.length === 0) return null
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--rv-mist-2)]">
      <p className="border-b border-[var(--rv-mist-2)] px-3.5 py-1.5 text-xs text-[var(--rv-muted)]">
        {label}: {d.geaendert.length} geändert{d.uebersprungen.length ? `, ${d.uebersprungen.length} unverändert` : ""}
      </p>
      <ul className="divide-y divide-[var(--rv-mist-2)]">
        {d.geaendert.map((g) => (
          <li key={g.ref} className="flex items-center gap-3 px-3.5 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[var(--rv-ink)]">{names[g.ref] ?? g.ref}</p>
              <p className="truncate text-xs text-[var(--rv-muted)]">
                {g.vorher != null && g.nachher != null ? `${String(g.vorher)} → ${String(g.nachher)}` : String(g.nachher ?? g.vorher ?? "")}
              </p>
            </div>
            {g.aktion_id &&
              (state[g.aktion_id] ? (
                <span className="text-xs text-[var(--rv-muted)]">{state[g.aktion_id]}</span>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const id = g.aktion_id as string
                    setState((s) => ({ ...s, [id]: "…" }))
                    const err = await undo(id)
                    setState((s) => ({ ...s, [id]: err ?? "Zurückgenommen" }))
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--rv-green-deep)] hover:bg-[var(--rv-mist)]"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  Zurücknehmen
                </button>
              ))}
          </li>
        ))}
        {d.uebersprungen.map((u) => (
          <li key={`u-${u.ref}`} className="px-3.5 py-2 text-xs text-[var(--rv-ink-soft)]">
            {names[u.ref] ?? u.ref}: {u.grund}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResultBlock({ e, names }: { e: Ergebnis; names: Record<string, string> }) {
  const intern = !!(e.data && typeof e.data === "object" && "geaendert" in (e.data as object))
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
  if (intern) return <ChangeResult e={e} names={names} />
  if (e.werkzeug === "ueberblick") return <OverviewResult e={e} />
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
                {[c.position, c.ort, c.berufsjahre != null ? `${c.berufsjahre} Jahre` : c.berufsjahre_unbekannt ? "Jahre unbekannt" : null, c.status]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {(c.treffer?.length || c.tags?.length) ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.treffer?.map((t) => (
                    <span key={t} className="rounded-full bg-[var(--rv-mist)] px-1.5 py-0.5 text-[10px] text-[var(--rv-ink-soft)]">
                      {t}
                    </span>
                  ))}
                  {c.tags?.map((t) => (
                    <span key={`tag-${t}`} className="rounded-full border border-[var(--rv-green)] px-1.5 py-0.5 text-[10px] text-[var(--rv-green-deep)]">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
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
  // Zusammenfassung (im Code aus den Daten gezählt) und Hilfe: kein Zitat nötig.
  if (a.art) return <p className="whitespace-pre-line text-sm text-[var(--rv-ink)]">{withNames(a.text, names)}</p>
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

function SetupCard({ setup }: { setup: SetupStatus }) {
  const offen = setup.punkte.filter((p) => !p.ok)
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-[var(--rv-ink)]">
      <p className="font-semibold">Revy ist noch nicht vollständig eingerichtet</p>
      <ul className="mt-1.5 space-y-1 text-xs text-[var(--rv-ink-soft)]">
        {offen.map((p) => (
          <li key={p.name}>
            <span className="font-medium text-[var(--rv-ink)]">{p.name}:</span> {p.hinweis}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface ActionRow {
  id: string
  created_at: string
  werkzeug: string
  ref: string
  vorher: Record<string, unknown> | null
  nachher: Record<string, unknown> | null
  zurueckgenommen_am: string | null
}

function describeAction(a: ActionRow): string {
  const v = a.vorher ?? {}
  const n = a.nachher ?? {}
  switch (a.werkzeug) {
    case "status_setzen":
      return `Status ${String(v.status ?? "")} → ${String(n.status ?? "")}`
    case "tag_setzen":
      return `Tag „${String(n.tag ?? "")}“ gesetzt`
    case "tag_entfernen":
      return `Tag entfernt: ${((v.tags as Array<{ tag: string }> | undefined) ?? []).map((t) => t.tag).join(", ")}`
    case "notiz_anlegen":
      return "Notiz angelegt"
    default:
      return WERKZEUG_TEXT[a.werkzeug] ?? a.werkzeug
  }
}

function ChangesView({ names, resolveRefs }: { names: Record<string, string>; resolveRefs: (refs: string[]) => Promise<void> }) {
  const [rows, setRows] = useState<ActionRow[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [state, setState] = useState<Record<string, string>>({})

  // Beim Öffnen der Ansicht laden.
  useEffect(() => {
    let cancelled = false
    fetch("/api/revy/actions", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => null)
        if (cancelled) return
        if (!r.ok) {
          setFehler(b?.error ?? "Änderungen sind gerade nicht lesbar.")
          return
        }
        const list = (b?.aktionen ?? []) as ActionRow[]
        setRows(list)
        void resolveRefs(list.map((x) => x.ref))
      })
      .catch(() => {
        if (!cancelled) setFehler("Keine Verbindung.")
      })
    return () => {
      cancelled = true
    }
  }, [resolveRefs])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <p className="mb-3 text-sm text-[var(--rv-ink-soft)]">
        Was Revy in Revetly geändert hat. Jede Änderung lässt sich einzeln zurücknehmen, solange niemand sie danach selbst geändert hat.
      </p>
      {fehler && <p className="text-sm text-[var(--rv-ink-soft)]">{fehler}</p>}
      {!rows && !fehler && (
        <div className="flex items-center gap-2 text-sm text-[var(--rv-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Lädt
        </div>
      )}
      {rows && rows.length === 0 && <p className="text-sm text-[var(--rv-muted)]">Noch keine Änderungen.</p>}
      {rows && rows.length > 0 && (
        <ul className="divide-y divide-[var(--rv-mist-2)] overflow-hidden rounded-2xl border border-[var(--rv-mist-2)]">
          {rows.map((a) => {
            const done = a.zurueckgenommen_am || state[a.id] === "Zurückgenommen"
            return (
              <li key={a.id} className="flex items-center gap-3 px-3.5 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-semibold ${done ? "text-[var(--rv-muted)] line-through" : "text-[var(--rv-ink)]"}`}>{names[a.ref] ?? a.ref}</p>
                  <p className="truncate text-xs text-[var(--rv-muted)]">
                    {describeAction(a)} ·{" "}
                    {new Date(a.created_at).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {done ? (
                  <span className="text-xs text-[var(--rv-muted)]">Zurückgenommen</span>
                ) : state[a.id] && state[a.id] !== "…" ? (
                  <span className="max-w-[9rem] text-right text-xs text-[var(--rv-muted)]">{state[a.id]}</span>
                ) : (
                  <button
                    type="button"
                    disabled={state[a.id] === "…"}
                    onClick={async () => {
                      setState((s) => ({ ...s, [a.id]: "…" }))
                      const err = await undo(a.id)
                      setState((s) => ({ ...s, [a.id]: err ?? "Zurückgenommen" }))
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--rv-green-deep)] hover:bg-[var(--rv-mist)] disabled:opacity-50"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden />
                    Zurücknehmen
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Etappe 3: Entwürfe und Freigabe ────────────────────────────────────────

interface Entwurfsergebnis {
  batch_id: string | null
  stapel?: Array<{ batch_id: string; stelle_id: string; entwuerfe: number }>
  art: "absage" | "einladung"
  entwuerfe: number
  uebersprungen: Array<{ ref: string; grund: string }>
}

function DraftResult({ e, names, onOpen }: { e: Ergebnis; names: Record<string, string>; onOpen: (id: string) => void }) {
  const d = e.data as Entwurfsergebnis
  const wort = d.art === "absage" ? (d.entwuerfe === 1 ? "Absage" : "Absagen") : d.entwuerfe === 1 ? "Einladung" : "Einladungen"
  return (
    <div className="rounded-2xl border border-[var(--rv-green)] bg-white px-3.5 py-3 text-sm text-[var(--rv-ink)]">
      <p className="flex items-center gap-2 font-semibold">
        <Mail className="h-4 w-4 text-[var(--rv-green-deep)]" aria-hidden />
        {d.entwuerfe} {wort} als Entwurf
      </p>
      <p className="mt-1 text-xs text-[var(--rv-ink-soft)]">Revy verschickt nichts selbst. Du prüfst die Entwürfe und gibst sie frei.</p>
      {d.uebersprungen.length > 0 && (
        <ul className="mt-1.5 text-xs text-[var(--rv-ink-soft)]">
          {d.uebersprungen.map((u) => (
            <li key={u.ref}>
              {names[u.ref] ?? u.ref}: {u.grund}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {(d.stapel?.length ? d.stapel : d.batch_id ? [{ batch_id: d.batch_id, entwuerfe: d.entwuerfe }] : []).map((st, i, all) => (
          <button
            key={st.batch_id}
            type="button"
            onClick={() => onOpen(st.batch_id)}
            className="rounded-full bg-[var(--rv-green)] px-3.5 py-1.5 text-xs font-semibold text-[var(--rv-ink)] active:scale-[0.97]"
          >
            Prüfen und freigeben{all.length > 1 ? ` (Stelle ${i + 1}, ${st.entwuerfe})` : ""}
          </button>
        ))}
      </div>
    </div>
  )
}

interface BatchView {
  id: string
  art: "absage" | "einladung"
  status: string
  ton: string
  stelle: { id: string; titel: string; firma: string }
  entwuerfe: Array<{
    id: string
    ref: string
    betreff: string
    text: string
    ausgewaehlt: boolean
    zustellung: { status: string; fehler: string | null } | null
  }>
  token?: string
}

const TON_LABEL: Record<string, string> = {
  standard: "Standard",
  kurz: "Kurz",
  persoenlich: "Persönlich",
  offen: "Offen",
  vor_ort: "Vor Ort",
  video: "Video",
  telefon: "Telefon",
}

const ZUSTELL_LABEL: Record<string, string> = {
  geplant: "geplant",
  in_versand: "wird verschickt",
  gesendet: "verschickt",
  zugestellt: "zugestellt",
  zurueckgewiesen: "nicht zugestellt",
  fehler: "Fehler",
  abgebrochen: "gestoppt",
}

function FreigabeView({
  batchId,
  names,
  resolveRefs,
  onBack,
}: {
  batchId: string
  names: Record<string, string>
  resolveRefs: (refs: string[]) => Promise<void>
  onBack: () => void
}) {
  const [batch, setBatch] = useState<BatchView | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set())
  const [offen, setOffen] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [zustellung, setZustellung] = useState<Record<string, { status: string; fehler: string | null }>>({})
  const [version, setVersion] = useState(0)

  // Stapel laden (mit frischem Einmal-Token, solange offen).
  useEffect(() => {
    let cancelled = false
    fetch(`/api/revy/batches/${batchId}`, { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => null)
        if (cancelled) return
        if (!r.ok) {
          setFehler(b?.error ?? "Entwurf nicht lesbar.")
          return
        }
        const v = b as BatchView
        setBatch(v)
        setAuswahl(new Set(v.entwuerfe.filter((d) => d.ausgewaehlt).map((d) => d.id)))
        const z: Record<string, { status: string; fehler: string | null }> = {}
        for (const d of v.entwuerfe) if (d.zustellung) z[d.id] = d.zustellung
        setZustellung(z)
        void resolveRefs(v.entwuerfe.map((d) => d.ref))
      })
      .catch(() => !cancelled && setFehler("Keine Verbindung."))
    return () => {
      cancelled = true
    }
  }, [batchId, version, resolveRefs])

  // Fortschritt abfragen, solange etwas geplant ist.
  const versandLaeuft = batch?.status === "freigegeben" || Object.values(zustellung).some((z) => z.status === "geplant" || z.status === "in_versand")
  useEffect(() => {
    if (!versandLaeuft) return
    const t = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/revy/batches/${batchId}/status`, { cache: "no-store" })
        const b = await r.json()
        if (!r.ok) return
        const z: Record<string, { status: string; fehler: string | null }> = {}
        for (const d of b.zustellungen as Array<{ draft_id: string; status: string; fehler: string | null }>) z[d.draft_id] = { status: d.status, fehler: d.fehler }
        setZustellung(z)
        setBatch((prev) => (prev ? { ...prev, status: b.status } : prev))
      } catch {
        /* nächster Versuch */
      }
    }, 4000)
    return () => window.clearInterval(t)
  }, [versandLaeuft, batchId])

  const post = async (body: Record<string, unknown>) => {
    setLaeuft(true)
    try {
      const r = await fetch(`/api/revy/batches/${batchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) setFehler(b?.error ?? "Das ging gerade nicht.")
      else setFehler(null)
      return r.ok
    } finally {
      setLaeuft(false)
    }
  }

  if (!batch) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm text-[var(--rv-ink-soft)]">
        <BackLink onBack={onBack} />
        {fehler ?? (
          <span className="flex items-center gap-2 text-[var(--rv-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Lädt
          </span>
        )}
      </div>
    )
  }

  const istOffen = batch.status === "entwurf"
  const toene = batch.art === "absage" ? ["standard", "kurz", "persoenlich"] : ["offen", "vor_ort", "video", "telefon"]
  const anzahl = auswahl.size
  const wort = batch.art === "absage" ? (anzahl === 1 ? "Absage" : "Absagen") : anzahl === 1 ? "Einladung" : "Einladungen"

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <BackLink onBack={onBack} />
      <p className="text-sm font-bold text-[var(--rv-ink)]">
        {batch.art === "absage" ? "Absagen" : "Einladungen"} · {batch.stelle.titel}
      </p>
      <p className="mt-0.5 text-xs text-[var(--rv-ink-soft)]">
        {istOffen
          ? "Prüf die Entwürfe, wähl ab, was nicht raus soll, und gib frei. Verschickt wird gestaffelt."
          : batch.status === "abgebrochen"
            ? "Abgebrochen. Was noch nicht verschickt war, bleibt liegen."
            : "Freigegeben. Der Stand je Empfänger aktualisiert sich hier."}
      </p>

      {istOffen && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={batch.art === "absage" ? "Ton für alle" : "Gesprächsform für alle"}>
          {toene.map((t) => (
            <button
              key={t}
              type="button"
              disabled={laeuft}
              onClick={async () => {
                if (t !== batch.ton && (await post({ aktion: "ton", ton: t }))) setVersion((v) => v + 1)
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium ${t === batch.ton ? "bg-[var(--rv-ink)] text-white" : "bg-[var(--rv-mist)] text-[var(--rv-ink-soft)] hover:bg-[var(--rv-mist-2)]"}`}
            >
              {TON_LABEL[t] ?? t}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-3 divide-y divide-[var(--rv-mist-2)] overflow-hidden rounded-2xl border border-[var(--rv-mist-2)]">
        {batch.entwuerfe.map((d) => {
          const name = names[d.ref] ?? d.ref
          const z = zustellung[d.id]
          const werte = { name, stelle: batch.stelle.titel, firma: batch.stelle.firma }
          return (
            <li key={d.id} className="px-3.5 py-2 text-sm">
              <div className="flex items-center gap-2.5">
                {istOffen && (
                  <input
                    type="checkbox"
                    checked={auswahl.has(d.id)}
                    onChange={(ev) =>
                      setAuswahl((prev) => {
                        const n = new Set(prev)
                        if (ev.target.checked) n.add(d.id)
                        else n.delete(d.id)
                        return n
                      })
                    }
                    aria-label={`${name} auswählen`}
                    className="h-4 w-4 accent-[var(--rv-green-deep)]"
                  />
                )}
                <button type="button" onClick={() => setOffen(offen === d.id ? null : d.id)} className="min-w-0 flex-1 text-left">
                  <span className={`block truncate font-semibold ${istOffen && !auswahl.has(d.id) ? "text-[var(--rv-muted)] line-through" : "text-[var(--rv-ink)]"}`}>{name}</span>
                  <span className="block truncate text-xs text-[var(--rv-muted)]">{renderDraft(d.betreff, werte)}</span>
                </button>
                {z && (
                  <span className={`shrink-0 text-xs ${z.status === "zugestellt" ? "text-[var(--rv-green-deep)]" : z.status === "fehler" || z.status === "zurueckgewiesen" ? "text-red-600" : "text-[var(--rv-muted)]"}`} title={z.fehler ?? undefined}>
                    {ZUSTELL_LABEL[z.status] ?? z.status}
                  </span>
                )}
              </div>
              {offen === d.id && (
                <div className="mt-2 whitespace-pre-line rounded-xl bg-[var(--rv-mist)] px-3 py-2 text-xs leading-relaxed text-[var(--rv-ink)]">{renderDraft(d.text, werte)}</div>
              )}
            </li>
          )
        })}
      </ul>

      {fehler && <p className="mt-2 text-xs text-red-600">{fehler}</p>}

      {istOffen && batch.token && (
        <div className="mt-3 space-y-2">
          {/* Bewusster Klick: kein Fokus beim Öffnen, Enter und Leertaste lösen
              nichts aus, nur ein echter Klick (event.detail > 0). */}
          <button
            type="button"
            disabled={laeuft || anzahl === 0}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") ev.preventDefault()
            }}
            onClick={async (ev) => {
              if (ev.detail === 0) return
              if (await post({ aktion: "freigeben", token: batch.token, ausgewaehlt: [...auswahl] })) setVersion((v) => v + 1)
            }}
            className="w-full rounded-full bg-[var(--rv-green)] px-4 py-2 text-sm font-semibold text-[var(--rv-ink)] active:scale-[0.98] disabled:opacity-40"
          >
            {anzahl} {wort} verschicken
          </button>
          <p className="text-center text-[11px] text-[var(--rv-muted)]">Nur per Klick, nicht mit Enter. Danach geht eine Mail nach der anderen raus.</p>
          <button
            type="button"
            disabled={laeuft}
            onClick={async () => {
              if (await post({ aktion: "abbrechen" })) setVersion((v) => v + 1)
            }}
            className="w-full rounded-full px-4 py-1.5 text-xs font-medium text-[var(--rv-ink-soft)] hover:bg-[var(--rv-mist)]"
          >
            Entwürfe verwerfen
          </button>
        </div>
      )}

      {batch.status === "freigegeben" && Object.values(zustellung).some((z) => z.status === "geplant") && (
        <button
          type="button"
          disabled={laeuft}
          onClick={async () => {
            if (await post({ aktion: "abbrechen" })) setVersion((v) => v + 1)
          }}
          className="mt-3 w-full rounded-full border border-[var(--rv-mist-2)] px-4 py-1.5 text-xs font-medium text-[var(--rv-ink)] hover:bg-[var(--rv-mist)]"
        >
          Restlichen Versand stoppen
        </button>
      )}
    </div>
  )
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1 text-xs font-medium text-[var(--rv-ink-soft)] hover:text-[var(--rv-ink)]">
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      Zurück zum Chat
    </button>
  )
}

interface Ueberblick {
  pro_stelle: Array<{ stelle_id: string; titel: string; bewerbungen: number; status: Record<string, number>; durchschnitt_score: number | null; neu_7_tage: number; wartet_ueber_14_tage: number }>
}

function OverviewResult({ e }: { e: Ergebnis }) {
  const d = e.data as Ueberblick
  if (!d.pro_stelle?.length) return null
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--rv-mist-2)]">
      <ul className="divide-y divide-[var(--rv-mist-2)]">
        {d.pro_stelle.map((s) => (
          <li key={s.stelle_id} className="px-3.5 py-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate font-semibold text-[var(--rv-ink)]">{s.titel}</span>
              <span className="shrink-0 text-xs tabular-nums text-[var(--rv-muted)]">
                {s.bewerbungen} {s.bewerbungen === 1 ? "Bewerbung" : "Bewerbungen"}
                {s.durchschnitt_score != null ? ` · Ø ${s.durchschnitt_score} %` : ""}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--rv-ink-soft)]">
              {Object.entries(s.status)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${k} ${v}`)
                .join(" · ") || "noch keine Bewerbungen"}
            </p>
            {(s.neu_7_tage > 0 || s.wartet_ueber_14_tage > 0) && (
              <p className="mt-0.5 text-xs text-[var(--rv-muted)]">
                {[s.neu_7_tage ? `${s.neu_7_tage} neu diese Woche` : null, s.wartet_ueber_14_tage ? `${s.wartet_ueber_14_tage} warten über 14 Tage` : null].filter(Boolean).join(" · ")}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
