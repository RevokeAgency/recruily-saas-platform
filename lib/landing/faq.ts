import { PLANS } from "@/lib/plans"

// Fragen und Antworten der FAQ auf der Startseite. Eigene Datei ohne
// "use client", damit dieselben Texte auch als FAQPage-Daten für
// Suchmaschinen dienen (lib/seo/site-schema.ts).
// Die Zahlen kommen aus lib/plans.ts. "Wie viele Stellen" nannte früher
// "nicht begrenzt", obwohl die Pläne Stellen sehr wohl begrenzen.
export const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "Was zählt als Match?",
    a: `Ein Match ist die Analyse genau einer Bewerbung für genau eine Stelle. Zwanzig Bewerbungen auf eine Stelle ergeben zwanzig Matches. Zum Testen bekommst du eine Probestelle mit ${PLANS.free.matches} Matches, danach wechselst du auf einen bezahlten Plan.`,
  },
  {
    q: "Ersetzt Revetly mein HR-System?",
    a: "Nein. Revetly deckt die Auswahl ab, von der Stellenanzeige bis zur Zusage. Danach überträgst du die eingestellte Person in dein HR-System.",
  },
  {
    q: "Wer trifft die Entscheidung?",
    a: "Immer du. Revetly sortiert, begründet und organisiert, eingestellt wird nur, wen du auswählst.",
  },
  {
    q: "Wie kommt die Revetly Match Analyse zustande?",
    a: "Aus dem vollständigen Lebenslauf entsteht zuerst ein Kurzdossier, danach prüft Revetly nach festen Regeln, welche geforderten Fähigkeiten wirklich gedeckt sind. Erst dann prüft ein Modell die neun Ebenen und muss vor jeder Zahl Begründung und Beleg liefern. Ein zweites Modell kontrolliert das Ergebnis gegen und korrigiert, wo nötig, und du siehst am Ende beide Urteile.",
  },
  {
    q: "Wie viele Stellen kann ich parallel betreiben?",
    a: "Das hängt vom Plan ab, von einer Probestelle im kostenlosen Plan bis unbegrenzt im Pro-Plan. Dein Match-Kontingent gilt stellenübergreifend.",
  },
  {
    q: "Was passiert, wenn mein Kontingent aufgebraucht ist?",
    a: "Du wirst rechtzeitig benachrichtigt, bevor es so weit ist. Weitere Bewerbungen kommen trotzdem an und warten auf ihren Match, sobald du aufstockst. Bereits gematchte Kandidaten und alle Daten bleiben dabei unverändert erhalten.",
  },
  {
    q: "Wo werden die Bewerberdaten verarbeitet?",
    a: "Ausschließlich in der EU. Das gilt für die Speicherung, die KI-Auswertung und den Mailversand gleichermaßen. Aus deinen Entscheidungen lernt Revetly nur für dein Konto und nur mit deiner ausdrücklichen Zustimmung. Nach 180 Tagen löscht Revetly automatisch, und Bewerber können ihre Löschung jederzeit selbst anstoßen. Welche Auftragsverarbeiter im Einzelnen beteiligt sind, steht in der Datenschutzerklärung.",
  },
  {
    q: "Kann ich monatlich kündigen?",
    a: "Ja, alle bezahlten Pläne sind monatlich kündbar, direkt in deinem Kundenkonto. Die Probestelle ist kostenlos und verlangt keine Kreditkarte.",
  },
]
