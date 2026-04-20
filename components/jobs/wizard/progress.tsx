import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const steps = [
  { id: 1, name: "Eingabe", description: "Job importieren" },
  { id: 2, name: "Prüfen", description: "Details bearbeiten" },
  { id: 3, name: "Aktivieren", description: "Job veröffentlichen" },
]

interface JobWizardProgressProps {
  currentStep: number
}

export function JobWizardProgress({ currentStep }: JobWizardProgressProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <li key={step.id} className="flex-1 relative">
            <div className="flex flex-col items-center">
              {/* Connector line */}
              {stepIdx !== 0 && (
                <div
                  className={cn(
                    "absolute top-4 -left-1/2 w-full h-0.5",
                    currentStep > step.id ? "bg-primary" : "bg-border"
                  )}
                  style={{ width: "100%", left: "-50%" }}
                />
              )}

              {/* Step circle */}
              <div
                className={cn(
                  "relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  currentStep > step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground border-2 border-border"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>

              {/* Step label */}
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}
