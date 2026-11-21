import type { SupabaseClient } from "@supabase/supabase-js"
import { checkApplicantText, extractWithoutHiddenText, type FindingSource } from "@/lib/document-guard"

// ─────────────────────────────────────────────────────────────────────────────
// Seitentext der Unterlagen für Belegstellen (candidate_document_pages, 039).
//
// Wird beim ersten Bedarf gebaut. Vorher prüft der Client des Nutzers, dass
// der Kandidat für ihn sichtbar ist (RLS). Erst dann liest die Service-Rolle
// die Datei aus dem privaten Storage. Versteckter Text ist dabei schon
// entfernt (lib/document-guard), genau wie beim Matching.
//
// Revy liest die Tabelle nie direkt, sondern nur geschwärzte Ausschnitte über
// revy.belege().
// ─────────────────────────────────────────────────────────────────────────────

interface Dokument {
  dokument: FindingSource
  seite: number
  text: string
}

async function pagesFromFile(admin: SupabaseClient, path: string, source: FindingSource): Promise<Dokument[]> {
  const { data: file } = await admin.storage.from("resumes").download(path)
  if (!file) return []
  const buf = Buffer.from(await file.arrayBuffer())
  const doc = await extractWithoutHiddenText(buf, null, path, source)
  const pages = doc.pages?.length ? doc.pages : [doc.text]
  return pages
    .map((t, i) => ({ dokument: source, seite: i + 1, text: checkApplicantText(t, source).text.trim() }))
    .filter((p) => p.text.length > 0)
}

/**
 * Legt die Seiten an, falls es noch keine gibt. Gibt false zurück, wenn der
 * Kandidat für den Nutzer nicht sichtbar ist.
 */
export async function ensureDocumentPages(
  db: SupabaseClient,
  admin: SupabaseClient,
  candidateId: string,
): Promise<boolean> {
  const { data: c } = await db
    .from("candidates")
    .select("id, user_id, resume_path, resume_text, cover_letter_path, cover_letter_text")
    .eq("id", candidateId)
    .maybeSingle()
  if (!c) return false

  const { count } = await admin
    .from("candidate_document_pages")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", candidateId)
  if ((count ?? 0) > 0) return true

  const rows: Dokument[] = []
  try {
    if (c.resume_path) rows.push(...(await pagesFromFile(admin, c.resume_path, "lebenslauf")))
    if (c.cover_letter_path) rows.push(...(await pagesFromFile(admin, c.cover_letter_path, "anschreiben")))
  } catch (err) {
    console.error("[revy] Seitentext nicht lesbar, Rückfall auf gespeicherten Text:", err)
  }
  // Ohne Datei (oder nicht lesbar): gespeicherter Text als eine Seite.
  if (!rows.some((r) => r.dokument === "lebenslauf") && c.resume_text) {
    rows.push({ dokument: "lebenslauf", seite: 1, text: checkApplicantText(c.resume_text, "lebenslauf").text })
  }
  if (!rows.some((r) => r.dokument === "anschreiben") && c.cover_letter_text) {
    rows.push({ dokument: "anschreiben", seite: 1, text: checkApplicantText(c.cover_letter_text, "anschreiben").text })
  }
  if (rows.length === 0) return true

  const { error } = await admin
    .from("candidate_document_pages")
    .upsert(
      rows.map((r) => ({ ...r, user_id: c.user_id, candidate_id: candidateId })),
      { onConflict: "candidate_id,dokument,seite", ignoreDuplicates: true },
    )
  if (error) console.error("[revy] Seiten nicht gespeichert:", error.message)
  return true
}
