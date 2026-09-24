// Einwilligung und Regeln zum Lernen aus Einstellungsentscheidungen.
//
// Seit Positionierung v2 gilt, was die Landing Page, die FAQ und die
// Datenschutzerklärung zusagen: "Revetly lernt aus deinen Entscheidungen nur
// für dein Konto und nur mit deiner ausdrücklichen Zustimmung."
//
// Daraus folgt technisch:
//   1. Die Kalibrierung pro Konto (nächtlicher Cron, Gewichte der Match
//      Analyse) läuft nur mit gültiger Einwilligung in der aktuellen Fassung.
//      Vorher lief sie für alle Konten ohne Einwilligung.
//   2. Angepasste Gewichte wirken nur in den Plänen, deren Preistabelle
//      "Gewichtung lernt mit" zusagt.
//   3. Das gemeinsame Modelltraining über Konten hinweg (Fine-Tune eines
//      eigenen Revetly-Modells) widerspricht "nur für dein Konto" und ist
//      deshalb abgeschaltet. Der Code bleibt, der Schalter steht auf aus.
//      Wer ihn einschaltet, muss vorher Landing Page, FAQ, Einwilligungstext
//      und Datenschutzerklärung ändern.

/**
 * Fassung der Einwilligungserklärung. Bei jeder inhaltlichen Änderung
 * hochzählen: Gespeichert wird pro Einwilligung, welcher Fassung zugestimmt
 * wurde (Nachweispflicht Art. 7 Abs. 1 DSGVO), und nur die aktuelle zählt.
 *
 * 2026-08-v1: Nutzung für ein gemeinsames Revetly-Modell.
 * 2026-09-v2: Lernen nur für das eigene Konto. Neuer Zweck, deshalb gilt eine
 *             Zustimmung zu v1 nicht weiter und muss neu erteilt werden.
 */
export const CONSENT_VERSION = "2026-09-v2"

/** Pläne, in denen angepasste Gewichte wirken (Preistabelle: "Gewichtung lernt mit"). */
export const LEARNING_PLANS: readonly string[] = ["pro", "enterprise"]

/** Gemeinsames Modelltraining über Konten hinweg. Standard: aus. */
export const SHARED_TRAINING_ENABLED = process.env.AI_SHARED_TRAINING === "on"

type ConsentFields = {
  ai_training_consent?: boolean | null
  ai_training_consent_version?: string | null
}

/** Gültige Einwilligung in der aktuellen Fassung. */
export function hasLearningConsent(p: ConsentFields | null | undefined): boolean {
  return p?.ai_training_consent === true && p?.ai_training_consent_version === CONSENT_VERSION
}

/** Dürfen angepasste Gewichte für dieses Konto wirken? */
export function mayApplyLearnedWeights(p: (ConsentFields & { plan?: string | null }) | null | undefined): boolean {
  return hasLearningConsent(p) && LEARNING_PLANS.includes(p?.plan ?? "")
}
