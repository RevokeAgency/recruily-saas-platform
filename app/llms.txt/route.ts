import { getAllPosts } from "@/lib/blog/posts"
import { PLANS, seatsLabel } from "@/lib/plans"
import { absoluteUrl } from "@/lib/site"

// llms.txt (https://llmstxt.org): Kurzbeschreibung und wichtigste Seiten für
// KI-Assistenten. Aus PLANS und den Blogbeiträgen erzeugt, damit Preise und
// Beiträge nie auseinanderlaufen.
export const dynamic = "force-static"

export function GET() {
  const plan = (id: "starter" | "growth" | "pro") =>
    `- ${PLANS[id].label}: ${PLANS[id].price_monthly} € pro Monat zzgl. USt., ${PLANS[id].matches_label}, ${PLANS[id].jobs_label}, ${seatsLabel(id)}`

  const body = `# Revetly

> Revetly ist eine KI-Recruiting-Software für den DACH-Raum. Sie sammelt Bewerbungen aus Stellenseite und E-Mail, prüft die Passung jeder Bewerbung mit Begründung und Beleg (Revetly Match Analyse), plant Gespräche und schreibt Absagen. Die Entscheidung, wen ein Unternehmen einstellt, trifft immer ein Mensch. Daten werden in der EU verarbeitet. Anbieter: Revetly e.U., Österreich.

## Produkt

- [Startseite](${absoluteUrl("/")}): Funktionen, Ablauf, Datenschutz, Preise und häufige Fragen
- [KI-Transparenz](${absoluteUrl("/ki-transparenz")}): Wie die Match Analyse arbeitet und welche Pflichten Arbeitgeber nach der KI-Verordnung haben

## Preise

- ${PLANS.free.label}: kostenlos, ${PLANS.free.matches_label}, ${PLANS.free.jobs_label}, keine Kreditkarte
${plan("starter")}
${plan("growth")}
${plan("pro")}
- ${PLANS.enterprise.label}: Preis und Volumen nach Absprache

## Blog

${getAllPosts().map((p) => `- [${p.title}](${absoluteUrl(`/blog/${p.slug}`)}): ${p.excerpt}`).join("\n")}

## Rechtliches

- [Datenschutzerklärung](${absoluteUrl("/datenschutz")})
- [AGB](${absoluteUrl("/agb")})
- [Impressum](${absoluteUrl("/impressum")})
`
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } })
}
