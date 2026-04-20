"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Mail,
  MapPin,
  Briefcase,
  CheckCircle2,
  Calendar,
  Loader2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  GraduationCap,
  Users,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

interface Candidate {
  id: string
  name?: string
  full_name?: string
  initials?: string
  email?: string
  location?: string
  experience?: string
  experience_level?: string
  years_of_experience?: number
  job_title?: string
  skills?: string[]
  education?: string
  summary_ai?: string
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

interface MatchResult {
  overallScore: number
  hardSkillsScore: number
  experienceLevelScore: number
  softSkillsBenefitsScore: number
  whyTheyFit: string[]
  potentialConcerns: string[] | null
  interviewFocus: string
}

interface CandidateMatchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: Candidate | null
  job: Job
  onInviteToInterview?: (candidateId: string) => void
}

// Circular Progress Component
function CircularProgress({ 
  value, 
  size = 180, 
  strokeWidth = 12,
  className = ""
}: { 
  value: number
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#0D9488" // Teal
    if (score >= 60) return "#F59E0B" // Amber
    return "#EF4444" // Red
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getScoreColor(value)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="text-4xl font-bold"
          style={{ color: getScoreColor(value) }}
        >
          {value}%
        </span>
        <span className="text-sm text-slate-500">Match Score</span>
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
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)

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
      toast.error("Fehler beim Berechnen des Matches")
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
  const initials = candidate.initials || candidateName.split(" ").map(n => n[0]).join("").toUpperCase()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <SheetTitle className="text-xl">Recruily Godlike Matcher</SheetTitle>
          </div>
        </SheetHeader>

        {/* Candidate Header */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16 bg-teal-600 text-white">
            <AvatarFallback className="bg-teal-600 text-white text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
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
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-xs text-slate-500 mb-1">Matching für</p>
          <p className="font-semibold text-slate-900">{job.title}</p>
          <p className="text-sm text-slate-500">{job.company}</p>
        </div>

        <Separator className="mb-6" />

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 text-teal-600 animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Analysiere Kandidatenprofil...</p>
            <p className="text-sm text-slate-400 mt-1">Semantisches Skill-Mapping aktiv</p>
          </div>
        )}

        {/* Match Result */}
        {matchResult && !isLoading && (
          <div className="space-y-6">
            {/* Circular Score */}
            <div className="flex justify-center">
              <CircularProgress value={matchResult.overallScore} />
            </div>

            {/* Score Breakdown - Recruily Matrix */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Target className="h-4 w-4 text-teal-600" />
                Recruily-Matrix Breakdown
              </h4>
              
              {/* Hard Skills - 50% */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <Zap className="h-4 w-4 text-blue-500" />
                    Hard Skills
                    <Badge variant="outline" className="text-xs">50%</Badge>
                  </span>
                  <span className="font-semibold">{matchResult.hardSkillsScore}%</span>
                </div>
                <Progress value={matchResult.hardSkillsScore} className="h-2" />
              </div>

              {/* Experience Level - 30% */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <Briefcase className="h-4 w-4 text-purple-500" />
                    Erfahrungslevel
                    <Badge variant="outline" className="text-xs">30%</Badge>
                  </span>
                  <span className="font-semibold">{matchResult.experienceLevelScore}%</span>
                </div>
                <Progress value={matchResult.experienceLevelScore} className="h-2" />
              </div>

              {/* Soft Skills & Benefits - 20% */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <Users className="h-4 w-4 text-amber-500" />
                    Soft Skills & Benefits
                    <Badge variant="outline" className="text-xs">20%</Badge>
                  </span>
                  <span className="font-semibold">{matchResult.softSkillsBenefitsScore}%</span>
                </div>
                <Progress value={matchResult.softSkillsBenefitsScore} className="h-2" />
              </div>
            </div>

            <Separator />

            {/* Why They Fit - The Contextual Pitch */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                Warum passt dieser Kandidat?
              </h4>
              <ul className="space-y-2">
                {matchResult.whyTheyFit.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Potential Concerns */}
            {matchResult.potentialConcerns && matchResult.potentialConcerns.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Mögliche Bedenken
                  </h4>
                  <ul className="space-y-2">
                    {matchResult.potentialConcerns.map((concern, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Interview Focus */}
            <div className="bg-teal-50 rounded-xl p-4">
              <h4 className="font-semibold text-teal-800 flex items-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4" />
                Interview-Fokus
              </h4>
              <p className="text-sm text-teal-700">{matchResult.interviewFocus}</p>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleInviteToInterview}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Interview einladen
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Schließen
              </Button>
            </div>
          </div>
        )}

        {/* Initial State - Before Loading */}
        {!isLoading && !matchResult && (
          <div className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500">Match wird berechnet...</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
