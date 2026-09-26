import { createClient as createAdmin } from "@supabase/supabase-js"

import { checkApplicantText, extractWithoutHiddenText } from "./index"
import type { DocumentCheck, DocumentFinding } from "./types"

/** Eine Zeile aus candidates, wie select("*") sie liefert. */
export interface ScreenableCandidate {
  id: string
  resume_path?: string | null
  cover_letter_path?: string | null
  cover_letter_text?: string | null
  resume_text?: string | null
  [column: string]: unknown
}

export interface ScreenResult {
  resumeText: string | null
  coverText: string | null
  check: DocumentCheck
  /** Der gespeicherte Text war ein anderer. Ein daraus gebautes Dossier ist veraltet. */
  textChanged: boolean
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createAdmin(url, key, { auth: { persistSession: false } })
}

function isMissingColumn(message: string | null | undefined): boolean {
  return /document_findings/i.test(message || "")
}

/**
 * Prüft die gespeicherten Unterlagen eines Kandidaten, speichert die Befunde
 * (Migration 030) und ersetzt zwischengespeicherten Text durch die bereinigte
 * Fassung. Best-effort: liefert null bei jedem Problem, wirft nie.
 *
 * Aufgerufen beim Eingang (Bewerbungsseite, E-Mail, Upload) und vor dem
 * Matching für Kandidaten, die noch nie geprüft wurden.
 */
export async function screenCandidateDocuments(
  candidateOrId: ScreenableCandidate | string,
): Promise<ScreenResult | null> {
  const db = admin()
  if (!db) return null
  try {
    let candidate: ScreenableCandidate
    if (typeof candidateOrId === "string") {
      const { data } = await db.from("candidates").select("*").eq("id", candidateOrId).single()
      if (!data) return null
      candidate = data as ScreenableCandidate
    } else {
      candidate = candidateOrId
    }

    const findings: DocumentFinding[] = []
    const download = async (path: string) => {
      const { data } = await db.storage.from("resumes").download(path)
      return data ? Buffer.from(await data.arrayBuffer()) : null
    }

    // Lebenslauf: vollständig neu aus der Datei, ohne versteckten Text.
    let resumeText: string | null = candidate.resume_text ?? null
    if (candidate.resume_path) {
      const buf = await download(candidate.resume_path)
      if (buf) {
        const doc = await extractWithoutHiddenText(buf, null, candidate.resume_path, "lebenslauf")
        const checked = checkApplicantText(doc.text, "lebenslauf")
        findings.push(...doc.findings, ...checked.findings)
        resumeText = checked.text.trim() || null
      }
    }

    // Anschreiben: Der gespeicherte Text kann mehr sein als die Datei (auf der
    // Bewerbungsseite getippte Nachricht plus Anschreiben, oder der E-Mail-
    // Text). Deshalb wird nur der Dateianteil ersetzt, wenn er versteckten
    // Text enthielt und unverändert im gespeicherten Text steht.
    let coverText = candidate.cover_letter_text ?? ""
    if (candidate.cover_letter_path) {
      const buf = await download(candidate.cover_letter_path)
      if (buf) {
        const doc = await extractWithoutHiddenText(buf, null, candidate.cover_letter_path, "anschreiben")
        findings.push(...doc.findings)
        if (doc.findings.length && doc.rawText && coverText.endsWith(doc.rawText)) {
          coverText = coverText.slice(0, coverText.length - doc.rawText.length) + doc.text
        }
      }
    }
    const coverChecked = checkApplicantText(coverText, "anschreiben")
    findings.push(...coverChecked.findings)
    const cover = coverChecked.text.trim() || null

    const check: DocumentCheck = { version: 1, checked_at: new Date().toISOString(), findings }
    const textChanged =
      (resumeText ?? null) !== (candidate.resume_text ?? null) ||
      (cover ?? null) !== (candidate.cover_letter_text?.trim() || null)

    // Nur Spalten schreiben, die es gibt (select("*") liefert genau diese).
    // So scheitert das Update nicht an einer fehlenden älteren Migration.
    const has = (column: string) => column in candidate
    const update: Record<string, unknown> = { document_findings: check }
    if (has("resume_text") && resumeText !== (candidate.resume_text ?? null)) update.resume_text = resumeText
    if (has("cover_letter_text") && cover !== (candidate.cover_letter_text?.trim() || null)) update.cover_letter_text = cover
    // Ein Dossier aus dem alten Text könnte versteckte Angaben enthalten.
    if (textChanged && has("dossier") && candidate.dossier != null) update.dossier = null

    let { error } = await db.from("candidates").update(update).eq("id", candidate.id)
    if (error && isMissingColumn(error.message)) {
      // Ohne Migration 030: bereinigten Text trotzdem speichern.
      delete update.document_findings
      ;({ error } = await db.from("candidates").update(update).eq("id", candidate.id))
    }
    if (error) console.error("[document-guard] Befunde nicht gespeichert:", error.message)

    return { resumeText, coverText: cover, check, textChanged }
  } catch (err) {
    console.error("[document-guard] Prüfung übersprungen:", err)
    return null
  }
}
