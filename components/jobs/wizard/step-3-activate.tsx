"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Check,
  Briefcase,
  MapPin,
  Clock,
  GraduationCap,
  Languages,
  Banknote,
  Loader2,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import type { JobFormData } from "@/app/(app)/jobs/new/page"

interface Step3Props {
  formData: JobFormData
  updateFormData: (data: Partial<JobFormData>) => void
  onBack: () => void
}

export function JobWizardStep3({ formData, updateFormData, onBack }: Step3Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (asDraft: boolean = false) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          isActive: asDraft ? false : formData.isActive,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        toast.error(result.error || "Fehler beim Speichern des Jobs")
        setIsSubmitting(false)
        return
      }
      
      if (asDraft) {
        toast.success("Job als Entwurf gespeichert", {
          description: "Du kannst ihn jederzeit aktivieren.",
        })
      } else {
        toast.success("Job erfolgreich erstellt!", {
          description: "Das Kandidaten-Matching kann jetzt starten.",
        })
      }
      
      router.push("/jobs")
    } catch (error) {
      console.error("Error saving job:", error)
      toast.error("Fehler beim Speichern des Jobs")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Job Summary Card */}
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{formData.title}</CardTitle>
              <p className="text-muted-foreground">{formData.company}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            {formData.location && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{formData.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {formData.employmentType === "full-time"
                  ? "Vollzeit"
                  : formData.employmentType === "part-time"
                  ? "Teilzeit"
                  : formData.employmentType === "remote"
                  ? "Remote"
                  : "Freelance"}
              </span>
            </div>
            {formData.yearsExperience && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                <span>{formData.yearsExperience} Erfahrung</span>
              </div>
            )}
            {formData.salaryRange && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Banknote className="h-4 w-4" />
                <span>{formData.salaryRange}</span>
              </div>
            )}
          </div>

          {/* Description Preview */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Beschreibung</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
              {formData.description}
            </p>
          </div>

          {/* Skills */}
          {formData.requiredSkills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">
                Erforderliche Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {formData.requiredSkills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {formData.niceToHaveSkills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">
                Wünschenswerte Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {formData.niceToHaveSkills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {formData.languages.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Languages className="h-4 w-4" />
                Sprachkenntnisse
              </h4>
              <div className="flex flex-wrap gap-2">
                {formData.languages.map((lang) => (
                  <Badge key={lang} variant="outline">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activation Toggle */}
      <Card className="border border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="activate" className="text-base font-medium">
                Job für Matching aktivieren
              </Label>
              <p className="text-sm text-muted-foreground">
                Wenn aktiviert, werden Kandidaten automatisch mit diesem Job abgeglichen.
              </p>
            </div>
            <Switch
              id="activate"
              checked={formData.isActive}
              onCheckedChange={(checked) => updateFormData({ isActive: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Badge */}
      <div className="flex items-center justify-center">
        <Badge variant="outline" className="text-muted-foreground">
          Powered by Gemini AI
        </Badge>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
          >
            Als Entwurf speichern
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird erstellt...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Job erstellen
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
