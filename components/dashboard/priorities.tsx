import Link from "next/link"
import {
  ClipboardCheck,
  Inbox,
  Zap,
  Plus,
  UserCheck,
  ChevronRight,
  CheckCircle2,
} from "lucide-react"

export type PriorityKind = "review" | "queued" | "inbox" | "quota" | "firstjob"

export interface PriorityItem {
  id: string
  kind: PriorityKind
  title: string
  subtitle: string
  href: string
}

const meta: Record<PriorityKind, { icon: typeof Zap; tone: "green" | "cyan" | "amber" }> = {
  review: { icon: UserCheck, tone: "cyan" },
  queued: { icon: Zap, tone: "amber" },
  inbox: { icon: Inbox, tone: "cyan" },
  quota: { icon: Zap, tone: "amber" },
  firstjob: { icon: Plus, tone: "green" },
}

const toneChip: Record<"green" | "cyan" | "amber", string> = {
  green: "bg-[rgba(22,199,124,.16)] text-[#45CB8D]",
  cyan: "bg-[rgba(34,193,238,.16)] text-[#5AD1F2]",
  amber: "bg-[rgba(245,158,11,.16)] text-[#FCD34D]",
}

/**
 * Dark focus card — the one high-contrast surface on the dashboard. Surfaces
 * the few things that actually need the recruiter's attention right now
 * (candidates awaiting review, unassigned mail, quota, first job), each a
 * direct link to the place it's handled. Empty = an all-clear state.
 */
export function Priorities({ items }: { items: PriorityItem[] }) {
  return (
    <div className="flex h-full flex-col rounded-[24px] bg-[var(--rv-ink)] p-6 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-[#45CB8D]" strokeWidth={2} />
          <span className="text-[0.82rem] font-semibold text-white">Prioritäten</span>
        </div>
        {items.length > 0 && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-white/80">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="h-9 w-9 text-[#45CB8D]" strokeWidth={1.75} />
          <p className="mt-3 text-sm font-medium text-white">Alles erledigt</p>
          <p className="mt-1 text-xs text-white/50">
            Keine offenen Aufgaben — schön aufgeräumt.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-1">
          {items.map((item) => {
            const { icon: Icon, tone } = meta[item.kind]
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.06]"
                >
                  <span
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${toneChip[tone]}`}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{item.title}</p>
                    <p className="truncate text-xs text-white/50">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-none text-white/30 transition-colors group-hover:text-white/60" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
