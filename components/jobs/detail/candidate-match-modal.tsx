"use client"

import { useState, useEffect } from "react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createClient } from "@/lib/supabase/client"
import { RejectionModal } from "@/components/ui/rejection-modal"
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
} from "lucide-react"
import { toast } from "sonner"

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

// Category config
const categories = [
  { key: "hard_skills_score", label: "Hard Skills", weight: 25, icon: Target },
  { key: "experience_score", label: "Berufserfahrung", weight: 20, icon: Briefcase },
  { key: "education_score", label: "Ausbildung", weight: 10, icon: GraduationCap },
  { key: "soft_skills_score", label: "Soft Skills", weight: 10, icon: MessageSquare },
  { key: "languages_score", label: "Sprachen", weight: 5, icon: Globe },
  { key: "location_score", label: "Standort", weight: 5, icon: MapPin },
  { key: "industry_score", label: "Branche", weight: 10, icon: Building },
  { key: "salary_score", label: "Gehalt", weight: 5, icon: Wallet },
  { key: "culture_score", label: "Kultur", weight: 10, icon: Heart },
]

// Get score color based on value
function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600"
  if (score >= 60) return "text-amber-500"
  return "text-red-500"
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-500"
  if (score >= 60) return "bg-amber-500"
  return "bg-red-500"
}

function getScoreStrokeColor(score: number): string {
  if (score >= 80) return "#10b981"
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
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${getScoreColor(value)}`}>
          {value}%
        </span>
        <span className="text-sm text-slate-500">IMLRS Score</span>
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
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    stable: {
      icon: Minus,
      label: "Stabil",
      description: "Kandidat zeigt konsistente Entwicklung",
      className: "bg-blue-50 text-blue-700 border-blue-200",
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
    <div className={`rounded-xl border p-4 ${className}`}>
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
  icon: Icon 
}: { 
  label: string
  score: number
  weight: number
  icon: React.ElementType 
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-700">{label}</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {weight}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out ${getScoreBgColor(score)}`}
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
  const [rejectionOpen, setRejectionOpen] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [inviteDate, setInviteDate] = useState("")
  const [inviteTime, setInviteTime] = useState("")
  const [inviteFormat, setInviteFormat] = useState("remote")
  const [inviteNote, setInviteNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invited, setInvited] = useState(false)

  // Reflect already-saved statuses when the candidate changes
  useEffect(() => {
    setInvited(candidate?.status === "Eingeladen")
    setRejected(candidate?.status === "Abgesagt")
  }, [candidate])

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
            <SheetTitle className="text-xl">IMLRS Match-Analyse</SheetTitle>
          </div>
          <p className="text-xs text-slate-500">Intelligent Multi-Layer Ranking System</p>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Candidate Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 bg-teal-600 text-white">
              <AvatarFallback className="bg-teal-600 text-white text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-slate-900">{candidate.full_name}</h3>
              <p className="text-sm text-slate-500">{candidate.job_title || "Kandidat"}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
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
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Analysiert für</p>
            <p className="font-semibold text-slate-900">{job.title}</p>
            <p className="text-sm text-slate-500">{job.company}</p>
          </div>

          {/* Match Result - Show stored data */}
          {candidate.match_score !== null && (
            <>
              {/* Circular Score */}
              <div className="flex justify-center">
                <CircularProgress value={candidate.match_score} />
              </div>

              {/* Career Prognosis */}
              {candidate.career_prognosis && (
                <CareerPrognosisBadge prognosis={candidate.career_prognosis} />
              )}

              {/* IMLRS 9 Categories */}
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4 text-teal-600" />
                    IMLRS 9-Kategorien Breakdown
                  </h4>
                  <div className="space-y-3">
                    {categories.map((cat) => {
                      const score = candidate[cat.key as keyof Candidate] as number | null
                      return (
                        <CategoryBar 
                          key={cat.key}
                          label={cat.label}
                          score={score || 0}
                          weight={cat.weight}
                          icon={cat.icon}
                        />
                      )
                    })}
                  </div>
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

              {/* Candidate Summary */}
              {candidate.summary_ai && !pitchPoints.length && (
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-teal-600" />
                      <h4 className="font-semibold text-sm text-slate-900">KI-Zusammenfassung</h4>
                    </div>
                    <p className="text-sm text-slate-600">{candidate.summary_ai}</p>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm text-slate-900 mb-3">Skills</h4>
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
              <Card className="border-slate-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Erfahrung</p>
                      <p className="text-sm font-medium text-slate-900">
                        {candidate.years_of_experience} Jahre ({candidate.experience_level})
                      </p>
                    </div>
                  </div>
                  {candidate.education && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <GraduationCap className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Ausbildung</p>
                        <p className="text-sm font-medium text-slate-900">{candidate.education}</p>
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
                    className="flex-1"
                  >
                    Schliessen
                  </Button>
                  {invited ? (
                    <Button
                      disabled
                      className="flex-1 bg-emerald-600 hover:bg-emerald-600 disabled:opacity-100 text-white"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Einladung gesendet ✓
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setInviteOpen(true)}
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                      disabled={rejected}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Zum Interview einladen
                    </Button>
                  )}
                </div>
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
                    className="text-slate-400 w-full"
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
              <p className="text-slate-700 font-medium">Keine IMLRS-Daten verfügbar</p>
              <p className="text-sm text-slate-500">Die Analyse wurde nicht abgeschlossen</p>
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
            <Input id="invite-candidate" value={candidate.full_name} readOnly className="bg-slate-50" />
          </div>

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
            onClick={handleSubmitInvite}
            disabled={isSubmitting}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSubmitting ? "Wird gespeichert..." : "Einladung senden"}
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
        toast.success("Absage wurde gesendet ✓")
      }}
    />
    </>
  )
}
