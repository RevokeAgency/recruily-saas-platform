import { z } from "zod"
import { mentionsBlocked } from "./policy"

// ─────────────────────────────────────────────────────────────────────────────
// Belegpflicht. Jede inhaltliche Aussage in einer Antwort von Revy trägt
// mindestens einen Beleg: Kürzel, Quelle, Seite (bei Unterlagen) und ein
// wörtliches Zitat. Der Prüfer gleicht jedes Zitat gegen die Ergebnisse der
// Werkzeuge in diesem Lauf ab. Was nicht belegt ist, ersetzt NO_EVIDENCE.
// ─────────────────────────────────────────────────────────────────────────────

export const NO_EVIDENCE = "Dazu geben die Unterlagen nichts her."

export const belegSchema = z.object({
  ref: z.string().max(60).describe("Kürzel K-XXXXXXXX oder stelle:<id>"),
  quelle: z.enum(["unterlagen", "profil", "matching", "stelle"]),
  seite: z.number().int().min(1).max(50).nullable(),
  zitat: z.string().max(300).describe("Wörtlich aus dem Datenblock kopiert"),
})
export type Beleg = z.infer<typeof belegSchema>

export const aussageSchema = z.object({
  text: z.string().max(500),
  belege: z.array(belegSchema).max(4),
})
export type Aussage = z.infer<typeof aussageSchema>

export interface CheckedAussage {
  text: string
  belege: Beleg[]
  belegt: boolean
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[„“”"'‚‘’«»]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.…]+$/, "")
    .trim()
}

/** Seitenangabe eines Ausschnitts, für die Prüfung der Seite. */
export type Korpus = Record<string, string[]>
export type SeitenKorpus = Record<string, Array<{ seite: number; text: string }>>

function belegOk(b: Beleg, korpus: Korpus, seiten: SeitenKorpus): boolean {
  const zitat = norm(b.zitat)
  if (zitat.length === 0) return false
  // Kurze Zitate (etwa ein Score "81") nur als ganzer Wert, längere als Teil.
  const found = (t: string) => (zitat.length < 3 ? norm(t) === zitat : norm(t).includes(zitat))
  if (b.quelle === "unterlagen") {
    const list = seiten[b.ref] ?? []
    return list.some((s) => (b.seite == null || s.seite === b.seite) && found(s.text))
  }
  return (korpus[b.ref] ?? []).some(found)
}

/**
 * Prüft alle Aussagen. Unbelegte oder falsch belegte Aussagen und Aussagen,
 * die ein gesperrtes Merkmal nennen, werden durch NO_EVIDENCE ersetzt.
 * Mehrere Ersetzungen hintereinander werden zu einer zusammengefasst.
 */
export function checkEvidence(aussagen: Aussage[], korpus: Korpus, seiten: SeitenKorpus): CheckedAussage[] {
  const out: CheckedAussage[] = []
  for (const a of aussagen) {
    const belege = a.belege.filter((b) => belegOk(b, korpus, seiten))
    const ok = a.text.trim().length > 0 && belege.length > 0 && belege.length === a.belege.length && !mentionsBlocked(a.text)
    const item: CheckedAussage = ok ? { text: a.text.trim(), belege, belegt: true } : { text: NO_EVIDENCE, belege: [], belegt: false }
    const last = out[out.length - 1]
    if (!item.belegt && last && !last.belegt) continue
    out.push(item)
  }
  if (out.length === 0) out.push({ text: NO_EVIDENCE, belege: [], belegt: false })
  return out
}
