"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, ArrowRight, X, Plus } from "lucide-react"
import { useState } from "react"
import type { JobFormData } from "@/app/(app)/jobs/new/page"

interface Step2Props {
  formData: JobFormData
  updateFormData: (data: Partial<JobFormData>) => void
  onNext: () => void
  onBack: () => void
}

export function JobWizardStep2({ formData, updateFormData, onNext, onBack }: Step2Props) {
  const [newRequiredSkill, setNewRequiredSkill] = useState("")
  const [newNiceSkill, setNewNiceSkill] = useState("")
  const [newLanguage, setNewLanguage] = useState("")

  const addSkill = (type: "required" | "nice") => {
    if (type === "required" && newRequiredSkill.trim()) {
      updateFormData({
        requiredSkills: [...formData.requiredSkills, newRequiredSkill.trim()],
      })
      setNewRequiredSkill("")
    } else if (type === "nice" && newNiceSkill.trim()) {
      updateFormData({
        niceToHaveSkills: [...formData.niceToHaveSkills, newNiceSkill.trim()],
      })
      setNewNiceSkill("")
    }
  }

  const removeSkill = (type: "required" | "nice", skill: string) => {
    if (type === "required") {
      updateFormData({
        requiredSkills: formData.requiredSkills.filter((s) => s !== skill),
      })
    } else {
      updateFormData({
        niceToHaveSkills: formData.niceToHaveSkills.filter((s) => s !== skill),
      })
    }
  }

  const addLanguage = () => {
    if (newLanguage.trim()) {
      updateFormData({
        languages: [...formData.languages, newLanguage.trim()],
      })
      setNewLanguage("")
    }
  }

  const removeLanguage = (lang: string) => {
    updateFormData({
      languages: formData.languages.filter((l) => l !== lang),
    })
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-lg">Grundinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Jobtitel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder="z.B. Senior Frontend Developer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Unternehmen *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => updateFormData({ company: e.target.value })}
                placeholder="z.B. TechCorp GmbH"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Standort</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => updateFormData({ location: e.target.value })}
                placeholder="z.B. Wien, Österreich"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentType">Anstellungsart</Label>
              <Select
                value={formData.employmentType}
                onValueChange={(value) => updateFormData({ employmentType: value })}
              >
                <SelectTrigger id="employmentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Vollzeit</SelectItem>
                  <SelectItem value="part-time">Teilzeit</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="contract">Freelance/Vertrag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Gehaltsrahmen (optional)</Label>
              <Input
                id="salary"
                value={formData.salaryRange}
                onChange={(e) => updateFormData({ salaryRange: e.target.value })}
                placeholder="z.B. €60.000 - €80.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Berufserfahrung</Label>
              <Input
                id="experience"
                value={formData.yearsExperience}
                onChange={(e) => updateFormData({ yearsExperience: e.target.value })}
                placeholder="z.B. 3-5 Jahre"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="education">Ausbildung</Label>
            <Input
              id="education"
              value={formData.education}
              onChange={(e) => updateFormData({ education: e.target.value })}
              placeholder="z.B. Bachelor in Informatik oder vergleichbar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Stellenbeschreibung *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              placeholder="Beschreibe die Position, Aufgaben und Anforderungen..."
              className="min-h-[150px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Required Skills */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-lg">Erforderliche Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {formData.requiredSkills.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                {skill}
                <button
                  onClick={() => removeSkill("required", skill)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newRequiredSkill}
              onChange={(e) => setNewRequiredSkill(e.target.value)}
              placeholder="Skill hinzufügen..."
              onKeyDown={(e) => e.key === "Enter" && addSkill("required")}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => addSkill("required")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Nice to Have Skills */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-lg">Wünschenswerte Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {formData.niceToHaveSkills.map((skill) => (
              <Badge key={skill} variant="outline" className="gap-1 pr-1">
                {skill}
                <button
                  onClick={() => removeSkill("nice", skill)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newNiceSkill}
              onChange={(e) => setNewNiceSkill(e.target.value)}
              placeholder="Skill hinzufügen..."
              onKeyDown={(e) => e.key === "Enter" && addSkill("nice")}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => addSkill("nice")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Languages */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-lg">Sprachkenntnisse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {formData.languages.map((lang) => (
              <Badge key={lang} variant="secondary" className="gap-1 pr-1">
                {lang}
                <button
                  onClick={() => removeLanguage(lang)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              placeholder="z.B. Deutsch (fließend)"
              onKeyDown={(e) => e.key === "Enter" && addLanguage()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addLanguage}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button onClick={onNext} disabled={!formData.title || !formData.company}>
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
