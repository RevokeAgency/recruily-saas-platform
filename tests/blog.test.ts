import { describe, expect, it } from "vitest"

import { BLOG_AUTHOR, BLOG_POSTS, readingMinutes } from "@/lib/blog/posts"

function prose(post: (typeof BLOG_POSTS)[number]): string {
  return [post.title, post.excerpt, ...post.blocks.flatMap((b) => [b.text ?? "", ...(b.items ?? [])])].join("\n")
}

describe("Blogbeiträge", () => {
  it.each(BLOG_POSTS.map((p) => [p.slug, p] as const))("%s: Verweise passen zur Quellenliste", (_, post) => {
    const refs = new Set([...prose(post).matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))
    expect(post.sources.length).toBeGreaterThan(0)
    for (const n of refs) expect(n, `[${n}]`).toBeLessThanOrEqual(post.sources.length)
    for (let n = 1; n <= post.sources.length; n++) expect(refs.has(n), `Quelle ${n} wird nie zitiert`).toBe(true)
  })

  it.each(BLOG_POSTS.map((p) => [p.slug, p] as const))("%s: Du-Form, keine Gedankenstriche, kein Ausrufezeichen", (_, post) => {
    const text = prose(post)
    // Großes „Sie“ mitten im Satz ist Höflichkeitsform; am Satzanfang kann es „sie“ (Plural) sein.
    expect(text).not.toMatch(/[a-zäöüß,] (Sie|Ihnen|Ihre[mnrs]?|Ihr)\b/)
    expect(text).not.toMatch(/[—–!]/)
    expect(post.author).toBe(BLOG_AUTHOR)
  })

  it("Titel und Anrisse für die Startseite enthalten kein „bewert“", () => {
    for (const p of BLOG_POSTS) {
      expect(`${p.title} ${p.cardTitle ?? ""} ${p.excerpt}`, p.slug).not.toMatch(/bewert/i)
    }
  })

  it("berechnet die Lesezeit aus dem Text", () => {
    for (const p of BLOG_POSTS) expect(readingMinutes(p)).toBeGreaterThanOrEqual(3)
  })
})
