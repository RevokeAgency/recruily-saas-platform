import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Banknote, GraduationCap, Languages, Briefcase, CheckCircle2 } from "lucide-react"

// Helper function to format job description with better structure
function formatDescription(text: string) {
  if (!text) return null
  
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let key = 0

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-2 my-4">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
      currentList = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Skip empty lines
    if (!trimmed) {
      flushList()
      continue
    }
    
    // Check if it's a bullet point (•, -, *)
    const bulletMatch = trimmed.match(/^[•\-\*]\s*(.+)/)
    if (bulletMatch) {
      currentList.push(bulletMatch[1])
      continue
    }
    
    // Check if it's a section header (ends with : and is relatively short)
    if (trimmed.endsWith(":") && trimmed.length < 50) {
      flushList()
      elements.push(
        <h4 key={key++} className="font-semibold text-foreground mt-6 mb-2 first:mt-0">
          {trimmed}
        </h4>
      )
      continue
    }
    
    // Regular paragraph
    flushList()
    elements.push(
      <p key={key++} className="text-muted-foreground leading-relaxed mb-3 last:mb-0">
        {trimmed}
      </p>
    )
  }
  
  flushList()
  return elements
}

interface Job {
  description: string
  salaryRange: string
  yearsExperience: string
  education: string
  requiredSkills: string[]
  niceToHaveSkills: string[]
  languages: string[]
}

interface JobOverviewTabProps {
  job: Job
}

export function JobOverviewTab({ job }: JobOverviewTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Description */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg">Stellenbeschreibung</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            {formatDescription(job.description)}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg">Erforderliche Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {job.requiredSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-sm">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {job.niceToHaveSkills.length > 0 && (
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-lg">Wünschenswerte Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.niceToHaveSkills.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Quick Facts */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.salaryRange && (
              <div className="flex items-start gap-3">
                <Banknote className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Gehalt</p>
                  <p className="text-sm text-muted-foreground">{job.salaryRange}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Erfahrung</p>
                <p className="text-sm text-muted-foreground">{job.yearsExperience}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Ausbildung</p>
                <p className="text-sm text-muted-foreground">{job.education}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Languages className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Sprachen</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {job.languages.map((lang) => (
                    <Badge key={lang} variant="outline" className="text-xs">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Badge */}
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="text-muted-foreground">
            Powered by Gemini AI
          </Badge>
        </div>
      </div>
    </div>
  )
}
