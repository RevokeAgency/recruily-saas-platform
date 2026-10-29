import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Jede Mail, die Revetly verschickt, läuft durch shell() aus
// lib/email/layout.ts: gleicher Kopf, gleiche Schrift, gleiche Farben.
// Dieser Test findet Stellen, die sendMail mit eigenem HTML aufrufen.

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : files(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

const senders = [...files("app"), ...files("lib")].filter((f) => {
  if (f === join("lib", "email", "client.ts")) return false
  return /\bsendMail\(/.test(readFileSync(f, "utf8"))
})

describe("Einheitliches Mail-Layout", () => {
  it("findet die Stellen, die Mails verschicken", () => {
    expect(senders.length).toBeGreaterThan(5)
  })

  it.each(senders)("%s baut seine Mails mit shell()", (file) => {
    const src = readFileSync(file, "utf8")
    expect(src).toMatch(/\bshell\(/)
    // Reste alter Vorlagen: fremde Schrift oder das frühere Türkis.
    expect(src).not.toMatch(/Arial|#0d9488/i)
  })
})
