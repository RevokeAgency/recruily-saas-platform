// Wann fragt Revetly nach Produkt-Feedback?
//
// Die Schwellen stehen bewusst hier und nicht in der Datenbank: Sie sind eine
// Produktentscheidung, die man nach den ersten Wochen nachjustieren will, ohne
// eine Migration zu fahren.

/**
 * Nach wie vielen bewerteten Kandidaten (Lebenszeit, nicht pro Monat) gefragt
 * wird. Wird eine Frage weggeklickt, rückt die nächste Schwelle nach. Nach der
 * letzten Schwelle fragt Revetly von selbst nicht mehr.
 */
export const FEEDBACK_MILESTONES = [5, 10, 30] as const

/** Wie lange „Später" mindestens Ruhe gibt. */
export const SNOOZE_DAYS = 7

export interface FeedbackState {
  matchesLifetime: number
  stage: number
  snoozedUntil: string | null
  optedOut: boolean
}

export interface FeedbackPrompt {
  /** Die Schwelle, die die Frage ausgelöst hat (5, 10, 30). */
  milestone: number
  /** Nullbasierter Index der Schwelle. */
  stage: number
  /** Ist das die erste Frage überhaupt? Ändert die Ansprache im Dialog. */
  first: boolean
}

/**
 * Entscheidet, ob jetzt gefragt werden darf. Reine Funktion, damit sie sich
 * testen lässt, ohne eine Datenbank zu brauchen.
 */
export function nextPrompt(state: FeedbackState, now: Date = new Date()): FeedbackPrompt | null {
  if (state.optedOut) return null

  const stage = Math.max(0, state.stage)
  if (stage >= FEEDBACK_MILESTONES.length) return null

  if (state.snoozedUntil && new Date(state.snoozedUntil).getTime() > now.getTime()) return null

  const milestone = FEEDBACK_MILESTONES[stage]
  if (state.matchesLifetime < milestone) return null

  return { milestone, stage, first: stage === 0 }
}

/** Zeitpunkt, ab dem nach einem „Später" wieder gefragt werden darf. */
export function snoozeUntil(now: Date = new Date()): string {
  return new Date(now.getTime() + SNOOZE_DAYS * 24 * 60 * 60 * 1000).toISOString()
}
