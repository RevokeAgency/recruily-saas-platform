import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Clock3 } from "lucide-react"

import { getAllPosts, formatBlogDate } from "@/lib/blog/posts"
import { BlogHeader, BlogFooter } from "@/components/blog/blog-chrome"
import { absoluteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: "Blog — Recruiting-Wissen für DACH-Personalabteilungen | Revetly",
  description:
    "Beiträge zu KI-Recruiting, EU AI Act, strukturierten Interviews, Time-to-Hire und Bewerbermanagement-Software. Praxisnah für Personalabteilungen und Agenturen.",
  keywords: [
    "Recruiting Blog",
    "KI Recruiting",
    "Bewerbermanagement",
    "Time-to-Hire",
    "strukturierte Interviews",
    "EU AI Act Recruiting",
  ],
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    siteName: "Revetly",
    locale: "de_DE",
    url: "/blog",
    title: "Revetly Blog — Recruiting-Wissen für DACH-Personalabteilungen",
    description:
      "Beiträge zu KI-Recruiting, EU AI Act, strukturierten Interviews und Bewerbermanagement. Praxisnah statt theoretisch.",
    images: [{ url: "/revetly/og-image.jpg", width: 1200, height: 630 }],
  },
}

export default function BlogIndexPage() {
  const posts = getAllPosts()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Revetly Blog",
    description:
      "Beiträge zu KI-Recruiting, Recht, Auswahlverfahren und Kennzahlen für Personalabteilungen im DACH-Raum.",
    inLanguage: "de-AT",
    publisher: { "@type": "Organization", name: "Revetly" },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.metaDescription,
      datePublished: p.publishedAt,
      url: absoluteUrl(`/blog/${p.slug}`),
    })),
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
          <div className="rv-patternbg" data-pattern="grid" />
          <div className="relative z-[1] mx-auto max-w-[820px] px-4 py-[clamp(48px,6vw,76px)] sm:px-6">
            <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
              Revetly Blog
            </span>
            <h1 className="mt-[22px] text-[clamp(1.9rem,4vw,2.6rem)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--rv-ink)]">
              Recruiting-Wissen,
              <br />
              <span className="rv-gradient-text">das im Alltag hilft.</span>
            </h1>
            <p className="mt-4 text-[clamp(1rem,1.3vw,1.14rem)] leading-[1.65] text-[var(--rv-muted)]">
              Rechtliches, Auswahlverfahren und Kennzahlen. Geschrieben für Personalabteilungen
              und Agenturen, die selbst besetzen statt zu delegieren.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[820px] px-4 py-[clamp(40px,5vw,64px)] sm:px-6">
          <div className="flex flex-col gap-5">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="rounded-[var(--rv-radius-lg)] border border-[rgba(12,26,22,.10)] bg-white p-[26px_28px] transition-shadow duration-300 hover:shadow-[var(--rv-shadow)]"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-full bg-[rgba(22,199,124,.12)] px-3 py-[5px] text-[.71rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase">
                    {post.category}
                  </span>
                  <span className="text-[.79rem] text-[var(--rv-muted)]">{formatBlogDate(post.publishedAt)}</span>
                  <span className="inline-flex items-center gap-1 text-[.79rem] text-[var(--rv-muted)]">
                    <Clock3 className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {post.readingMinutes} Min.
                  </span>
                </div>
                <h2 className="mt-4 text-[clamp(1.15rem,2vw,1.4rem)] leading-[1.3] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
                  <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-[var(--rv-green-deep)]">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 text-[.94rem] leading-[1.66] text-[var(--rv-muted)]">{post.excerpt}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group mt-4 inline-flex items-center gap-1.5 text-[.88rem] font-bold text-[var(--rv-ink)] transition-colors hover:text-[var(--rv-green-deep)]"
                >
                  Weiterlesen
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </main>

      <BlogFooter />
    </div>
  )
}
