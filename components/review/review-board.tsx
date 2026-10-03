"use client"

import { useState } from "react"
import { Check, CheckCircle2, FileText, Loader2, MapPin, ShieldAlert, ThumbsDown, ThumbsUp } from "lucide-react"
import { toast } from "sonner"

import {
  REVIEW_COMMENT_MAX,
  VERDICT_LABEL,
  type ReviewCandidateView,
  type ReviewPageData,
  type ReviewVerdict,
} from "@/lib/review/shared"

type OkData = Extract<ReviewPageData, { status: "ok" }>

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
}

function dateDe(iso: string) {
  return new Date(iso).toLocaleDateString("de-AT", { day: "numeric", month: "long" })
}

/**
 * Freigabeseite: pro Bewerber Zusammenfassung, Lebenslauf und das Urteil
 * "Interessant" oder "Ablehnen" mit Kommentar. Jedes Urteil wird sofort
 * gespeichert und lässt sich bis zum Ablauf des Links ändern.
 */
export function ReviewBoard({ token, data }: { token: string; data: OkData }) {
  const [candidates, setCandidates] = useState<ReviewCandidateView[]>(data.candidates)
  const decided = candidates.filter((c) => c.verdict).length
  const allDone = candidates.length > 0 && decided === candidates.length

  const onSaved = (itemId: string, verdict: ReviewVerdict, comment: string | null) => {
    setCandidates((list) =>
      list.map((c) => (c.itemId === itemId ? { ...c, verdict, comment, decidedAt: new Date().toISOString() } : c)),
    )
  }

  return (
    <div className="mx-auto max-w-[880px] px-4 py-10 sm:px-6 lg:py-14">
      <section className="rounded-[var(--rv-radius-lg)] border border-[var(--app-line)] bg-white p-7 shadow-[var(--rv-shadow-sm)]">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--rv-green-deep)]">
          Deine Einschätzung
        </p>
        <h1 className="mt-2 text-[1.4rem] font-bold leading-tight tracking-tight text-foreground">{data.jobTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[data.company, data.jobLocation].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-foreground">
          {data.reviewerName ? `Hallo ${data.reviewerName}, ` : ""}
          {data.senderName} bittet dich um deine Einschätzung zu{" "}
          {candidates.length === 1 ? "dieser Bewerbung" : `diesen ${candidates.length} Bewerbungen`}. Sag pro Person,
          ob sie für dich interessant ist. Ein kurzer Satz dazu hilft am meisten.
        </p>
        {data.note && (
          <blockquote className="mt-4 whitespace-pre-line rounded-2xl border border-[var(--app-line)] bg-[var(--rv-mist)] px-4 py-3 text-sm leading-relaxed text-foreground">
            {data.note}
          </blockquote>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">
            {decided} von {candidates.length} beurteilt
          </span>
          <span>Link gültig bis {dateDe(data.expiresAt)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--rv-mist)]">
          <div
            className="h-full rounded-full bg-[image:var(--rv-gradient)] transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ width: `${candidates.length ? (decided / candidates.length) * 100 : 0}%` }}
          />
        </div>
      </section>

      {allDone && (
        <div className="mt-5 flex items-start gap-3 rounded-[var(--rv-radius-lg)] border border-[rgba(22,199,124,.3)] bg-[var(--app-green-wash)] px-5 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-[var(--rv-green-deep)]" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Danke, deine Rückmeldung ist angekommen.</p>
            <p className="mt-0.5 text-muted-foreground">
              {data.senderName} sieht deine Einschätzung jetzt. Bis zum Ablauf des Links kannst du sie noch ändern.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {candidates.map((c) => (
          <CandidateCard key={c.itemId} token={token} candidate={c} onSaved={onSaved} />
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Die Zusammenfassungen und der Match hat Revetly automatisch aus den Unterlagen erstellt. Sie sind eine Hilfe,
        keine Entscheidung. Was dir wichtig ist, prüfst du am besten direkt im Lebenslauf.
      </p>
    </div>
  )
}

function CandidateCard({
  token,
  candidate: c,
  onSaved,
}: {
  token: string
  candidate: ReviewCandidateView
  onSaved: (itemId: string, verdict: ReviewVerdict, comment: string | null) => void
}) {
  const [editing, setEditing] = useState(!c.verdict)
  const [comment, setComment] = useState(c.comment ?? "")
  const [saving, setSaving] = useState<ReviewVerdict | null>(null)

  const submit = async (verdict: ReviewVerdict) => {
    setSaving(verdict)
    try {
      const res = await fetch(`/api/public/review/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: c.itemId, verdict, comment }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || "Speichern fehlgeschlagen")
        return
      }
      onSaved(c.itemId, verdict, comment.trim() || null)
      setEditing(false)
    } catch {
      toast.error("Speichern fehlgeschlagen. Bitte prüfe deine Verbindung.")
    } finally {
      setSaving(null)
    }
  }

  const meta = [c.headline, c.location, c.years != null ? `${c.years} Jahre Erfahrung` : null].filter(Boolean)

  return (
    <article className="rounded-[var(--rv-radius-lg)] border border-[var(--app-line)] bg-white p-6 shadow-[var(--rv-shadow-sm)]">
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-sm font-bold text-[#0C1A16]"
          style={{ backgroundImage: "var(--rv-gradient)" }}
          aria-hidden="true"
        >
          {initials(c.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">{c.name}</h2>
            {c.knockout && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                <ShieldAlert className="h-3 w-3" /> K.O.-Kriterium
              </span>
            )}
          </div>
          {meta.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {c.location && <MapPin className="mr-1 -mt-0.5 inline h-3.5 w-3.5" />}
              {meta.join(" · ")}
            </p>
          )}
        </div>
        {c.score != null && (
          <div className="flex-none text-right">
            <div className="text-2xl font-extrabold tabular-nums tracking-tight text-foreground">{c.score}</div>
            <div className="text-[11px] font-medium text-muted-foreground">Match</div>
          </div>
        )}
      </div>

      {c.knockout && c.knockoutReasons.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {c.knockoutReasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      {c.strengths.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Was passt</p>
          <ul className="mt-2 space-y-1.5">
            {c.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                <Check className="mt-0.5 h-4 w-4 flex-none text-[var(--rv-green-deep)]" strokeWidth={2.6} />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.summary && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Kurzprofil</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{c.summary}</p>
        </div>
      )}

      {c.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {c.skills.map((s) => (
            <span key={s} className="rounded-full bg-[var(--rv-mist)] px-2.5 py-1 text-xs font-medium text-foreground">{s}</span>
          ))}
        </div>
      )}

      {c.hasCv && (
        <a
          href={`/api/public/review/${token}/cv/${c.itemId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--app-line)] bg-white px-4 py-2 text-sm font-medium text-foreground transition-all hover:-translate-y-px hover:border-[var(--rv-green)] hover:shadow-[0_8px_20px_-14px_rgba(22,199,124,.6)]"
        >
          <FileText className="h-4 w-4" /> Lebenslauf ansehen
        </a>
      )}

      <div className="mt-5 border-t border-[var(--app-line)] pt-5">
        {!editing && c.verdict ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  c.verdict === "interessant" ? "bg-[var(--app-green-wash)] text-[var(--rv-green-deep)]" : "bg-red-50 text-red-600"
                }`}
              >
                {c.verdict === "interessant" ? <ThumbsUp className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
                {VERDICT_LABEL[c.verdict]}
              </span>
              {c.comment && <p className="mt-2 whitespace-pre-line text-muted-foreground">{c.comment}</p>}
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Ändern
            </button>
          </div>
        ) : (
          <>
            <label htmlFor={`comment-${c.itemId}`} className="text-sm font-medium text-foreground">
              Kommentar <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id={`comment-${c.itemId}`}
              value={comment}
              maxLength={REVIEW_COMMENT_MAX}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Zum Beispiel: Erfahrung mit Hydraulik fehlt, sonst gerne kennenlernen."
              className="mt-2 w-full resize-none rounded-2xl border border-[var(--app-line)] px-4 py-3 text-sm leading-relaxed text-foreground outline-none focus:border-[var(--rv-green)] focus:ring-1 focus:ring-[var(--rv-green)]"
            />
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => submit("interessant")}
                disabled={saving !== null}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[image:var(--rv-gradient)] px-4 py-3 text-sm font-bold text-[#0C1A16] shadow-[0_10px_24px_-14px_rgba(22,199,124,.8)] transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-60"
              >
                {saving === "interessant" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                Interessant
              </button>
              <button
                type="button"
                onClick={() => submit("ablehnen")}
                disabled={saving !== null}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 transition-transform duration-150 ease-out hover:bg-red-50 active:scale-[0.97] disabled:opacity-60"
              >
                {saving === "ablehnen" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                Ablehnen
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  )
}
