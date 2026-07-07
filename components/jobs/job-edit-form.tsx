"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Loader2, X, Plus } from "lucide-react"

export interface JobEditInitial {
  title: string
  company: string
  location: string
  employmentType: string
  salaryRange: string
  yearsExperience: string
  education: string
  description: string
  requiredSkills: string[]
  niceToHaveSkills: string[]
  languages: string[]
}

function ChipInput({
  label, hint, values, onChange, placeholder,
}: {
  label: string; hint?: string; values: string[]; onChange: (v: string[]) => void; placeholder: string
}) {
  const [draft, setDraft] = useState("")
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean)
    if (parts.length === 0) return
    onChange(Array.from(new Set([...values, ...parts])))
    setDraft("")
  }
  return (
    <div className="space-y-1.5">
      <Label>{label}{hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
        />
        <Button type="button" variant="outline" onClick={add} className="flex-shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-green-wash)] px-3 py-1 text-sm font-medium text-[var(--rv-green-deep)]">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function JobEditForm({ jobId, initial }: { jobId: string; initial: JobEditInitial }) {
  const router = useRouter()
  const [form, setForm] = useState<JobEditInitial>(initial)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof JobEditInitial>(k: K, v: JobEditInitial[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title.trim() || !form.company.trim()) {
      toast.error("Titel und Unternehmen sind erforderlich")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Speichern fehlgeschlagen"); return }
      toast.success("Job gespeichert")
      router.push(`/jobs/${jobId}`)
      router.refresh()
    } catch {
      toast.error("Speichern fehlgeschlagen")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Button variant="outline" size="sm" asChild className="mb-6">
        <Link href={`/jobs/${jobId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Job
        </Link>
      </Button>

      <h1 className="mb-1 text-2xl font-bold text-foreground">Job bearbeiten</h1>
      <p className="mb-6 text-muted-foreground">Passe die Stellendaten an. Änderungen sind sofort auf der Job-Page sichtbar.</p>

      <Card className="border border-border">
        <CardHeader><CardTitle className="text-lg">Stellendaten</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Jobtitel *</Label>
              <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Unternehmen *</Label>
              <Input id="company" value={form.company} onChange={(e) => set("company", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="location">Standort</Label>
              <Input id="location" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Wien / Remote" />
            </div>
            <div className="space-y-1.5">
              <Label>Anstellungsart</Label>
              <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v)}>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="salary">Gehaltsrahmen <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="salary" value={form.salaryRange} onChange={(e) => set("salaryRange", e.target.value)} placeholder="€60.000 - €80.000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp">Berufserfahrung</Label>
              <Input id="exp" value={form.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} placeholder="3-5 Jahre" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="education">Ausbildung</Label>
            <Input id="education" value={form.education} onChange={(e) => set("education", e.target.value)} placeholder="Bachelor in Informatik o.ä." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Stellenbeschreibung</Label>
            <Textarea id="description" rows={8} value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder={"Kurze Einleitung.\n\nDeine Aufgaben:\n- …\n\nDein Profil:\n- …"} />
            <p className="text-xs text-muted-foreground">Tipp: Überschriften mit „:" und Stichpunkte mit „- " werden auf der Job-Page schön formatiert.</p>
          </div>

          <ChipInput label="Erforderliche Skills" values={form.requiredSkills} onChange={(v) => set("requiredSkills", v)} placeholder="Skill eingeben, Enter" />
          <ChipInput label="Nice-to-have Skills" hint="(optional)" values={form.niceToHaveSkills} onChange={(v) => set("niceToHaveSkills", v)} placeholder="Skill eingeben, Enter" />
          <ChipInput label="Sprachen" hint="(optional)" values={form.languages} onChange={(v) => set("languages", v)} placeholder="z.B. Deutsch (fließend)" />
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" asChild disabled={saving}>
          <Link href={`/jobs/${jobId}`}>Abbrechen</Link>
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Speichern
        </Button>
      </div>
    </div>
  )
}
