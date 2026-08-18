"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useProfile } from "@/lib/hooks/useProfile"
import { hasFullScore } from "@/lib/quota"
import { RejectionModal } from "@/components/ui/rejection-modal"
import { CalendarConnectButtons } from "@/components/scheduling/calendar-connect"
import { InterviewGuidePanel } from "./interview-guide-panel"
import {
  Mail,
  MapPin,
  Briefcase,
  CheckCircle2,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target,
  GraduationCap,
  Globe,
  Building,
  Wallet,
  Heart,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

// Reasoning trail written by IMLRS 2.0 (migration 021) — optional on older rows.
export interface MatchDetail {
  engine: string
  /** Absent when scoring failed — see `error` below. */
  categories?: Record<string, {
    begruendung: string
    belege: string[]
    konfidenz: "hoch" | "mittel" | "niedrig"
    rohScore: number
    verifier?: { urteil: string; begruendung: string }
    capped?: boolean
  }>
  /** Gesetzt, wenn eine formale Zulassungsvoraussetzung fehlt (Migration nicht nötig). */
  zulassungsSperre?: {
    cap: number | null
    gewichteterScore: number
    fehlend: { anforderung: string; grund: string }[]
    teilweise: { anforderung: string; grund: string }[]
  } | null
  verifierNote?: string
  dossierSummary?: string
  modelUsed?: string
  /** Set instead of categories when scoring failed — the reason, for diagnosis. */
  error?: string
  failedAt?: string
}

interface Candidate {
  id: string
  linkId: string
  full_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  years_of_experience: number
  experience_level: string
  skills: string[]
  education: string | null
  summary_ai: string | null
  photo_url?: string | null
  location: string | null
  status: string
  match_score: number | null
  hard_skills_score: number | null
  experience_score: number | null
  education_score: number | null
  soft_skills_score: number | null
  languages_score: number | null
  location_score: number | null
  industry_score: number | null
  salary_score: number | null
  culture_score: number | null
  career_prognosis: string | null
  ai_summary: string | null
  knockout?: boolean
  knockout_reasons?: string[]
  match_detail?: MatchDetail | null
  match_engine?: string | null
  notes: string | null
  added_at: string
}

interface Job {
  id: string
  title: string
  company: string
  location?: string
  employment_type?: string
  required_skills?: string[]
  nice_to_have_skills?: string[]
  years_experience?: string
  education?: string
  description?: string
}

interface CandidateMatchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: Candidate | null
  job: Job
  onInviteToInterview?: (candidateId: string) => void
}

// Category config (detailKey = key inside match_detail.categories, IMLRS 2.0)
const categories = [
  { key: "hard_skills_score", detailKey: "hardSkills", label: "Hard Skills", weight: 25, icon: Target },
  { key: "experience_score", detailKey: "experience", label: "Berufserfahrung", weight: 20, icon: Briefcase },
  { key: "education_score", detailKey: "education", label: "Ausbildung", weight: 10, icon: GraduationCap },
  { key: "soft_skills_score", detailKey: "softSkills", label: "Soft Skills", weight: 10, icon: MessageSquare },
  { key: "languages_score", detailKey: "languages", label: "Sprachen", weight: 5, icon: Globe },
  { key: "location_score", detailKey: "location", label: "Standort", weight: 5, icon: MapPin },
  { key: "industry_score", detailKey: "industry", label: "Branche", weight: 10, icon: Building },
  { key: "salary_score", detailKey: "salary", label: "Gehalt", weight: 5, icon: Wallet },
  { key: "culture_score", detailKey: "culture", label: "Kultur", weight: 10, icon: Heart },
]

// Zwei verschiedene Aussagen, zwei getrennte Darstellungen.
//
// Vorher trugen beide dieselbe Ampel: Der Balken zeigte den Score, der Punkt
// daneben die Konfidenz. Bei „Hard Skills 20, Konfidenz hoch" stand dann ein
// grüner Punkt neben einem roten Balken, weil das Modell sich sehr sicher war,
// dass der Kandidat hier nicht passt. Inhaltlich richtig, als Bild aber
// gelesen als Widerspruch.
//
// Jetzt gilt: Farbe heißt immer Score. Die Konfidenz steht als Wort daneben,
// bewusst ohne Ampelfarbe, damit sie sich nicht mehr dazwischenfunkt.
const konfidenzLabel: Record<string, string> = {
  hoch: "Konfidenz hoch",
  mittel: "Konfidenz mittel",
  niedrig: "Konfidenz niedrig, im Interview klären",
}

/** Kurzform für die enge Zeile in der Übersicht. */
const konfidenzKurz: Record<string, string> = {
  hoch: "sicher",
  mittel: "eher sicher",
  niedrig: "unsicher",
}

// Get score color based on value
function getScoreColor(score: number): string {
  if (score >= 80) return "text-[var(--rv-green-deep)]"
  if (score >= 60) return "text-amber-500"
  return "text-red-500"
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-[var(--rv-green)]"
  if (score >= 60) return "bg-amber-500"
  return "bg-red-500"
}

function getScoreStrokeColor(score: number): string {
  if (score >= 80) return "#16C77C"
  if (score >= 60) return "#f59e0b"
  return "#ef4444"
}

// Circular progress component for overall score
function CircularProgress({ value, size = 160 }: { value: number; size?: number }) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getScoreStrokeColor(value)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${getScoreColor(value)}`}>
          {value}%
        </span>
        <span className="text-sm text-muted-foreground">Revetly Match Analyse</span>
      </div>
    </div>
  )
}

// Career Prognosis Badge
function CareerPrognosisBadge({ prognosis }: { prognosis: string }) {
  const config = {
    ascending: {
      icon: TrendingUp,
      label: "Aufsteigend",
      description: "Kandidat zeigt starkes Wachstumspotenzial",
      className: "bg-[var(--app-green-wash)] text-[var(--rv-green-deep)] border-[rgba(22,199,124,.35)]",
    },
    stable: {
      icon: Minus,
      label: "Stabil",
      description: "Kandidat zeigt konsistente Entwicklung",
      className: "bg-[rgba(34,193,238,.10)] text-[var(--rv-cyan-deep)] border-[rgba(34,193,238,.35)]",
    },
    risk: {
      icon: TrendingDown,
      label: "Risiko",
      description: "Kandidat könnte Herausforderungen haben",
      className: "bg-red-50 text-red-700 border-red-200",
    },
  }

  const { icon: Icon, label, description, className } = config[prognosis as keyof typeof config] || config.stable

  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="font-semibold text-sm">Karriereprognose: {label}</span>
      </div>
      <p className="text-xs opacity-80">{description}</p>
    </div>
  )
}

// IMLRS Category Bar Component
function CategoryBar({
  label,
  score,
  weight,
  icon: Icon,
  konfidenz,
}: {
  label: string
  score: number
  weight: number
  icon: React.ElementType
  konfidenz?: "hoch" | "mittel" | "niedrig"
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1.5 text-xs font-medium text-foreground/85">
            {/* Punkt und Balken zeigen dasselbe: den Score. */}
            <span
              title={`${score} von 100`}
              className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${getScoreBgColor(score)}`}
            />
            {label}
            {/* Nur die unsichere Bewertung wird markiert. Sie ist die einzige,
                aus der etwas folgt, nämlich im Interview nachzufragen. */}
            {konfidenz === "niedrig" && (
              <span
                title={konfidenzLabel[konfidenz]}
                className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground"
              >
                {konfidenzKurz[konfidenz]}
              </span>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground/70 bg-[var(--muted)] px-1.5 py-0.5 rounded">
            {weight}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${getScoreBgColor(score)}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className={`text-xs font-bold w-8 text-right ${getScoreColor(score)}`}>
            {score}
          </span>
        </div>
      </div>
    </div>
  )
}

export function CandidateMatchModal({
  open,
  onOpenChange,
  candidate,
  job,
  onInviteToInterview,
}: CandidateMatchModalProps) {

  const [inviteOpen, setInviteOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [rejectionOpen, setRejectionOpen] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [inviteDate, setInviteDate] = useState("")
  const [inviteTime, setInviteTime] = useState("")
  const [inviteFormat, setInviteFormat] = useState("remote")
  const [inviteNote, setInviteNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  // "link"  = Bewerber wählt selbst aus den freien Zeiten (Standard)
  // "fixed" = fester Termin wie bisher, für den Fall, dass er schon steht
  const [inviteMode, setInviteMode] = useState<"link" | "fixed">("link")
  const [meetingTypes, setMeetingTypes] = useState<{ id: string; name: string; durationMinutes: number; isDefault: boolean; active: boolean }[]>([])
  const [meetingTypeId, setMeetingTypeId] = useState<string>("")
  const [schedulingReady, setSchedulingReady] = useState(true)
  // Warum die Selbstbuchung nicht bereitsteht. Wird im Dialog angezeigt, statt
  // die Umschaltung wortlos verschwinden zu lassen.
  const [schedulingReason, setSchedulingReason] = useState<string | null>(null)
  // Kalender-Zustand für den Verbinden-Schritt direkt im Dialog.
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)
  const [calendarSetup, setCalendarSetup] = useState({ google: false, microsoft: false, encryptionReady: false })
  const [connectDismissed, setConnectDismissed] = useState(false)
  const [invited, setInvited] = useState(false)
  const [hired, setHired] = useState(false)
  const [markingHired, setMarkingHired] = useState(false)

  // Records the hire outcome. hired_at is written separately so a pending
  // migration 022 can never block the status update itself.
  const markHired = async () => {
    if (!candidate) return
    setMarkingHired(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("job_candidates")
        .update({ status: "Eingestellt" })
        .eq("id", candidate.linkId)
      if (error) {
        toast.error("Status konnte nicht gespeichert werden")
        return
      }
      await supabase
        .from("job_candidates")
        .update({ hired_at: new Date().toISOString() })
        .eq("id", candidate.linkId)
        .then(({ error: e }) => { if (e) console.error("[hire] hired_at skipped:", e.message) })
      setHired(true)
      toast.success("Als eingestellt markiert ✓", {
        description: "Fließt in die Kalibrierung deiner Match-Qualität ein.",
      })
    } catch {
      toast.error("Status konnte nicht gespeichert werden")
    } finally {
      setMarkingHired(false)
    }
  }
  const { profile } = useProfile()
  // Free plan gets the "Basic AI Matching Score" (overall only); every paid plan
  // gets the full 9-category breakdown + prognosis + pitch.
  const showFull = hasFullScore(profile?.plan)

  // Reflect already-saved statuses when the candidate changes
  useEffect(() => {
    setInvited(candidate?.status === "Eingeladen" || candidate?.status === "Eingestellt")
    setRejected(candidate?.status === "Abgesagt")
    setHired(candidate?.status === "Eingestellt")
  }, [candidate])

  /** Kalender-Zustand holen. Auch nach dem Verbinden im Popup aufgerufen. */
  const loadCalendarState = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/accounts", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setCalendarConnected((data.accounts ?? []).length > 0)
      setCalendarSetup(data.setup ?? { google: false, microsoft: false, encryptionReady: false })
    } catch {
      // Ohne Antwort wird der Verbinden-Schritt einfach nicht gezeigt.
      setCalendarConnected(null)
    }
  }, [])

  // Terminarten erst laden, wenn der Dialog aufgeht. Fehlt Migration 025,
  // bleibt nur der feste Termin übrig und der Dialog verhält sich wie bisher.
  useEffect(() => {
    if (!inviteOpen) return
    let cancelled = false
    void loadCalendarState()
    ;(async () => {
      try {
        const res = await fetch("/api/scheduling/meeting-types", { cache: "no-store" })
        if (!res.ok) throw new Error("nicht_erreichbar")
        const data = await res.json()
        if (cancelled) return
        const active = (data.meetingTypes ?? []).filter((t: { active: boolean }) => t.active)
        setMeetingTypes(active)
        setMeetingTypeId(active.find((t: { isDefault: boolean }) => t.isDefault)?.id ?? active[0]?.id ?? "")
        setSchedulingReady(data.verfuegbar === true)
        setSchedulingReason(data.grund ?? null)
        if (data.verfuegbar !== true) setInviteMode("fixed")
      } catch {
        if (!cancelled) {
          setSchedulingReady(false)
          setSchedulingReason("nicht_erreichbar")
          setInviteMode("fixed")
        }
      }
    })()
    return () => { cancelled = true }
  }, [inviteOpen, loadCalendarState])

  /** Persönlichen Buchungslink erzeugen und per Mail schicken. */
  const handleSendBookingLink = async () => {
    if (!candidate) return
    if (!candidate.email) {
      toast.error("Für diesen Bewerber ist keine E-Mail-Adresse hinterlegt.")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/scheduling/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobCandidateId: candidate.linkId,
          meetingTypeId: meetingTypeId || undefined,
          note: inviteNote,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Einladung fehlgeschlagen")

      setInviteOpen(false)
      setInvited(true)
      toast.success("Buchungslink verschickt", {
        description: `${candidate.full_name} kann jetzt selbst einen Termin aus deinen freien Zeiten wählen.`,
      })
      onInviteToInterview?.(candidate.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Einladung fehlgeschlagen")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitInvite = async () => {
    if (!candidate) return
    setIsSubmitting(true)

    // 1. Update status in job_candidates
    const supabase = createClient()
    const { error: dbError } = await supabase
      .from("job_candidates")
      .update({ status: "Eingeladen" })
      .eq("id", candidate.linkId)

    if (dbError) {
      console.error("[v0] Interview invite update failed:", dbError)
      toast.error("Einladung konnte nicht gespeichert werden")
      setIsSubmitting(false)
      return
    }

    // Best-effort time-to-interview stamp (migration 016); separate call so a
    // missing column can never break the invite itself.
    await supabase
      .from("job_candidates")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", candidate.linkId)
      .then(({ error }) => { if (error) console.error("[invite] invited_at skipped:", error.message) })

    // 2. Send email with .ics attachment if candidate has an email address
    if (candidate.email) {
      try {
        await fetch("/api/send-interview-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateName: candidate.full_name,
            candidateEmail: candidate.email,
            jobTitle: job.title,
            companyName: job.company,
            date: inviteDate,
            time: inviteTime,
            format: inviteFormat,
            note: inviteNote,
          }),
        })
      } catch (emailError) {
        console.error("[v0] Interview invite email failed:", emailError)
        // Non-fatal: status was already updated, just warn
        toast.warning("Status aktualisiert, E-Mail konnte nicht gesendet werden")
        setIsSubmitting(false)
        setInviteOpen(false)
        setInvited(true)
        onInviteToInterview?.(candidate.id)
        return
      }
    }

    setIsSubmitting(false)
    setInviteOpen(false)
    setInvited(true)
    toast.success("Interview-Einladung gespeichert ✓")
    onInviteToInterview?.(candidate.id)
  }

  if (!candidate) return null

  const initials = candidate.full_name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  // Parse AI summary into pitch points
  const pitchPoints = candidate.ai_summary?.split(" | ").filter(Boolean) || []

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <SheetTitle className="text-xl">Revetly Match Analyse</SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground">Intelligent Multi-Layer Ranking System</p>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Candidate Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              {candidate.photo_url && <AvatarImage src={candidate.photo_url} alt={candidate.full_name} className="object-cover" />}
              <AvatarFallback
                className="text-[#0C1A16] text-lg font-semibold"
                style={{ backgroundImage: "var(--rv-gradient)" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-foreground">{candidate.full_name}</h3>
              <p className="text-sm text-muted-foreground">{candidate.job_title || "Kandidat"}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/70">
                {candidate.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {candidate.email}
                  </span>
                )}
                {candidate.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {candidate.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Job Context */}
          <div className="bg-[var(--muted)]/60 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Analysiert für</p>
            <p className="font-semibold text-foreground">{job.title}</p>
            <p className="text-sm text-muted-foreground">{job.company}</p>
          </div>

          {/* Match Result - Show stored data */}
          {candidate.match_score !== null && (
            <>
              {/* Circular Score */}
              <div className="flex justify-center">
                <CircularProgress value={candidate.match_score} />
              </div>

              {/* KO-Kriterien verletzt — hard warning, shown to every plan */}
              {candidate.knockout && (candidate.knockout_reasons?.length ?? 0) > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-red-600" />
                      <h4 className="text-sm font-semibold text-red-700">KO-Kriterium nicht erfüllt</h4>
                    </div>
                    <p className="mb-2 text-xs text-red-700/80">
                      Dieser Kandidat erfüllt eine harte Muss-Anforderung nachweislich nicht. Der
                      Score bleibt zur Nachvollziehbarkeit erhalten.
                    </p>
                    <ul className="space-y-1">
                      {candidate.knockout_reasons?.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                          <span className="mt-0.5 flex-shrink-0 text-red-500">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {showFull ? (
                <>
                  {/* Zulassungssperre: steht bewusst ganz oben. Ohne diese
                      Voraussetzung ist alles darunter zweitrangig. */}
                  {candidate.match_detail?.zulassungsSperre && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="mt-0.5 h-4.5 w-4.5 flex-none text-red-600" strokeWidth={2.2} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-red-900">
                            {candidate.match_detail.zulassungsSperre.fehlend.length > 0
                              ? "Zulassungsvoraussetzung nicht erfüllt"
                              : "Zulassungsvoraussetzung nur teilweise belegt"}
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {[
                              ...candidate.match_detail.zulassungsSperre.fehlend,
                              ...candidate.match_detail.zulassungsSperre.teilweise,
                            ].map((e) => (
                              <li key={e.anforderung} className="text-xs leading-relaxed text-red-800">
                                <span className="font-medium">{e.anforderung}</span>
                                {e.grund ? <span className="text-red-700"> — {e.grund}</span> : null}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2.5 text-[11px] leading-relaxed text-red-700">
                            Der Gesamtscore ist deshalb auf {candidate.match_detail.zulassungsSperre.cap} gedeckelt.
                            Die gewichtete Rechnung allein hätte {candidate.match_detail.zulassungsSperre.gewichteterScore} ergeben,
                            weil starke Nebenkategorien die fehlende Voraussetzung sonst ausgleichen.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Career Prognosis */}
                  {candidate.career_prognosis && (
                    <CareerPrognosisBadge prognosis={candidate.career_prognosis} />
                  )}

                  {/* IMLRS 9 Categories */}
                  <Card className="border-black/[0.06]">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
                        <Target className="h-4 w-4 text-teal-600" />
                        Die neun Bewertungsebenen
                      </h4>
                      <div className="space-y-3">
                        {categories.map((cat) => {
                          const score = candidate[cat.key as keyof Candidate] as number | null
                          const catDetail = candidate.match_detail?.categories?.[cat.detailKey]
                          return (
                            <CategoryBar
                              key={cat.key}
                              label={cat.label}
                              score={score || 0}
                              weight={cat.weight}
                              icon={cat.icon}
                              konfidenz={catDetail?.konfidenz}
                            />
                          )
                        })}
                      </div>

                      {/* IMLRS 2.0 audit trail: Begründungen, Belege, Prüf-Urteile */}
                      {candidate.match_detail?.categories && (
                        <div className="mt-4 border-t border-border pt-3">
                          <button
                            type="button"
                            onClick={() => setAuditOpen((v) => !v)}
                            className="flex w-full items-center justify-between text-left text-sm font-medium text-[var(--rv-cyan-deep)] hover:underline"
                          >
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4" />
                              Begründungen & Prüfprotokoll
                            </span>
                            {auditOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>

                          {auditOpen && (
                            <div className="mt-3 space-y-3">
                              {candidate.match_detail.verifierNote && (
                                <p className="rounded-xl bg-[rgba(34,193,238,.07)] p-3 text-xs leading-relaxed text-muted-foreground">
                                  <span className="font-semibold text-[var(--rv-cyan-deep)]">Unabhängige Prüfung: </span>
                                  {candidate.match_detail.verifierNote}
                                </p>
                              )}
                              {categories.map((cat) => {
                                const d = candidate.match_detail?.categories?.[cat.detailKey]
                                if (!d) return null
                                // Denselben Score wie in der Übersicht nehmen, nicht d.rohScore:
                                // Der Rohwert liegt vor der Prüfinstanz und würde von der
                                // Balkenfarbe eine Zeile weiter oben abweichen.
                                const catScore = (candidate[cat.key as keyof Candidate] as number | null) ?? 0
                                return (
                                  <div key={cat.key} className="rounded-xl border border-black/[0.05] p-3">
                                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                      <span
                                        title={`${catScore} von 100`}
                                        className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${getScoreBgColor(catScore)}`}
                                      />
                                      <span className="text-xs font-semibold text-foreground">{cat.label}</span>
                                      <span className={`text-xs font-bold ${getScoreColor(catScore)}`}>{catScore}</span>
                                      <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                        {konfidenzLabel[d.konfidenz] ?? d.konfidenz}
                                      </span>
                                      {d.verifier && (
                                        <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                          Prüfung: {d.verifier.urteil === "zu_hoch" ? "korrigiert ↓" : d.verifier.urteil === "zu_niedrig" ? "korrigiert ↑" : "bestätigt"}
                                        </span>
                                      )}
                                      {d.capped && (
                                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600">
                                          Hard-Fact-Limit
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs leading-relaxed text-muted-foreground">{d.begruendung}</p>
                                    {d.belege.length > 0 && (
                                      <ul className="mt-1.5 space-y-0.5">
                                        {d.belege.map((b, i) => (
                                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground/80">
                                            <span className="mt-0.5 flex-shrink-0 text-[var(--rv-green-deep)]">▸</span>
                                            {b}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Why They Fit - Contextual Pitch (from ai_summary) */}
                  {pitchPoints.length > 0 && (
                    <Card className="border-teal-200 bg-teal-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="h-5 w-5 text-teal-600" />
                          <h4 className="font-semibold text-sm text-teal-900">Warum dieser Kandidat passt</h4>
                        </div>
                        <ul className="space-y-2">
                          {pitchPoints.map((reason, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-teal-800">
                              <span className="text-teal-500 mt-0.5 flex-shrink-0">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                /* Free plan — Basic Score only. Full breakdown is a paid feature. */
                <Card className="border-dashed border-border">
                  <CardContent className="p-5 text-center space-y-2">
                    <Sparkles className="h-6 w-6 text-[var(--rv-green)] mx-auto" />
                    <h4 className="font-semibold text-sm text-foreground">Vollständige Match Analyse</h4>
                    <p className="text-sm text-muted-foreground">
                      Der detaillierte 9-Kategorien-Breakdown, die Karriere-Prognose und der
                      Contextual Pitch sind ab dem Starter-Plan verfügbar.
                    </p>
                    <Button asChild size="sm" className="mt-1">
                      <Link href="/subscription">Upgraden</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Structured interview — turns the score's weak spots into a
                  guided, rated interview (paid feature). */}
              {showFull && <InterviewGuidePanel linkId={candidate.linkId} />}

              {/* Candidate Summary */}
              {candidate.summary_ai && !pitchPoints.length && (
                <Card className="border-black/[0.06]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-teal-600" />
                      <h4 className="font-semibold text-sm text-foreground">KI-Zusammenfassung</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{candidate.summary_ai}</p>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <Card className="border-black/[0.06]">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm text-foreground mb-3">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill) => (
                        <span 
                          key={skill} 
                          className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Experience & Education */}
              <Card className="border-black/[0.06]">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Erfahrung</p>
                      <p className="text-sm font-medium text-foreground">
                        {candidate.years_of_experience} Jahre ({candidate.experience_level})
                      </p>
                    </div>
                  </div>
                  {candidate.education && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ausbildung</p>
                        <p className="text-sm font-medium text-foreground">{candidate.education}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4 border-t">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 rounded-full"
                  >
                    Schliessen
                  </Button>
                  {invited ? (
                    <Button
                      disabled
                      className="flex-1 rounded-full bg-[var(--rv-green-deep)] hover:bg-[var(--rv-green-deep)] disabled:opacity-100 text-white"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Einladung gesendet ✓
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setInviteOpen(true)}
                      className="flex-1 rounded-full"
                      disabled={rejected}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Zum Interview einladen
                    </Button>
                  )}
                </div>
                {/* Outcome: closes the decision chain Score → Interview → Hire
                    and feeds the nightly matching calibration. */}
                {hired ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="w-full text-[var(--rv-green-deep)] disabled:opacity-100"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Eingestellt ✓
                  </Button>
                ) : (
                  !rejected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markHired}
                      disabled={markingHired}
                      className="w-full rounded-full border-[rgba(22,199,124,.4)] text-[var(--rv-green-deep)] hover:bg-[var(--app-green-wash)]"
                    >
                      {markingHired
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Als eingestellt markieren
                    </Button>
                  )
                )}
                {!rejected ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRejectionOpen(true)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full"
                  >
                    Absage senden
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="text-muted-foreground/70 w-full"
                  >
                    Abgesagt
                  </Button>
                )}
              </div>
            </>
          )}

          {/* No Score State */}
          {candidate.match_score === null && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <p className="text-foreground/85 font-medium">Noch keine Match Analyse vorhanden</p>
              <p className="text-sm text-muted-foreground">Die Analyse wurde nicht abgeschlossen</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* Interview Invite Dialog */}
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-600" />
            Zum Interview einladen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-candidate">Kandidat</Label>
            <Input id="invite-candidate" value={candidate.full_name} readOnly className="bg-[var(--muted)]/60" />
          </div>

          {/* Kalender noch nicht verbunden? Dann hier verbinden, nicht in einem
              Untermenü. Das Popup lässt diesen Dialog offen, danach füllt sich
              der Zustand von selbst auf. Bewusst kein Zwang: Ohne Kalender
              funktioniert die Buchung weiterhin. */}
          {inviteMode === "link" &&
            calendarConnected === false &&
            !connectDismissed &&
            calendarSetup.encryptionReady &&
            (calendarSetup.google || calendarSetup.microsoft) && (
              <div className="rounded-xl border border-[rgba(22,199,124,.35)] bg-[var(--app-green-wash)] p-4">
                <p className="text-sm font-medium text-foreground">
                  Kalender verbinden, dann passt der Termin sicher
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Revetly sieht dann, wann du schon belegt bist, und trägt den gebuchten Termin
                  direkt bei dir ein, samt Videolink. Dauert einmalig zwei Klicks und öffnet sich
                  in einem kleinen Fenster, dieser Dialog bleibt offen.
                </p>
                <div className="mt-3">
                  <CalendarConnectButtons
                    verfuegbar={calendarSetup}
                    size="sm"
                    onConnected={loadCalendarState}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setConnectDismissed(true)}
                  className="mt-2.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Ohne Kalender fortfahren
                </button>
              </div>
            )}

          {inviteMode === "link" && calendarConnected === true && (
            <p className="flex items-center gap-1.5 text-xs text-[var(--rv-green-deep)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Kalender verbunden, belegte Zeiten werden berücksichtigt
            </p>
          )}

          {/* Steht die Selbstbuchung nicht bereit, sagen warum. Vorher
              verschwand die Umschaltung wortlos und der Dialog sah aus wie
              vorher, ohne Hinweis worauf das zurückgeht. */}
          {!schedulingReady && schedulingReason && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
              {schedulingReason === "migration_fehlt" ? (
                <>
                  Die Terminplanung ist in der Datenbank noch nicht angelegt. Führe
                  <code className="mx-1 rounded bg-amber-100 px-1">scripts/025_scheduling.sql</code>
                  in Supabase aus, dann kann der Bewerber seinen Termin selbst wählen.
                </>
              ) : (
                <>
                  Die Terminplanung ist gerade nicht erreichbar. Du kannst weiterhin einen festen
                  Termin vorgeben.
                </>
              )}
            </p>
          )}

          {/* Zwei Wege zum selben Ziel: Der Bewerber sucht sich eine Zeit aus,
              oder der Termin steht bereits fest. */}
          {schedulingReady && (
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: "link", title: "Bewerber wählt", hint: "Er bucht aus deinen freien Zeiten" },
                { key: "fixed", title: "Fester Termin", hint: "Du gibst Datum und Uhrzeit vor" },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setInviteMode(option.key)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    inviteMode === option.key
                      ? "border-[var(--rv-green)] bg-[var(--app-green-wash)]"
                      : "border-[var(--app-line)] hover:border-foreground/20"
                  }`}
                >
                  <span className="block text-sm font-medium text-foreground">{option.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
                </button>
              ))}
            </div>
          )}

          {inviteMode === "link" ? (
            <>
              {meetingTypes.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="invite-type">Terminart</Label>
                  <select
                    id="invite-type"
                    value={meetingTypeId}
                    onChange={(e) => setMeetingTypeId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[var(--app-line)] bg-transparent px-3 text-sm"
                  >
                    {meetingTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.durationMinutes} Min.)
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!candidate.email && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Ohne E-Mail-Adresse lässt sich kein Buchungslink verschicken.
                </p>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                {candidate.full_name.split(" ")[0]} bekommt eine E-Mail mit einem persönlichen Link
                und wählt daraus eine Zeit. Der Termin landet danach unter{" "}
                <Link href="/termine" className="text-[var(--rv-green-deep)] hover:underline">
                  Termine
                </Link>
                . Deinen Google- oder Microsoft-Kalender verbindest du einmalig ebenfalls dort,
                nicht hier bei jeder Einladung. Ohne Verbindung funktioniert die Buchung trotzdem.
              </p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="invite-date">Datum</Label>
                  <Input
                    id="invite-date"
                    type="date"
                    value={inviteDate}
                    onChange={(e) => setInviteDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-time">Uhrzeit</Label>
                  <Input
                    id="invite-time"
                    type="time"
                    value={inviteTime}
                    onChange={(e) => setInviteTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Format</Label>
                <RadioGroup
                  value={inviteFormat}
                  onValueChange={setInviteFormat}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="remote" id="format-remote" />
                    <Label htmlFor="format-remote" className="font-normal cursor-pointer">Remote</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="onsite" id="format-onsite" />
                    <Label htmlFor="format-onsite" className="font-normal cursor-pointer">Vor Ort</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="invite-note">Optionale Notiz</Label>
            <Textarea
              id="invite-note"
              placeholder="z.B. Bitte Portfolio mitbringen"
              value={inviteNote}
              onChange={(e) => setInviteNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button
            onClick={inviteMode === "link" ? handleSendBookingLink : handleSubmitInvite}
            disabled={isSubmitting || (inviteMode === "link" && !candidate.email)}
          >
            {isSubmitting
              ? "Wird gesendet..."
              : inviteMode === "link"
                ? "Buchungslink senden"
                : "Einladung senden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <RejectionModal
      isOpen={rejectionOpen}
      onClose={() => setRejectionOpen(false)}
      candidateName={candidate.full_name}
      candidateEmail={candidate.email ?? ""}
      jobTitle={job.title}
      companyName={job.company}
      onSuccess={async () => {
        const supabase = createClient()
        await supabase
          .from("job_candidates")
          .update({ status: "Abgesagt" })
          .eq("id", candidate.linkId)
        setRejected(true)
        toast.success("Kandidat abgesagt ✓")
      }}
    />
    </>
  )
}
