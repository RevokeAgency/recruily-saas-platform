import Link from "next/link"
import { Mail, ScrollText } from "lucide-react"

import { PageHero } from "@/components/app/page-hero"
import { Card, CardContent } from "@/components/ui/card"
import { INTERVIEW_WEIGHT } from "@/lib/matching/screening"

// ─────────────────────────────────────────────────────────────────────────────
// Gebrauchsanweisung und Betreiberpflichten nach der KI-Verordnung.
//
// Revetly analysiert und ordnet Bewerbungen und fällt damit unter Anhang III
// Nr. 4 a (Hochrisiko). Revetly ist Anbieter, das Kundenunternehmen Betreiber.
// Art. 13 verlangt eine Gebrauchsanweisung für Betreiber, Art. 26 regelt ihre
// Pflichten. Diese Seite deckt beides ab.
//
// Jede Aussage hier muss im Code stimmen. Wer das Matching ändert, prüft
// diese Seite mit (Modelle, Gewichte, Regeln in lib/ai/applicant-text.ts,
// Dokumentprüfung in lib/document-guard, Protokoll in Migration 031).
// Keine Aussagen zur Konformitätsbewertung, solange sie nicht abgeschlossen ist.
// ─────────────────────────────────────────────────────────────────────────────

const STAND = "30.\u00a0September\u00a02026"
const pct = (n: number) => `${Math.round(n * 100)} Prozent`

type Block = { title: string; intro?: string; items: string[] }

const BLOCKS: Block[] = [
  {
    title: "Wofür Revetly gedacht ist",
    intro:
      "Revetly unterstützt dich bei der Auswahl von Bewerberinnen und Bewerbern für eine konkrete Stelle. Es liest die Unterlagen, gleicht sie mit den Anforderungen der Stelle ab, ordnet die Bewerbungen nach ihrer Passung und schlägt Fragen für das Gespräch vor. Entscheiden, wen du einlädst, einstellst oder absagst, tust du.",
    items: [
      "Nach der KI-Verordnung gilt ein System, das Bewerbungen analysiert, filtert und bewertet, als Hochrisiko-KI-System (Anhang III Nr. 4 a). Revetly ist der Anbieter, dein Unternehmen ist Betreiber.",
      "Diese Seite ist die Gebrauchsanweisung für Betreiber (Art. 13) und fasst zusammen, was du beim Einsatz beachten musst (Art. 26).",
      "Nicht vorgesehen ist der Einsatz für Beförderungen, Kündigungen, Leistungsbeurteilung von Beschäftigten oder für andere Zwecke als die Auswahl für ausgeschriebene Stellen.",
    ],
  },
  {
    title: "Wie der Match entsteht",
    items: [
      "Unterlagen: Lebenslauf und Anschreiben als PDF oder Word. Gescannte PDFs liest ein Bildmodell. Text, den man im Dokument nicht sieht (weiße oder winzige Schrift, verdeckt, in Word ausgeblendet), wird vor der Analyse entfernt und beim Kandidaten mit Beleg gemeldet.",
      "Dossier: Aus dem Lebenslauf entsteht ein strukturierter Werdegang mit Stationen, belegten Fähigkeiten, Sprachen und Abschlüssen. Aufgenommen wird nur, was im Text belegt ist. Geschützte Merkmale wie Alter, Geschlecht oder Herkunft erfasst das Dossier nicht.",
      "Harte Fakten: Fähigkeiten, Erfahrung, Ausbildung, Standort, deine K.-o.-Kriterien und formale Zulassungsvoraussetzungen werden nach festen Regeln geprüft.",
      "Einschätzung: Ein Modell bewertet neun Kategorien, jeweils mit der Stelle in den Unterlagen, auf der die Einschätzung beruht. Ein zweites Modell prüft jede Kategorie unabhängig nach und korrigiert, was die Belege nicht tragen.",
      `Match: Die Kategorien werden gewichtet zusammengefasst. Nach einem strukturierten Gespräch fließt deine Bewertung mit ${pct(INTERVIEW_WEIGHT)} ein, die Analyse mit ${pct(1 - INTERVIEW_WEIGHT)}. Ein verletztes K.-o.-Kriterium oder eine fehlende Zulassung begrenzt den Match nach oben.`,
      "Gewichtung: Standardmäßig fest. Nur mit deiner Einwilligung passt Revetly sie aus deinen eigenen Entscheidungen an, in engen Grenzen und nur für dein Konto.",
      "Modelle: Mistral AI, Frankreich, Verarbeitung in der EU. Welches Modell bei einer Bewerbung geantwortet hat, steht im Entscheidungsprotokoll.",
    ],
  },
  {
    title: "Was Revetly nicht tut",
    items: [
      "Keine automatischen Absagen oder Einladungen. Revetly setzt niemanden von sich aus auf eingeladen, eingestellt oder abgesagt. Das löst immer ein Mensch aus, etwa mit einer Terminanfrage oder beim Abschließen der Stelle.",
      "Keine Auswertung von Fotos, Gesichtern, Stimme oder Emotionen. Ein Bewerbungsfoto dient nur als Profilbild.",
      "Alter, Geschlecht, Herkunft, Religion, Behinderung, sexuelle Orientierung, Familienstand, Aussehen und Name dürfen das Ergebnis nicht beeinflussen. Lücken wegen Elternzeit, Pflege, Krankheit oder Präsenzdienst gelten nicht als Nachteil. Das ist als feste Regel in jeder Analyse hinterlegt.",
      "Anweisungen in Bewerbungsunterlagen, die sich an eine KI richten, werden nicht befolgt.",
      "Keine Einschätzung, ob ein Text mit KI geschrieben wurde. Das lässt sich nicht verlässlich feststellen.",
      "Bewerberdaten trainieren keine fremden Modelle.",
    ],
  },
  {
    title: "Grenzen, die du kennen solltest",
    items: [
      "Grundlage ist nur, was in den Unterlagen steht. Knappe, ungewöhnlich aufgebaute Lebensläufe und Quereinstiege schneiden leicht schlechter ab, als die Person ist.",
      "Schlechte Scans, Tabellen und Grafiken können dazu führen, dass Text fehlt. Die Belege beim Kandidaten zeigen, worauf sich die Analyse gestützt hat.",
      "Die Analyse ist auf deutsch- und englischsprachige Unterlagen ausgelegt. Bei anderen Sprachen ist sie weniger verlässlich.",
      "Der Match ist eine Einschätzung, keine Messung. Wenige Punkte Unterschied sagen nichts über die Rangfolge zweier Personen.",
      "Modelle können trotz Prüfung irren. Lies bei knappen Entscheidungen die Begründung und die Belege, nicht nur die Zahl.",
    ],
  },
  {
    title: "Menschliche Aufsicht: was Revetly dafür bietet",
    items: [
      "Zu jeder Kategorie Begründung, Beleg und Konfidenz. Unsichere Bereiche sind markiert und landen als Fragen im Gesprächsleitfaden.",
      "K.-o.-Gründe, Befunde in den Unterlagen und der Abgleich von Anschreiben und Lebenslauf stehen beim Kandidaten.",
      "Vor dem Abschließen einer Stelle bestätigst du, dass du die offenen Bewerbungen geprüft hast. Erst dann gehen Absagen raus.",
      "Das Entscheidungsprotokoll jeder Stelle hält fest, wer wann welchen Status gesetzt, welches Gespräch bewertet und welche Absage verschickt hat. Du lädst es auf der Stelle über „Protokoll“ herunter.",
    ],
  },
  {
    title: "Deine Pflichten als Betreiber",
    items: [
      "Setze Revetly so ein, wie auf dieser Seite beschrieben.",
      "Lass die Auswahl von Personen treffen, die dafür zuständig sind, die Grenzen des Systems kennen und Entscheidungen des Systems übergehen dürfen.",
      "Deine Stellenanforderungen sind die Eingabedaten. Sie sollen für die Stelle erforderlich und nicht diskriminierend sein, etwa „sehr gute Deutschkenntnisse“ statt „Deutsch als Muttersprache“.",
      "Bewerber informieren: Revetly weist auf deiner Stellenseite und in der Eingangsbestätigung auf die KI-gestützte Auswertung und die menschliche Entscheidung hin. Legst du Kandidaten selbst an, informierst du sie selbst.",
      "Informiere vor dem Einsatz deine Arbeitnehmervertretung, falls vorhanden, und prüfe, ob eine Betriebsvereinbarung nötig ist.",
      "Bewahre die Protokolle mindestens sechs Monate auf. Revetly speichert das Entscheidungsprotokoll dauerhaft, solange dein Konto besteht, ohne Personenbezug nach Löschung eines Kandidaten.",
      "Führe eine Datenschutz-Folgenabschätzung durch, bevor du Revetly für Bewerbungen einsetzt. Die Angaben auf dieser Seite helfen dir dabei.",
      "Fällt dir etwas auf, etwa dass eine Gruppe von Bewerbern systematisch schlechter eingestuft wird, setze die Nutzung für die betroffene Stelle aus und melde es uns. Schwerwiegende Vorfälle meldest du außerdem der zuständigen Behörde.",
    ],
  },
]

export default function KiTransparenzPage() {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="relative z-[1] mx-auto max-w-3xl space-y-8 p-6 lg:p-8">
        <PageHero
          eyebrow="KI-Transparenz"
          title="So arbeitet die Match Analyse"
          subtitle={`Gebrauchsanweisung und Pflichten nach der KI-Verordnung. Stand: ${STAND}.`}
        />

        {BLOCKS.map((block) => (
          <section key={block.title}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {block.title}
            </h2>
            <Card className="border border-border">
              <CardContent className="space-y-3 px-5 py-0 text-sm leading-relaxed text-muted-foreground sm:px-6">
                {block.intro && <p className="text-foreground">{block.intro}</p>}
                <ul className="list-disc space-y-2 pl-5">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        ))}

        <Card className="border border-border bg-[var(--app-green-wash)]">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
                <ScrollText className="h-5 w-5 text-[var(--rv-green-deep)]" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Anbieter und Kontakt</p>
                <p className="text-sm text-muted-foreground">
                  Angaben zum Anbieter im <Link href="/impressum" className="underline">Impressum</Link>. Diese
                  Übersicht ersetzt keine Rechtsberatung.
                </p>
              </div>
            </div>
            <a
              href="mailto:support@revetly.ai"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--rv-mist)]"
            >
              <Mail className="h-4 w-4 text-[var(--rv-green-deep)]" />
              support@revetly.ai
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
