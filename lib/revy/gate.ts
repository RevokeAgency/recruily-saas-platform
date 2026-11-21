import { createHash } from "node:crypto"
import { getTool, type Effect } from "./tools"

// ─────────────────────────────────────────────────────────────────────────────
// Freigaberegel von Revy. Steht nur hier.
//
//   LESEND       läuft sofort.
//   INTERN       läuft sofort, rücknehmbar über revy_actions (ab Etappe 2).
//   NACH_AUSSEN  läuft nie aus dem Plan heraus. Es entstehen nur Entwürfe;
//                versendet wird ausschließlich über die eigene Freigaberoute
//                nach einem Klick (ab Etappe 3).
//
// Dazu die Ableitungsregel gegen Prompt Injection: Ausgeführt wird nur, was
// im gespeicherten Plan steht. Der Plan entsteht, bevor das Modell
// Bewerbertext sieht. Alles andere wird geblockt und als Vorfall erfasst.
// ─────────────────────────────────────────────────────────────────────────────

export interface PlannedStep {
  schritt: number
  werkzeug: string
  parameter: Record<string, unknown>
  wirkung: Effect
  klartext: string
  /** Prüfsumme über Werkzeug und Parameter, gegen nachträgliche Änderung. */
  siegel: string
}

export type GateDecision =
  | { ok: true; wirkung: Effect }
  | { ok: false; grund: "unbekanntes_werkzeug" | "ungueltige_parameter" | "ungeplante_aktion" | "freigabe_noetig"; detail?: string; vorfall: boolean }

export function seal(werkzeug: string, parameter: unknown): string {
  return createHash("sha256").update(JSON.stringify([werkzeug, parameter])).digest("hex").slice(0, 32)
}

/**
 * Prüft einen Vorschlag des Planungsmodells und macht daraus einen Schritt.
 * Parameter werden gegen das Schema des Werkzeugs geprüft und normalisiert.
 */
export function admitProposal(
  schritt: number,
  werkzeug: string,
  input: unknown,
): { ok: true; step: PlannedStep } | { ok: false; decision: Extract<GateDecision, { ok: false }> } {
  const tool = getTool(werkzeug)
  if (!tool) return { ok: false, decision: { ok: false, grund: "unbekanntes_werkzeug", detail: werkzeug, vorfall: true } }
  const parsed = tool.params.safeParse(input ?? {})
  if (!parsed.success) {
    return {
      ok: false,
      decision: { ok: false, grund: "ungueltige_parameter", detail: parsed.error.issues.map((i) => i.message).join("; "), vorfall: false },
    }
  }
  const parameter = parsed.data as Record<string, unknown>
  return {
    ok: true,
    step: { schritt, werkzeug, parameter, wirkung: tool.effect, klartext: tool.describe(parameter), siegel: seal(werkzeug, parameter) },
  }
}

/**
 * Darf dieser Schritt jetzt laufen? `plan` ist der gespeicherte Plan des
 * Laufs. Die Wirkungsklasse kommt immer aus dem Register, nie aus dem Schritt.
 */
export function gate(step: PlannedStep, plan: PlannedStep[]): GateDecision {
  const tool = getTool(step.werkzeug)
  if (!tool) return { ok: false, grund: "unbekanntes_werkzeug", detail: step.werkzeug, vorfall: true }

  const stored = plan.find((p) => p.schritt === step.schritt)
  if (!stored || stored.werkzeug !== step.werkzeug || stored.siegel !== seal(step.werkzeug, step.parameter)) {
    return { ok: false, grund: "ungeplante_aktion", detail: step.werkzeug, vorfall: true }
  }
  if (!tool.params.safeParse(step.parameter).success) {
    return { ok: false, grund: "ungueltige_parameter", vorfall: false }
  }

  switch (tool.effect) {
    case "LESEND":
      return { ok: true, wirkung: "LESEND" }
    case "INTERN":
      return { ok: true, wirkung: "INTERN" }
    case "NACH_AUSSEN":
      // Kein Weg aus dem Plan heraus. Auch nicht mit Bestätigung.
      return { ok: false, grund: "freigabe_noetig", vorfall: false }
  }
}
