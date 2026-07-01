import { Check } from "lucide-react"

const TRUST_ITEMS = ["DSGVO-konform", "EU AI Act", "Server in Deutschland"]

/**
 * Split-screen shell for the full-page auth flows (register/reset), per
 * DASHBOARD_AUTH_REDESIGN.md §5: form left (quiet, centered, max-w ~420px),
 * brand panel right (subtle mesh-gradient, no marketing motion — this is
 * product chrome, not a landing section).
 */
export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>

      <div className="relative hidden overflow-hidden bg-[var(--rv-ink)] lg:block">
        <div className="rv-patternbg" data-pattern="mesh" style={{ animationDuration: "40s" }} />
        <div className="relative z-[1] flex h-full flex-col justify-center px-16">
          <h2 className="max-w-sm text-[2rem] leading-[1.15] font-bold tracking-tight text-white">
            Die besten Kandidaten, sofort sichtbar.
          </h2>
          <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-white/60">
            Revetly matcht CV und Anschreiben gemeinsam und zeigt dir mit einem
            erklärbaren Score, wer wirklich zu deiner Stelle passt.
          </p>
          <div className="mt-8 flex flex-col gap-2.5">
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-2 text-[0.83rem] font-medium text-white/50">
                <Check className="h-3.5 w-3.5 flex-none text-[var(--rv-green)]" strokeWidth={2.5} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
