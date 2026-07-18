import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Banknote, GraduationCap, Languages, Briefcase } from "lucide-react"
import { formatJobDescription } from "@/components/jobs/formatted-description"

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
          <CardContent className="max-w-none text-sm text-muted-foreground">
            {formatJobDescription(job.description)}
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
                <Badge key={skill} className="rounded-full border-transparent bg-[var(--app-green-wash)] text-[var(--rv-green-deep)] text-sm font-medium">
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
                  <Badge key={skill} variant="outline" className="rounded-full text-sm font-medium text-muted-foreground">
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
                <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--muted)]"><Banknote className="h-4 w-4 text-muted-foreground" strokeWidth={2} /></span>
                <div>
                  <p className="text-sm font-medium text-foreground">Gehalt</p>
                  <p className="text-sm text-muted-foreground">{job.salaryRange}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--muted)]"><Briefcase className="h-4 w-4 text-muted-foreground" strokeWidth={2} /></span>
              <div>
                <p className="text-sm font-medium text-foreground">Erfahrung</p>
                <p className="text-sm text-muted-foreground">{job.yearsExperience}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--muted)]"><GraduationCap className="h-4 w-4 text-muted-foreground" strokeWidth={2} /></span>
              <div>
                <p className="text-sm font-medium text-foreground">Ausbildung</p>
                <p className="text-sm text-muted-foreground">{job.education}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--muted)]"><Languages className="h-4 w-4 text-muted-foreground" strokeWidth={2} /></span>
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

      </div>
    </div>
  )
}
