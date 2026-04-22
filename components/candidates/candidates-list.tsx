"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
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
  Loader2,
  GraduationCap,
  Plus,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"
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

export function CandidatesList() {
  const { data, error, isLoading, mutate } = useSWR<{ candidates: Candidate[] }>(
    "/api/candidates",
    fetcher
  )
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
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

  const candidates = data?.candidates || []

  if (candidates.length === 0) {
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

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {candidates.map((candidate) => (
          <Card 
            key={candidate.id} 
            className="bg-white border border-slate-200 rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
          >
            <CardContent className="p-5">
              {/* Header with Avatar, Name, Badge and Actions */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-teal-100">
                    <AvatarFallback className="bg-teal-100 text-teal-700 font-semibold">
                      {getInitials(candidate.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-900 text-base">
                      {candidate.full_name}
                    </p>
                    <Badge className={`mt-1 text-xs ${experienceLevelConfig[candidate.experience_level].color}`}>
                      {experienceLevelConfig[candidate.experience_level].label}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={() => setSelectedCandidate(candidate)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Profil anzeigen
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/jobs">
                        <Briefcase className="mr-2 h-4 w-4" />
                        Mit Job matchen
                      </Link>
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

              {/* Job Title & Location */}
              <div className="space-y-2 mb-4">
                {candidate.job_title && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Briefcase className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{candidate.job_title}</span>
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{candidate.location}</span>
                  </div>
                )}
                {candidate.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{candidate.email}</span>
                  </div>
                )}
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {candidate.skills.length > 3 && (
                  <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-medium">
                    +{candidate.skills.length - 3}
                  </span>
                )}
              </div>

              {/* View Profile Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4 text-teal-600 border-teal-200 hover:bg-teal-50"
                onClick={() => setSelectedCandidate(candidate)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Profil ansehen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Candidate Profile Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Kandidatenprofil</DialogTitle>
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
                  <h3 className="text-xl font-bold text-slate-900">
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
                <h4 className="font-semibold text-slate-900 mb-3">Skills</h4>
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
                  <h4 className="font-semibold text-slate-900 mb-2">Ausbildung</h4>
                  <p className="text-slate-600">{selectedCandidate.education}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedCandidate(null)}
                >
                  Schließen
                </Button>
                <Button asChild className="flex-1 bg-teal-600 hover:bg-teal-700">
                  <Link href="/jobs">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Mit Job matchen
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
