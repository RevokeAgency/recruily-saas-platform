"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Mail,
  MapPin,
  Briefcase,
  Filter,
  ArrowUpDown,
  UserPlus,
  Sparkles,
  Loader2,
  Trash2,
  X,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  List,
  ChevronRight,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import Link from "next/link"
import { CandidateMatchModal } from "./candidate-match-modal"
import { RejectionModal } from "@/components/ui/rejection-modal"
import { createClient } from "@/lib/supabase/client"

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
  photo_url: string | null
  resume_path: string | null
  cover_letter_path: string | null
  status: "queued" | "analyzing" | "scored" | "error" | "stale" | "new" | "shortlisted" | "interviewed" | "Eingeladen" | "Abgesagt"
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

function getScoreColor(score: number) {
  if (score >= 80) return "text-primary"
  if (score >= 60) return "text-amber-500"
  return "text-destructive"
}

// German label + badge styling per status (raw enum values read unprofessional).
function statusMeta(status: Candidate["status"]): { label: string; className: string } {
  switch (status) {
    case "scored": return { label: "Bewertet", className: "border-[rgba(22,199,124,.4)] text-[var(--rv-green-deep)] bg-[var(--app-green-wash)]" }
    case "analyzing": return { label: "Analysiere…", className: "border-border text-muted-foreground" }
    case "queued": return { label: "Wartet auf Kontingent", className: "border-amber-200 text-amber-600 bg-amber-50" }
    case "error": return { label: "Fehler", className: "border-destructive/30 text-destructive" }
    case "new": return { label: "Neu", className: "border-blue-200 text-blue-600 bg-blue-50" }
    case "shortlisted": return { label: "Shortlist", className: "border-[rgba(22,199,124,.4)] text-[var(--rv-green-deep)]" }
    case "interviewed":
    case "Eingeladen": return { label: "Eingeladen", className: "border-amber-200 text-amber-600 bg-amber-50" }
    case "Abgesagt": return { label: "Abgesagt", className: "border-border text-muted-foreground" }
    default: return { label: status, className: "border-border text-muted-foreground" }
  }
}

const MAX_VISIBLE_SKILLS = 8

export function JobCandidatesTab({ jobId, jobTitle, job }: JobCandidatesTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState("match")
  const [viewMode, setViewMode] = useState<"detail" | "list">("detail")

  // Remember the chosen view across visits.
  useEffect(() => {
    const saved = localStorage.getItem("revetly:candidates:view")
    if (saved === "list" || saved === "detail") setViewMode(saved)
  }, [])
  const changeView = (mode: "detail" | "list") => {
    setViewMode(mode)
    localStorage.setItem("revetly:candidates:view", mode)
  }
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [matchModalOpen, setMatchModalOpen] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<Candidate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [rejectionCandidate, setRejectionCandidate] = useState<Candidate | null>(null)

  // Fetch candidates for this job - refresh every 2s while any candidate is analyzing
  const { data, error, isLoading, mutate } = useSWR<{ candidates: Candidate[] }>(
    `/api/jobs/${jobId}/candidates`,
    fetcher,
    {
      refreshInterval: (latestData) => {
        // Check if any candidate is still analyzing
        const hasAnalyzing = latestData?.candidates?.some(c => c.status === "analyzing")
        return hasAnalyzing ? 2000 : 0 // Poll every 2s if analyzing, otherwise stop
      },
    }
  )

  const candidates = data?.candidates || []

  const filteredCandidates = candidates
    .filter((c) =>
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .filter((c) => filterStatus === "all" || c.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case "experience": return (b.years_of_experience || 0) - (a.years_of_experience || 0)
        case "name": return (a.full_name || "").localeCompare(b.full_name || "", "de")
        case "date": return new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
        default: return (b.match_score || 0) - (a.match_score || 0)
      }
    })

  // Helper to get initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const [retryingPhoto, setRetryingPhoto] = useState<string | null>(null)
  const retryPhoto = async (candidateId: string) => {
    setRetryingPhoto(candidateId)
    try {
      const res = await fetch(`/api/candidates/${candidateId}/photo`, { method: "POST" })
      const data = await res.json()
      if (data.ok) {
        toast.success("Foto aus dem Lebenslauf übernommen")
        mutate()
      } else {
        toast.error(data.reason || data.error || "Kein Foto gefunden")
      }
    } catch {
      toast.error("Foto-Extraktion fehlgeschlagen")
    } finally {
      setRetryingPhoto(null)
    }
  }

  const [openingDoc, setOpeningDoc] = useState<string | null>(null)
  const openDocument = async (candidateId: string, type: "resume" | "cover") => {
    setOpeningDoc(`${candidateId}-${type}`)
    try {
      const res = await fetch(`/api/candidates/${candidateId}/document?type=${type}`)
      const data = await res.json()
      if (res.ok && data.url) window.open(data.url, "_blank", "noopener")
      else toast.error(data.error || "Dokument konnte nicht geladen werden")
    } catch {
      toast.error("Dokument konnte nicht geladen werden")
    } finally {
      setOpeningDoc(null)
    }
  }

  // Delete candidate from job
  const handleDeleteCandidate = async () => {
    if (!deleteCandidate) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/jobs/${jobId}/candidates?linkId=${deleteCandidate.linkId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const result = await response.json()
        toast.error(result.error || "Fehler beim Entfernen des Kandidaten")
        return
      }

      toast.success(`${deleteCandidate.full_name} wurde aus dem Job entfernt`)
      mutate() // Refresh the candidate list
    } catch (error) {
      console.error("Error deleting candidate:", error)
      toast.error("Fehler beim Entfernen des Kandidaten")
    } finally {
      setIsDeleting(false)
      setDeleteCandidate(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-full flex-none" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-16 flex-none" />
            </CardContent>
          </Card>
        ))}
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Kandidaten</h2>
          <p className="text-muted-foreground text-sm">
            {filteredCandidates.length} {filteredCandidates.length === 1 ? "Kandidat" : "Kandidaten"} für {jobTitle}
          </p>
        </div>
        <Button asChild>
          <Link href={`/candidates/new?jobId=${jobId}`}>
            <UserPlus className="mr-2 h-4 w-4" />
            Kandidat hinzufügen
          </Link>
        </Button>
      </div>

      {/* Search, Filters, View Toggle */}
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nach Name, E-Mail oder Skills suchen…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[170px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Alle Kandidaten" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kandidaten</SelectItem>
                  <SelectItem value="scored">Bewertet</SelectItem>
                  <SelectItem value="queued">Wartet auf Kontingent</SelectItem>
                  <SelectItem value="Eingeladen">Eingeladen</SelectItem>
                  <SelectItem value="Abgesagt">Abgesagt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Match Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">Match Score</SelectItem>
                  <SelectItem value="experience">Erfahrung</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Zuletzt hinzugefügt</SelectItem>
                </SelectContent>
              </Select>
              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-border p-0.5" role="group" aria-label="Ansicht">
                <button
                  type="button"
                  onClick={() => changeView("detail")}
                  aria-pressed={viewMode === "detail"}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
                    viewMode === "detail" ? "bg-[var(--rv-mist)] text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => changeView("list")}
                  aria-pressed={viewMode === "list"}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
                    viewMode === "list" ? "bg-[var(--rv-mist)] text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-4 w-4" />
                  Liste
                </button>
              </div>
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
            <Button asChild>
              <Link href={`/candidates/new?jobId=${jobId}`}>
                <UserPlus className="mr-2 h-4 w-4" />
                Kandidat hinzufügen
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Compact list view */}
      {viewMode === "list" && filteredCandidates.length > 0 && (
        <Card className="overflow-hidden rounded-xl border border-border">
          <ul className="divide-y divide-border">
            {filteredCandidates.map((candidate) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedCandidate(candidate); setMatchModalOpen(true) }}
                  disabled={candidate.status === "analyzing"}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--rv-mist)] disabled:cursor-default lg:px-5"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    {candidate.photo_url && <AvatarImage src={candidate.photo_url} alt={candidate.full_name} className="object-cover" />}
                    <AvatarFallback
                      className="text-sm font-semibold text-[#0C1A16]"
                      style={{ backgroundImage: "var(--rv-gradient)" }}
                    >
                      {getInitials(candidate.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1 lg:grid lg:grid-cols-[1.2fr_1.4fr_1fr_0.8fr] lg:items-center lg:gap-4">
                    <p className="truncate font-semibold text-foreground">{candidate.full_name}</p>
                    <p className="hidden truncate text-sm text-muted-foreground lg:block">{candidate.email || "–"}</p>
                    <p className="hidden truncate text-sm text-muted-foreground lg:block">{candidate.location || "–"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {candidate.years_of_experience} Jahre
                    </p>
                  </div>

                  <div className="flex w-24 flex-shrink-0 items-center justify-end gap-2">
                    {candidate.status === "analyzing" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[var(--rv-green-deep)]" />
                    ) : candidate.status === "queued" ? (
                      <span className="text-xs font-medium text-amber-600">Wartet</span>
                    ) : candidate.match_score != null ? (
                      <span className={`text-lg font-bold tabular-nums ${getScoreColor(candidate.match_score)}`}>
                        {candidate.match_score}%
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">–</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Detail cards */}
      {viewMode === "detail" && (
      <div className="space-y-4">
        {filteredCandidates.map((candidate) => (
          <Card
            key={candidate.id}
            className="rounded-xl transition-shadow duration-150 ease-out hover:shadow-[0_1px_2px_rgba(12,26,22,.04),0_14px_32px_-14px_rgba(12,26,22,.14)]"
          >
            <CardContent className="p-6">
              <div className="flex flex-col xl:flex-row gap-6">
                {/* Left: Candidate Info */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-12 w-12">
                      {candidate.photo_url && <AvatarImage src={candidate.photo_url} alt={candidate.full_name} className="object-cover" />}
                      <AvatarFallback
                        className="text-[#0C1A16] font-semibold"
                        style={{ backgroundImage: "var(--rv-gradient)" }}
                      >
                        {getInitials(candidate.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-lg">{candidate.full_name}</h3>
                        <Badge variant="outline" className={`text-xs ${statusMeta(candidate.status).className}`}>
                          {statusMeta(candidate.status).label}
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

                  {/* Skills (capped — the full list lives in the details modal) */}
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {candidate.skills.slice(0, MAX_VISIBLE_SKILLS).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-[var(--app-green-wash)] px-3 py-1 text-xs font-medium text-[var(--rv-green-deep)]"
                        >
                          {skill}
                        </span>
                      ))}
                      {candidate.skills.length > MAX_VISIBLE_SKILLS && (
                        <button
                          type="button"
                          onClick={() => { setSelectedCandidate(candidate); setMatchModalOpen(true) }}
                          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-[var(--rv-mist)] hover:text-foreground"
                        >
                          +{candidate.skills.length - MAX_VISIBLE_SKILLS} weitere
                        </button>
                      )}
                    </div>
                  )}

                  {/* AI Summary */}
                  {candidate.summary_ai && (
                    <div className="rounded-lg bg-[var(--rv-mist)] p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-[var(--rv-green-deep)]" />
                        <span className="font-medium text-sm text-[var(--rv-green-deep)]">KI-Zusammenfassung</span>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{candidate.summary_ai}</p>
                    </div>
                  )}

                  {/* Documents */}
                  {(candidate.resume_path || candidate.cover_letter_path) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {candidate.resume_path && (
                        <Button
                          variant="outline" size="sm" className="gap-2"
                          disabled={openingDoc === `${candidate.id}-resume`}
                          onClick={() => openDocument(candidate.id, "resume")}
                        >
                          {openingDoc === `${candidate.id}-resume`
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <FileText className="h-4 w-4 text-[var(--rv-green-deep)]" />}
                          Lebenslauf
                        </Button>
                      )}
                      {candidate.cover_letter_path && (
                        <Button
                          variant="outline" size="sm" className="gap-2"
                          disabled={openingDoc === `${candidate.id}-cover`}
                          onClick={() => openDocument(candidate.id, "cover")}
                        >
                          {openingDoc === `${candidate.id}-cover`
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <FileText className="h-4 w-4 text-[var(--rv-green-deep)]" />}
                          Anschreiben
                        </Button>
                      )}
                      {candidate.resume_path && !candidate.photo_url && candidate.resume_path.toLowerCase().endsWith(".pdf") && (
                        <Button
                          variant="outline" size="sm" className="gap-2"
                          disabled={retryingPhoto === candidate.id}
                          onClick={() => retryPhoto(candidate.id)}
                        >
                          {retryingPhoto === candidate.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <ImageIcon className="h-4 w-4 text-[var(--rv-green-deep)]" />}
                          Foto extrahieren
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Match Score - Only Overall Score */}
                <div className="xl:w-48 xl:border-l xl:pl-6 xl:border-border flex flex-col items-center xl:items-end">
                  {/* Score Display */}
                  <div className="text-center xl:text-right mb-4">
                    {candidate.status === "analyzing" ? (
                      <div className="flex flex-col items-center xl:items-end">
                        <div className="w-16 h-16 mb-2 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 text-[var(--rv-green-deep)] animate-spin" />
                        </div>
                        <p className="text-sm font-medium text-[var(--rv-green-deep)]">Analysiere...</p>
                      </div>
                    ) : candidate.status === "queued" ? (
                      <div className="flex flex-col items-center xl:items-end">
                        <div className="w-16 h-16 mb-2 flex items-center justify-center">
                          <Sparkles className="h-7 w-7 text-amber-500" />
                        </div>
                        <p className="text-sm font-medium text-amber-600">Kontingent aufgebraucht</p>
                        <a href="/subscription" className="text-xs text-[var(--rv-green-deep)] hover:underline">
                          Upgraden zum Scoren
                        </a>
                      </div>
                    ) : candidate.match_score !== null && candidate.match_score !== undefined ? (
                      <div className="flex flex-col items-center xl:items-end">
                        <div className={`text-5xl font-bold ${getScoreColor(candidate.match_score)}`}>
                          {candidate.match_score}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Match Score</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center xl:items-end">
                        <div className="text-3xl font-bold text-slate-300">--</div>
                        <p className="text-sm text-muted-foreground mt-1">Kein Score</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => {
                          setSelectedCandidate(candidate)
                          setMatchModalOpen(true)
                        }}
                        disabled={candidate.status === "analyzing"}
                      >
                        <Sparkles className="h-4 w-4" />
                        {candidate.match_score !== null ? "Details" : "Profil"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => setDeleteCandidate(candidate)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {candidate.status !== "Abgesagt" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectionCandidate(candidate)}
                        className="w-full gap-1.5 border-border text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                        Absage senden
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled className="w-full text-muted-foreground">
                        Absage gesendet
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Rejection Modal */}
      {rejectionCandidate && (
        <RejectionModal
          isOpen={!!rejectionCandidate}
          onClose={() => setRejectionCandidate(null)}
          candidateName={rejectionCandidate.full_name}
          candidateEmail={rejectionCandidate.email ?? ""}
          jobTitle={jobTitle}
          companyName={job.company}
          onSuccess={() => {
            const supabase = createClient()
            supabase
              .from("job_candidates")
              .update({ status: "Abgesagt" })
              .eq("id", rejectionCandidate.linkId)
              .then(() => {
                toast.success("Absage wurde gesendet ✓")
                mutate()
                setRejectionCandidate(null)
              })
          }}
        />
      )}

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCandidate} onOpenChange={() => setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kandidat entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du <span className="font-semibold">{deleteCandidate?.full_name}</span> aus diesem Job entfernen? 
              Der Kandidat bleibt im allgemeinen Kandidatenpool erhalten und kann später wieder hinzugefügt werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCandidate}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entferne...
                </>
              ) : (
                "Entfernen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
