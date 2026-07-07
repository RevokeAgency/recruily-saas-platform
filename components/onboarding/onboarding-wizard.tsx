"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Building2, Upload, Check, Loader2, ArrowRight, PartyPopper } from "lucide-react"
import Image from "next/image"
import { slugify, INBOUND_DOMAIN } from "@/lib/email/routing"
import { saveCompany, checkSlugAvailable, completeOnboarding } from "@/app/actions/onboarding"

interface Props {
  initial: { companyName: string; slug: string; logoUrl: string | null }
}

const STEPS = ["Firma", "Fertig"]

export function OnboardingWizard({ initial }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 1: company
  const [companyName, setCompanyName] = useState(initial.companyName || "")
  const [slug, setSlug] = useState(initial.slug || "")
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "free" | "taken">("idle")
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [logoUploading, setLogoUploading] = useState(false)

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

  const finish = () => {
    startTransition(async () => {
      await completeOnboarding()
      router.push("/dashboard")
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-[var(--rv-mist)]">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Image
            src="/revetly/LogoEntwurf-trim.png"
            alt="Revetly"
            width={129}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <span className="text-sm text-muted-foreground">Schritt {Math.min(step + 1, STEPS.length)} von {STEPS.length}</span>
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
                <h1 className="text-xl font-bold text-foreground">Willkommen bei Revetly</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Richte in unter 2 Minuten deine Firma ein. Los geht's mit den Basics.
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
                  {slugStatus === "free" && <span className="inline-flex items-center gap-1 text-[var(--rv-green-deep)]"><Check className="h-3.5 w-3.5" /> verfügbar</span>}
                  {slugStatus === "taken" && <span className="text-amber-600">Bereits vergeben, Vorschlag übernommen</span>}
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

          {/* ---------- Step 2: Done ---------- */}
          {step === 1 && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-green-wash)]">
                <PartyPopper className="h-8 w-8 text-[var(--rv-green-deep)]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Firma eingerichtet</h1>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Alles bereit. Leg im Dashboard deinen ersten Job an. Bewerbungen laufen dann
                  automatisch über deine E-Mail-Adresse und die öffentliche Job-Page rein.
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
