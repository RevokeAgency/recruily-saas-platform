import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Clock } from "lucide-react"
import Link from "next/link"

const recentJobs = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp GmbH",
    status: "active" as const,
    candidates: 24,
    topScore: 92,
    createdAt: "vor 2 Stunden",
  },
  {
    id: "2",
    title: "Product Manager",
    company: "StartupXYZ",
    status: "active" as const,
    candidates: 18,
    topScore: 87,
    createdAt: "vor 1 Tag",
  },
  {
    id: "3",
    title: "UX Designer",
    company: "DesignStudio",
    status: "draft" as const,
    candidates: 0,
    topScore: 0,
    createdAt: "vor 2 Tagen",
  },
  {
    id: "4",
    title: "Backend Engineer",
    company: "CloudServices AG",
    status: "active" as const,
    candidates: 31,
    topScore: 89,
    createdAt: "vor 3 Tagen",
  },
  {
    id: "5",
    title: "Data Scientist",
    company: "Analytics Pro",
    status: "archived" as const,
    candidates: 15,
    topScore: 78,
    createdAt: "vor 1 Woche",
  },
]

const statusConfig = {
  active: { label: "Aktiv", variant: "default" as const, className: "bg-success text-success-foreground" },
  draft: { label: "Entwurf", variant: "secondary" as const, className: "bg-muted text-muted-foreground" },
  archived: { label: "Archiviert", variant: "outline" as const, className: "bg-muted/50 text-muted-foreground" },
}

export function RecentActivity() {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Letzte Aktivitäten
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentJobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {job.title}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {job.company} · {job.createdAt}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge className={statusConfig[job.status].className}>
                  {statusConfig[job.status].label}
                </Badge>
                {job.status === "active" && (
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-foreground">{job.candidates} Kandidaten</p>
                    <p className="text-xs text-muted-foreground">Top: {job.topScore}%</p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
