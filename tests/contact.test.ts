import { beforeEach, describe, expect, it, vi } from "vitest"

import { contactInbox, parseContactInput } from "@/lib/contact"
import { sendContactConfirmation, sendContactRequest } from "@/lib/email/contact"

const sent: Array<{ to: string; subject: string; html: string; replyTo?: string }> = []
vi.mock("@/lib/email/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/email/client")>()),
  sendMail: async (mail: { to: string; subject: string; html: string; replyTo?: string }) => {
    sent.push(mail)
    return true
  },
}))

const valid = {
  topic: "support",
  name: "Anna Berger",
  email: "Anna@Beispiel.at ",
  company: "Muster Bau GmbH",
  message: "Ich finde den Knopf für den Export nicht.\nWo ist er?",
}

describe("Eingabe des Kontaktformulars", () => {
  it("bereinigt gültige Angaben", () => {
    const r = parseContactInput(valid)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.email).toBe("anna@beispiel.at")
      expect(r.value.topic).toBe("support")
      expect(r.value.message).toContain("\n")
    }
  })

  it("lehnt fehlende oder ungültige Angaben mit verständlicher Meldung ab", () => {
    expect(parseContactInput({ ...valid, name: "" })).toEqual({ ok: false, error: "Bitte gib deinen Namen an." })
    expect(parseContactInput({ ...valid, email: "keine-adresse" }).ok).toBe(false)
    expect(parseContactInput({ ...valid, message: "Hi" }).ok).toBe(false)
    expect(parseContactInput({ ...valid, message: "x".repeat(5001) }).ok).toBe(false)
  })

  it("nimmt bei unbekanntem Anliegen die allgemeine Frage", () => {
    const r = parseContactInput({ ...valid, topic: "<script>" })
    expect(r.ok && r.value.topic).toBe("frage")
  })

  it("verhindert Zeilenumbrüche im Namen (Betreffzeile)", () => {
    const r = parseContactInput({ ...valid, name: "Anna\r\nBcc: x@y.at" })
    expect(r.ok && r.value.name).toBe("Anna Bcc: x@y.at")
  })
})

describe("Verteilung auf die Postfächer", () => {
  it("Support an support@, alles andere an hallo@", () => {
    expect(contactInbox("support")).toBe("support@revetly.ai")
    expect(contactInbox("frage")).toBe("hallo@revetly.ai")
    expect(contactInbox("vertrieb")).toBe("hallo@revetly.ai")
    expect(contactInbox("datenschutz")).toBe("hallo@revetly.ai")
  })
})

describe("Mails des Kontaktformulars", () => {
  beforeEach(() => {
    sent.length = 0
  })

  it("Anfrage geht ans Postfach, Antwort an den Absender, mit Konto", async () => {
    const r = parseContactInput(valid)
    if (!r.ok) throw new Error("ungültig")
    await sendContactRequest(r.value, { email: "anna@beispiel.at", userId: "u-1", plan: "growth", workspaceOwnerId: "u-1" })
    expect(sent[0].to).toBe("support@revetly.ai")
    expect(sent[0].replyTo).toBe("anna@beispiel.at")
    expect(sent[0].subject).toBe("[Hilfe bei der Nutzung] Anna Berger, Muster Bau GmbH")
    expect(sent[0].html).toContain("Plan growth")
    expect(sent[0].html).toContain("Wo ist er?")
  })

  it("escapt die Nachricht", async () => {
    const r = parseContactInput({ ...valid, message: '<img src=x onerror="alert(1)"> bitte melden' })
    if (!r.ok) throw new Error("ungültig")
    await sendContactRequest(r.value, null)
    expect(sent[0].html).not.toContain("<img src=x")
    expect(sent[0].html).toContain("&lt;img")
  })

  it("Bestätigung enthält den Text der Nachricht nicht", async () => {
    const r = parseContactInput({ ...valid, message: "Kaufen Sie jetzt billige Uhren unter spam.example" })
    if (!r.ok) throw new Error("ungültig")
    await sendContactConfirmation(r.value)
    expect(sent[0].to).toBe("anna@beispiel.at")
    expect(sent[0].html).not.toContain("spam.example")
    expect(sent[0].html).toContain("Hilfe bei der Nutzung")
  })
})
