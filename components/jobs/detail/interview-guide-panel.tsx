"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ClipboardList, Sparkles, Loader2, CheckCircle2, RefreshCw, HelpCircle, Eye } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Question {
  competency: string
  question: string
  rationale: string
  lookFor: string
  weakAnchor: string
  strongAnchor: string
}
interface Guide {
  focusSummary: string
  questions: Question[]
}
interface SavedRating {
  competency?: string
  question?: string
  rating?: number
  notes?: string
}
interface InterviewResponse {
  guide: Guide | null
  ratings: SavedRating[] | null
  score: number | null
  notes: string | null
  completedAt: string | null
  needsMigration?: boolean
}

interface RatingEntry {
  rating: number | null
  notes: string
}

function scoreTone(score: number) {
  if (score >= 80) return "text-[var(--rv-green-deep)]"
  if (score >= 60) return "text-amber-500"
  return "text-red-500"
}

export function InterviewGuidePanel({ linkId }: { linkId: string }) {
  const { data, isLoading, mutate } = useSWR<InterviewResponse>(
    `/api/job-candidates/${linkId}/interview`,
    fetcher,
  )
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ratings, setRatings] = useState<RatingEntry[]>([])
  const [overallNotes, setOverallNotes] = useState("")

  const guide = data?.guide ?? null

  // Seed local rating state from the guide + any saved ratings.
  useEffect(() => {
    if (!guide) return
    setRatings(
      guide.questions.map((q, i) => {
        const saved = data?.ratings?.[i]
        const matches = saved && (saved.question === q.question || saved.competency === q.competency)
        return { rating: matches && typeof saved?.rating === "number" ? saved.rating : null, notes: matches ? saved?.notes ?? "" : "" }
      }),
    )
    setOverallNotes(data?.notes ?? "")
  }, [guide, data?.ratings, data?.notes])

  const rated = ratings.map((r) => r.rating).filter((n): n is number => typeof n === "number")
  const liveScore = rated.length ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 20) : null

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/job-candidates/${linkId}/interview`, { method: "POST" })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Leitfaden konnte nicht erstellt werden")
        return
      }
      toast.success("Interviewleitfaden erstellt")
      mutate()
    } catch {
      toast.error("Leitfaden konnte nicht erstellt werden")
    } finally {
      setGenerating(false)
    }
  }

  const save = async () => {
    if (!guide) return
    setSaving(true)
    try {
      const payload = {
        ratings: guide.questions.map((q, i) => ({
          competency: q.competency,
          question: q.question,
          rating: ratings[i]?.rating ?? null,
          notes: ratings[i]?.notes ?? "",
        })),
        notes: overallNotes,
      }
      const res = await fetch(`/api/job-candidates/${linkId}/interview`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) {
        toast.error(result.error || "Speichern fehlgeschlagen")
        return
      }
      toast.success("Interview-Bewertung gespeichert ✓")
      mutate()
    } catch {
      toast.error("Speichern fehlgeschlagen")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return null

  if (data?.needsMigration) {
    return (
      <Card className="border-dashed border-border">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Strukturierte Interviews sind fast bereit — die Datenbank-Migration
          <code className="mx-1 rounded bg-[var(--muted)] px-1 py-0.5 text-xs">020_interview_guide.sql</code>
          muss noch ausgeführt werden.
        </CardContent>
      </Card>
    )
  }

  // No guide yet → CTA to generate.
  if (!guide) {
    return (
      <Card className="border-[rgba(34,193,238,.25)] bg-[rgba(34,193,238,.04)]">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[rgba(34,193,238,.14)]">
              <ClipboardList className="h-[18px] w-[18px] text-[var(--rv-cyan-deep)]" strokeWidth={2} />
            </span>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Strukturiertes Interview</h4>
              <p className="mt-0.5 text-sm text-muted-foreground">
                REVETLY erstellt aus den unsicheren Score-Bereichen einen Leitfaden mit festen
                Fragen und Bewertungsskala — strukturierte Interviews sagen Berufserfolg deutlich
                besser vorher als freie Gespräche.
              </p>
              <Button size="sm" className="mt-3 rounded-full" onClick={generate} disabled={generating}>
                {generating
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Leitfaden wird erstellt…</>
                  : <><Sparkles className="mr-2 h-4 w-4" /> Interviewleitfaden erstellen</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-[rgba(34,193,238,.25)]">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[var(--rv-cyan-deep)]" />
            <h4 className="font-semibold text-foreground">Strukturiertes Interview</h4>
          </div>
          <div className="flex items-center gap-3">
            {(liveScore ?? data?.score) != null && (
              <div className="text-right">
                <span className={`text-xl font-bold tabular-nums ${scoreTone((liveScore ?? data?.score)!)}`}>
                  {liveScore ?? data?.score}
                </span>
                <span className="ml-0.5 text-xs text-muted-foreground">Interview</span>
              </div>
            )}
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              title="Leitfaden neu generieren"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {data?.completedAt && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--rv-green-deep)]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Bewertet am {new Date(data.completedAt).toLocaleDateString("de-DE")}
          </div>
        )}

        <p className="rounded-xl bg-[var(--muted)]/60 p-3 text-sm text-muted-foreground">
          {guide.focusSummary}
        </p>

        <ol className="space-y-4">
          {guide.questions.map((q, i) => (
            <li key={i} className="rounded-2xl border border-black/[0.06] p-4">
              <div className="mb-1.5 flex items-center gap-2">
                <Badge variant="outline" className="border-[rgba(34,193,238,.35)] text-xs text-[var(--rv-cyan-deep)]">
                  {q.competency}
                </Badge>
              </div>
              <p className="font-medium text-foreground">{i + 1}. {q.question}</p>

              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-start gap-1.5">
                  <HelpCircle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-500" />
                  <span><span className="font-medium text-foreground/80">Warum:</span> {q.rationale}</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <Eye className="mt-0.5 h-3.5 w-3.5 flex-none text-[var(--rv-green-deep)]" />
                  <span><span className="font-medium text-foreground/80">Worauf achten:</span> {q.lookFor}</span>
                </p>
              </div>

              {/* Anchored 1–5 rating scale */}
              <div className="mt-3">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = ratings[i]?.rating === n
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setRatings((prev) => {
                            const next = [...prev]
                            next[i] = { ...next[i], rating: active ? null : n }
                            return next
                          })
                        }
                        className={`h-8 w-8 rounded-full text-sm font-semibold transition-colors ${
                          active
                            ? "bg-[var(--rv-ink)] text-white"
                            : "border border-black/[0.08] text-muted-foreground hover:border-foreground/30"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  })}
                  <span className="ml-2 text-[11px] text-muted-foreground">1 = schwach · 5 = stark</span>
                </div>
                <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                  <p><span className="font-medium text-red-500">1–2:</span> {q.weakAnchor}</p>
                  <p><span className="font-medium text-[var(--rv-green-deep)]">4–5:</span> {q.strongAnchor}</p>
                </div>
              </div>

              <Textarea
                value={ratings[i]?.notes ?? ""}
                onChange={(e) =>
                  setRatings((prev) => {
                    const next = [...prev]
                    next[i] = { ...next[i], notes: e.target.value }
                    return next
                  })
                }
                placeholder="Notiz zur Antwort (optional)"
                rows={2}
                className="mt-3 text-sm"
              />
            </li>
          ))}
        </ol>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Gesamteindruck / Empfehlung</label>
          <Textarea
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            placeholder="z. B. Starke fachliche Antworten, Lücke 2023 plausibel erklärt — Empfehlung: weiter in Runde 2."
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {rated.length}/{guide.questions.length} Fragen bewertet
          </p>
          <Button onClick={save} disabled={saving} className="rounded-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Interview speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
