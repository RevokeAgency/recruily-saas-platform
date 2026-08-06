import type { MetadataRoute } from "next"

import { getAllPosts } from "@/lib/blog/posts"
import { absoluteUrl } from "@/lib/site"

// Nur öffentliche Seiten. Alles hinter dem Login sowie die Stellen-Seiten der
// Kunden bleiben draußen: Erstere gehören nicht in den Index, letztere sind
// kundeneigene Inhalte mit eigener Lebensdauer.
export default function sitemap(): MetadataRoute.Sitemap {
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
  ]
}
