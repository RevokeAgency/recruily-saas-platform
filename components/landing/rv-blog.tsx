"use client"

import Link from "next/link"
import { ArrowUpRight, Clock3 } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { getAllPosts, formatBlogDate } from "@/lib/blog/posts"
import { RvButton } from "./rv-button"
import { RvCard } from "./rv-card"

/**
 * Blog-Vorschau auf der Landing-Page.
 *
 * Zeigt bewusst nur Anrisstexte. Der vollständige Beitrag liegt unter
 * /blog/<slug> und wird über „Weiterlesen" in einem neuen Tab geöffnet, damit
 * der Besucher die Landing-Page nicht verliert.
 */
export function RvBlog() {
  const ref = useReveal()
  const posts = getAllPosts()
  const [lead, ...rest] = posts

  return (
    <section id="blog" ref={ref} className="relative overflow-hidden bg-white py-[clamp(72px,9vw,130px)]">
      <div className="rv-patternbg" data-pattern="grid" />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="reveal mb-14 flex flex-wrap items-end justify-between gap-6" data-dir="left">
          <div className="max-w-[660px]">
            <span className="rv-eyebrow inline-flex items-center gap-2 rounded-full border border-[rgba(12,26,22,.10)] bg-white px-3.5 py-[7px] text-[var(--rv-ink-soft)] shadow-[var(--rv-shadow-sm)] before:h-[7px] before:w-[7px] before:rounded-full before:bg-[image:var(--rv-gradient)]">
              Revetly Blog
            </span>
            <h2 className="mt-[22px] text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
              Recruiting-Wissen,
              <br />
              <span className="rv-gradient-text">das im Alltag hilft.</span>
            </h2>
            <p className="mt-[18px] text-[clamp(1rem,1.25vw,1.12rem)] leading-[1.65] text-[var(--rv-muted)]">
              Rechtliches, Auswahlverfahren und Kennzahlen. Geschrieben für Personalabteilungen
              und Agenturen, die selbst besetzen statt zu delegieren.
            </p>
          </div>
          <Link
            href="/blog"
            target="_blank"
            rel="noopener"
            className="group inline-flex items-center gap-1.5 text-[.92rem] font-semibold text-[var(--rv-ink-soft)] transition-colors hover:text-[var(--rv-green-deep)]"
          >
            Alle Beiträge
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} />
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          {/* Aufmacher: neuester Beitrag, größer gesetzt. */}
          <RvCard
            spotlight
            className="reveal s1 flex flex-col justify-between gap-8 p-[30px_28px] shadow-[var(--rv-shadow-sm)] hover:shadow-[var(--rv-shadow)]"
            data-dir="left"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-[rgba(22,199,124,.12)] px-3 py-[5px] text-[.71rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase">
                  {lead.category}
                </span>
                <span className="text-[.78rem] text-[var(--rv-muted)]">{formatBlogDate(lead.publishedAt)}</span>
                <span className="inline-flex items-center gap-1 text-[.78rem] text-[var(--rv-muted)]">
                  <Clock3 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {lead.readingMinutes} Min.
                </span>
              </div>
              <h3 className="mt-[18px] text-[clamp(1.35rem,2.2vw,1.75rem)] leading-[1.25] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
                {lead.title}
              </h3>
              <p className="mt-3.5 text-[.95rem] leading-[1.66] text-[var(--rv-muted)]">{lead.excerpt}</p>
            </div>
            <div>
              <RvButton variant="primary" size="sm" asChild>
                <Link href={`/blog/${lead.slug}`} target="_blank" rel="noopener">
                  Weiterlesen
                  <ArrowUpRight className="rv-btn-arrow h-3.5 w-3.5" strokeWidth={2.4} />
                </Link>
              </RvButton>
            </div>
          </RvCard>

          {/* Die übrigen Beiträge als kompakte Liste. */}
          <div className="flex flex-col gap-5">
            {rest.slice(0, 3).map((post, i) => (
              <RvCard
                key={post.slug}
                spotlight
                className={`reveal s${i + 2} flex flex-col gap-3 p-[22px_24px] shadow-[var(--rv-shadow-sm)] hover:shadow-[var(--rv-shadow)]`}
                data-dir="right"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[.71rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase">
                    {post.category}
                  </span>
                  <span className="text-[.75rem] text-[var(--rv-muted)]">{post.readingMinutes} Min.</span>
                </div>
                <h3 className="text-[1.05rem] leading-[1.35] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">
                  {post.cardTitle ?? post.title}
                </h3>
                <p className="line-clamp-3 text-[.87rem] leading-[1.58] text-[var(--rv-muted)]">{post.excerpt}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="group mt-auto inline-flex w-fit items-center gap-1.5 pt-1 text-[.85rem] font-bold text-[var(--rv-ink)] transition-colors hover:text-[var(--rv-green-deep)]"
                >
                  Weiterlesen
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} />
                </Link>
              </RvCard>
            ))}
          </div>
        </div>

        {/* Ältere Beiträge in einer flachen Reihe. */}
        {rest.length > 3 && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {rest.slice(3).map((post, i) => (
              <RvCard
                key={post.slug}
                spotlight
                className={`reveal s${i + 1} flex flex-col gap-3 p-[24px_26px] shadow-[var(--rv-shadow-sm)] hover:shadow-[var(--rv-shadow)]`}
                data-dir={i % 2 === 0 ? "left" : "right"}
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[.71rem] font-bold tracking-[.08em] text-[var(--rv-green-deep)] uppercase">
                    {post.category}
                  </span>
                  <span className="text-[.75rem] text-[var(--rv-muted)]">{formatBlogDate(post.publishedAt)}</span>
                  <span className="inline-flex items-center gap-1 text-[.75rem] text-[var(--rv-muted)]">
                    <Clock3 className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {post.readingMinutes} Min.
                  </span>
                </div>
                <h3 className="text-[1.12rem] leading-[1.35] font-bold tracking-[-0.02em] text-[var(--rv-ink)]">
                  {post.cardTitle ?? post.title}
                </h3>
                <p className="text-[.88rem] leading-[1.6] text-[var(--rv-muted)]">{post.excerpt}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener"
                  className="group mt-auto inline-flex w-fit items-center gap-1.5 pt-1 text-[.85rem] font-bold text-[var(--rv-ink)] transition-colors hover:text-[var(--rv-green-deep)]"
                >
                  Weiterlesen
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.4} />
                </Link>
              </RvCard>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
