"use client"

import { useState } from "react"
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
  Phone,
  Calendar,
  TrendingUp,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { CandidateProfile } from "./candidate-profile"

const mockCandidates = [
  {
    id: "1",
    name: "Anna Schmidt",
    initials: "AS",
    email: "anna.schmidt@email.at",
    phone: "+43 660 1234567",
    topSkills: ["React", "TypeScript", "Next.js"],
    jobsMatched: 3,
    bestScore: 92,
    uploadDate: "15.03.2024",
  },
  {
    id: "2",
    name: "Thomas Müller",
    initials: "TM",
    email: "t.mueller@email.de",
    phone: "+43 664 9876543",
    topSkills: ["Python", "Machine Learning", "TensorFlow"],
    jobsMatched: 2,
    bestScore: 87,
    uploadDate: "14.03.2024",
  },
  {
    id: "3",
    name: "Lisa Weber",
    initials: "LW",
    email: "lisa.weber@email.at",
    phone: "+43 676 5555555",
    topSkills: ["Java", "Spring Boot", "Kubernetes"],
    jobsMatched: 4,
    bestScore: 89,
    uploadDate: "12.03.2024",
  },
  {
    id: "4",
    name: "Michael Bauer",
    initials: "MB",
    email: "m.bauer@email.at",
    phone: "+43 650 1111111",
    topSkills: ["Product Management", "Agile", "Jira"],
    jobsMatched: 1,
    bestScore: 78,
    uploadDate: "10.03.2024",
  },
  {
    id: "5",
    name: "Sarah Klein",
    initials: "SK",
    email: "sarah.klein@email.de",
    phone: "+43 699 2222222",
    topSkills: ["UX Design", "Figma", "User Research"],
    jobsMatched: 2,
    bestScore: 84,
    uploadDate: "08.03.2024",
  },
  {
    id: "6",
    name: "David Gruber",
    initials: "DG",
    email: "d.gruber@email.at",
    phone: "+43 660 3333333",
    topSkills: ["DevOps", "AWS", "Terraform"],
    jobsMatched: 0,
    bestScore: 0,
    uploadDate: "05.03.2024",
  },
]

function getScoreColor(score: number) {
  if (score >= 80) return "text-success"
  if (score >= 60) return "text-warning-foreground"
  return "text-muted-foreground"
}

export function CandidatesList() {
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)

  if (mockCandidates.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Noch keine Kandidaten"
        description="Lade deinen ersten Kandidaten-CV hoch, um mit dem Matching zu beginnen."
        actionLabel="Kandidaten hochladen"
        onAction={() => document.getElementById("cv-upload")?.click()}
      />
    )
  }

  const selectedCandidateData = mockCandidates.find((c) => c.id === selectedCandidate)

  return (
    <>
      <div className="grid gap-4">
        {mockCandidates.map((candidate) => (
          <Card key={candidate.id} className="border border-border hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Candidate Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {candidate.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {candidate.name}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{candidate.email}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {candidate.topSkills.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{candidate.jobsMatched} Jobs</span>
                  </div>

                  {candidate.bestScore > 0 && (
                    <div className={`flex items-center gap-1.5 ${getScoreColor(candidate.bestScore)}`}>
                      <TrendingUp className="h-4 w-4" />
                      <span>Best: {candidate.bestScore}%</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-muted-foreground hidden sm:flex">
                    <Calendar className="h-4 w-4" />
                    <span>{candidate.uploadDate}</span>
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedCandidate(candidate.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Profil anzeigen
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Briefcase className="mr-2 h-4 w-4" />
                      Mit Job matchen
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Candidate Profile Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kandidatenprofil</DialogTitle>
          </DialogHeader>
          {selectedCandidateData && (
            <CandidateProfile candidate={selectedCandidateData} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
