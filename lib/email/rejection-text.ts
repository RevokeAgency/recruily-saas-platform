// Reiner Absagetext ohne Abhängigkeiten, damit ihn auch das Modal im Browser
// als Vorschlag anzeigen kann, ohne den Mailversand ins Client-Bundle zu ziehen.
// Versand: lib/email/rejection.ts.
//
// Die Anrede an Bewerber bleibt bewusst beim Sie: Das ist Korrespondenz im
// Namen des Kunden an Dritte, nicht die Ansprache von Revetly an seine Nutzer.

/** Obergrenze für einen selbst geschriebenen Absagetext. */
export const MAX_REJECTION_TEXT = 5000

export function defaultRejectionText(candidateName: string, jobTitle: string, companyName: string): string {
  return `Guten Tag ${candidateName},

vielen Dank für Ihre Bewerbung als ${jobTitle} bei ${companyName}.

Nach sorgfältiger Prüfung aller eingegangenen Bewerbungen müssen wir Ihnen leider mitteilen, dass wir uns für andere Kandidatinnen und Kandidaten entschieden haben, die noch besser zu unserem aktuellen Anforderungsprofil passen.

Wir danken Ihnen für Ihr Interesse an unserem Unternehmen und wünschen Ihnen bei Ihrer weiteren Suche viel Erfolg.

Mit freundlichen Grüßen
${companyName}`
}
