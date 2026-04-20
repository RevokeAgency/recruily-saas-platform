"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Pencil,
  Archive,
  Share2,
  MapPin,
  Clock,
  Calendar,
  Briefcase,
} from "lucide-react"
import { JobOverviewTab } from "@/components/jobs/detail/overview-tab"
import { JobCandidatesTab } from "@/components/jobs/detail/candidates-tab"
import { JobMatchesTab } from "@/components/jobs/detail/matches-tab"

// Mock job data
const mockJob = {
  id: "1",
  title: "Senior Frontend Developer",
  company: "TechCorp GmbH",
  location: "Wien, Österreich",
  employmentType: "Vollzeit",
  status: "active" as const,
  createdAt: "15. März 2024",
  salaryRange: "€60.000 - €80.000",
  yearsExperience: "5+ Jahre",
  education: "Bachelor in Informatik oder vergleichbar",
  description: `Wir suchen einen erfahrenen Frontend Developer mit React-Expertise für unser wachsendes Team. Sie werden an der Entwicklung unserer SaaS-Plattform arbeiten und eng mit dem Design-Team zusammenarbeiten.

Aufgaben:
• Entwicklung von React-Komponenten mit TypeScript
• Code Reviews und Mentoring von Junior-Entwicklern
• Performance-Optimierung der Anwendung
• Zusammenarbeit mit Backend-Team und Product Management
• Mitgestaltung der technischen Architektur

Wir bieten:
• Modernes Büro in Wien-Mitte
• Flexible Arbeitszeiten und Home-Office-Möglichkeit
• Weiterbildungsbudget
• Team-Events und Firmenfeiern`,
  requiredSkills: ["React", "TypeScript", "CSS/SCSS", "Git", "REST APIs"],
  niceToHaveSkills: ["Next.js", "GraphQL", "Testing (Jest, Cypress)", "CI/CD"],
  languages: ["Deutsch (fließend)", "Englisch (gut)"],
  candidateCount: 24,
  topScore: 92,
}

const statusConfig = {
  active: { label: "Aktiv", className: "bg-success text-success-foreground" },
  draft: { label: "Entwurf", className: "bg-muted text-muted-foreground" },
  archived: { label: "Archiviert", className: "bg-muted/50 text-muted-foreground border border-border" },
}

export default function JobDetailPage() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="p-6 lg:p-8">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-4 -ml-2">
        <Link href="/jobs">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu Jobs
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-foreground">{mockJob.title}</h1>
              <Badge className={statusConfig[mockJob.status].className}>
                {statusConfig[mockJob.status].label}
              </Badge>
            </div>
            <p className="text-muted-foreground">{mockJob.company}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {mockJob.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {mockJob.employmentType}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Erstellt am {mockJob.createdAt}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Teilen
          </Button>
          <Button variant="outline" size="sm">
            <Archive className="mr-2 h-4 w-4" />
            Archivieren
          </Button>
          <Button size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="candidates">
            Kandidaten ({mockJob.candidateCount})
          </TabsTrigger>
          <TabsTrigger value="matches">Match-Analyse</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <JobOverviewTab job={mockJob} />
        </TabsContent>

        <TabsContent value="candidates">
          <JobCandidatesTab />
        </TabsContent>

        <TabsContent value="matches">
          <JobMatchesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
