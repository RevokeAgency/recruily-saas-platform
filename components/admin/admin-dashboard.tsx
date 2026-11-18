import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  Briefcase,
  CalendarCheck,
  CircleDollarSign,
  Database,
  FileText,
  Gauge,
  Inbox,
  ListChecks,
  RefreshCcw,
  TrendingDown,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react"

import { AdminBarChart } from "./admin-charts"
import { AdminSignOut } from "./admin-signout"
import type { CustomerRow, DbMetrics } from "@/lib/admin/metrics"
import type { StripeMetrics } from "@/lib/admin/stripe-metrics"
import { cn } from "@/lib/utils"

const DAY = 86_400_000
const PLAN_LABEL: Record<string, string> = { free: "Free", starter: "Starter", growth: "Growth", pro: "Pro", enterprise: "Enterprise" }

const num = (v: number | null | undefined) => (v == null ? "–" : new Intl.NumberFormat("de-AT").format(v))
const pct = (v: number | null | undefined) =>
  v == null ? "–" : new Intl.NumberFormat("de-AT", { style: "percent", maximumFractionDigits: 1 }).format(v)
const eur = (cents: number | null | undefined) =>
  cents == null ? "–" : new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100)
const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "–"

/** Kachel im Stil der StatCard aus dem App-Dashboard, mit fertig formatiertem Wert. */
function Stat({
  label,
  value,
  icon: Icon,
  context,
  tone = "green",
  warn,
}: {
  label: string
  value: string
  icon: LucideIcon
  context?: string
  tone?: "green" | "cyan"
  warn?: boolean
}) {
  const chip = warn
    ? "bg-[rgba(245,158,11,.14)] text-[#B45309]"
    : tone === "cyan"
      ? "bg-[rgba(34,193,238,.12)] text-[var(--rv-cyan-deep)]"
      : "bg-[var(--app-green-wash)] text-[var(--rv-green-deep)]"
  return (
    <div className="rounded-[20px] border border-[var(--app-line)] bg-card p-5 shadow-[var(--app-shadow-card)]">
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-8 w-8 flex-none items-center justify-center rounded-full", chip)}>
          {warn ? <AlertTriangle className="h-[17px] w-[17px]" strokeWidth={2} /> : <Icon className="h-[17px] w-[17px]" strokeWidth={2} />}
        </span>
        <span className="text-[0.78rem] font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-4 text-[2.1rem] leading-none font-bold tracking-tight text-foreground tabular-nums">{value}</p>
      {context && <p className="mt-2.5 text-xs text-muted-foreground tabular-nums">{context}</p>}
    </div>
  )
}

function Panel({ title, note, children, className }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[20px] border border-[var(--app-line)] bg-card p-5 shadow-[var(--app-shadow-card)]", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      {children}
    </section>
  )
}

/** Anteile als Balkenliste mit Zahl daneben: lesbar ohne Farbe und ohne Legende. */
function Bars({ items, empty = "Noch keine Daten" }: { items: { label: string; count: number }[]; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count))
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-muted-foreground">{i.label}</span>
          <span className="h-2 rounded-full bg-[rgba(12,26,22,.06)]">
            <span className="block h-2 rounded-full bg-[var(--rv-green-deep)]" style={{ width: `${(i.count / max) * 100}%` }} />
          </span>
          <span className="w-10 text-right font-semibold text-foreground tabular-nums">{num(i.count)}</span>
        </li>
      ))}
    </ul>
  )
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mt-10 mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-bold tracking-tight text-foreground">{children}</h2>
      {aside}
    </div>
  )
}

function riskOf(c: CustomerRow, now: number): string | null {
  if (c.plan === "free") return null
  const last = c.lastActivityAt ? new Date(c.lastActivityAt).getTime() : 0
  return now - last > 14 * DAY ? "Seit über 14 Tagen inaktiv" : null
}

export function AdminDashboard({
  db,
  stripe,
  email,
}: {
  db: DbMetrics | null
  stripe: StripeMetrics | { error: string } | null
  email: string
}) {
  const now = db ? new Date(db.generatedAt).getTime() : 0
  const s = stripe && !("error" in stripe) ? stripe : null

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--app-line)] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Image src="/revetly/logo-520.webp" alt="Revetly" width={116} height={28} className="h-7 w-auto" priority />
            <span className="rounded-full bg-[var(--rv-ink)] px-2.5 py-0.5 text-[.7rem] font-bold tracking-[.08em] text-white uppercase">Admin</span>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/admin" className="rounded-full bg-[var(--rv-mist)] px-3.5 py-1.5 font-semibold text-foreground">Übersicht</Link>
            <Link href="/admin/warteliste" className="rounded-full px-3.5 py-1.5 font-medium text-muted-foreground hover:text-foreground">Warteliste</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
            <AdminSignOut />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 pt-8 pb-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[1.9rem] leading-tight font-bold tracking-tight text-foreground">Übersicht</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Stand {db ? new Date(db.generatedAt).toLocaleString("de-AT", { dateStyle: "medium", timeStyle: "short" }) : "unbekannt"}
              {db?.users.excluded ? ` · ${db.users.excluded} interne Konten ausgeblendet` : ""}
            </p>
          </div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--app-line)] bg-white px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <RefreshCcw className="h-4 w-4" />
            Aktualisieren
          </Link>
        </div>

        {/* ── Umsatz ─────────────────────────────────────────────────────── */}
        <SectionTitle
          aside={
            s?.mode === "test" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(245,158,11,.14)] px-3 py-1 text-xs font-semibold text-[#B45309]">
                <AlertTriangle className="h-3.5 w-3.5" />
                Stripe-Testdaten
              </span>
            ) : s ? (
              <span className="text-xs text-muted-foreground">aus Stripe, netto ohne USt.</span>
            ) : null
          }
        >
          Umsatz
        </SectionTitle>
        {!stripe && <p className="text-sm text-muted-foreground">Stripe ist nicht eingerichtet (STRIPE_SECRET_KEY fehlt).</p>}
        {stripe && "error" in stripe && (
          <p className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">Stripe nicht erreichbar: {stripe.error}</p>
        )}
        {s && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="MRR" value={eur(s.mrr)} icon={CircleDollarSign} context={`ARR ${eur(s.arr)} · pro Kunde ${eur(s.arpa)}`} />
              <Stat label="Umsatz diesen Monat" value={eur(s.revenueThisMonth)} icon={Wallet} context={`Letzte 30 Tage ${eur(s.revenue30)}`} />
              <Stat label="Zahlende Kunden" value={num(s.payingCustomers)} icon={Users} context={`${num(s.trialing)} in der Testphase`} tone="cyan" />
              <Stat
                label="Churn (30 Tage)"
                value={pct(s.churnRate30)}
                icon={TrendingDown}
                context={`${num(s.churnedCustomers30)} ${s.churnedCustomers30 === 1 ? "Kunde" : "Kunden"}, ${eur(s.churnedMrr30)} MRR verloren`}
                warn={(s.churnRate30 ?? 0) > 0.05}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Panel title="Umsatz je Monat" note="netto, bezahlte Rechnungen">
                <AdminBarChart data={s.revenueByMonth} xKey="month" yKey="amount" unit="eur-cents" />
              </Panel>
              <Panel title="Bewegung (30 Tage)">
                <dl className="space-y-3 text-sm">
                  {[
                    ["Neuer MRR", eur(s.newMrr30)],
                    ["Verlorener MRR", eur(s.churnedMrr30)],
                    ["Kündigung vorgemerkt", num(s.cancelScheduled)],
                    ["Zahlung offen", num(s.pastDue)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 border-b border-[var(--app-line)] pb-2.5 last:border-0">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-semibold text-foreground tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                {s.pastDue > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {num(s.pastDue)} Abo mit offener Zahlung, im Stripe-Dashboard prüfen.
                  </p>
                )}
              </Panel>
            </div>
          </>
        )}

        {!db && <p className="mt-10 text-sm text-destructive">Zahlen aus der Datenbank nicht verfügbar. Entweder fehlt SUPABASE_SERVICE_ROLE_KEY, oder die Abfrage hat die Zeitgrenze überschritten (Vercel-Log, Einträge mit [admin]).</p>}
        {db && (
          <>
            {/* ── Wachstum ─────────────────────────────────────────────── */}
            <SectionTitle>Wachstum</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Nutzer" value={num(db.users.total)} icon={Users} context={`+${num(db.users.new7)} in 7 Tagen · +${num(db.users.new30)} in 30 Tagen`} />
              <Stat
                label="Konten"
                value={num(db.accounts.total)}
                icon={UserPlus}
                context={`${num(db.accounts.paying)} zahlend · ${pct(db.accounts.conversion)} Umwandlung`}
                tone="cyan"
              />
              <Stat
                label="Warteliste"
                value={num(db.waitlist?.confirmed)}
                icon={ListChecks}
                context={db.waitlist ? `+${num(db.waitlist.confirmedLast7)} in 7 Tagen · ${num(db.waitlist.pending)} unbestätigt` : "Migration 037 fehlt"}
              />
              <Stat label="Aktive Nutzer" value={num(db.active.d7)} icon={Gauge} context={`7 Tage · ${num(db.active.d30)} in 30 Tagen`} tone="cyan" />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Panel title="Registrierungen je Woche" note="letzte 12 Wochen">
                <AdminBarChart data={db.signupsPerWeek} xKey="week" yKey="count" unit="count" />
              </Panel>
              <Panel title="Konten nach Tarif">
                <Bars items={db.accounts.byPlan.map((p) => ({ label: PLAN_LABEL[p.plan] ?? p.plan, count: p.count }))} />
                <p className="mt-4 text-xs text-muted-foreground">{num(db.users.teamMembers)} Teammitglieder zusätzlich</p>
              </Panel>
            </div>

            {/* ── Nutzung ──────────────────────────────────────────────── */}
            <SectionTitle>Nutzung</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Aktive Stellen" value={num(db.usage.activeJobs)} icon={Briefcase} />
              <Stat label="Bewerbungen (30 Tage)" value={num(db.usage.candidates30)} icon={FileText} tone="cyan" />
              <Stat label="Matches diesen Monat" value={num(db.usage.matchesThisMonth)} icon={Gauge} />
              <Stat label="Kalender verbunden" value={num(db.usage.calendars)} icon={CalendarCheck} context={`${num(db.usage.bookings30)} Termine in 30 Tagen`} tone="cyan" />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Panel title="Bewerbungen nach Kanal" note="30 Tage">
                <Bars items={db.usage.bySource.map((x) => ({ label: x.source, count: x.count }))} />
              </Panel>
              <Panel title="Mail-Eingang" note="30 Tage">
                <Bars items={db.ops.inbound30.map((x) => ({ label: x.status, count: x.count }))} empty="Keine Bewerbungen per Mail" />
              </Panel>
            </div>

            {/* ── Betrieb ──────────────────────────────────────────────── */}
            <SectionTitle>Betrieb</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Fehler (7 Tage)" value={num(db.ops.errors7)} icon={AlertTriangle} warn={(db.ops.errors7 ?? 0) > 0} />
              <Stat
                label="Matching-Fehlerquote"
                value={pct(db.ops.matchingErrorRate30)}
                icon={Gauge}
                context={`${num(db.ops.matchingErrors30)} Fehler in 30 Tagen`}
                warn={(db.ops.matchingErrorRate30 ?? 0) > 0.05}
              />
              <Stat label="Ergebnis-Cache" value={num(db.ops.cacheEntries)} icon={Database} context={`${num(db.ops.cacheHits)} Treffer ohne KI-Aufruf`} tone="cyan" />
              <Stat label="Bewerbungen per Mail" value={num(db.ops.inbound30.reduce((a, b) => a + b.count, 0))} icon={Inbox} context="30 Tage" />
            </div>
            {db.ops.topErrors.length > 0 && (
              <Panel title="Häufigste Fehler" note="7 Tage" className="mt-4">
                <ul className="space-y-2 text-sm">
                  {db.ops.topErrors.map((e) => (
                    <li key={e.message} className="flex items-start justify-between gap-4">
                      <span className="text-xs break-all text-muted-foreground">{e.message}</span>
                      <span className="font-semibold text-foreground tabular-nums">{num(e.count)}×</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {/* ── Kunden ───────────────────────────────────────────────── */}
            <SectionTitle aside={<span className="text-xs text-muted-foreground">{num(db.customers.length)} Konten, neueste zuerst</span>}>
              Kunden
            </SectionTitle>
            <div className="overflow-x-auto rounded-[20px] border border-[var(--app-line)] bg-card shadow-[var(--app-shadow-card)]">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-[var(--app-line)] text-xs text-muted-foreground">
                  <tr>
                    {["Konto", "Tarif", "Registriert", "Letzte Aktivität", "Matches (Monat)", "Stellen", "Bewerbungen", "Team"].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {db.customers.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-6 text-muted-foreground">Noch keine Kunden.</td></tr>
                  )}
                  {db.customers.slice(0, 300).map((c) => {
                    const risk = riskOf(c, now)
                    return (
                      <tr key={c.id} className="border-b border-[var(--app-line)] last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{c.company || c.email}</p>
                          {c.company && <p className="text-xs text-muted-foreground">{c.email}</p>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            c.plan === "free" ? "bg-[rgba(12,26,22,.06)] text-muted-foreground" : "bg-[var(--app-green-wash)] text-[var(--rv-green-deep)]",
                          )}>
                            {PLAN_LABEL[c.plan] ?? c.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">{date(c.registeredAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                          <span className="text-muted-foreground">{date(c.lastActivityAt)}</span>
                          {risk && (
                            <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#B45309]">
                              <AlertTriangle className="h-3 w-3" />
                              {risk}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-foreground tabular-nums">{num(c.matchesThisMonth)}</td>
                        <td className="px-4 py-3 text-foreground tabular-nums">{num(c.activeJobs)}</td>
                        <td className="px-4 py-3 text-foreground tabular-nums">{num(c.candidates)}</td>
                        <td className="px-4 py-3 text-foreground tabular-nums">{num(c.teamMembers)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
