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
  salary_range?: string | null
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

/**
 * Gehalt aus dem Freitext für Google ("baseSalary"). Nur bei eindeutigen
 * Angaben, sonst null: Ein falsch gelesenes Gehalt in der Jobsuche wäre
 * schlimmer als keins. Der Freitext steht ohnehin auf der Stellenseite.
 *
 *   "ab € 3.200 brutto/Monat"      → MONTH, min 3200
 *   "€60.000 - €80.000"            → YEAR (ohne Zeitraum, Betrag > 15.000)
 *   "€ 22,50 pro Stunde"           → HOUR, 22.5
 */
export function parseSalary(text: string | null | undefined): { min: number; max?: number; unit: "HOUR" | "MONTH" | "YEAR" } | null {
  if (!text?.trim()) return null
  // "14x", "14 mal", "14 Gehälter": Anzahl der Monatsgehälter, kein Betrag.
  const t = text.toLowerCase().replace(/\b1[2-5]\s*(x|×|-?mal|monatsgehälter|gehälter)/g, " ")
  if (!/€|eur/.test(t)) return null
  // Deutsche Schreibweise: Punkt als Tausender-, Komma als Dezimaltrenner.
  const nums = [...t.matchAll(/(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,(\d{1,2}))?\s*(k\b|tsd\.?)?/g)]
    .map((m) => {
      const base = Number(m[1].replace(/[.\s]/g, "")) + (m[2] ? Number(`0.${m[2]}`) : 0)
      return m[3] ? base * 1000 : base
    })
    .filter((n) => n > 0)
  if (nums.length === 0 || nums.length > 2) return null
  const [a, b] = nums
  const min = b != null ? Math.min(a, b) : a
  const max = b != null ? Math.max(a, b) : undefined

  let unit: "HOUR" | "MONTH" | "YEAR" | null = null
  if (/stunde|stündlich|\/\s*h\b|pro h\b/.test(t)) unit = "HOUR"
  else if (/monat|mtl|monatlich/.test(t)) unit = "MONTH"
  else if (/jahr|jährlich|p\.\s*a\.?|\bpa\b/.test(t)) unit = "YEAR"
  else if (min >= 15000) unit = "YEAR"
  else if (min >= 900) unit = "MONTH"
  if (!unit) return null

  // Plausibilität: grobe Bandbreiten, damit "ab 2026" oder Tippfehler nicht durchrutschen.
  const range = { HOUR: [8, 500], MONTH: [800, 60000], YEAR: [10000, 700000] }[unit]
  if (min < range[0] || min > range[1] || (max != null && max > range[1])) return null
  return { min, ...(max != null ? { max } : {}), unit }
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

  const salary = parseSalary(job.salary_range)
  if (salary) {
    data.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "EUR",
      value: {
        "@type": "QuantitativeValue",
        ...(salary.max != null ? { minValue: salary.min, maxValue: salary.max } : { value: salary.min }),
        unitText: salary.unit,
      },
    }
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
