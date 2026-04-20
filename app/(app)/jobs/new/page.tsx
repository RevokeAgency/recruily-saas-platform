"use client"

import { useState } from "react"
import { JobWizardStep1 } from "@/components/jobs/wizard/step-1-input"
import { JobWizardStep2 } from "@/components/jobs/wizard/step-2-review"
import { JobWizardStep3 } from "@/components/jobs/wizard/step-3-activate"
import { JobWizardProgress } from "@/components/jobs/wizard/progress"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export type JobFormData = {
  inputMethod: "upload" | "url" | "manual" | null
  url?: string
  file?: File | null
  title: string
  company: string
  location: string
  employmentType: string
  salaryRange: string
  description: string
  requiredSkills: string[]
  niceToHaveSkills: string[]
  yearsExperience: string
  education: string
  languages: string[]
  isActive: boolean
}

const initialFormData: JobFormData = {
  inputMethod: null,
  url: "",
  file: null,
  title: "",
  company: "",
  location: "",
  employmentType: "full-time",
  salaryRange: "",
  description: "",
  requiredSkills: [],
  niceToHaveSkills: [],
  yearsExperience: "",
  education: "",
  languages: [],
  isActive: true,
}

export default function NewJobPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<JobFormData>(initialFormData)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const updateFormData = (data: Partial<JobFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  // Simulate URL scraping
  const handleScrapeUrl = async () => {
    setIsProcessing(true)
    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 2000))
    
    // Mock parsed data
    updateFormData({
      title: "Senior Frontend Developer",
      company: "TechCorp GmbH",
      location: "Wien, Österreich",
      employmentType: "full-time",
      salaryRange: "€60.000 - €80.000",
      description: "Wir suchen einen erfahrenen Frontend Developer mit React-Expertise für unser wachsendes Team. Sie werden an der Entwicklung unserer SaaS-Plattform arbeiten und eng mit dem Design-Team zusammenarbeiten.\n\nAufgaben:\n- Entwicklung von React-Komponenten\n- Code Reviews und Mentoring\n- Performance-Optimierung\n- Zusammenarbeit mit Backend-Team",
      requiredSkills: ["React", "TypeScript", "CSS", "Git", "REST APIs"],
      niceToHaveSkills: ["Next.js", "GraphQL", "Testing", "CI/CD"],
      yearsExperience: "5+",
      education: "Bachelor in Informatik oder vergleichbar",
      languages: ["Deutsch (fließend)", "Englisch (gut)"],
    })
    setIsProcessing(false)
    handleNext()
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link href="/jobs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zu Jobs
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Neuen Job erstellen</h1>
        <p className="text-muted-foreground mt-1">
          Importiere oder erstelle eine neue Stellenausschreibung
        </p>
      </div>

      {/* Progress Indicator */}
      <JobWizardProgress currentStep={currentStep} />

      {/* Step Content */}
      <div className="mt-8">
        {currentStep === 1 && (
          <JobWizardStep1
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onScrapeUrl={handleScrapeUrl}
            isProcessing={isProcessing}
          />
        )}
        {currentStep === 2 && (
          <JobWizardStep2
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 3 && (
          <JobWizardStep3
            formData={formData}
            updateFormData={updateFormData}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  )
}
