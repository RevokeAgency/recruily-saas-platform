import { sendMail } from "./client"
import { details, escapeHtml, eyebrow, heading, panel, paragraph, shell } from "./layout"
import { CONTACT_TOPICS, contactInbox, type ContactInput } from "@/lib/contact"

// ─────────────────────────────────────────────────────────────────────────────
// Mails des Kontaktformulars: die Anfrage an uns und eine kurze Bestätigung
// an den Absender.
//
// Die Bestätigung enthält bewusst NICHT den Text der Nachricht. Sonst ließe
// sich das Formular nutzen, um beliebigen Text unter unserem Absender an
// fremde Adressen zu schicken.
// ─────────────────────────────────────────────────────────────────────────────

export interface ContactAccount {
  email: string | null
  userId: string
  plan: string | null
  workspaceOwnerId: string
}

export async function sendContactRequest(input: ContactInput, account: ContactAccount | null): Promise<boolean> {
  const topic = CONTACT_TOPICS[input.topic].label
  const rows: Array<[string, string]> = [
    ["Anliegen", escapeHtml(topic)],
    ["Name", escapeHtml(input.name)],
    ["E-Mail", `<a href="mailto:${escapeHtml(input.email)}" style="color:inherit;">${escapeHtml(input.email)}</a>`],
  ]
  if (input.company) rows.push(["Firma", escapeHtml(input.company)])
  if (account) {
    rows.push([
      "Konto",
      escapeHtml(
        [
          account.email ?? "ohne Adresse",
          account.plan ? `Plan ${account.plan}` : null,
          account.workspaceOwnerId !== account.userId ? "Teammitglied" : null,
          `ID ${account.userId}`,
        ]
          .filter(Boolean)
          .join(" · "),
      ),
    ])
  }

  const body = `
    ${eyebrow("Kontaktformular")}
    ${heading(escapeHtml(topic))}
    ${details(rows)}
    ${panel(`<div style="font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.message)}</div>`)}
    ${paragraph("Antworten gehen direkt an den Absender.", { muted: true, small: true, last: true })}
  `
  return sendMail(
    {
      to: contactInbox(input.topic),
      subject: `[${topic}] ${input.name}${input.company ? `, ${input.company}` : ""}`,
      html: shell("Revetly", body, { preheader: input.message.slice(0, 120) }),
      replyTo: input.email,
    },
    "Kontakt Anfrage",
  )
}

export async function sendContactConfirmation(input: ContactInput): Promise<boolean> {
  const body = `
    ${eyebrow("Kontakt")}
    ${heading("Deine Nachricht ist angekommen")}
    ${paragraph(`Hallo ${escapeHtml(input.name)}, danke für deine Nachricht zum Thema „${escapeHtml(CONTACT_TOPICS[input.topic].label)}“. Wir melden uns per Mail bei dir.`)}
    ${paragraph("Du hast uns nicht geschrieben? Dann hat jemand deine Adresse eingegeben. Du musst nichts tun, wir verwenden sie nur für die Antwort auf diese Anfrage.", { muted: true, small: true, last: true })}
  `
  return sendMail(
    {
      to: input.email,
      subject: "Deine Nachricht an Revetly",
      html: shell("Revetly", body, { preheader: "Wir melden uns per Mail bei dir." }),
      replyTo: contactInbox(input.topic),
    },
    "Kontakt Bestätigung",
  )
}
