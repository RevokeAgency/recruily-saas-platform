"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Briefcase,
  Clock,
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  GraduationCap,
} from "lucide-react"

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  employment_type: string | null
  description: string | null
  required_skills: string[] | null
  nice_to_have_skills: string[] | null
  years_experience: string | null
  education: string | null
  salary_range: string | null
}

const getEmploymentLabel = (type: string | null) => {
  switch (type) {
    case "full-time": return "Vollzeit"
    case "part-time": return "Teilzeit"
    case "contract": return "Freelance / Vertrag"
    case "remote": return "Remote"
    default: return type || "Vollzeit"
  }
}

export default function ApplyPage() {
  const params = useParams()
  const jobId = params.jobId as string

  const [job, setJob] = useState<Job | null>(null)
  const [jobLoading, setJobLoading] = useState(true)
  const [jobNotFound, setJobNotFound] = useState(false)

  // Form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [dsgvo, setDsgvo] = useState(false)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`/api/public/jobs/${jobId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.job) setJob(data.job)
        else setJobNotFound(true)
      })
      .catch(() => setJobNotFound(true))
      .finally(() => setJobLoading(false))
  }, [jobId])

  const handleFileChange = (file: File | null) => {
    if (!file) return
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if (!validTypes.includes(file.type)) {
      setErrors((e) => ({ ...e, cv: "Nur PDF oder DOCX erlaubt." }))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((e) => ({ ...e, cv: "Maximale Dateigröße: 10 MB." }))
      return
    }
    setErrors((e) => { const n = { ...e }; delete n.cv; return n })
    setCvFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileChange(file)
  }, [])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!firstName.trim()) errs.firstName = "Pflichtfeld"
    if (!lastName.trim()) errs.lastName = "Pflichtfeld"
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = "Gültige E-Mail erforderlich"
    if (!cvFile) errs.cv = "Bitte laden Sie Ihren Lebenslauf hoch."
    if (!dsgvo) errs.dsgvo = "Bitte stimmen Sie der Datenschutzerklärung zu."
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setIsSubmitting(true)

    try {
      // Step 1: Parse CV
      let parsedData: Record<string, unknown> = { full_name: `${firstName} ${lastName}`, email, phone }

      if (cvFile) {
        const formData = new FormData()
        formData.append("file", cvFile)
        const parseRes = await fetch("/api/candidates/parse", { method: "POST", body: formData })
        if (parseRes.ok) {
          const parseResult = await parseRes.json()
          if (parseResult.data) {
            parsedData = {
              ...parseResult.data,
              // Always override with what the applicant entered
              full_name: `${firstName} ${lastName}`,
              email,
              phone: phone || parseResult.data.phone,
            }
          }
        }
      }

      // Step 2: Upload CV to Supabase Storage (anon key, public: false bucket)
      if (cvFile) {
        const uploadFormData = new FormData()
        uploadFormData.append("file", cvFile)
        uploadFormData.append("jobId", jobId)
        uploadFormData.append("candidateName", `${firstName} ${lastName}`)
        // Non-fatal — proceed even if storage fails
        await fetch("/api/public/upload-resume", { method: "POST", body: uploadFormData }).catch(() => null)
      }

      // Step 3: Create candidate + trigger matching
      const applyRes = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, candidateData: { ...parsedData, note: message } }),
      })

      if (!applyRes.ok) {
        const err = await applyRes.json()
        throw new Error(err.error || "Unbekannter Fehler")
      }

      setSubmitted(true)
    } catch (err) {
      console.error("[v0] Apply submit error:", err)
      setErrors({ submit: err instanceof Error ? err.message : "Fehler beim Senden. Bitte versuchen Sie es erneut." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Loading / Not found states ---
  if (jobLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (jobNotFound || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Stelle nicht gefunden</h1>
          <p className="text-slate-500">Diese Stelle ist nicht mehr aktiv oder existiert nicht.</p>
        </div>
      </div>
    )
  }

  // --- Success state ---
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Vielen Dank für Ihre Bewerbung!</h1>
          <p className="text-slate-600 leading-relaxed">
            Wir haben Ihre Unterlagen erhalten und melden uns in Kürze bei Ihnen.
          </p>
          <div className="mt-6 p-4 bg-white rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500">Beworben auf</p>
            <p className="font-semibold text-slate-900">{job.title}</p>
            <p className="text-sm text-slate-500">{job.company}</p>
          </div>
        </div>
      </div>
    )
  }

  // --- Main apply page ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header / Branding */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-semibold text-slate-900 text-lg">REVETLY</span>
          </div>
          <span className="text-sm text-slate-500">Stellenbewerbung</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Job Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Briefcase className="h-7 w-7 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{job.title}</h1>
              <p className="text-slate-600 font-medium">{job.company}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-5">
            {job.location && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                {job.location}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              {getEmploymentLabel(job.employment_type)}
            </div>
            {job.years_experience && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <GraduationCap className="h-4 w-4" />
                {job.years_experience} Erfahrung
              </div>
            )}
          </div>

          {job.description && (
            <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-line border-t border-slate-100 pt-4">
              {job.description}
            </div>
          )}

          {(job.required_skills?.length ?? 0) > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-2">Gesuchte Skills</p>
              <div className="flex flex-wrap gap-2">
                {job.required_skills!.map((s) => (
                  <Badge key={s} variant="secondary" className="bg-teal-50 text-teal-700 border-teal-100">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">Ihre Bewerbung</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Vorname <span className="text-red-500">*</span></Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Max"
                  className={errors.firstName ? "border-red-300" : ""}
                />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Nachname <span className="text-red-500">*</span></Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Mustermann"
                  className={errors.lastName ? "border-red-300" : ""}
                />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email-Adresse <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="max@beispiel.at"
                className={errors.email ? "border-red-300" : ""}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+43 660 123 4567"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label htmlFor="message">Nachricht / Motivationsschreiben <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Warum bewerben Sie sich auf diese Stelle?"
                rows={4}
              />
            </div>

            {/* CV Upload */}
            <div className="space-y-1.5">
              <Label>Lebenslauf (CV) hochladen <span className="text-red-500">*</span></Label>
              {cvFile ? (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-teal-200 bg-teal-50">
                  <FileText className="h-5 w-5 text-teal-600 shrink-0" />
                  <span className="text-sm text-teal-800 font-medium truncate flex-1">{cvFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setCvFile(null)}
                    className="text-teal-500 hover:text-teal-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-teal-400 bg-teal-50"
                      : errors.cv
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"
                  }`}
                  onClick={() => document.getElementById("cv-input")?.click()}
                >
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">Datei hierher ziehen oder klicken</p>
                  <p className="text-xs text-slate-400 mt-1">PDF oder DOCX, max. 10 MB</p>
                  <input
                    id="cv-input"
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}
              {errors.cv && <p className="text-xs text-red-500">{errors.cv}</p>}
            </div>

            {/* DSGVO */}
            <div className="space-y-1.5">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="dsgvo"
                  checked={dsgvo}
                  onCheckedChange={(v) => setDsgvo(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="dsgvo" className="text-sm text-slate-600 font-normal leading-relaxed cursor-pointer">
                  Ich stimme der Verarbeitung meiner Daten gemäß{" "}
                  <span className="text-teal-600 underline">Datenschutzerklärung</span> zu.{" "}
                  <span className="text-red-500">*</span>
                </Label>
              </div>
              {errors.dsgvo && <p className="text-xs text-red-500">{errors.dsgvo}</p>}
            </div>

            {errors.submit && (
              <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">{errors.submit}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 text-base font-medium"
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Wird gesendet...</>
              ) : (
                "Jetzt bewerben"
              )}
            </Button>

            <p className="text-center text-xs text-slate-400">
              Powered by <span className="font-semibold">REVETLY</span> — Intelligentes Recruiting
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
