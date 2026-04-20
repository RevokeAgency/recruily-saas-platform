"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  MoreHorizontal,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  Filter,
  ArrowUpDown,
  UserPlus,
  Sparkles,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { CandidateMatchModal } from "./candidate-match-modal"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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

interface JobCandidatesTabProps {
  jobId: string
  jobTitle: string
  job: Job
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
  location: string | null
  status: string
  match_score: number | null
  skills_score: number | null
  experience_score: number | null
  culture_score: number | null
  ai_summary: string | null
  notes: string | null
  added_at: string
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-primary"
  if (score >= 60) return "text-amber-500"
  return "text-destructive"
}

export function JobCandidatesTab({ jobId, jobTitle, job }: JobCandidatesTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState("match")
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [matchModalOpen, setMatchModalOpen] = useState(false)

  // Fetch candidates for this job
  const { data, error, isLoading } = useSWR<{ candidates: Candidate[] }>(
    `/api/jobs/${jobId}/candidates`,
    fetcher
  )

  const candidates = data?.candidates || []

  const filteredCandidates = candidates
    .filter((c) => 
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))

  // Helper to get initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Fehler beim Laden der Kandidaten</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Candidate Pool</h2>
          <p className="text-muted-foreground text-sm">
            {filteredCandidates.length} candidates for {jobTitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            {filteredCandidates.length} Total
          </Badge>
          <Button asChild className="bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm">
            <Link href={`/candidates/new?jobId=${jobId}`}>
              <UserPlus className="mr-2 h-4 w-4" />
              Kandidat hinzufügen
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search candidates by name, email, skills, location..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Candidates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Candidates</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="interviewed">Interviewed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Match Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">Match Score</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date Added</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredCandidates.length === 0 && (
        <Card className="border border-slate-200 bg-white rounded-xl">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Noch keine Kandidaten</h3>
            <p className="text-slate-500 mb-6">
              Füge den ersten Kandidaten zu diesem Job hinzu um das Matching zu starten.
            </p>
            <Button asChild className="bg-teal-600 hover:bg-teal-700">
              <Link href={`/candidates/new?jobId=${jobId}`}>
                <UserPlus className="mr-2 h-4 w-4" />
                Kandidat hinzufügen
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Candidates List */}
      <div className="space-y-4">
        {filteredCandidates.map((candidate) => (
          <Card 
            key={candidate.id} 
            className="border border-slate-200 bg-white rounded-xl hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="p-6">
              <div className="flex flex-col xl:flex-row gap-6">
                {/* Left: Candidate Info */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-12 w-12 bg-teal-600 text-white">
                      <AvatarFallback className="bg-teal-600 text-white font-semibold">
                        {getInitials(candidate.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-lg">{candidate.full_name}</h3>
                        <Badge 
                          variant="outline" 
                          className={`text-xs capitalize ${
                            candidate.status === 'new' ? 'border-blue-300 text-blue-600' :
                            candidate.status === 'shortlisted' ? 'border-teal-300 text-teal-600' :
                            candidate.status === 'interviewed' ? 'border-amber-300 text-amber-600' :
                            'border-slate-300 text-slate-600'
                          }`}
                        >
                          {candidate.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {candidate.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-4 w-4" />
                            {candidate.email}
                          </span>
                        )}
                        {candidate.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            {candidate.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4" />
                          {candidate.years_of_experience} Jahre Erfahrung
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {candidate.skills.map((skill) => (
                        <span 
                          key={skill} 
                          className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-teal-100 transition-colors cursor-default"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* AI Summary */}
                  {candidate.summary_ai && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-teal-600" />
                        <span className="font-medium text-sm text-teal-600">KI-Zusammenfassung</span>
                      </div>
                      <p className="text-sm text-slate-600">{candidate.summary_ai}</p>
                    </div>
                  )}
                </div>

                {/* Right: Match Score */}
                <div className="xl:w-64 xl:border-l xl:pl-6 xl:border-border">
                  <div className="text-center xl:text-right mb-4">
                    {candidate.match_score ? (
                      <>
                        <p className={`text-4xl font-bold ${getScoreColor(candidate.match_score)}`}>
                          {candidate.match_score}%
                        </p>
                        <p className="text-sm text-muted-foreground">Overall Match</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-slate-400">--</p>
                        <p className="text-sm text-muted-foreground">Match noch nicht berechnet</p>
                      </>
                    )}
                  </div>

                  {/* Score Breakdown (only if scores exist) */}
                  {candidate.match_score && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Skills</span>
                        <div className="flex items-center gap-2">
                          <Progress value={candidate.skills_score || 0} className="w-20 h-2" />
                          <span className="w-10 text-right font-medium">{candidate.skills_score || 0}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Experience</span>
                        <div className="flex items-center gap-2">
                          <Progress value={candidate.experience_score || 0} className="w-20 h-2" />
                          <span className="w-10 text-right font-medium">{candidate.experience_score || 0}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Culture</span>
                        <div className="flex items-center gap-2">
                          <Progress value={candidate.culture_score || 0} className="w-20 h-2" />
                          <span className="w-10 text-right font-medium">{candidate.culture_score || 0}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-teal-600 hover:bg-teal-700 gap-1"
                      onClick={() => {
                        setSelectedCandidate(candidate)
                        setMatchModalOpen(true)
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      Match analysieren
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Calendar className="mr-2 h-4 w-4" />
                      Interview
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Godlike Matcher Modal */}
      <CandidateMatchModal
        open={matchModalOpen}
        onOpenChange={setMatchModalOpen}
        candidate={selectedCandidate}
        job={job}
        onInviteToInterview={(candidateId) => {
          console.log("Invite to interview:", candidateId)
          // TODO: Update candidate status in database
        }}
      />
    </div>
  )
}
