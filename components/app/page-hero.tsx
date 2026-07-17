import { cn } from "@/lib/utils"

interface PageHeroProps {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Right-aligned actions. */
  actions?: React.ReactNode
  className?: string
}

/**
 * Light, airy page header shared across the product sub-pages (Jobs, Kandidaten,
 * Posteingang, Abo, Einstellungen). Sits directly on the neutral canvas — no
 * card, no dark band — so every page opens with the same big friendly title and
 * a quiet accent eyebrow. Presentation only.
 */
export function PageHero({ eyebrow, title, subtitle, actions, className }: PageHeroProps) {
  return (
    <section
      className={cn(
        "rv-fade-up flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow && (
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--rv-green-deep)]">
            {eyebrow}
          </span>
        )}
        <h1
          className={cn(
            "text-[1.85rem] font-bold leading-[1.1] tracking-tight text-foreground lg:text-[2.1rem]",
            eyebrow && "mt-1.5",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-3">{actions}</div>
      )}
    </section>
  )
}

/**
 * Secondary button for the light page header — white surface, hairline border,
 * quiet hover. Pairs with the primary <Button> for the main action.
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
        "inline-flex h-10 items-center justify-center rounded-full border border-[var(--app-line)] bg-white px-4 text-sm font-medium text-foreground shadow-[0_1px_2px_rgba(12,26,22,.04)] transition-colors duration-150 ease-out hover:bg-[var(--muted)] active:scale-[0.98]",
        className,
      )}
    >
      {children}
    </button>
  )
}
