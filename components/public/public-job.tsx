"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, Clock, Upload, FileText, X, Loader2, CheckCircle2, GraduationCap, Lock, ArrowDown } from "lucide-react"
import { FormattedJobDescription } from "@/components/jobs/formatted-description"

export interface PublicJob {
  id: string
  title: string
  company: string
  location: string | null
  employment_type: string | null
  description: string | null
  required_skills: string[] | null
  years_experience: string | null
  is_active: boolean
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

function CompanyBrand({ company, logoUrl }: { company: string; logoUrl: string | null }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={company} className="h-14 w-auto max-w-[240px] object-contain" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--app-green-wash)] text-2xl font-bold text-[var(--rv-green-deep)]">
          {company.trim().charAt(0).toUpperCase() || "?"}
        </div>
      )}
      <span className="text-sm font-semibold text-foreground">{company}</span>
    </div>
  )
}

function MetaChip({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 text-[var(--rv-green-deep)]" />
      {children}
    </span>
  )
}

function PoweredBy() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
      <span>Intelligentes Recruiting mit</span>
      <a href="/" aria-label="Revetly" className="inline-flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/revetly/LogoEntwurf-trim.png" alt="Revetly" className="h-5 w-auto" />
      </a>
    </div>
  )
}

export function PublicJobView({ job, logoUrl }: { job: PublicJob; logoUrl: string | null }) {
  const closed = !job.is_active

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [dsgvo, setDsgvo] = useState(false)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    if (!cvFile) errs.cv = "Bitte lade deinen Lebenslauf hoch."
    if (!dsgvo) errs.dsgvo = "Bitte stimme der Datenschutzerklärung zu."
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setIsSubmitting(true)

    try {
      let parsedData: Record<string, unknown> = { full_name: `${firstName} ${lastName}`, email, phone }
      if (cvFile) {
        const fd = new FormData()
        fd.append("file", cvFile)
        const parseRes = await fetch("/api/candidates/parse", { method: "POST", body: fd })
        if (parseRes.ok) {
          const parseResult = await parseRes.json()
          if (parseResult.data) {
            parsedData = {
              ...parseResult.data,
              full_name: `${firstName} ${lastName}`,
              email,
              phone: phone || parseResult.data.phone,
            }
          }
        }
        const up = new FormData()
        up.append("file", cvFile)
        up.append("jobId", job.id)
        up.append("candidateName", `${firstName} ${lastName}`)
        await fetch("/api/public/upload-resume", { method: "POST", body: up }).catch(() => null)
      }

      const applyRes = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, candidateData: { ...parsedData, note: message } }),
      })
      if (!applyRes.ok) {
        const err = await applyRes.json()
        throw new Error(err.error || "Unbekannter Fehler")
      }
      setSubmitted(true)
    } catch (err) {
      console.error("Apply submit error:", err)
      setErrors({ submit: err instanceof Error ? err.message : "Fehler beim Senden. Bitte versuche es erneut." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const scrollToApply = () =>
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" })

  const applyPanel = closed ? (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--app-shadow-card)]">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Lock className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Diese Stelle ist nicht mehr verfügbar</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Die Bewerbungsphase für diese Position wurde beendet. Schau gerne später wieder vorbei.
      </p>
    </div>
  ) : submitted ? (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--app-shadow-card)]">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-green-wash)]">
        <CheckCircle2 className="h-8 w-8 text-[var(--rv-green-deep)]" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Vielen Dank für deine Bewerbung!</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Wir haben deine Unterlagen erhalten und melden uns in Kürze. Du erhältst zusätzlich eine
        Bestätigung per E-Mail.
      </p>
    </div>
  ) : (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--app-shadow-card)]">
      <div className="h-1 w-full bg-[image:var(--rv-gradient)]" />
      <div className="p-6">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Jetzt bewerben</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Vorname *</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Max" className={errors.firstName ? "border-destructive" : ""} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Nachname *</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mustermann" className={errors.lastName ? "border-destructive" : ""} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail-Adresse *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="max@beispiel.at" className={errors.email ? "border-destructive" : ""} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+43 660 123 4567" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message">Anschreiben / Motivation <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Warum passt du zu dieser Stelle?" rows={4} />
          </div>

          <div className="space-y-1.5">
            <Label>Lebenslauf (CV) *</Label>
            {cvFile ? (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--rv-green)] bg-[var(--app-green-wash)] p-4">
                <FileText className="h-5 w-5 flex-shrink-0 text-[var(--rv-green-deep)]" />
                <span className="flex-1 truncate text-sm font-medium text-foreground">{cvFile.name}</span>
                <button type="button" onClick={() => setCvFile(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => document.getElementById("cv-input")?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging ? "border-[var(--rv-green)] bg-[var(--app-green-wash)]"
                  : errors.cv ? "border-destructive bg-destructive/5"
                  : "border-border hover:border-[var(--rv-green)] hover:bg-muted/50"
                }`}
              >
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Datei hierher ziehen oder klicken</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF oder DOCX, max. 10 MB</p>
                <input id="cv-input" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
              </div>
            )}
            {errors.cv && <p className="text-xs text-destructive">{errors.cv}</p>}
          </div>

          <div className="flex items-start gap-3">
            <Checkbox id="dsgvo" checked={dsgvo} onCheckedChange={(v) => setDsgvo(v === true)} className="mt-0.5" />
            <Label htmlFor="dsgvo" className="cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground">
              Ich stimme der Verarbeitung meiner Daten gemäß Datenschutzerklärung zu. *
            </Label>
          </div>
          {errors.dsgvo && <p className="text-xs text-destructive">{errors.dsgvo}</p>}

          {errors.submit && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{errors.submit}</p>}

          <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base">
            {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Wird gesendet...</>) : "Bewerbung absenden"}
          </Button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--rv-mist)]">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <CompanyBrand company={job.company} logoUrl={logoUrl} />
          <span className="hidden text-sm text-muted-foreground sm:inline">Stellenausschreibung</span>
        </div>
      </header>

      {/* Hero */}
      <section className="rv-fade-up border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-4 py-12 lg:py-16">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--rv-green-deep)]">
            {closed ? "Geschlossen" : "Offene Stelle"}
          </span>
          <h1 className="mt-3 text-3xl font-bold leading-[1.05] tracking-tighter text-foreground lg:text-[2.9rem]">
            {job.title}
          </h1>
          <p className="mt-2 text-lg font-medium text-muted-foreground">{job.company}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {job.location && <MetaChip icon={MapPin}>{job.location}</MetaChip>}
            <MetaChip icon={Clock}>{getEmploymentLabel(job.employment_type)}</MetaChip>
            {job.years_experience && <MetaChip icon={GraduationCap}>{job.years_experience} Erfahrung</MetaChip>}
          </div>

          {!closed && (
            <Button onClick={scrollToApply} className="mt-8 h-11 px-6 lg:hidden">
              Jetzt bewerben <ArrowDown className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </section>

      {/* Body: description (left) + sticky apply panel (right) */}
      <main className="mx-auto max-w-5xl px-4 py-10 lg:grid lg:grid-cols-[1.55fr_1fr] lg:items-start lg:gap-8">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Über die Stelle</h2>
            {job.description ? (
              <FormattedJobDescription
                text={job.description}
                className="text-sm leading-relaxed text-muted-foreground"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Keine Beschreibung hinterlegt.</p>
            )}

            {(job.required_skills?.length ?? 0) > 0 && (
              <div className="mt-6 border-t border-border pt-6">
                <p className="mb-3 text-sm font-medium text-foreground">Gesuchte Skills</p>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills!.map((s) => (
                    <span key={s} className="rounded-full bg-[var(--app-green-wash)] px-3 py-1 text-sm font-medium text-[var(--rv-green-deep)]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div id="apply" className="mt-6 scroll-mt-24 lg:sticky lg:top-24 lg:mt-0">
          {applyPanel}
        </div>
      </main>

      <PoweredBy />
    </div>
  )
}
