"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft,
  FileUp,
  FileText,
  Upload,
  Loader2,
  X,
  Plus,
  CheckCircle2,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  User
} from "lucide-react"
import { toast } from "sonner"

type ExperienceLevel = "junior" | "mid" | "senior"

interface CandidateData {
  full_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  years_of_experience: number
  experience_level: ExperienceLevel
  skills: string[]
  education: string | null
  location: string | null
  summary_ai: string | null
}

const experienceLevelConfig = {
  junior: { label: "Junior", color: "bg-blue-100 text-blue-700", years: "0-2 Jahre" },
  mid: { label: "Mid-Level", color: "bg-amber-100 text-amber-700", years: "3-5 Jahre" },
  senior: { label: "Senior", color: "bg-emerald-100 text-emerald-700", years: "6+ Jahre" },
}

function NewCandidateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams.get("jobId")
  
  const [step, setStep] = useState<"upload" | "preview" | "success">("upload")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [candidateData, setCandidateData] = useState<CandidateData | null>(null)
  const [newSkill, setNewSkill] = useState("")
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setCvFile(file)
    setIsProcessing(true)

    try {
      // Use FormData for file uploads - more efficient and handles larger files
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/candidates/parse", {
        method: "POST",
        body: formData,
      })

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorResult = await response.json()
          toast.error(errorResult.error || "Fehler beim Analysieren des CVs")
        } else {
          // Handle non-JSON error responses (e.g., "Request Entity Too Large")
          const errorText = await response.text()
          console.error("Server error:", errorText)
          if (errorText.includes("Request Entity Too Large") || response.status === 413) {
            toast.error("Die Datei ist zu groß. Bitte verwende eine kleinere Datei oder den Text-Modus.")
          } else {
            toast.error("Fehler beim Analysieren des CVs. Bitte versuche es erneut.")
          }
        }
        setIsProcessing(false)
        return
      }

      const result = await response.json()

      if (result.error) {
        toast.error(result.error || "Fehler beim Analysieren des CVs")
        setIsProcessing(false)
        return
      }

      setCandidateData(result.data)
      setStep("preview")
      toast.success("CV erfolgreich analysiert")
    } catch (error) {
      console.error("Error parsing CV:", error)
      toast.error("Fehler beim Analysieren des CVs")
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle text paste fallback
  const handleTextSubmit = async (text: string) => {
    if (!text.trim()) {
      toast.error("Bitte füge CV-Text ein")
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch("/api/candidates/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textContent: text }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        toast.error(result.error || "Fehler beim Analysieren des CVs")
        setIsProcessing(false)
        return
      }

      setCandidateData(result.data)
      setStep("preview")
      toast.success("CV erfolgreich analysiert")
    } catch (error) {
      console.error("Error parsing CV:", error)
      toast.error("Fehler beim Analysieren des CVs")
    } finally {
      setIsProcessing(false)
    }
  }

  // Add skill
  const addSkill = () => {
    if (!newSkill.trim() || !candidateData) return
    if (candidateData.skills.includes(newSkill.trim())) {
      toast.error("Skill bereits vorhanden")
      return
    }
    setCandidateData({
      ...candidateData,
      skills: [...candidateData.skills, newSkill.trim()],
    })
    setNewSkill("")
  }

  // Remove skill
  const removeSkill = (skill: string) => {
    if (!candidateData) return
    setCandidateData({
      ...candidateData,
      skills: candidateData.skills.filter((s) => s !== skill),
    })
  }

  // Set experience level
  const setExperienceLevel = (level: ExperienceLevel) => {
    if (!candidateData) return
    setCandidateData({ ...candidateData, experience_level: level })
  }

  // Save candidate
  const saveCandidate = async () => {
    if (!candidateData) return

    setIsSaving(true)

    try {
      const response = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...candidateData,
          jobId: jobId, // Include jobId to link candidate to job
        }),
      })

      const result = await response.json()

      if (response.status === 403 && result.error === "match_limit_reached") {
        toast.error("Match-Limit erreicht. Bitte upgrade deinen Plan.")
        router.push("/subscription")
        setIsSaving(false)
        return
      }

      if (!response.ok || result.error) {
        toast.error(result.error || "Fehler beim Speichern")
        setIsSaving(false)
        return
      }

      // Attach CV + cover letter and extract the photo (best-effort).
      const candidateId = result.candidate?.id
      if (candidateId && (cvFile || coverFile)) {
        try {
          const fd = new FormData()
          if (cvFile) fd.append("cv", cvFile)
          if (coverFile) fd.append("cover", coverFile)
          await fetch(`/api/candidates/${candidateId}/upload`, { method: "POST", body: fd })
        } catch {
          /* non-fatal: candidate is saved, documents are optional */
        }
      }

      // If a match was triggered, notify the counter to refresh
      if (jobId) {
        window.dispatchEvent(new Event("match-completed"))
      }

      setStep("success")
    } catch (error) {
      console.error("Error saving candidate:", error)
      toast.error("Fehler beim Speichern")
    } finally {
      setIsSaving(false)
    }
  }

  // Get initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href={jobId ? `/jobs/${jobId}` : "/candidates"}>
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kandidat hinzufügen</h1>
          <p className="text-slate-500">
            {jobId ? "CV hochladen und zum Job hinzufügen" : "CV hochladen und Profil erstellen"}
          </p>
        </div>
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <UploadSection
          isProcessing={isProcessing}
          onFileUpload={handleFileUpload}
          onTextSubmit={handleTextSubmit}
        />
      )}

      {/* Step: Preview */}
      {step === "preview" && candidateData && (
        <PreviewSection
          data={candidateData}
          onDataChange={setCandidateData}
          onAddSkill={addSkill}
          onRemoveSkill={removeSkill}
          onSetExperienceLevel={setExperienceLevel}
          newSkill={newSkill}
          setNewSkill={setNewSkill}
          getInitials={getInitials}
          isSaving={isSaving}
          onSave={saveCandidate}
          onBack={() => setStep("upload")}
          coverFile={coverFile}
          onCoverChange={setCoverFile}
        />
      )}

      {/* Step: Success */}
      {step === "success" && candidateData && (
        <SuccessSection 
          candidateName={candidateData.full_name}
          jobId={jobId}
          onAddAnother={() => {
            setCandidateData(null)
            setStep("upload")
          }}
        />
      )}
    </div>
  )
}

export default function NewCandidatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-16">
          <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
        </div>
      }
    >
      <NewCandidateContent />
    </Suspense>
  )
}

// Upload Section Component
function UploadSection({
  isProcessing,
  onFileUpload,
  onTextSubmit,
}: {
  isProcessing: boolean
  onFileUpload: (file: File) => void
  onTextSubmit: (text: string) => void
}) {
  const [showTextFallback, setShowTextFallback] = useState(false)
  const [cvText, setCvText] = useState("")

  return (
    <div className="space-y-6">
      {/* File Upload Card */}
      <Card className="border-2 border-dashed border-slate-200 hover:border-teal-400 transition-colors rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-teal-500" />
              </div>
              <p className="text-lg font-semibold text-slate-900 mt-6">
                KI analysiert CV...
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Extrahiere Fähigkeiten, Erfahrung und Profil
              </p>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16 px-8 cursor-pointer"
              onClick={() => document.getElementById("cv-file-upload")?.click()}
            >
              <input
                id="cv-file-upload"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onFileUpload(file)
                }}
              />
              <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mb-6 transition-transform hover:scale-110">
                <FileUp className="h-10 w-10 text-teal-600" />
              </div>
              <p className="text-lg font-semibold text-slate-900">
                CV hochladen
              </p>
              <p className="text-sm text-slate-500 mt-2">
                PDF oder DOCX Datei hierher ziehen oder klicken
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  .pdf
                </Badge>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  .docx
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Text Fallback */}
      {!isProcessing && (
        <div className="text-center">
          <button
            onClick={() => setShowTextFallback(!showTextFallback)}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            {showTextFallback ? "Datei-Upload verwenden" : "Oder: CV-Text einfügen"}
          </button>
        </div>
      )}

      {showTextFallback && !isProcessing && (
        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                CV-Text einfügen
              </label>
              <Textarea
                placeholder="Kopiere den CV-Text hier hinein..."
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                rows={10}
                className="resize-none"
              />
            </div>
            <Button
              onClick={() => onTextSubmit(cvText)}
              className="w-full"
              disabled={!cvText.trim()}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Mit KI analysieren
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-teal-50 border-teal-200 rounded-2xl">
        <CardContent className="p-5 flex items-start gap-4">
          <Sparkles className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-teal-900">Automatische CV-Analyse</p>
            <p className="text-sm text-teal-700 mt-1">
              Unsere KI extrahiert automatisch alle relevanten Informationen aus dem CV:
              Kontaktdaten, Skills, Berufserfahrung und erstellt ein professionelles Profil.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Preview Section Component
function PreviewSection({
  data,
  onDataChange,
  onAddSkill,
  onRemoveSkill,
  onSetExperienceLevel,
  newSkill,
  setNewSkill,
  getInitials,
  isSaving,
  onSave,
  onBack,
  coverFile,
  onCoverChange,
}: {
  data: CandidateData
  onDataChange: (data: CandidateData) => void
  onAddSkill: () => void
  onRemoveSkill: (skill: string) => void
  onSetExperienceLevel: (level: ExperienceLevel) => void
  newSkill: string
  setNewSkill: (value: string) => void
  getInitials: (name: string) => string
  isSaving: boolean
  onSave: () => void
  onBack: () => void
  coverFile: File | null
  onCoverChange: (file: File | null) => void
}) {
  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-10">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-teal-600">
                  {getInitials(data.full_name)}
                </span>
              </div>
              {/* Name & Role */}
              <div className="text-white">
                <Input
                  value={data.full_name}
                  onChange={(e) => onDataChange({ ...data, full_name: e.target.value })}
                  className="text-2xl font-bold bg-transparent border-none text-white placeholder:text-white/60 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Input
                  value={data.job_title || ""}
                  onChange={(e) => onDataChange({ ...data, job_title: e.target.value })}
                  placeholder="Aktuelle Position"
                  className="text-lg bg-transparent border-none text-white/90 placeholder:text-white/60 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <Input
                  value={data.email || ""}
                  onChange={(e) => onDataChange({ ...data, email: e.target.value })}
                  placeholder="Email"
                  className="border-slate-200"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-slate-500" />
                </div>
                <Input
                  value={data.phone || ""}
                  onChange={(e) => onDataChange({ ...data, phone: e.target.value })}
                  placeholder="Telefon"
                  className="border-slate-200"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-slate-500" />
                </div>
                <Input
                  value={data.location || ""}
                  onChange={(e) => onDataChange({ ...data, location: e.target.value })}
                  placeholder="Standort"
                  className="border-slate-200"
                />
              </div>
            </div>

            {/* AI Summary */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <h3 className="font-semibold text-slate-900">KI-Zusammenfassung</h3>
              </div>
              <Textarea
                value={data.summary_ai || ""}
                onChange={(e) => onDataChange({ ...data, summary_ai: e.target.value })}
                rows={3}
                className="border-slate-200 bg-teal-50/50"
              />
            </div>

            {/* Experience Level */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Erfahrungslevel</h3>
              </div>
              <div className="flex gap-3">
                {(["junior", "mid", "senior"] as ExperienceLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => onSetExperienceLevel(level)}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-[border-color,background-color] duration-150 ease-out ${
                      data.experience_level === level
                        ? "border-primary bg-[var(--app-green-wash)]"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <Badge className={experienceLevelConfig[level].color}>
                      {experienceLevelConfig[level].label}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1">
                      {experienceLevelConfig[level].years}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Skills</h3>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {data.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full text-sm font-medium group"
                  >
                    {skill}
                    <button
                      onClick={() => onRemoveSkill(skill)}
                      className="text-teal-400 hover:text-teal-600 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Neuen Skill hinzufügen..."
                  className="border-slate-200"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      onAddSkill()
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onAddSkill}
                  className="flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Education */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-4 w-4 text-slate-500" />
                <h3 className="font-semibold text-slate-900">Ausbildung</h3>
              </div>
              <Input
                value={data.education || ""}
                onChange={(e) => onDataChange({ ...data, education: e.target.value })}
                placeholder="Höchster Abschluss"
                className="border-slate-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cover letter (optional) */}
      <Card className="border border-border rounded-2xl">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-slate-900 mb-1">Anschreiben / Motivationsschreiben <span className="font-normal text-slate-500">(optional)</span></p>
          {coverFile ? (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--rv-green)] bg-[var(--app-green-wash)] p-3">
              <FileText className="h-5 w-5 flex-shrink-0 text-[var(--rv-green-deep)]" />
              <span className="flex-1 truncate text-sm font-medium text-slate-900">{coverFile.name}</span>
              <button type="button" onClick={() => onCoverChange(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => document.getElementById("cover-upload-input")?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-3 text-sm text-slate-500 transition-colors hover:border-[var(--rv-green)] hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              Anschreiben hinzufügen (PDF oder DOCX)
              <input id="cover-upload-input" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)} />
            </button>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Zurück
        </Button>
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Speichern...
            </>
          ) : (
            "Kandidat aufnehmen"
          )}
        </Button>
      </div>
    </div>
  )
}

// Success Section Component
function SuccessSection({
  candidateName,
  jobId,
  onAddAnother,
}: {
  candidateName: string
  jobId: string | null
  onAddAnother: () => void
}) {
  const router = useRouter()

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-teal-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Kandidat erfolgreich indexiert!
        </h2>
        <p className="text-slate-500 mb-4">
          {candidateName} wurde zu deinem Kandidatenpool hinzugefügt{jobId ? " und dem Job zugeordnet" : ""}.
        </p>
        
        {/* IMLRS Analysis Notice */}
        {jobId && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-8 inline-flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-teal-600" />
            </div>
            <p className="text-sm text-teal-700">
              <span className="font-medium">IMLRS-Analyse läuft automatisch</span> — Der Match-Score wird im Hintergrund berechnet.
            </p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={onAddAnother}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Weiteren Kandidaten hinzufügen
          </Button>
          <Button
            onClick={() => router.push(jobId ? `/jobs/${jobId}` : "/jobs")}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {jobId ? "Zum Candidate Pool" : "Direkt mit Jobs matchen"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
