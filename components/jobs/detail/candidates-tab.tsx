"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
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
  Search,
  MoreHorizontal,
  Eye,
  Calendar,
  XCircle,
  Zap,
  Loader2,
} from "lucide-react"
import { MatchScoreBreakdown } from "./match-score-breakdown"

const mockCandidates = [
  {
    id: "1",
    name: "Anna Schmidt",
    initials: "AS",
    matchScore: 92,
    topSkills: ["React", "TypeScript", "Next.js"],
    experienceMatch: "5 Jahre Frontend",
    status: "new" as const,
  },
  {
    id: "2",
    name: "Thomas Müller",
    initials: "TM",
    matchScore: 87,
    topSkills: ["React", "JavaScript", "CSS"],
    experienceMatch: "4 Jahre Frontend",
    status: "reviewed" as const,
  },
  {
    id: "3",
    name: "Lisa Weber",
    initials: "LW",
    matchScore: 84,
    topSkills: ["Vue.js", "TypeScript", "Tailwind"],
    experienceMatch: "6 Jahre Frontend",
    status: "interview" as const,
  },
  {
    id: "4",
    name: "Michael Bauer",
    initials: "MB",
    matchScore: 78,
    topSkills: ["React", "Node.js", "MongoDB"],
    experienceMatch: "3 Jahre Fullstack",
    status: "new" as const,
  },
  {
    id: "5",
    name: "Sarah Klein",
    initials: "SK",
    matchScore: 65,
    topSkills: ["Angular", "TypeScript", "RxJS"],
    experienceMatch: "4 Jahre Frontend",
    status: "rejected" as const,
  },
]

const statusConfig = {
  new: { label: "Neu", className: "bg-blue-100 text-blue-700" },
  reviewed: { label: "Geprüft", className: "bg-muted text-muted-foreground" },
  interview: { label: "Interview", className: "bg-success/10 text-success" },
  rejected: { label: "Abgelehnt", className: "bg-destructive/10 text-destructive" },
}

function getScoreColor(score: number) {
  if (score >= 80) return "bg-success"
  if (score >= 60) return "bg-warning"
  return "bg-destructive"
}

function getScoreTextColor(score: number) {
  if (score >= 80) return "text-success"
  if (score >= 60) return "text-warning-foreground"
  return "text-destructive"
}

export function JobCandidatesTab() {
  const [isMatching, setIsMatching] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)

  const handleRunMatching = async () => {
    setIsMatching(true)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsMatching(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Kandidaten durchsuchen..." className="pl-9" />
        </div>
        <Button onClick={handleRunMatching} disabled={isMatching}>
          {isMatching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              AI analysiert Kandidaten...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Matching starten
            </>
          )}
        </Button>
      </div>

      {/* Candidates List */}
      <div className="space-y-3">
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
                    <p className="text-sm text-muted-foreground truncate">
                      {candidate.experienceMatch}
                    </p>
                  </div>
                </div>

                {/* Match Score */}
                <div
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedCandidate(candidate.id)}
                >
                  <div className="w-32">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Match</span>
                      <span className={`text-sm font-semibold ${getScoreTextColor(candidate.matchScore)}`}>
                        {candidate.matchScore}%
                      </span>
                    </div>
                    <Progress
                      value={candidate.matchScore}
                      className={`h-2 ${getScoreColor(candidate.matchScore)}`}
                    />
                  </div>
                </div>

                {/* Top Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {candidate.topSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>

                {/* Status */}
                <Badge className={statusConfig[candidate.status].className}>
                  {statusConfig[candidate.status].label}
                </Badge>

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
                      Match-Details anzeigen
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Calendar className="mr-2 h-4 w-4" />
                      Interview planen
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <XCircle className="mr-2 h-4 w-4" />
                      Ablehnen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Match Score Breakdown Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Match-Score Analyse</DialogTitle>
          </DialogHeader>
          {selectedCandidate && (
            <MatchScoreBreakdown
              candidate={mockCandidates.find((c) => c.id === selectedCandidate)!}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
