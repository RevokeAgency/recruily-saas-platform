"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, Plus, Loader2, Users, ChevronDown, ChevronUp, Zap } from "lucide-react"
import { toast } from "sonner"
import { useProfile } from "@/lib/hooks/useProfile"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Suggestion {
  id: string
  full_name: string
  job_title: string | null
  photo_url: string | null
  years_of_experience: number | null
  location: string | null
  score: number
  matchedSkills: string[]
  missingSkills: string[]
}

interface PoolResponse {
  suggestions: Suggestion[]
  strongCount: number
  matchCount: number
  poolSize: number
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function scoreTone(score: number) {
  if (score >= 80) return "bg-[var(--app-green-wash)] text-[var(--rv-green-deep)]"
  if (score >= 65) return "bg-amber-50 text-amber-600"
  return "bg-[var(--muted)] text-muted-foreground"
}

/**
 * Talent-pool rediscovery panel: surfaces existing candidates that likely fit
 * this job (heuristic pre-selection, no quota) and lets the recruiter add +
 * score them in one click. Renders nothing when there's nothing to suggest.
 */
export function PoolSuggestions({
  jobId,
  onAdded,
}: {
  jobId: string
  onAdded?: () => void
}) {
  const router = useRouter()
  const { profile } = useProfile()
  const [expanded, setExpanded] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [bulkAdding, setBulkAdding] = useState(false)
  const { data, isLoading, mutate } = useSWR<PoolResponse>(
    `/api/jobs/${jobId}/pool-suggestions`,
    fetcher,
  )

  if (isLoading || !data || !data.suggestions?.length) return null

  const { suggestions, strongCount, matchCount } = data
  const shown = expanded ? suggestions : suggestions.slice(0, 3)

  // Bulk action targets the strong (≥80) suggestions in the returned list.
  const strongOnes = suggestions.filter((s) => s.score >= 80)
  const remaining = Math.max(0, (profile?.matches_limit ?? 0) - (profile?.matches_used ?? 0))

  const headline =
    strongCount > 0
      ? `${strongCount} ${strongCount === 1 ? "starker Treffer" : "starke Treffer"} aus deinem Talent-Pool`
      : `${matchCount} ${matchCount === 1 ? "möglicher Kandidat" : "mögliche Kandidaten"} aus deinem Talent-Pool`

  const addCandidate = async (s: Suggestion) => {
    setAddingId(s.id)
    try {
      const res = await fetch(`/api/candidates/${s.id}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      })
      const result = await res.json().catch(() => ({}))
      if (res.status === 403 && result.error === "match_limit_reached") {
        toast.error("Match-Limit erreicht. Bitte upgrade deinen Plan.")
        router.push("/subscription")
        return
      }
      if (!res.ok) {
        toast.error(result.error || "Konnte nicht hinzugefügt werden")
        return
      }
      toast.success(`${s.full_name} hinzugefügt — wird jetzt bewertet`)
      mutate() // drop from suggestions (now linked)
      onAdded?.() // refresh the candidate list
    } catch {
      toast.error("Konnte nicht hinzugefügt werden")
    } finally {
      setAddingId(null)
    }
  }

  // Add + score every strong match in one go. Sequential so quota is spent
  // predictably; stops as soon as the plan's match limit is hit.
  const addTopMatches = async () => {
    if (strongOnes.length === 0 || bulkAdding) return
    const ok = window.confirm(
      `${strongOnes.length} Top-Kandidaten hinzufügen und per IMLRS bewerten?\n\n` +
        `Das verbraucht bis zu ${strongOnes.length} Matches ` +
        `(aktuell ${remaining} verfügbar).`,
    )
    if (!ok) return

    setBulkAdding(true)
    let added = 0
    try {
      for (const s of strongOnes) {
        const res = await fetch(`/api/candidates/${s.id}/match`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        })
        if (res.status === 403) {
          toast.error("Match-Limit erreicht — die restlichen wurden nicht hinzugefügt.")
          router.push("/subscription")
          break
        }
        if (res.ok) added++
      }
    } finally {
      setBulkAdding(false)
      if (added > 0) {
        toast.success(`${added} ${added === 1 ? "Kandidat" : "Kandidaten"} hinzugefügt — werden bewertet`)
        mutate()
        onAdded?.()
      }
    }
  }

  return (
    <Card className="border border-[rgba(34,193,238,.25)] bg-[rgba(34,193,238,.04)]">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[rgba(34,193,238,.14)]">
            <Users className="h-[18px] w-[18px] text-[var(--rv-cyan-deep)]" strokeWidth={2} />
          </span>
          <div className="flex-1">
            <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-[var(--rv-cyan-deep)]" />
              {headline}
            </h3>
            <p className="text-sm text-muted-foreground">
              Kandidaten aus deiner Datenbank, die zu dieser Stelle passen könnten — ohne neue
              Akquise. Beim Hinzufügen wird die volle IMLRS-Analyse berechnet.
            </p>
          </div>
        </div>

        {strongOnes.length >= 2 && (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-black/[0.05] bg-white px-4 py-2.5">
            <Button
              size="sm"
              className="rounded-full"
              onClick={addTopMatches}
              disabled={bulkAdding}
            >
              {bulkAdding
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <Zap className="mr-1.5 h-4 w-4" />}
              Top {strongOnes.length} hinzufügen
            </Button>
            <span className="text-xs text-muted-foreground">
              verbraucht bis zu {strongOnes.length} Matches · {remaining} verfügbar
            </span>
          </div>
        )}

        <ul className="space-y-2">
          {shown.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-white p-3"
            >
              <Avatar className="h-10 w-10 flex-none">
                {s.photo_url && <AvatarImage src={s.photo_url} alt={s.full_name} className="object-cover" />}
                <AvatarFallback className="text-xs font-semibold text-[#0C1A16]" style={{ backgroundImage: "var(--rv-gradient)" }}>
                  {initials(s.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-foreground">{s.full_name}</p>
                  <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${scoreTone(s.score)}`}>
                    ≈{s.score}%
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[s.job_title, s.location, s.years_of_experience != null ? `${s.years_of_experience} J.` : null]
                    .filter(Boolean)
                    .join(" · ") || "Kandidat aus dem Pool"}
                </p>
                {s.matchedSkills.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {s.matchedSkills.slice(0, 4).map((sk) => (
                      <span key={sk} className="rounded-full bg-[var(--app-green-wash)] px-2 py-0.5 text-[11px] font-medium text-[var(--rv-green-deep)]">
                        {sk}
                      </span>
                    ))}
                    {s.matchedSkills.length > 4 && (
                      <span className="rounded-full px-1 py-0.5 text-[11px] text-muted-foreground">
                        +{s.matchedSkills.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Button
                size="sm"
                className="flex-none rounded-full"
                onClick={() => addCandidate(s)}
                disabled={addingId === s.id}
              >
                {addingId === s.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><Plus className="mr-1.5 h-4 w-4" /> Hinzufügen</>}
              </Button>
            </li>
          ))}
        </ul>

        {suggestions.length > 3 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--rv-cyan-deep)] hover:underline"
          >
            {expanded ? (
              <>Weniger anzeigen <ChevronUp className="h-4 w-4" /></>
            ) : (
              <>Alle {suggestions.length} Vorschläge anzeigen <ChevronDown className="h-4 w-4" /></>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  )
}
