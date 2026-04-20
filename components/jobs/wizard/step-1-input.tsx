"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Link as LinkIcon, FileText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { JobFormData } from "@/app/(app)/jobs/new/page"

interface Step1Props {
  formData: JobFormData
  updateFormData: (data: Partial<JobFormData>) => void
  onNext: () => void
  onScrapeUrl: () => void
  onFileUpload: (file: File) => void
  isProcessing: boolean
}

const inputMethods = [
  {
    id: "upload" as const,
    title: "Datei hochladen",
    description: "PDF oder DOCX Stellenausschreibung",
    icon: Upload,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
    borderColor: "border-blue-200",
  },
  {
    id: "url" as const,
    title: "URL importieren",
    description: "Von LinkedIn, Indeed, Karriere.at, etc.",
    icon: LinkIcon,
    bgColor: "bg-primary/5",
    iconColor: "text-primary",
    borderColor: "border-primary",
  },
  {
    id: "manual" as const,
    title: "Manuell erstellen",
    description: "Job direkt eingeben",
    icon: FileText,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
    borderColor: "border-purple-200",
  },
]

export function JobWizardStep1({
  formData,
  updateFormData,
  onNext,
  onScrapeUrl,
  onFileUpload,
  isProcessing,
}: Step1Props) {
  const handleMethodSelect = (method: "upload" | "url" | "manual") => {
    updateFormData({ inputMethod: method })
    if (method === "manual") {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {inputMethods.map((method) => (
          <Card
            key={method.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              formData.inputMethod === method.id
                ? `border-2 ${method.borderColor} shadow-sm`
                : "border border-border"
            )}
            onClick={() => handleMethodSelect(method.id)}
          >
            <CardHeader className="text-center pb-2">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-2",
                  method.bgColor
                )}
              >
                <method.icon className={cn("h-6 w-6", method.iconColor)} />
              </div>
              <CardTitle className="text-base">{method.title}</CardTitle>
              <CardDescription className="text-xs">
                {method.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* URL Input */}
      {formData.inputMethod === "url" && (
        <Card className="border border-border">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-url">Job URL</Label>
                <Input
                  id="job-url"
                  type="url"
                  placeholder="https://www.karriere.at/jobs/..."
                  value={formData.url || ""}
                  onChange={(e) => updateFormData({ url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Unterstützt: LinkedIn, Indeed, Glassdoor, Karriere.at, und Unternehmenswebsites
                </p>
              </div>
              <Button
                onClick={onScrapeUrl}
                disabled={!formData.url || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analysiere Stellenausschreibung...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    URL analysieren
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload */}
      {formData.inputMethod === "upload" && (
        <Card className="border border-border">
          <CardContent className="pt-6">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-sm font-medium text-foreground">
                  Analysiere Stellenausschreibung mit AI...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dies kann einige Sekunden dauern
                </p>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => {
                  document.getElementById("file-upload")?.click()
                }}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      onFileUpload(file)
                    }
                  }}
                />
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Datei hierher ziehen oder klicken
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF oder DOCX, max. 10MB
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
