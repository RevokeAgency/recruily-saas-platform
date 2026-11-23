import { fold } from "./tools"

// ─────────────────────────────────────────────────────────────────────────────
// Filter, die der Nutzer nicht genannt hat, fliegen aus dem Plan.
//
// Das Planungsmodell hängt gern Filter an, die niemand verlangt hat (etwa
// „nur Talent-Pool“, Protokoll vom 23.11.2026), und die Suche bleibt dann
// leer. Bevor der Plan gesiegelt wird, prüft der Code jeden Filter gegen den
// Wortlaut des Befehls und entfernt, was dort keine Grundlage hat.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_WOERTER: Record<string, RegExp> = {
  neu: /\bneu/,
  wartet: /wart|kontingent/,
  in_analyse: /analys/,
  bewertet: /bewert|gematcht|score/,
  shortlist: /shortlist|vorauswahl|engere/,
  eingeladen: /einlad|eingeladen|gesprach|gespraech|interview/,
  eingestellt: /eingestellt|einstell/,
  abgesagt: /absag|abgesagt/,
  fehler: /fehler/,
}

type Params = Record<string, unknown>

export function trimUnfoundedFilters(werkzeug: string, input: unknown, befehl: string): { input: unknown; entfernt: string[] } {
  if (werkzeug !== "pool_suchen" || !input || typeof input !== "object") return { input, entfernt: [] }
  const b = fold(befehl)
  const p: Params = { ...(input as Params) }
  const entfernt: string[] = []
  const drop = (key: string) => {
    if (p[key] != null) {
      delete p[key]
      entfernt.push(key)
    }
  }

  if (p.nur_talent_pool && !/talent/.test(b)) drop("nur_talent_pool")
  if (typeof p.ort === "string" && !b.includes(fold(p.ort))) drop("ort")
  if (p.min_berufsjahre != null && !/jahr/.test(b)) drop("min_berufsjahre")
  if (typeof p.status === "string" && !(STATUS_WOERTER[p.status]?.test(b) ?? false)) drop("status")
  if (typeof p.tag === "string" && !b.includes(fold(p.tag)) && !/\btag|markier|etikett/.test(b)) drop("tag")
  if ((p.min_score != null || p.max_score != null) && !/prozent|score|punkte|\d/.test(b) && !befehl.includes("%")) {
    drop("min_score")
    drop("max_score")
  }
  if ((p.eingang_aelter_als_tage != null || p.eingang_juenger_als_tage != null) && !/tag|woche|monat|seit|alter|aelter|neu|frisch|letzt/.test(b)) {
    drop("eingang_aelter_als_tage")
    drop("eingang_juenger_als_tage")
  }
  // modus "alle" bleibt: "SAP und Disposition" meint oft beides. Findet die
  // Suche damit nichts, lockert pool_suchen selbst und sagt das.
  return { input: p, entfernt }
}
