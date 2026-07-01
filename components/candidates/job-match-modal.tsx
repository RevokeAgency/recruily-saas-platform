"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Search, 
  Briefcase, 
  MapPin, 
  Building2, 
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { PaywallModal } from "@/components/ui/paywall-modal"
import { useProfile } from "@/lib/hooks/useProfile"

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  employment_type: string | null
  is_active: boolean
}

interface JobMatchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateId: string
  candidateName: string
  onSuccess?: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const employmentTypeLabels: Record<string, string> = {
  full_time: "Vollzeit",
  part_time: "Teilzeit",
  contract: "Befristet",
  freelance: "Freiberuflich",
}

export function JobMatchModal({ 
  open, 
  onOpenChange, 
  candidateId, 
  candidateName,
  onSuccess,
}: JobMatchModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [isMatching, setIsMatching] = useState(false)
  const [matchStatus, setMatchStatus] = useState<"idle" | "success" | "error">("idle")
  const [paywallOpen, setPaywallOpen] = useState(false)
  const { profile } = useProfile()

  const { data, isLoading } = useSWR<{ jobs: Job[] }>(
    open ? "/api/jobs" : null,
    fetcher
  )

  const jobs = data?.jobs?.filter(job => job.is_active) || []
  
  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.location?.toLowerCase().includes(query)
    )
  })

  const handleMatch = async () => {
    if (!selectedJob) return

    setIsMatching(true)
    setMatchStatus("idle")

    try {
      const response = await fetch(`/api/candidates/${candidateId}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJob.id }),
      })

      const result = await response.json()

      if (response.status === 403 && result.error === "match_limit_reached") {
        setPaywallOpen(true)
        return
      }

      if (!response.ok) {
        toast.error(result.error || "Fehler beim Matching")
        setMatchStatus("error")
        return
      }

      setMatchStatus("success")
      toast.success(`${candidateName} wird mit "${selectedJob.title}" gematcht`)

      // Notify the match counter (and any other listeners) to refresh
      window.dispatchEvent(new Event("match-completed"))
      
      // Wait a moment to show success state, then close
      setTimeout(() => {
        onOpenChange(false)
        setSelectedJob(null)
        setMatchStatus("idle")
        onSuccess?.()
      }, 1500)
    } catch (error) {
      console.error("Error matching:", error)
      toast.error("Fehler beim Matching")
      setMatchStatus("error")
    } finally {
      setIsMatching(false)
    }
  }

  const handleClose = () => {
    if (!isMatching) {
      onOpenChange(false)
      setSelectedJob(null)
      setSearchQuery("")
      setMatchStatus("idle")
    }
  }

  return (
    <>
    <PaywallModal
      isOpen={paywallOpen}
      onClose={() => setPaywallOpen(false)}
      matchesUsed={profile?.matches_used ?? 0}
    />
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Job auswählen
          </DialogTitle>
          <DialogDescription>
            Wähle einen Job aus, um <span className="font-semibold text-slate-700">{candidateName}</span> zu matchen
          </DialogDescription>
        </DialogHeader>

        {matchStatus === "success" ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-slate-900">Matching gestartet!</p>
            <p className="text-sm text-slate-500 mt-1">
              Der IMLRS-Score wird berechnet...
            </p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Jobs suchen..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Job List */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-2">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg flex-none" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3.5 w-1/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Briefcase className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="font-medium">Keine Jobs gefunden</p>
                  <p className="text-sm">
                    {searchQuery ? "Versuche eine andere Suche" : "Erstelle zuerst einen Job"}
                  </p>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <Card
                    key={job.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedJob?.id === job.id
                        ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    }`}
                    onClick={() => setSelectedJob(job)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          selectedJob?.id === job.id ? "bg-teal-100" : "bg-slate-100"
                        }`}>
                          <Briefcase className={`h-5 w-5 ${
                            selectedJob?.id === job.id ? "text-teal-600" : "text-slate-500"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {job.title}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {job.company}
                            </span>
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {job.location}
                              </span>
                            )}
                          </div>
                        </div>
                        {job.employment_type && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {employmentTypeLabels[job.employment_type] || job.employment_type}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={isMatching}
              >
                Abbrechen
              </Button>
              <Button
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={handleMatch}
                disabled={!selectedJob || isMatching}
              >
                {isMatching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Matche...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Jetzt matchen
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
