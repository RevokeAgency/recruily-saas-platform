// ─────────────────────────────────────────────────────────────────────────────
// Strukturierte Daten für Google for Jobs (schema.org/JobPosting).
//
// Google zeigt Stellen in der Jobsuche nur mit diesen Daten an. Pflicht sind
// Titel, Beschreibung, Veröffentlichungsdatum, Arbeitgeber und Arbeitsort.
// Fehlt das Datum (Migration 031 noch nicht eingespielt) oder ist die Stelle
// geschlossen, gibt es keine Daten: Google verlangt, abgelaufene Stellen
// nicht mehr auszuzeichnen.
// ─────────────────────────────────────────────────────────────────────────────

export interface JobPostingInput {
  title: string
  company: string
  description: string | null
  location: string | null
  employment_type: string | null
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
  id: string
}

const EMPLOYMENT: Record<string, string> = {
  "full-time": "FULL_TIME",
  "part-time": "PART_TIME",
  contract: "CONTRACTOR",
  remote: "FULL_TIME",
}

// Ländererkennung aus dem freien Ortsfeld. Nur eindeutige Fälle, sonst bleibt
// das Land weg (Google empfiehlt es, verlangt es aber nicht).
const COUNTRIES: Array<[RegExp, string]> = [
  [/österreich|austria|\bwien\b|\bgraz\b|\blinz\b|salzburg|innsbruck|klagenfurt|villach|st\.? pölten|wels|dornbirn|bregenz/i, "AT"],
  [/deutschland|germany|berlin|hamburg|münchen|munich|köln|frankfurt|stuttgart|düsseldorf|leipzig|dresden|nürnberg|hannover|bremen/i, "DE"],
  [/schweiz|switzerland|zürich|zurich|\bbern\b|basel|genf|lausanne|luzern/i, "CH"],
]

function countryOf(location: string | null): string | null {
  if (!location) return null
  for (const [re, code] of COUNTRIES) if (re.test(location)) return code
  return null
}

const REMOTE = /remote|homeoffice|home-office|home office|ortsunabhängig/i

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Google erwartet die Beschreibung als HTML. Absätze aus Leerzeilen, Zeilenumbrüche als <br>. */
function descriptionHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

export function jobPostingJsonLd(
  job: JobPostingInput,
  opts: { url: string; logoUrl?: string | null },
): Record<string, unknown> | null {
  if (!job.is_active || !job.created_at || !job.description?.trim()) return null

  const country = countryOf(job.location)
  // Als reine Remote-Stelle nur, wenn sie das wirklich ist: Typ "Remote" oder
  // der Ort besteht nur aus "Remote". "Wien (Remote möglich)" ist hybrid und
  // bleibt eine Stelle in Wien, so verlangt es Google.
  const remote = job.employment_type === "remote" || /^\s*(remote|homeoffice|home-office|home office|ortsunabhängig)\s*$/i.test(job.location ?? "")
  // Ort ohne Remote-Zusatz und ohne Land, etwa "Wien (Remote möglich)" → "Wien",
  // "Berlin, Deutschland" → "Berlin". Das Land steht in addressCountry.
  const locality = (job.location ?? "")
    .replace(/\(.*?\)/g, "")
    .replace(REMOTE, "")
    .replace(/,?\s*(österreich|deutschland|schweiz|austria|germany|switzerland)\s*$/i, "")
    .replace(/[,/·|-]\s*$/, "")
    .trim()

  const data: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: descriptionHtml(job.description),
    identifier: { "@type": "PropertyValue", name: job.company, value: job.id },
    datePosted: job.created_at.slice(0, 10),
    employmentType: EMPLOYMENT[job.employment_type ?? ""] ?? "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      ...(opts.logoUrl ? { logo: opts.logoUrl } : {}),
    },
    directApply: true,
    url: opts.url,
  }

  if (locality) {
    data.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: locality,
        ...(country ? { addressCountry: country } : {}),
      },
    }
  }
  // Reine Remote-Stellen braucht Google mit Land, in dem man arbeiten darf.
  if (remote && country) {
    data.jobLocationType = "TELECOMMUTE"
    data.applicantLocationRequirements = { "@type": "Country", name: country }
  }
  // Ohne Ort und ohne erkennbares Remote-Land ist die Auszeichnung ungültig.
  if (!data.jobLocation && !data.jobLocationType) return null

  return data
}
