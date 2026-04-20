import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Candidate {
  name: string
  initials: string
  matchScore: number
}

interface MatchScoreBreakdownProps {
  candidate: Candidate
}

const scoreCategories = [
  {
    name: "Hard Skills",
    nameDE: "Fachkenntnisse",
    weight: 25,
    score: 95,
    reason: "Ausgezeichnete Übereinstimmung bei React, TypeScript und modernen Frontend-Technologien.",
  },
  {
    name: "Work Experience",
    nameDE: "Berufserfahrung",
    weight: 20,
    score: 90,
    reason: "5+ Jahre Erfahrung in der Frontend-Entwicklung, davon 3 Jahre in ähnlicher Position.",
  },
  {
    name: "Soft Skills",
    nameDE: "Soft Skills",
    weight: 15,
    score: 85,
    reason: "Teamfähigkeit und Kommunikationsstärke durch frühere Projektleitungen nachgewiesen.",
  },
  {
    name: "Education",
    nameDE: "Ausbildung",
    weight: 10,
    score: 100,
    reason: "Master in Informatik von der TU Wien - übertrifft die Anforderungen.",
  },
  {
    name: "Industry Experience",
    nameDE: "Branchenerfahrung",
    weight: 10,
    score: 80,
    reason: "Erfahrung in SaaS und B2B-Produkten, aber nicht direkt in der gleichen Branche.",
  },
  {
    name: "Languages",
    nameDE: "Sprachkenntnisse",
    weight: 8,
    score: 95,
    reason: "Deutsch als Muttersprache, Englisch fließend mit C1-Zertifikat.",
  },
  {
    name: "Location",
    nameDE: "Standort",
    weight: 5,
    score: 100,
    reason: "Wohnort in Wien - perfekte Übereinstimmung mit dem Arbeitsort.",
  },
  {
    name: "Salary Expectations",
    nameDE: "Gehaltsvorstellung",
    weight: 4,
    score: 85,
    reason: "Gehaltsvorstellung liegt im oberen Bereich des Budgets, aber noch akzeptabel.",
  },
  {
    name: "Additional Qualifications",
    nameDE: "Zusatzqualifikationen",
    weight: 3,
    score: 90,
    reason: "AWS-Zertifizierung und Open-Source-Beiträge zeigen technische Leidenschaft.",
  },
]

function getScoreColor(score: number) {
  if (score >= 80) return "bg-success"
  if (score >= 60) return "bg-warning"
  return "bg-destructive"
}

function getScoreTextColor(score: number) {
  if (score >= 80) return "text-success"
  if (score >= 60) return "text-warning-foreground"
  return "text-destructive"
}

export function MatchScoreBreakdown({ candidate }: MatchScoreBreakdownProps) {
  // Calculate weighted total
  const totalScore = scoreCategories.reduce(
    (acc, cat) => acc + (cat.score * cat.weight) / 100,
    0
  )

  return (
    <div className="space-y-6">
      {/* Candidate Header */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
            {candidate.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{candidate.name}</h3>
          <p className="text-sm text-muted-foreground">Senior Frontend Developer Kandidat</p>
        </div>
        <div className="text-center">
          <div
            className={`text-4xl font-bold ${getScoreTextColor(totalScore)}`}
          >
            {Math.round(totalScore)}%
          </div>
          <p className="text-xs text-muted-foreground">Gesamt-Score</p>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground">Detaillierte Bewertung (9 Kategorien)</h4>
        
        {scoreCategories.map((category) => {
          const weightedContribution = (category.score * category.weight) / 100
          
          return (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{category.nameDE}</span>
                  <Badge variant="outline" className="text-xs">
                    {category.weight}% Gewichtung
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${getScoreTextColor(category.score)}`}>
                    {category.score}/100
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (+{weightedContribution.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <Progress
                value={category.score}
                className={`h-2 ${getScoreColor(category.score)}`}
              />
              <p className="text-sm text-muted-foreground">{category.reason}</p>
            </div>
          )
        })}
      </div>

      {/* AI Summary */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
          <Badge variant="outline" className="text-xs">AI Analyse</Badge>
          Zusammenfassung
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {candidate.name} ist ein sehr starker Kandidat mit hervorragenden technischen 
          Fähigkeiten und relevanter Berufserfahrung. Die Hauptstärken liegen in den 
          Hard Skills und der Ausbildung. Die Gehaltsvorstellung liegt im akzeptablen 
          Bereich. Empfehlung: Zum Interview einladen.
        </p>
      </div>
    </div>
  )
}
