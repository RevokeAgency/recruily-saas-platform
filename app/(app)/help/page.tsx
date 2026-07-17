import { PageHero } from "@/components/app/page-hero"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, LifeBuoy } from "lucide-react"

type QA = { q: string; a: string }
type Section = { title: string; items: QA[] }

const SECTIONS: Section[] = [
  {
    title: "Erste Schritte",
    items: [
      {
        q: "Was ist Revetly?",
        a: "Revetly ist dein KI-Recruiting-Assistent. Du legst eine Stelle an, sammelst Bewerbungen automatisch über eine öffentliche Job-Page und eine eigene Bewerbungs-E-Mail-Adresse, und die KI bewertet jeden Lebenslauf passgenau zur Stelle. So siehst du auf einen Blick, wer wirklich passt.",
      },
      {
        q: "Wie lege ich einen Job an?",
        a: "Unter Stellenangebote auf 'Job erstellen'. Du hast drei Wege: einen Link zu einer bestehenden Anzeige einfügen (z.B. von Karriere.at), ein PDF hochladen, oder die Felder von Hand ausfüllen. Bei Link und PDF liest die KI Titel, Aufgaben, Anforderungen und Skills automatisch aus. Danach kannst du alles noch anpassen.",
      },
      {
        q: "Wie kann ich einen Job bearbeiten, archivieren oder löschen?",
        a: "In der Job-Liste öffnest du oben rechts an der Kachel das Menü mit den drei Punkten. Dort kannst du den Job ansehen, bearbeiten, archivieren (er nimmt dann keine Bewerbungen mehr an, bleibt aber erhalten) oder endgültig löschen. Beim Löschen bleiben die Kandidaten in deinem Pool erhalten.",
      },
    ],
  },
  {
    title: "Bewerbungen empfangen",
    items: [
      {
        q: "Wie kommen Bewerbungen zu mir?",
        a: "Auf zwei Wegen, beide vollautomatisch: über die öffentliche Job-Page (ein Link, den du teilst) und über eine eigene Bewerbungs-E-Mail-Adresse pro Job. Beide findest du am Job unter 'Kanäle & Bewerbungslink'. Jede eingehende Bewerbung wird automatisch ausgelesen, als Kandidat angelegt und zur Stelle bewertet.",
      },
      {
        q: "Was ist die öffentliche Job-Page?",
        a: "Eine gebrandete Bewerbungsseite für deine Stelle, die du überall verlinken kannst (Karriere.at, LinkedIn, deine Website). Oben steht dein Firmenlogo, darunter der Firmenname der Stelle. Bewerber laden dort ihren Lebenslauf hoch, der Rest passiert automatisch.",
      },
      {
        q: "Wie funktioniert die Bewerbungs-E-Mail-Adresse?",
        a: "Jeder Job bekommt eine eigene Adresse. Trägst du sie bei Jobbörsen als Kontakt ein, landen alle Bewerbungen inklusive Lebenslauf-Anhang direkt und richtig zugeordnet in diesem Job. Anhänge werden auf Viren geprüft und der Lebenslauf automatisch ausgewertet.",
      },
      {
        q: "Wo sehe ich neue Aktivitäten?",
        a: "Über das Glocken-Symbol unten in der Seitenleiste. Dort erscheinen die letzten Bewerbungen mit Quelle (Job-Page oder E-Mail), Stelle und Match-Ergebnis. Ein roter Punkt zeigt an, dass es Neues gibt.",
      },
    ],
  },
  {
    title: "Matching & Kontingent",
    items: [
      {
        q: "Was ist ein Match und wie wird mein Kontingent verbraucht?",
        a: "Ein Match ist eine KI-Bewertung eines Kandidaten zu einer Stelle. Jede automatische Bewertung verbraucht ein Match aus deinem Monatskontingent (siehe 'KI-Matches' in der Seitenleiste). Das Kontingent setzt sich zu Beginn jedes Kalendermonats zurück.",
      },
      {
        q: "Was passiert, wenn mein Kontingent aufgebraucht ist?",
        a: "Keine Bewerbung geht verloren. Neue Kandidaten werden weiterhin gespeichert und in die Warteschlange gestellt ('wartet auf Kontingent'). Sobald sich dein Kontingent zurücksetzt oder du upgradest, werden sie automatisch nachbewertet.",
      },
      {
        q: "Was bedeutet der Match Score?",
        a: "Der Prozentwert zeigt, wie gut ein Kandidat zur Stelle passt. In den bezahlten Plänen bekommst du zusätzlich die volle Aufschlüsselung nach Kategorien wie Hard Skills, Erfahrung, Ausbildung, Sprachen und mehr, samt einer kurzen KI-Begründung.",
      },
      {
        q: "Kann ich Kandidaten einladen oder absagen?",
        a: "Ja. In der Kandidatenansicht eines Jobs kannst du eine Interview-Einladung (mit Kalender-Termin) oder eine Absage per E-Mail versenden. Der Versand ist je nach Plan verfügbar.",
      },
    ],
  },
  {
    title: "Konto & Datenschutz",
    items: [
      {
        q: "Wie wechsle ich meinen Plan?",
        a: "Unter Abonnement siehst du alle Pläne im Vergleich und kannst jederzeit wechseln. Höhere Pläne bieten mehr Matches pro Monat, mehr aktive Jobs und die volle Match-Aufschlüsselung.",
      },
      {
        q: "Wo werden meine Daten gespeichert?",
        a: "DSGVO-konform auf Servern in der EU. Du kannst deine Daten in den Einstellungen jederzeit als Datei exportieren oder dein Konto samt aller Daten löschen.",
      },
      {
        q: "Wie ändere ich Firmenname oder Logo?",
        a: "Unter Einstellungen im Bereich Profil. Das Logo erscheint oben auf deinen öffentlichen Job-Pages. Der Firmenname lässt sich anpassen, ohne dass bestehende Job-Links oder E-Mail-Adressen brechen.",
      },
    ],
  },
]

export default function HelpPage() {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="relative z-[1] mx-auto max-w-3xl space-y-8 p-6 lg:p-8">
        <PageHero
          eyebrow="Hilfe"
          title="Hilfe & häufige Fragen"
          subtitle="Die wichtigsten Antworten rund um Revetly, kurz und knapp."
        />

        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {section.title}
            </h2>
            <Card className="border border-border">
              <CardContent className="px-2 py-0 sm:px-4">
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, i) => (
                    <AccordionItem key={i} value={`${section.title}-${i}`} className="last:border-b-0">
                      <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </section>
        ))}

        <Card className="border border-border bg-[var(--app-green-wash)]">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
                <LifeBuoy className="h-5 w-5 text-[var(--rv-green-deep)]" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Noch Fragen offen?</p>
                <p className="text-sm text-muted-foreground">Unser Team hilft dir gerne weiter.</p>
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
