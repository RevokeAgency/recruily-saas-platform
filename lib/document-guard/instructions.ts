import { mergeAdjacent, toExcerpt, type DocumentFinding, type FindingSource } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Sichtbarer Text, der sich an eine KI richtet, und unsichtbare Zeichen.
//
// Sichtbare Sätze werden NICHT entfernt, nur als Befund festgehalten. Der
// Recruiter sieht sie ohnehin, und eine Mustererkennung irrt sich gelegentlich
// (etwa beim Lebenslauf von jemandem, der beruflich mit KI arbeitet). Gegen
// das Befolgen solcher Sätze schützt die Regel in den Prompts
// (lib/ai/applicant-text.ts).
//
// Die Muster sind absichtlich eng: Sie sollen Sätze finden, die in einer
// echten Bewerbung keinen Sinn ergeben, nicht jede Erwähnung von KI.
// ─────────────────────────────────────────────────────────────────────────────

const PATTERNS: RegExp[] = [
  // Englisch
  /\b(ignore|disregard|forget|override)\b[^.!?\n]{0,40}\b(instructions?|prompts?|rules|guidelines|directions)\b/i,
  /\b(you are|you're) (now )?(an? |the )?(ai|assistant|language model|llm|chatbot)\b/i,
  /\b(rate|score|rank|grade|evaluate|mark)\b[^.!?\n]{0,25}\b(this|the) (candidate|applicant|resume|cv|profile)\b[^.!?\n]{0,40}\b(highly|high|top|best|perfect|maximum|max|100|10\/10|excellent)\b/i,
  /\bthis (candidate|applicant) (is|would be) (a |an |the )?(perfect|ideal|best) (match|fit|candidate|hire)\b/i,
  /\b(note|message|instructions?) (to|for) (the )?(ai|llm|language model|gpt|chatgpt|ats)\b/i,
  /\b(new|updated|additional) instructions?\s*:/i,
  // Deutsch
  /\b(ignorier\w*|vergiss|missachte\w*)\b[^.!?\n]{0,40}\b(anweisung\w*|instruktion\w*|vorgabe\w*|regeln|prompts?)\b/i,
  /\b(du bist) (jetzt |nun |ab sofort )?(eine? |der |die )?(ki|assistent\w*|sprachmodell|llm|chatbot)\b/i,
  /\b(bewerte|beurteile|stufe|reihe|ranke|setze)\w*\b[^.!?\n]{0,30}\b(diese[nrm]?|den|die) (kandidat\w*|bewerber\w*|lebenslauf|profil)\b[^.!?\n]{0,40}\b(hoch|höchst\w*|best\w*|top|perfekt\w*|maximal\w*|volle?n?|100|ausgezeichnet\w*)/i,
  /\b(diese[rs]?|der) (kandidat|bewerber)\w* (ist|wäre) (der |die |das |ein |eine )?(perfekt|ideal|optimal)\w* (match|treffer|kandidat\w*|besetzung|wahl)\b/i,
  /\b(hinweis|nachricht|anweisung)\w* (an|für) (die |das |den )?(ki|llm|sprachmodell|gpt|chatgpt|künstliche intelligenz)\b/i,
  /\b(neue|geänderte|zusätzliche) anweisung(en)?\s*:/i,
  /\b(vergib|gib|setze)\b[^.!?\n]{0,20}\b(volle|maximale|alle|100) punkt\w*/i,
]

// Unicode-"Tag"-Zeichen (U+E0000–U+E007F) sind unsichtbar, werden von
// Sprachmodellen aber gelesen. In einer Bewerbung haben sie keinen Zweck.
const TAG_CHARS = /[\u{E0000}-\u{E007F}]+/gu
// Nullbreite und Richtungssteuerung: Kommen auch in harmlosen Dokumenten vor
// (Kopieren aus dem Web). Sie werden still entfernt, damit sie weder das Modell
// noch die Mustererkennung stören.
const INVISIBLE = /[​-‏‪-‮⁠-⁤⁦-⁩﻿­]/g

function sentenceAround(text: string, index: number, length: number): string {
  const before = text.slice(0, index)
  const start = Math.max(before.search(/[^.!?\n]*$/), 0)
  const rest = text.slice(index + length)
  const endRel = rest.search(/[.!?\n]/)
  const end = endRel === -1 ? text.length : index + length + endRel + 1
  return text.slice(start, end)
}

/**
 * Prüft Text aus Lebenslauf, Anschreiben oder Nachricht. Entfernt unsichtbare
 * Zeichen und meldet Sätze, die sich an eine KI richten.
 */
export function checkApplicantText(input: string, source: FindingSource): { text: string; findings: DocumentFinding[] } {
  const findings: DocumentFinding[] = []

  let text = input.replace(TAG_CHARS, (m) => {
    // Tag-Zeichen spiegeln ASCII. Dekodiert zeigt der Beleg, was darin stand.
    const decoded = Array.from(m, (ch) => String.fromCharCode((ch.codePointAt(0) ?? 0xe0000) - 0xe0000))
      .join("")
      .replace(/[^\x20-\x7e]/g, "")
    findings.push({ source, reason: "unicode", excerpt: decoded || "(unsichtbare Zeichen)" })
    return ""
  })
  text = text.replace(INVISIBLE, "")

  const seen = new Set<string>()
  for (const re of PATTERNS) {
    const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`)
    for (const m of text.matchAll(global)) {
      const sentence = sentenceAround(text, m.index ?? 0, m[0].length).trim()
      if (!sentence || seen.has(sentence)) continue
      seen.add(sentence)
      findings.push({ source, reason: "anweisung", excerpt: sentence })
    }
  }

  const unicode = mergeAdjacent(findings.filter((f) => f.reason === "unicode"))
  const sentences = findings.filter((f) => f.reason === "anweisung").map((f) => ({ ...f, excerpt: toExcerpt(f.excerpt) }))
  return { text, findings: [...unicode, ...sentences] }
}
