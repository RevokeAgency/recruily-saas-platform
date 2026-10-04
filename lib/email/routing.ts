/**
 * Bewerbungsadressen pro Stelle.
 *
 * Format (seit Oktober 2026):   stelle@firma.revetly.ai
 *   z. B.  kfz-mechatroniker@autohaus-berger.revetly.ai
 *   - vor dem @ der Adressname der Stelle (jobs.inbound_alias, Migration
 *     034): die ersten zwei aussagekräftigen Wörter des Titels, ohne
 *     Geschlechterzusatz, Seniorität und Füllwörter, höchstens 28 Zeichen,
 *     pro Kunde eindeutig (sonst mit Laufnummer). Beim Anlegen vergeben und
 *     danach fest.
 *   - die Subdomain ist der Kurzname des Kunden (user_profiles.slug); der
 *     Vorschlag dafür lässt die Rechtsform weg.
 * Kein Pluszeichen (das lehnen viele Jobportale ab), keine lange ID.
 *
 * Zugeordnet wird über Kunde + Adressname. Die alten Formate mit der
 * Stellen-ID hinter "+" werden weiter erkannt, damit bereits veröffentlichte
 * Adressen nicht ins Leere laufen:
 *   jobslug+<jobId>@<kunde>.revetly.ai
 *   <kunde>.jobslug+<jobId>@revetly.ai
 *
 * DNS: Wildcard-MX für *.revetly.ai auf den Empfangsdienst. Subdomains, die
 * anders belegt sind, dürfen deshalb kein Kunden-Kurzname werden
 * (RESERVED_SUBDOMAINS, gleiche Liste in scripts/034_inbound_addresses.sql).
 */

export const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN || "revetly.ai"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Kurznamen, die als Subdomain belegt sind oder es werden können. */
export const RESERVED_SUBDOMAINS = [
  "www", "app", "api", "admin", "auth", "login", "dashboard",
  "mail", "email", "webmail", "smtp", "imap", "pop", "pop3", "mx", "autodiscover", "autoconfig",
  "bounce", "bounces", "return", "noreply", "no-reply", "postmaster", "abuse",
  "jobs", "job", "bewerbung", "bewerbungen", "apply", "karriere", "careers",
  "termin", "freigabe", "report", "status", "help", "hilfe", "support", "docs", "blog",
  "cdn", "static", "assets", "media", "files",
  "dev", "staging", "test", "preview", "demo", "beta",
  "ftp", "ns", "ns1", "ns2", "vpn", "billing", "revetly",
] as const

export function isReservedSubdomain(slug: string): boolean {
  return (RESERVED_SUBDOMAINS as readonly string[]).includes(slug.toLowerCase())
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äàâ]/g, "a").replace(/[öô]/g, "o").replace(/[üû]/g, "u")
    .replace(/ß/g, "ss").replace(/[éèêë]/g, "e").replace(/ç/g, "c").replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Wörter, die im Adressnamen einer Stelle nichts beitragen. Gleiche Liste in
 * scripts/034_inbound_addresses.sql (job_alias_base); ein Test vergleicht.
 */
export const ALIAS_STOPWORDS = [
  "m", "w", "d", "x", "f", "in", "innen", "all", "alle", "gender", "genders", "geschlechter",
  "und", "oder", "fur", "fuer", "mit", "im", "am", "an", "der", "die", "das", "den", "zur", "zum", "bei", "als",
  "senior", "junior", "lead", "head", "chief", "praktikum", "werkstudent", "trainee",
  "vollzeit", "teilzeit", "ab", "sofort", "befristet", "unbefristet",
] as const

/** Rechtsformen, die im Kurznamen einer Firma wegfallen. Gleiche Liste in Migration 034. */
export const LEGAL_FORMS = [
  "gmbh", "gesmbh", "mbh", "ag", "kg", "og", "ohg", "ug", "se", "gbr", "co", "eu", "ev",
  "e", "u", "v", "ltd", "limited", "inc", "haftungsbeschrankt",
] as const

const ALIAS_MAX = 28

/** Umlaute ausschreiben (ä → ae, ß → ss), wie man sie in einer Adresse erwartet. */
function germanize(text: string): string {
  return text
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
}

/**
 * Adressname einer Stelle aus dem Titel (Grundform, ohne Laufnummer). Die
 * verbindliche Vergabe macht die Datenbank (job_alias_base plus Laufnummer);
 * diese Fassung dient Vorschau und Rückfall, solange Migration 034 fehlt.
 *   "Kfz-Mechatroniker:in (m/w/d)"              → kfz-mechatroniker
 *   "Senior Fachkraft für Lagerlogistik (m/w/d)" → fachkraft-lagerlogistik
 */
export function jobAliasBase(title: string): string {
  const words = slugify(germanize(title)).split("-").filter((w) => w && !(ALIAS_STOPWORDS as readonly string[]).includes(w))
  let out = ""
  for (const w of words.slice(0, 2)) {
    const next = out ? `${out}-${w}` : w
    if (next.length > ALIAS_MAX) break
    out = next
  }
  if (!out && words[0]) out = words[0].slice(0, ALIAS_MAX)
  return out || "bewerbung"
}

/** Vorschlag für den Kurznamen einer Firma: ohne Rechtsform, höchstens 40 Zeichen. */
export function customerSlugSuggestion(companyName: string): string {
  const words = slugify(germanize(companyName)).split("-").filter(Boolean)
  const kept = words.filter((w) => !(LEGAL_FORMS as readonly string[]).includes(w))
  let s = (kept.length ? kept : words).join("-")
  if (s.length > 40) {
    const cut = s.slice(0, 41)
    const at = cut.lastIndexOf("-")
    s = at >= 20 ? cut.slice(0, at) : s.slice(0, 40)
  }
  return s.replace(/-+$/g, "") || "kunde"
}

// Geschlechterzusatz am Ende, vor einer eventuellen Laufnummer ("-2").
const GENDER_SUFFIX = /-(?:m-w-d|m-w-x|m-f-d|m-f-x|m-d-w|w-m-d|w-m-x|w-d-m|d-m-w|d-w-m|f-m-d|m-w|w-m|all-genders?|alle-geschlechter)(?=(?:-\d+)?$)/
const MAX_LOCAL = 40

/**
 * Teil vor dem @ aus dem Kurznamen der Stelle: ohne "(m/w/d)", höchstens 40
 * Zeichen, an einem Bindestrich gekürzt.
 *   kfz-mechatroniker-in-m-w-d     → kfz-mechatroniker-in
 *   kfz-mechatroniker-in-m-w-d-2   → kfz-mechatroniker-in-2
 */
export function addressLocalPart(publicSlug: string): string {
  let s = slugify(publicSlug).replace(GENDER_SUFFIX, "")
  if (s.length > MAX_LOCAL) {
    const cut = s.slice(0, MAX_LOCAL)
    const at = cut.lastIndexOf("-")
    s = (at > MAX_LOCAL * 0.5 ? cut.slice(0, at) : cut).replace(/-+$/g, "")
  }
  return s || "bewerbung"
}

export interface ParsedRecipient {
  customerSlug: string | null
  /** Stellen-ID aus den alten Formaten mit "+". */
  jobId: string | null
  /** Teil vor dem @ im neuen Format, zum Abgleich mit addressLocalPart. */
  jobKey: string | null
}

/**
 * Kunde und Stelle aus der Empfängeradresse. Was sich nicht bestimmen lässt,
 * bleibt null; der Aufrufer legt die Mail dann als "nicht zugeordnet" ab.
 */
export function parseInboundRecipient(address: string): ParsedRecipient {
  // "Name <adresse@…>" und Großschreibung zulassen.
  const raw = (address || "").trim().toLowerCase()
  const addr = /<([^>]+)>/.exec(raw)?.[1]?.trim() ?? raw
  const at = addr.lastIndexOf("@")
  if (at < 0) return { customerSlug: null, jobId: null, jobKey: null }

  const local = addr.slice(0, at)
  const domain = addr.slice(at + 1)

  let jobId: string | null = null
  if (local.includes("+")) {
    const tag = local.split("+").pop() as string
    if (UUID_RE.test(tag)) jobId = tag
  }

  let customerSlug: string | null = null
  let localForKey = local.split("+")[0]
  const base = INBOUND_DOMAIN.toLowerCase()
  if (domain.endsWith(`.${base}`)) {
    customerSlug = domain.slice(0, domain.length - base.length - 1) || null
  } else if (domain === base && local.includes(".")) {
    customerSlug = local.split(".")[0] || null
    localForKey = localForKey.split(".").slice(1).join(".")
  }

  const jobKey = !jobId && customerSlug && /^[a-z0-9-]+$/.test(localForKey) ? localForKey : null
  return { customerSlug, jobId, jobKey }
}

/**
 * Welche Stelle eines Kunden zu einem jobKey gehört. Zuerst über den
 * gespeicherten Adressnamen (eindeutig pro Kunde). Fehlt der (Migration 034
 * noch nicht eingespielt), über den Kurznamen der Stellenseite; passen dann
 * mehrere, gewinnt die einzige offene, sonst bleibt die Mail unzugeordnet im
 * Posteingang, statt bei der falschen Stelle zu landen.
 */
export function matchJobByKey<T extends { public_slug: string | null; is_active: boolean | null; inbound_alias?: string | null }>(
  jobs: T[],
  jobKey: string,
): T | null {
  const byAlias = jobs.filter((j) => j.inbound_alias === jobKey)
  if (byAlias.length === 1) return byAlias[0]
  const hits = jobs.filter((j) => !j.inbound_alias && j.public_slug && addressLocalPart(j.public_slug) === jobKey)
  if (hits.length === 1) return hits[0]
  const open = hits.filter((j) => j.is_active)
  return open.length === 1 ? open[0] : null
}

/**
 * Bewerbungsadresse einer Stelle. Bevorzugt den gespeicherten Adressnamen;
 * ohne ihn den Kurznamen der Stellenseite; ohne beides das alte Format mit ID.
 */
export function buildJobEmailAddress(
  customerSlug: string,
  job: { inboundAlias?: string | null; publicSlug?: string | null; id: string; title?: string | null },
): string {
  if (job.inboundAlias) return `${job.inboundAlias}@${customerSlug}.${INBOUND_DOMAIN}`
  if (job.publicSlug) return `${addressLocalPart(job.publicSlug)}@${customerSlug}.${INBOUND_DOMAIN}`
  const jobSlug = (slugify(job.title ?? "") || "job").slice(0, 24).replace(/-+$/g, "")
  return `${jobSlug}+${job.id}@${customerSlug}.${INBOUND_DOMAIN}`
}
