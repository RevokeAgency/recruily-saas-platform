import Link from "next/link"
import { ArrowUpRight, Play } from "lucide-react"

import { useReveal } from "@/lib/hooks/useReveal"
import { RvButton } from "./rv-button"

export function RvCta() {
  const ref = useReveal()

  return (
    <section ref={ref} className="bg-white py-[clamp(72px,9vw,130px)]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div
          className="reveal relative grid overflow-hidden bg-[image:var(--rv-gradient)] shadow-[var(--rv-shadow-lg)] md:grid-cols-[1.05fr_0.95fr]"
          style={{ borderRadius: "var(--rv-radius-xl)" }}
          data-dir="scale"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(120% 100% at 0% 0%, rgba(255,255,255,.32), transparent 50%)" }}
          />
          <div className="relative z-[1] p-9 sm:p-12 lg:p-16">
            <div className="rv-arrowbox mb-[22px]">
              <ArrowUpRight className="h-[18px] w-[18px]" strokeWidth={2.4} />
            </div>
            <h2 className="mb-3.5 text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.12] font-bold tracking-[-0.025em] text-[var(--rv-ink)]">
              10 Matches.
              <br />
              Gratis. Kein Risiko.
            </h2>
            <p className="mb-7 max-w-[420px] text-[rgba(12,26,22,.78)]">
              Leg jetzt los – kein Account, keine Kreditkarte. In drei Minuten siehst du,
              wer wirklich zu deiner Stelle passt. Und warum.
            </p>
            <div className="flex flex-wrap gap-3">
              <RvButton variant="light" size="lg" asChild>
                <Link href="/auth/register">Kostenlos starten</Link>
              </RvButton>
              <RvButton
                variant="ghost"
                size="lg"
                onClick={() => document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Play className="h-4 w-4" fill="currentColor" />
                Demo ansehen
              </RvButton>
            </div>
          </div>
          {/* CTA photo intentionally omitted: index.html hotlinks an Unsplash stock
              photo which we won't hotlink or fabricate a replacement for. Falls back
              to the gradient background, matching the reference's own .failed state
              for broken images. Drop a licensed photo into public/revetly/ and an
              <img> here when one is available. */}
          <div className="relative hidden min-h-[340px] bg-[var(--rv-ink)] md:block" />
        </div>
      </div>
    </section>
  )
}
