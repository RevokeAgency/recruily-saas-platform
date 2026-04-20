"use client"

import { useState } from "react"
import { JobWizardStep1 } from "@/components/jobs/wizard/step-1-input"
import { JobWizardStep2 } from "@/components/jobs/wizard/step-2-review"
import { JobWizardStep3 } from "@/components/jobs/wizard/step-3-activate"
import { JobWizardProgress } from "@/components/jobs/wizard/progress"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

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

  // Parse job from URL using AI
  const handleScrapeUrl = async () => {
    if (!formData.url) return
    
    setIsProcessing(true)
    try {
      const response = await fetch("/api/jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "url",
          url: formData.url,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        toast.error(result.error || "Fehler beim Analysieren der URL")
        setIsProcessing(false)
        return
      }

      updateFormData(result.data)
      toast.success("Stellenausschreibung erfolgreich analysiert")
      handleNext()
    } catch (error) {
      console.error("Error parsing URL:", error)
      toast.error("Fehler beim Analysieren der URL")
    } finally {
      setIsProcessing(false)
    }
  }

  // Parse job from file upload using AI
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    updateFormData({ file })

    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      )

      const response = await fetch("/api/jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "file",
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        toast.error(result.error || "Fehler beim Analysieren der Datei")
        setIsProcessing(false)
        return
      }

      updateFormData(result.data)
      toast.success("Datei erfolgreich analysiert")
      handleNext()
    } catch (error) {
      console.error("Error parsing file:", error)
      toast.error("Fehler beim Analysieren der Datei")
    } finally {
      setIsProcessing(false)
    }
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
            onFileUpload={handleFileUpload}
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
