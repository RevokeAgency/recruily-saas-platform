// Meta-Beschreibung der öffentlichen Stellenseite.

const EMPLOYMENT: Record<string, string> = {
  "full-time": "Vollzeit",
  "part-time": "Teilzeit",
  contract: "Freelance",
  remote: "Remote",
}

/** Länger schneidet Google die Beschreibung im Suchergebnis ab. */
const DESCRIPTION_MAX = 158

/**
 * Beschreibung mit Ort, Anstellung und Gehalt, soweit vorhanden. Wird sie zu
 * lang, fällt zuerst der Schlusssatz weg, dann wird an einer Wortgrenze gekürzt.
 */
export function jobDescription(job: {
  title: string
  company: string
  location: string | null
  employment_type: string | null
  salary_range?: string | null
}): string {
  const facts = [job.location, job.employment_type ? EMPLOYMENT[job.employment_type] ?? null : null, job.salary_range]
    .filter(Boolean)
    .join(", ")
  const base = `Jetzt bewerben als ${job.title} bei ${job.company}`
  const core = facts ? `${base}. ${facts}.` : `${base}.`
  const full = `${core} Bewerbung in wenigen Schritten, ohne Konto.`
  if (full.length <= DESCRIPTION_MAX) return full
  if (core.length <= DESCRIPTION_MAX) return core
  const cut = core.slice(0, DESCRIPTION_MAX - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 60)).replace(/[\s,.;:]+$/, "")}…`
}
