import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Mail,
  Phone,
  Download,
  Briefcase,
  GraduationCap,
  Languages,
} from "lucide-react"

interface Candidate {
  id: string
  name: string
  initials: string
  email: string
  phone: string
  topSkills: string[]
  jobsMatched: number
  bestScore: number
}

interface CandidateProfileProps {
  candidate: Candidate
}

const mockProfile = {
  skills: [
    "React",
    "TypeScript",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "GraphQL",
    "AWS",
    "Docker",
  ],
  languages: ["Deutsch (Muttersprache)", "Englisch (C1)", "Französisch (B1)"],
  education: [
    {
      degree: "Master of Science - Informatik",
      institution: "TU Wien",
      year: "2018 - 2020",
    },
    {
      degree: "Bachelor of Science - Informatik",
      institution: "Universität Wien",
      year: "2015 - 2018",
    },
  ],
  experience: [
    {
      title: "Senior Frontend Developer",
      company: "TechStartup GmbH",
      period: "2021 - heute",
      description: "Lead Developer für React/Next.js Anwendungen",
    },
    {
      title: "Frontend Developer",
      company: "Digital Agency",
      period: "2019 - 2021",
      description: "Entwicklung von Web-Applikationen mit React",
    },
    {
      title: "Junior Developer",
      company: "Software House",
      period: "2018 - 2019",
      description: "Fullstack Entwicklung mit JavaScript/Node.js",
    },
  ],
  jobMatches: [
    { jobTitle: "Senior Frontend Developer", company: "TechCorp GmbH", score: 92 },
    { jobTitle: "Lead Developer", company: "StartupXYZ", score: 87 },
    { jobTitle: "React Developer", company: "Digital Agency", score: 84 },
  ],
  aiSummary:
    "Erfahrener Frontend-Entwickler mit starkem Fokus auf React und TypeScript. Solide Ausbildung und progressiver Karriereverlauf zeigen kontinuierliches Wachstum. Besonders geeignet für anspruchsvolle SaaS-Projekte und Teamleitung.",
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-success"
  if (score >= 60) return "text-warning-foreground"
  return "text-destructive"
}

export function CandidateProfile({ candidate }: CandidateProfileProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {candidate.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground">{candidate.name}</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              {candidate.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="h-4 w-4" />
              {candidate.phone}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          CV herunterladen
        </Button>
      </div>

      {/* AI Summary */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="flex-shrink-0">AI Analyse</Badge>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {mockProfile.aiSummary}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Skills */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mockProfile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Languages */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Sprachen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {mockProfile.languages.map((lang) => (
                  <Badge key={lang} variant="outline">
                    {lang}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Ausbildung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockProfile.education.map((edu, idx) => (
                <div key={idx} className="relative pl-4 border-l-2 border-border">
                  <p className="font-medium text-foreground text-sm">{edu.degree}</p>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  <p className="text-xs text-muted-foreground">{edu.year}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Work Experience */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Berufserfahrung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockProfile.experience.map((exp, idx) => (
                <div key={idx} className="relative pl-4 border-l-2 border-primary/30">
                  <p className="font-medium text-foreground text-sm">{exp.title}</p>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                  <p className="text-xs text-muted-foreground">{exp.period}</p>
                  <p className="text-xs text-muted-foreground mt-1">{exp.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Job Matches */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Match-Scores pro Job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockProfile.jobMatches.map((match, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-foreground">{match.jobTitle}</span>
                      <span className="text-muted-foreground"> - {match.company}</span>
                    </div>
                    <span className={`font-semibold ${getScoreColor(match.score)}`}>
                      {match.score}%
                    </span>
                  </div>
                  <Progress value={match.score} gradient />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
