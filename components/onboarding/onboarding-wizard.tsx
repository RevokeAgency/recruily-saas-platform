"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Building2, Upload, Check, Loader2, Copy, Mail, Link2, Sparkles, ArrowRight, PartyPopper,
} from "lucide-react"
import { RvBrandMark } from "@/components/landing/rv-brand-mark"
import { slugify, buildJobEmailAddress, INBOUND_DOMAIN } from "@/lib/email/routing"
import { saveCompany, checkSlugAvailable, completeOnboarding } from "@/app/actions/onboarding"

interface Props {
  initial: { companyName: string; slug: string; logoUrl: string | null }
}

type CreatedJob = { id: string; public_slug: string; title: string }

const STEPS = ["Firma", "Erster Job", "Fertig", "Los geht's"]

export function OnboardingWizard({ initial }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 1 — company
  const [companyName, setCompanyName] = useState(initial.companyName || "")
  const [slug, setSlug] = useState(initial.slug || "")
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "free" | "taken">("idle")
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [logoUploading, setLogoUploading] = useState(false)

  // Step 2 — first job
  const [job, setJob] = useState({ title: "", location: "", employmentType: "full-time", description: "", requirements: "" })
  const [createdJob, setCreatedJob] = useState<CreatedJob | null>(null)

  const [pending, startTransition] = useTransition()

  const effectiveSlug = slugTouched ? slug : slugify(companyName)

  const onCompanyName = (v: string) => {
    setCompanyName(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  const checkSlug = useCallback((value: string) => {
    const s = slugify(value)
    if (!s) return
    setSlugStatus("checking")
    startTransition(async () => {
      const res = await checkSlugAvailable(s)
      if (res.available) {
        setSlugStatus("free")
      } else {
        setSlugStatus("taken")
        setSlug(res.suggestion)
        setSlugTouched(true)
      }
    })
  }, [])

  const uploadLogo = async (file: File | null) => {
    if (!file) return
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/company/logo", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok) { setLogoUrl(data.logoUrl); toast.success("Logo hochgeladen") }
      else toast.error(data.error || "Upload fehlgeschlagen")
    } catch {
      toast.error("Upload fehlgeschlagen")
    } finally {
      setLogoUploading(false)
    }
  }

  const submitCompany = () => {
    if (!companyName.trim()) { toast.error("Bitte gib deinen Firmennamen ein"); return }
    startTransition(async () => {
      const res = await saveCompany(companyName, effectiveSlug)
      if (!res.ok) { toast.error(res.error || "Speichern fehlgeschlagen"); return }
      setSlug(res.slug!)
      setStep(1)
    })
  }

  const submitJob = () => {
    if (!job.title.trim()) { toast.error("Bitte gib einen Jobtitel ein"); return }
    startTransition(async () => {
      const requiredSkills = job.requirements.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: job.title, company: companyName, location: job.location || null,
          employmentType: job.employmentType, description: job.description || null,
          requiredSkills, isActive: true,
        }),
      })
      const data = await res.json()
      if (res.status === 403 && data.error === "job_limit_reached") {
        toast.error("Job-Limit erreicht — im Dashboard kannst du upgraden.")
        return
      }
      if (!res.ok || !data.job) { toast.error(data.error || "Job konnte nicht angelegt werden"); return }
      setCreatedJob({ id: data.job.id, public_slug: data.job.public_slug, title: data.job.title })
      setStep(2)
    })
  }

  const finish = () => {
    startTransition(async () => {
      await completeOnboarding()
      router.push("/dashboard")
      router.refresh()
    })
  }

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const emailAddress = createdJob && slug ? buildJobEmailAddress(slug, createdJob.title, createdJob.id) : ""
  const jobPageUrl = createdJob && slug ? `${origin}/jobs/${slug}/${createdJob.public_slug}` : ""

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => {})
    toast.success(`${label} kopiert`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--rv-mist)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(34,193,238,.18),transparent_70%)] blur-2xl" />
        <div className="absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(22,199,124,.16),transparent_70%)] blur-2xl" />
      </div>

      <div className="relative z-[1] mx-auto flex min-h-screen max-w-xl flex-col px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <RvBrandMark />
          <span className="text-sm text-muted-foreground">Schritt {Math.min(step + 1, 4)} von 4</span>
        </div>

        {/* progress */}
        <div className="mb-8 flex gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(12,26,22,.08)]">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: i <= step ? "100%" : "0%", backgroundImage: "var(--rv-gradient)" }} />
            </div>
          ))}
        </div>

        <div className="rv-fade-up rounded-2xl border border-border bg-card p-6 shadow-[var(--app-shadow-card)] lg:p-8">
          {/* ---------- Step 1: Company ---------- */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--app-green-wash)]">
                  <Building2 className="h-5 w-5 text-[var(--rv-green-deep)]" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Willkommen bei Revetly 👋</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Richte in unter 5 Minuten deine Firma ein. Los geht's mit den Basics.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company">Firmenname *</Label>
                <Input id="company" value={companyName} placeholder="Muster GmbH"
                  onChange={(e) => onCompanyName(e.target.value)}
                  onBlur={() => checkSlug(effectiveSlug)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">Deine Subdomain</Label>
                <div className="flex items-center gap-2">
                  <Input id="slug" value={effectiveSlug}
                    onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); setSlugStatus("idle") }}
                    onBlur={() => checkSlug(effectiveSlug)} className="font-mono" />
                  <span className="whitespace-nowrap text-sm text-muted-foreground">.{INBOUND_DOMAIN}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {slugStatus === "checking" && "Prüfe Verfügbarkeit…"}
                  {slugStatus === "free" && <span className="text-[var(--rv-green-deep)]">✓ verfügbar</span>}
                  {slugStatus === "taken" && <span className="text-amber-600">Bereits vergeben — Vorschlag übernommen</span>}
                  {slugStatus === "idle" && "Wird für E-Mail-Adressen und Job-Page-Links verwendet."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Firmenlogo <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" className="h-11 w-11 rounded-lg object-contain" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Building2 className="h-5 w-5" />
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" disabled={logoUploading}
                    onClick={() => document.getElementById("logo-input")?.click()}>
                    {logoUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {logoUrl ? "Ändern" : "Logo hochladen"}
                  </Button>
                  <input id="logo-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0] ?? null)} />
                </div>
                <p className="text-xs text-muted-foreground">Kannst du auch später in den Einstellungen nachholen.</p>
              </div>

              <Button className="w-full" disabled={pending} onClick={submitCompany}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Weiter <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ---------- Step 2: First job ---------- */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--app-green-wash)]">
                  <Sparkles className="h-5 w-5 text-[var(--rv-green-deep)]" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Dein erster Job</h1>
                <p className="mt-1 text-sm text-muted-foreground">Nur die Basics — verfeinern kannst du später jederzeit.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jt">Jobtitel *</Label>
                <Input id="jt" value={job.title} placeholder="Senior Developer (m/w/d)"
                  onChange={(e) => setJob({ ...job, title: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="loc">Standort</Label>
                  <Input id="loc" value={job.location} placeholder="Wien / Remote"
                    onChange={(e) => setJob({ ...job, location: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Anstellung</Label>
                  <Select value={job.employmentType} onValueChange={(v) => setJob({ ...job, employmentType: v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Vollzeit</SelectItem>
                      <SelectItem value="part-time">Teilzeit</SelectItem>
                      <SelectItem value="contract">Freelance / Vertrag</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc">Beschreibung</Label>
                <Textarea id="desc" rows={4} value={job.description} placeholder="Was macht die Rolle aus?"
                  onChange={(e) => setJob({ ...job, description: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="req">Anforderungen / Skills <span className="font-normal text-muted-foreground">(eine pro Zeile)</span></Label>
                <Textarea id="req" rows={3} value={job.requirements} placeholder={"React\nTypeScript\n3+ Jahre Erfahrung"}
                  onChange={(e) => setJob({ ...job, requirements: e.target.value })} />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" disabled={pending} onClick={() => setStep(3)}>
                  Später anlegen
                </Button>
                <Button className="flex-1" disabled={pending} onClick={submitJob}>
                  {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Job anlegen
                </Button>
              </div>
            </div>
          )}

          {/* ---------- Step 3: Result ---------- */}
          {step === 2 && createdJob && (
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--app-green-wash)]">
                  <Check className="h-5 w-5 text-[var(--rv-green-deep)]" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Das war's schon! 🎉</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  „{createdJob.title}" ist live. Bewerbungen kommen ab jetzt automatisch rein — über zwei Wege:
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4 text-[var(--rv-green-deep)]" /> Bewerbungs-E-Mail
                  </div>
                  <div className="mb-2 rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs break-all text-muted-foreground">{emailAddress}</div>
                  <Button variant="outline" size="sm" onClick={() => copy(emailAddress, "E-Mail")}>
                    <Copy className="mr-2 h-4 w-4" /> Kopieren
                  </Button>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Link2 className="h-4 w-4 text-[var(--rv-green-deep)]" /> Öffentliche Job-Page
                  </div>
                  <div className="mb-2 rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs break-all text-muted-foreground">{jobPageUrl}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copy(jobPageUrl, "Link")}>
                      <Copy className="mr-2 h-4 w-4" /> Kopieren
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(jobPageUrl, "_blank")}>Öffnen</Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[var(--app-green-wash)] p-4 text-sm text-[var(--rv-green-deep)]">
                <strong>Dein nächster Schritt:</strong> Trage die E-Mail-Adresse bei deinen Jobbörsen
                (Karriere.at, Indeed …) ein und/oder teile den Job-Page-Link. Fertig — Revetly macht den Rest.
              </div>

              <Button className="w-full" onClick={() => setStep(3)}>
                Weiter <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ---------- Step 4: Done ---------- */}
          {step === 3 && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-green-wash)]">
                <PartyPopper className="h-8 w-8 text-[var(--rv-green-deep)]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Einrichtung abgeschlossen</h1>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Deine Firma ist eingerichtet. Im Dashboard siehst du alle Bewerbungen, Matches und Jobs an einem Ort.
                </p>
              </div>
              <Button className="w-full" disabled={pending} onClick={finish}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Zum Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
