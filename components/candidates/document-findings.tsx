"use client"

import { EyeOff, MessageSquareWarning } from "lucide-react"

import type { DocumentCheck, DocumentFinding, FindingReason } from "@/lib/document-guard/types"

// Die Texte sind bewusst nüchtern. Versteckter Text ist ein Befund, kein
// Urteil über die Person: Auch ein Wasserzeichen oder ein Rest aus einer
// Vorlage kann dahinterstecken. Was daraus folgt, entscheidet der Recruiter.

const REASON_LABEL: Record<FindingReason, string> = {
  unsichtbar: "nicht sichtbar, Schrift wie Hintergrund oder verdeckt",
  winzig: "winzige Schrift",
  ausserhalb: "außerhalb der Seite",
  ausgeblendet: "in Word ausgeblendet",
  unicode: "unsichtbare Zeichen",
  anweisung: "sichtbarer Satz an eine KI",
}

const SOURCE_LABEL = { lebenslauf: "Lebenslauf", anschreiben: "Anschreiben" } as const

function isHidden(f: DocumentFinding): boolean {
  return f.reason !== "anweisung"
}

function findingsOf(check: DocumentCheck | null | undefined): DocumentFinding[] {
  return Array.isArray(check?.findings) ? check.findings : []
}

/** Kleines Kennzeichen für die Kandidatenzeile. Nichts, wenn es keinen Befund gibt. */
export function DocumentFindingsBadge({ check }: { check: DocumentCheck | null | undefined }) {
  const findings = findingsOf(check)
  if (findings.length === 0) return null
  const hidden = findings.some(isHidden)
  return (
    <span
      title={hidden ? "Unterlagen enthalten Text, den man im Dokument nicht sieht" : "Unterlagen enthalten einen Satz an eine KI"}
      className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
    >
      {hidden ? <EyeOff className="h-2.5 w-2.5" /> : <MessageSquareWarning className="h-2.5 w-2.5" />}
      {hidden ? "Versteckt" : "KI-Satz"}
    </span>
  )
}

/** Befunde mit Beleg für die Detailansicht. */
export function DocumentFindingsPanel({ check, className = "" }: { check: DocumentCheck | null | undefined; className?: string }) {
  const findings = findingsOf(check)
  if (findings.length === 0) return null
  const hidden = findings.filter(isHidden)
  const sentences = findings.filter((f) => !isHidden(f))

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50/70 p-4 ${className}`}>
      <div className="mb-1.5 flex items-center gap-2">
        {hidden.length ? <EyeOff className="h-4 w-4 text-amber-700" /> : <MessageSquareWarning className="h-4 w-4 text-amber-700" />}
        <span className="text-sm font-semibold text-amber-800">
          {hidden.length ? "Versteckter Text in den Unterlagen" : "Satz an eine KI in den Unterlagen"}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-amber-900/80">
        {hidden.length > 0 &&
          "Diese Stellen sieht man im Dokument nicht, sie stehen aber in der Datei. Revetly hat sie aus der Analyse genommen, der Match beruht nur auf dem sichtbaren Inhalt. "}
        {sentences.length > 0 &&
          "Sätze, die sich an eine KI richten, befolgt Revetly nicht. Sie verändern den Match nicht."}
      </p>

      <ul className="mt-3 space-y-2.5">
        {findings.map((f, i) => (
          <li key={i} className="text-sm">
            <div className="text-[11px] font-semibold tracking-wide text-amber-800/80 uppercase">
              {SOURCE_LABEL[f.source] ?? "Unterlagen"}
              {f.page ? ` · Seite ${f.page}` : ""} · {REASON_LABEL[f.reason] ?? f.reason}
            </div>
            <blockquote className="mt-1 border-l-2 border-amber-300 pl-3 leading-relaxed break-words text-foreground/80">
              „{f.excerpt}“
            </blockquote>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-amber-900/70">
        {hidden.length > 0 &&
          "Ein Befund ist noch kein Beweis für Absicht. Auch ein Wasserzeichen oder ein Rest aus einer Vorlage kann dahinterstecken. "}
        Ob du es im Gespräch ansprichst, entscheidest du.
      </p>
    </div>
  )
}
