import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"

import { getAllPosts } from "@/lib/blog/posts"
import { absoluteUrl } from "@/lib/site"

// Stündlich neu, damit neue Stellen bald in der Sitemap stehen und
// geschlossene wieder verschwinden.
export const revalidate = 3600

/**
 * Offene Stellen der Kunden, damit Google sie für Google for Jobs findet
 * (dazu die strukturierten Daten auf der Stellenseite). Geschlossene Stellen
 * bleiben draußen. Best-effort: Ohne Datenbankzugang enthält die Sitemap
 * nur die festen Seiten.
 */
async function openJobs(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return []
  try {
    const db = createClient(url, key, { auth: { persistSession: false } })
    const { data: jobs } = await db
      .from("jobs")
      .select("public_slug, user_id, updated_at")
      .eq("is_active", true)
      .not("public_slug", "is", null)
      .limit(5000)
    if (!jobs?.length) return []
    const owners = [...new Set(jobs.map((j) => j.user_id).filter(Boolean))]
    const { data: profiles } = await db.from("user_profiles").select("id, slug").in("id", owners)
    const slugOf = new Map((profiles ?? []).map((p) => [p.id, p.slug as string | null]))
    return jobs
      .filter((j) => slugOf.get(j.user_id))
      .map((j) => ({
        url: absoluteUrl(`/jobs/${slugOf.get(j.user_id)}/${j.public_slug}`),
        lastModified: j.updated_at ? new Date(j.updated_at) : new Date(),
        changeFrequency: "daily" as const,
        priority: 0.6,
      }))
  } catch (err) {
    console.error("[sitemap] Stellen übersprungen:", err)
    return []
  }
}

// Öffentliche Seiten plus die offenen Stellen der Kunden. Alles hinter dem
// Login bleibt draußen.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts()
  const newest = posts[0]?.publishedAt

  return [
    { url: absoluteUrl("/"), lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    {
      url: absoluteUrl("/blog"),
      lastModified: newest ? new Date(newest) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: new Date(post.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: absoluteUrl("/datenschutz"), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: absoluteUrl("/impressum"), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: absoluteUrl("/agb"), changeFrequency: "yearly" as const, priority: 0.3 },
    ...(await openJobs()),
  ]
}
