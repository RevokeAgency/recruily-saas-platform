/**
 * Inbound-address routing. The stable routing key is always the job UUID
 * embedded in the address `+tag`; the customer slug is a cross-check. Both
 * address schemes are supported so the final MX decision is a config choice:
 *
 *   subdomain:      jobslug+<jobId>@<customerSlug>.revetly.ai     (spec default)
 *   single-domain:  <customerSlug>.jobslug+<jobId>@revetly.ai     (catch-all fallback)
 */

export const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN || "revetly.ai"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äàâ]/g, "a").replace(/[öô]/g, "o").replace(/[üû]/g, "u")
    .replace(/ß/g, "ss").replace(/[éèêë]/g, "e").replace(/ç/g, "c").replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export interface ParsedRecipient {
  customerSlug: string | null
  jobId: string | null
}

/**
 * Extract the customer slug and job UUID from an inbound recipient address.
 * Returns nulls for parts that can't be determined (the caller then treats the
 * mail as "unassigned").
 */
export function parseInboundRecipient(address: string): ParsedRecipient {
  const addr = (address || "").trim().toLowerCase()
  const at = addr.lastIndexOf("@")
  if (at < 0) return { customerSlug: null, jobId: null }

  const local = addr.slice(0, at)
  const domain = addr.slice(at + 1)

  // Job UUID = the segment after the last '+' in the local part.
  let jobId: string | null = null
  if (local.includes("+")) {
    const tag = local.split("+").pop() as string
    if (UUID_RE.test(tag)) jobId = tag
  }

  // Customer slug: subdomain label(s) if present, else the local-part prefix
  // before the first '.' (single-domain scheme).
  let customerSlug: string | null = null
  const base = INBOUND_DOMAIN.toLowerCase()
  if (domain.endsWith(`.${base}`)) {
    const sub = domain.slice(0, domain.length - base.length - 1)
    customerSlug = sub || null
  } else if (domain === base && local.includes(".")) {
    customerSlug = local.split(".")[0] || null
  }

  return { customerSlug, jobId }
}

/**
 * Build the display address for a job container (subdomain scheme). The job slug
 * is cosmetic — routing is by the UUID — so we cap it to keep the local part
 * within the 64-char limit.
 */
export function buildJobEmailAddress(customerSlug: string, jobTitle: string, jobId: string): string {
  const jobSlug = (slugify(jobTitle) || "job").slice(0, 24).replace(/-+$/g, "")
  return `${jobSlug}+${jobId}@${customerSlug}.${INBOUND_DOMAIN}`
}
