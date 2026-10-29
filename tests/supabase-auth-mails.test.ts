import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { SUPABASE_MAIL_SITE, supabaseAuthMails } from "@/lib/email/supabase-auth"

const DIR = "docs/supabase-mails"
const mails = supabaseAuthMails()

// Mit WRITE_SUPABASE_MAILS=1 schreibt der Test die Vorlagen neu, sonst prüft
// er, dass die eingecheckten Dateien zum Layout passen.
if (process.env.WRITE_SUPABASE_MAILS) {
  mkdirSync(DIR, { recursive: true })
  for (const m of mails) writeFileSync(`${DIR}/${m.file}`, m.html)
}

describe("Supabase-Mailvorlagen", () => {
  it.each(mails.map((m) => [m.file, m] as const))("%s ist aktuell", (file, m) => {
    expect(existsSync(`${DIR}/${file}`), `${file} fehlt, mit WRITE_SUPABASE_MAILS=1 erzeugen`).toBe(true)
    expect(readFileSync(`${DIR}/${file}`, "utf8")).toBe(m.html)
  })

  it.each(mails.map((m) => [m.file, m] as const))("%s: Platzhalter, Logo, Du-Form", (_, m) => {
    const placeholder = m.file === "reauthentication.html" ? "{{ .Token }}" : "{{ .ConfirmationURL }}"
    expect(m.html).toContain(placeholder)
    expect(m.html).toContain(`${SUPABASE_MAIL_SITE}/revetly/email-logo.png`)
    const text = m.html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ")
    expect(text).not.toMatch(/[—–]/)
    expect(text).not.toMatch(/!/)
    expect(text).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen)\b/)
  })
})
