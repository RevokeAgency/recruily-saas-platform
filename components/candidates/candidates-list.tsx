"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users,
  MoreHorizontal,
  Eye,
  Briefcase,
  Trash2,
  Mail,
  MapPin,
  GraduationCap,
  Plus,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { JobMatchModal } from "./job-match-modal"
import { toast } from "sonner"

interface Candidate {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  years_of_experience: number
  experience_level: "junior" | "mid" | "senior"
  skills: string[]
  education: string | null
  summary_ai: string | null
  location: string | null
  created_at: string
  job_count: number
}

interface CandidatesListProps {
  filter: string
  searchQuery: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const experienceLevelConfig = {
  junior: { label: "Junior", color: "bg-blue-100 text-blue-700" },
  mid: { label: "Mid-Level", color: "bg-amber-100 text-amber-700" },
  senior: { label: "Senior", color: "bg-emerald-100 text-emerald-700" },
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function CandidatesList({ filter, searchQuery }: CandidatesListProps) {
  const { data, error, isLoading, mutate } = useSWR<{ candidates: Candidate[] }>(
    "/api/candidates",
    fetcher
  )
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [matchCandidate, setMatchCandidate] = useState<Candidate | null>(null)

  // Filter and search candidates
  const filteredCandidates = (data?.candidates || []).filter(candidate => {
    // Apply filter
    if (filter === "matched" && candidate.job_count === 0) return false
    if (filter === "unmatched" && candidate.job_count > 0) return false
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = candidate.full_name.toLowerCase().includes(query)
      const matchesSkills = candidate.skills.some(skill => skill.toLowerCase().includes(query))
      const matchesLocation = candidate.location?.toLowerCase().includes(query)
      const matchesJobTitle = candidate.job_title?.toLowerCase().includes(query)
      if (!matchesName && !matchesSkills && !matchesLocation && !matchesJobTitle) return false
    }
    
    return true
  })

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/candidates/${id}`, {
        method: "DELETE",
      })
      
      if (response.ok) {
        toast.success("Kandidat gelöscht")
        mutate()
      } else {
        toast.error("Fehler beim Löschen")
      }
    } catch {
      toast.error("Fehler beim Löschen")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-full flex-none" />
              <div className="w-44 flex-none space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2 rounded-full" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3.5 w-1/4" />
              </div>
              <Skeleton className="h-8 w-20 flex-none" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 rounded-xl">
        <CardContent className="p-6 text-center text-red-600">
          Fehler beim Laden der Kandidaten
        </CardContent>
      </Card>
    )
  }

  if (filteredCandidates.length === 0 && !searchQuery && filter === "all") {
    return (
      <EmptyState
        icon={Users}
        title="Noch keine Kandidaten"
        description="Lade deinen ersten Kandidaten-CV hoch, um mit dem Matching zu beginnen."
        actionLabel="Kandidat hinzufügen"
        actionHref="/candidates/new"
      />
    )
  }

  if (filteredCandidates.length === 0) {
    return (
      <Card className="bg-[var(--rv-mist)]">
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-foreground font-medium">
            {searchQuery
              ? "Keine Kandidaten gefunden"
              : filter === "matched"
                ? "Keine gematchten Kandidaten"
                : "Keine unverknüpften Kandidaten"}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            {searchQuery
              ? "Versuche eine andere Suche"
              : "Ändere den Filter um andere Kandidaten zu sehen"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {filteredCandidates.map((candidate) => (
          <Card
            key={candidate.id}
            className="group transition-shadow duration-150 ease-out hover:shadow-[0_1px_2px_rgba(12,26,22,.04),0_14px_32px_-14px_rgba(12,26,22,.14)]"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <Avatar className="h-11 w-11 flex-shrink-0">
                  <AvatarFallback className="bg-teal-100 text-teal-700 font-semibold text-sm">
                    {getInitials(candidate.full_name)}
                  </AvatarFallback>
                </Avatar>

                {/* Name & Badge - Fixed Width */}
                <div className="w-44 flex-shrink-0">
                  <p className="font-semibold text-foreground truncate">
                    {candidate.full_name}
                  </p>
                  <Badge className={`mt-1 text-xs ${experienceLevelConfig[candidate.experience_level].color}`}>
                    {experienceLevelConfig[candidate.experience_level].label}
                  </Badge>
                </div>

                {/* Job Title & Location - Fixed Width */}
                <div className="w-48 flex-shrink-0 hidden md:block">
                  {candidate.job_title && (
                    <p className="text-sm text-slate-700 truncate">{candidate.job_title}</p>
                  )}
                  {candidate.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {candidate.location}
                    </p>
                  )}
                </div>

                {/* Skills - Flexible */}
                <div className="flex-1 hidden lg:flex flex-wrap gap-1.5">
                  {candidate.skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {candidate.skills.length > 4 && (
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-medium">
                      +{candidate.skills.length - 4}
                    </span>
                  )}
                </div>

                {/* Email - Hidden on smaller screens */}
                <div className="w-48 flex-shrink-0 hidden xl:block">
                  {candidate.email && (
                    <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      {candidate.email}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-teal-600 border-teal-200 hover:bg-teal-50"
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <Eye className="h-4 w-4 mr-1.5" />
                    Profil
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => setMatchCandidate(candidate)}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        Mit Job matchen
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleDelete(candidate.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Candidate Profile Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Kandidatenprofil</DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-6 pt-4">
              {/* Header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-xl font-bold">
                    {getInitials(selectedCandidate.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {selectedCandidate.full_name}
                  </h3>
                  {selectedCandidate.job_title && (
                    <p className="text-slate-600">{selectedCandidate.job_title}</p>
                  )}
                  <Badge className={`mt-2 ${experienceLevelConfig[selectedCandidate.experience_level].color}`}>
                    {experienceLevelConfig[selectedCandidate.experience_level].label} • {selectedCandidate.years_of_experience} Jahre Erfahrung
                  </Badge>
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                {selectedCandidate.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {selectedCandidate.email}
                  </div>
                )}
                {selectedCandidate.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {selectedCandidate.location}
                  </div>
                )}
              </div>

              {/* AI Summary */}
              {selectedCandidate.summary_ai && (
                <div className="bg-teal-50 rounded-xl p-4">
                  <h4 className="font-semibold text-teal-900 mb-2">KI-Zusammenfassung</h4>
                  <p className="text-teal-800 text-sm">{selectedCandidate.summary_ai}</p>
                </div>
              )}

              {/* Skills */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education */}
              {selectedCandidate.education && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Ausbildung</h4>
                  <p className="text-slate-600">{selectedCandidate.education}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedCandidate(null)}
                >
                  Schließen
                </Button>
                <Button 
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  onClick={() => {
                    setMatchCandidate(selectedCandidate)
                    setSelectedCandidate(null)
                  }}
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  Mit Job matchen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Job Match Modal */}
      <JobMatchModal
        open={!!matchCandidate}
        onOpenChange={() => setMatchCandidate(null)}
        candidateId={matchCandidate?.id || ""}
        candidateName={matchCandidate?.full_name || ""}
        onSuccess={() => mutate()}
      />
    </>
  )
}
