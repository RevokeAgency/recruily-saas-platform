import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, Clock3 } from "lucide-react"

import { BLOG_POSTS, getAllPosts, getPost, formatBlogDate, type BlogBlock } from "@/lib/blog/posts"
import { BlogHeader, BlogFooter } from "@/components/blog/blog-chrome"
import { absoluteUrl } from "@/lib/site"

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: "Beitrag nicht gefunden — Revetly" }

  return {
    title: `${post.title} — Revetly`,
    description: post.metaDescription,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.metaDescription,
      publishedTime: post.publishedAt,
      siteName: "Revetly",
      locale: "de_DE",
      url: `/blog/${post.slug}`,
      images: [{ url: "/revetly/og-image.jpg", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
      images: ["/revetly/og-image.jpg"],
    },
  }
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="mt-11 mb-3.5 text-[clamp(1.25rem,2vw,1.5rem)] leading-[1.3] font-bold tracking-[-0.022em] text-[var(--rv-ink)]">
          {block.text}
        </h2>
      )
    case "h3":
      return (
        <h3 className="mt-8 mb-2.5 text-[1.08rem] leading-[1.4] font-bold tracking-[-0.015em] text-[var(--rv-ink)]">
          {block.text}
        </h3>
      )
    case "list":
      return (
        <ul className="my-5 flex flex-col gap-2.5">
          {(block.items ?? []).map((item) => (
            <li key={item} className="flex gap-3 text-[1.02rem] leading-[1.7] text-[var(--rv-ink-soft)]">
              <span className="mt-[.62em] h-1.5 w-1.5 flex-none rounded-full bg-[image:var(--rv-gradient)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case "quote":
      return (
        <blockquote className="my-7 rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)] p-[22px_24px] text-[1.05rem] leading-[1.6] font-semibold tracking-[-0.01em] text-[var(--rv-ink)]">
          {block.text}
        </blockquote>
      )
    default:
      return (
        <p className="my-4 text-[1.02rem] leading-[1.75] text-[var(--rv-ink-soft)]">{block.text}</p>
      )
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const related = getAllPosts()
    .filter((p) => p.slug !== post.slug)
    .slice(0, 2)

  // Strukturierte Daten: Google erkennt den Beitrag damit als Artikel und kann
  // Datum, Titel und Beschreibung direkt aus der Seite übernehmen.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    inLanguage: "de-AT",
    keywords: post.keywords.join(", "),
    articleSection: post.category,
    author: { "@type": "Organization", name: "Revetly" },
    publisher: { "@type": "Organization", name: "Revetly" },
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/blog/${post.slug}`) },
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogHeader />

      <main>
        <div className="relative overflow-hidden border-b border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)]">
          <div className="rv-patternbg" data-pattern="rings" />
          <div className="relative z-[1] mx-auto max-w-[820px] px-4 py-[clamp(48px,6vw,76px)] sm:px-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-white px-3 py-[5px] text-[.71rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase shadow-[var(--rv-shadow-sm)]">
                {post.category}
              </span>
              <span className="text-[.82rem] text-[var(--rv-muted)]">{formatBlogDate(post.publishedAt)}</span>
              <span className="inline-flex items-center gap-1 text-[.82rem] text-[var(--rv-muted)]">
                <Clock3 className="h-3.5 w-3.5" strokeWidth={2.2} />
                {post.readingMinutes} Min. Lesezeit
              </span>
            </div>
            <h1 className="mt-5 text-[clamp(1.9rem,4vw,2.6rem)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--rv-ink)]">
              {post.title}
            </h1>
            <p className="mt-4 text-[clamp(1rem,1.3vw,1.14rem)] leading-[1.65] text-[var(--rv-muted)]">
              {post.excerpt}
            </p>
          </div>
        </div>

        <article className="mx-auto max-w-[820px] px-4 py-[clamp(40px,5vw,64px)] sm:px-6">
          {post.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </article>

        <section className="border-t border-[rgba(12,26,22,.10)] bg-[var(--rv-mist)]">
          <div className="mx-auto max-w-[820px] px-4 py-12 sm:px-6">
            <h2 className="text-[.78rem] font-bold tracking-[.1em] text-[var(--rv-ink)] uppercase">
              Weiterlesen
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col gap-2.5 rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.10)] bg-white p-[22px_24px] transition-shadow duration-300 hover:shadow-[var(--rv-shadow)]"
                >
                  <span className="text-[.71rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase">
                    {p.category}
                  </span>
                  <span className="text-[1.02rem] leading-[1.35] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">
                    {p.cardTitle ?? p.title}
                  </span>
                  <span className="line-clamp-3 text-[.87rem] leading-[1.58] text-[var(--rv-muted)]">
                    {p.excerpt}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[.85rem] font-bold text-[var(--rv-ink)] transition-colors group-hover:text-[var(--rv-green-deep)]">
                    Beitrag öffnen
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <BlogFooter />
    </div>
  )
}
