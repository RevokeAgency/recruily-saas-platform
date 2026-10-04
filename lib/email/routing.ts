/**
 * Bewerbungsadressen pro Stelle.
 *
 * Format (seit Oktober 2026):   kfz-mechatroniker@autohaus-berger.revetly.ai
 *   - vor dem @ der Kurzname der Stelle aus der Stellenseite (jobs.public_slug,
 *     beim Anlegen vergeben und danach unverändert), ohne "(m/w/d)" und auf
 *     40 Zeichen gekürzt,
 *   - die Subdomain ist der Kurzname des Kunden (user_profiles.slug).
 * Kein Pluszeichen (das lehnen viele Jobportale ab), keine lange ID.
 *
 * Zugeordnet wird über Kunde + Kurzname der Stelle. Die alten Formate mit der
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
 * Welche Stelle eines Kunden zu einem jobKey gehört. Eindeutig oder gar
 * nicht: Passen mehrere, gewinnt die einzige offene; sonst bleibt die Mail
 * unzugeordnet im Posteingang, statt bei der falschen Stelle zu landen.
 */
export function matchJobByKey<T extends { public_slug: string | null; is_active: boolean | null }>(
  jobs: T[],
  jobKey: string,
): T | null {
  const hits = jobs.filter((j) => j.public_slug && addressLocalPart(j.public_slug) === jobKey)
  if (hits.length === 1) return hits[0]
  const open = hits.filter((j) => j.is_active)
  return open.length === 1 ? open[0] : null
}

/** Bewerbungsadresse einer Stelle. Ohne Kurznamen der Stelle das alte Format mit ID. */
export function buildJobEmailAddress(customerSlug: string, publicSlug: string | null | undefined, jobId: string, jobTitle = ""): string {
  if (publicSlug) return `${addressLocalPart(publicSlug)}@${customerSlug}.${INBOUND_DOMAIN}`
  const jobSlug = (slugify(jobTitle) || "job").slice(0, 24).replace(/-+$/g, "")
  return `${jobSlug}+${jobId}@${customerSlug}.${INBOUND_DOMAIN}`
}
