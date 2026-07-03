import type { InboundAttachment } from "./types"

/**
 * Load an attachment's bytes — from inline base64 (small files / test fixtures)
 * or its EU-hosted download URL (large files on Scaleway S3). Returns null on
 * failure (expired URL, network error) so callers can handle it gracefully.
 */
export async function loadInboundAttachment(att: InboundAttachment): Promise<Buffer | null> {
  try {
    if (att.contentBase64) return Buffer.from(att.contentBase64, "base64")
    if (att.downloadUrl) {
      const res = await fetch(att.downloadUrl)
      if (!res.ok) return null
      return Buffer.from(await res.arrayBuffer())
    }
  } catch (err) {
    console.error("loadInboundAttachment failed:", err)
  }
  return null
}
