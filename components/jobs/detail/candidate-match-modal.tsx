"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import {
  Mail,
  MapPin,
  Briefcase,
  CheckCircle2,
  Calendar,
  Loader2,
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

interface IMLRSCategory {
  score: number
  weight: number
  label: string
}

interface IMLRSMatch {
  overallScore: number
  categories: {
    hardSkills: IMLRSCategory
    experience: IMLRSCategory
    education: IMLRSCategory
    softSkills: IMLRSCategory
    languages: IMLRSCategory
    location: IMLRSCategory
    industry: IMLRSCategory
    salary: IMLRSCategory
    culture: IMLRSCategory
  }
  whyTheyFit: string[]
  potentialConcerns: string[] | null
  interviewFocus: string
  careerPrognosis: "ascending" | "stable" | "risk"
  prognosisReason: string
}

interface Candidate {
  id: string
  name?: string
  full_name?: string
  initials?: string
  email?: string | null
  location?: string | null
  experience?: string
  experience_level?: string
  years_of_experience?: number
  job_title?: string | null
  skills?: string[]
  education?: string | null
  summary_ai?: string | null
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

// Category icons mapping
const categoryIcons: Record<string, React.ElementType> = {
  hardSkills: Target,
  experience: Briefcase,
  education: GraduationCap,
  softSkills: MessageSquare,
  languages: Globe,
  location: MapPin,
  industry: Building,
  salary: Wallet,
  culture: Heart,
}

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
function CareerPrognosisBadge({ prognosis, reason }: { prognosis: string; reason: string }) {
  const config = {
    ascending: {
      icon: TrendingUp,
      label: "Aufsteigend",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    stable: {
      icon: Minus,
      label: "Stabil",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    risk: {
      icon: TrendingDown,
      label: "Risiko",
      className: "bg-red-50 text-red-700 border-red-200",
    },
  }

  const { icon: Icon, label, className } = config[prognosis as keyof typeof config] || config.stable

  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="font-semibold text-sm">Karriereprognose: {label}</span>
      </div>
      <p className="text-xs opacity-80">{reason}</p>
    </div>
  )
}

// IMLRS Category Bar Component
function CategoryBar({ category, categoryKey }: { category: IMLRSCategory; categoryKey: string }) {
  const Icon = categoryIcons[categoryKey] || Target
  
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-700">{category.label}</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {category.weight}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out ${getScoreBgColor(category.score)}`}
              style={{ width: `${category.score}%` }}
            />
          </div>
          <span className={`text-xs font-bold w-8 text-right ${getScoreColor(category.score)}`}>
            {category.score}
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
  const [isLoading, setIsLoading] = useState(false)
  const [matchResult, setMatchResult] = useState<IMLRSMatch | null>(null)

  // Calculate match when modal opens
  useEffect(() => {
    if (open && candidate && !matchResult) {
      calculateMatch()
    }
  }, [open, candidate])

  // Reset when candidate changes
  useEffect(() => {
    setMatchResult(null)
  }, [candidate?.id])

  const calculateMatch = async () => {
    if (!candidate) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate, job }),
      })

      if (!response.ok) {
        throw new Error("Failed to calculate match")
      }

      const data = await response.json()
      setMatchResult(data.match)
    } catch (error) {
      console.error("Match calculation error:", error)
      toast.error("Fehler beim Berechnen des IMLRS Matches")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInviteToInterview = () => {
    if (candidate && onInviteToInterview) {
      onInviteToInterview(candidate.id)
      toast.success(`${candidate.full_name || candidate.name} wurde zum Interview eingeladen`)
      onOpenChange(false)
    }
  }

  if (!candidate) return null

  const candidateName = candidate.full_name || candidate.name || "Unbekannt"
  const initials = candidate.initials || candidateName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  return (
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
              <h3 className="font-bold text-lg text-slate-900">{candidateName}</h3>
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

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-teal-600 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-teal-600 animate-pulse" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-700">IMLRS Analyse läuft...</p>
              <p className="text-xs text-slate-500">9 Kategorien werden ausgewertet</p>
            </div>
          )}

          {/* Match Result */}
          {matchResult && !isLoading && (
            <>
              {/* Circular Score */}
              <div className="flex justify-center">
                <CircularProgress value={matchResult.overallScore} />
              </div>

              {/* Career Prognosis */}
              <CareerPrognosisBadge 
                prognosis={matchResult.careerPrognosis} 
                reason={matchResult.prognosisReason}
              />

              {/* IMLRS 9 Categories */}
              <Card className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4 text-teal-600" />
                    IMLRS 9-Kategorien Breakdown
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(matchResult.categories).map(([key, category]) => (
                      <CategoryBar 
                        key={key} 
                        category={category} 
                        categoryKey={key}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Why They Fit - Contextual Pitch */}
              <Card className="border-teal-200 bg-teal-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-teal-600" />
                    <h4 className="font-semibold text-sm text-teal-900">Warum dieser Kandidat passt</h4>
                  </div>
                  <ul className="space-y-2">
                    {matchResult.whyTheyFit.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-teal-800">
                        <span className="text-teal-500 mt-0.5 flex-shrink-0">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Potential Concerns */}
              {matchResult.potentialConcerns && matchResult.potentialConcerns.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <h4 className="font-semibold text-sm text-amber-900">Mögliche Bedenken</h4>
                    </div>
                    <ul className="space-y-2">
                      {matchResult.potentialConcerns.map((concern, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                          <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Interview Focus */}
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-sm text-blue-900">Interview-Fokus</h4>
                  </div>
                  <p className="text-sm text-blue-800">{matchResult.interviewFocus}</p>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Schliessen
                </Button>
                <Button
                  onClick={handleInviteToInterview}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Zum Interview einladen
                </Button>
              </div>
            </>
          )}

          {/* Initial State */}
          {!isLoading && !matchResult && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-teal-600 animate-spin mb-4" />
              <p className="text-slate-500">Analyse wird gestartet...</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
