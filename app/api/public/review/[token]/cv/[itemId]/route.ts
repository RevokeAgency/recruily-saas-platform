import { NextRequest } from "next/server"

import { isUuid } from "@/lib/review/shared"
import { findLink, reviewDb } from "@/lib/review/store"

export const dynamic = "force-dynamic"

/**
 * Lebenslauf eines Bewerbers aus einem Freigabe-Link. Leitet auf einen
 * signierten Link um, der fünf Minuten gilt. Prüft vorher, dass der Link
 * gültig ist und der Bewerber dazugehört.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string; itemId: string }> }) {
  const { token, itemId } = await params
  const db = reviewDb()
  if (!db || !isUuid(itemId)) return new Response("Nicht gefunden", { status: 404 })

  const found = await findLink(db, token)
  if (!found.ok) return new Response("Dieser Link ist nicht mehr gültig.", { status: 410 })

  const { data: item } = await db
    .from("review_link_items")
    .select("job_candidate:job_candidates(candidate:candidates(resume_path))")
    .eq("id", itemId)
    .eq("link_id", found.link.id)
    .maybeSingle()
  const jc = (Array.isArray(item?.job_candidate) ? item?.job_candidate[0] : item?.job_candidate) as { candidate?: unknown } | null | undefined
  const cand = (Array.isArray(jc?.candidate) ? jc?.candidate[0] : jc?.candidate) as { resume_path?: string | null } | null | undefined
  const path = cand?.resume_path
  if (!path) return new Response("Kein Lebenslauf vorhanden.", { status: 404 })

  const { data, error } = await db.storage.from("resumes").createSignedUrl(path, 300)
  if (error || !data?.signedUrl) return new Response("Lebenslauf gerade nicht verfügbar.", { status: 502 })

  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  })
}
