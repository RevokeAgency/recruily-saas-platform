import { cn } from "@/lib/utils"

interface PageHeroProps {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Right-aligned actions (primary <Button asChild> reads fine on the dark band). */
  actions?: React.ReactNode
  className?: string
}

/**
 * Slim branded header band shared across the product sub-pages (Jobs, Kandidaten,
 * Abo, Einstellungen). A calmer sibling of the dashboard hero: same dark
 * mesh-glow DNA and gradient family, shorter and without a flagship metric, so
 * every page reads as part of the same Revetly system without repeating the
 * full hero. Presentation only.
 */
export function PageHero({ eyebrow, title, subtitle, actions, className }: PageHeroProps) {
  return (
    <section
      className={cn(
        "rv-fade-up relative overflow-hidden rounded-[24px] bg-[var(--rv-ink)] p-7 lg:p-8",
        className,
      )}
    >
      <div className="rv-patternbg" data-pattern="mesh" style={{ animationDuration: "46s" }} aria-hidden="true" />

      <div className="relative z-[1] flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {eyebrow && (
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/45">
              {eyebrow}
            </span>
          )}
          <h1 className={cn("text-[1.65rem] font-bold leading-tight tracking-tight text-white", eyebrow && "mt-2")}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-lg text-[0.92rem] leading-relaxed text-white/60">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </section>
  )
}

/**
 * Glass secondary button for use inside PageHero (readable on the dark band,
 * unlike the light `outline` button variant).
 */
export function HeroGhostButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-white/15 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur-sm transition-[background-color,border-color] duration-150 ease-out hover:bg-white/[0.16] active:scale-[0.98]",
        className,
      )}
    >
      {children}
    </button>
  )
}
