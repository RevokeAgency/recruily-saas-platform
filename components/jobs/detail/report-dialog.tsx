"use client"

import { useMemo, useState } from "react"
import { EyeOff, FileDown, Loader2, ShieldAlert, UserRound } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { REPORT_MAX_CANDIDATES, REPORT_SECTIONS, profileCode, type ReportSection } from "@/lib/report/model"

export interface ReportCandidateOption {
  linkId: string
  full_name: string
  job_title: string | null
  match_score: number | null
  knockout: boolean
  status: string
}

const ALL_SECTIONS = Object.fromEntries(REPORT_SECTIONS.map((s) => [s.key, true])) as Record<ReportSection, boolean>

/**
 * Revetly Report erstellen: Kandidaten wählen (bei einem einzelnen entfällt
 * die Liste), anonym oder mit Namen, Inhalte an- und abwählen. Das PDF wird
 * direkt heruntergeladen.
 */
export function ReportDialog({
  open,
  onOpenChange,
  jobId,
  candidates,
  preselected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  candidates: ReportCandidateOption[]
  /** Vorauswahl, etwa der gerade geöffnete Kandidat. Sonst die drei stärksten. */
  preselected?: string[]
}) {
  const options = useMemo(
    () => [...candidates].filter((c) => c.status !== "Abgesagt" || preselected?.includes(c.linkId))
      .sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1)),
    [candidates, preselected],
  )
  const single = options.length === 1

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [anonymous, setAnonymous] = useState(true)
  const [sections, setSections] = useState<Record<ReportSection, boolean>>(ALL_SECTIONS)
  const [busy, setBusy] = useState(false)

  // Beim Öffnen die Vorauswahl setzen. Während des Renderns statt im Effekt.
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setSelected(new Set(
        preselected?.length
          ? preselected
          : options.filter((c) => c.match_score != null && !c.knockout).slice(0, 3).map((c) => c.linkId),
      ))
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < REPORT_MAX_CANDIDATES) next.add(id)
      else toast.error(`Höchstens ${REPORT_MAX_CANDIDATES} Kandidaten pro Report.`)
      return next
    })
  }

  const create = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          jobCandidateIds: options.filter((c) => selected.has(c.linkId)).map((c) => c.linkId),
          anonymous,
          sections,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "PDF konnte nicht erstellt werden")
        return
      }
      const blob = await res.blob()
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "Revetly-Report.pdf"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      toast.success("Report erstellt", { description: name })
      onOpenChange(false)
    } catch {
      toast.error("PDF konnte nicht erstellt werden")
    } finally {
      setBusy(false)
    }
  }

  const count = selected.size

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Revetly Report</DialogTitle>
          <DialogDescription>
            Ein PDF zum Weiterleiten oder Ausdrucken, mit deinem Logo. Bei mehreren Kandidaten mit Deckblatt und
            Ranking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {!single && (
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-medium text-foreground">Kandidaten</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {count} von höchstens {REPORT_MAX_CANDIDATES}
                </span>
              </div>
              <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-black/[0.06] p-1.5">
                {options.map((c) => (
                  <li key={c.linkId}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[var(--muted)]/60">
                      <Checkbox checked={selected.has(c.linkId)} onCheckedChange={() => toggle(c.linkId)} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                          {c.full_name}
                          {c.knockout && <ShieldAlert className="h-3.5 w-3.5 flex-none text-red-500" aria-label="K.O.-Kriterium" />}
                        </span>
                        {c.job_title && <span className="block truncate text-xs text-muted-foreground">{c.job_title}</span>}
                      </span>
                      <span className="flex-none text-sm font-semibold tabular-nums text-foreground">
                        {c.match_score ?? "–"}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <span className="text-sm font-medium text-foreground">Variante</span>
            <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Variante">
              {([
                { value: true, icon: EyeOff, title: "Anonym", hint: "Ohne Name, Kontaktdaten und Foto" },
                { value: false, icon: UserRound, title: "Mit Namen", hint: "Mit Name, Kontaktdaten und Foto" },
              ] as const).map((o) => {
                const active = anonymous === o.value
                const Icon = o.icon
                return (
                  <button
                    key={o.title}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAnonymous(o.value)}
                    className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      active ? "border-[var(--rv-green)] bg-[var(--app-green-wash)]" : "border-black/[0.08] hover:bg-[var(--muted)]/60"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon className={`h-4 w-4 ${active ? "text-[var(--rv-green-deep)]" : "text-muted-foreground"}`} />
                      {o.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{o.hint}</span>
                  </button>
                )
              })}
            </div>
            {anonymous && count > 0 && (
              <div className="mt-3 rounded-xl bg-[var(--muted)]/60 px-3 py-2.5">
                <p className="text-xs font-medium text-foreground">So heißen sie im Report</p>
                <ul className="mt-1.5 space-y-1">
                  {options.filter((c) => selected.has(c.linkId)).map((c) => (
                    <li key={c.linkId} className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate text-muted-foreground">{c.full_name}</span>
                      <span className="flex-none font-mono font-medium text-foreground">{profileCode(c.linkId)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Die Nummer bleibt immer gleich. Du findest sie beim Kandidaten und über die Suche.
                </p>
              </div>
            )}
            {anonymous && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Der Name wird auch in den Texten durch eine Profilnummer ersetzt, der Wohnort auf die Stadt gekürzt.
                Frühere Arbeitgeber bleiben stehen, weil sie für die Einschätzung wichtig sind. In kleinen Branchen
                können sie Rückschlüsse auf die Person erlauben.
              </p>
            )}
          </div>

          <div>
            <span className="text-sm font-medium text-foreground">Inhalt</span>
            <div className="mt-2 space-y-1">
              {REPORT_SECTIONS.map((s) => (
                <label key={s.key} className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1.5">
                  <Checkbox
                    checked={sections[s.key]}
                    onCheckedChange={(v) => setSections((prev) => ({ ...prev, [s.key]: v === true }))}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm text-foreground">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={create}
            disabled={busy || count === 0 || !Object.values(sections).some(Boolean)}
            className="w-full rounded-full"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            {count > 1 ? `Shortlist mit ${count} Kandidaten erstellen` : "PDF erstellen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
