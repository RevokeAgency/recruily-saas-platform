"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  MoreHorizontal,
  Mail,
  MapPin,
  Briefcase,
  TrendingUp,
  Star,
  Eye,
  Calendar,
  CheckCircle2,
  Filter,
  ArrowUpDown,
} from "lucide-react"

interface JobCandidatesTabProps {
  jobId: string
  jobTitle: string
}

const mockCandidates = [
  {
    id: "1",
    name: "Sarah Johnson",
    initials: "S",
    email: "sarah.johnson@email.com",
    location: "San Francisco, CA",
    experience: "7 years exp",
    matchScore: 92,
    skillsScore: 90,
    experienceScore: 88,
    educationScore: 95,
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"],
    strengths: [
      "7 years of relevant experience",
      "Strong technical skill set (5 skills)",
      "Educational background: BS Computer Science",
    ],
    recommendations: [
      "Schedule interview immediately",
      "Strong candidate - fast-track process",
    ],
    isDemo: true,
  },
  {
    id: "2",
    name: "Michael Chen",
    initials: "M",
    email: "m.chen@techmail.com",
    location: "New York, NY",
    experience: "5 years exp",
    matchScore: 87,
    skillsScore: 85,
    experienceScore: 90,
    educationScore: 82,
    skills: ["React", "JavaScript", "CSS", "Node.js", "MongoDB"],
    strengths: [
      "5 years of frontend experience",
      "Strong React knowledge",
      "Good communication skills",
    ],
    recommendations: [
      "Consider for technical interview",
      "May need upskilling in TypeScript",
    ],
    isDemo: true,
  },
  {
    id: "3",
    name: "Emma Davis",
    initials: "E",
    email: "emma.d@gmail.com",
    location: "Berlin, DE",
    experience: "4 years exp",
    matchScore: 78,
    skillsScore: 80,
    experienceScore: 75,
    educationScore: 78,
    skills: ["Vue.js", "TypeScript", "Tailwind", "Python"],
    strengths: [
      "4 years of frontend development",
      "TypeScript proficiency",
      "Agile methodology experience",
    ],
    recommendations: [
      "Good backup candidate",
      "Consider for Vue.js specific roles",
    ],
    isDemo: true,
  },
  {
    id: "4",
    name: "Thomas Mueller",
    initials: "T",
    email: "t.mueller@company.de",
    location: "Munich, DE",
    experience: "6 years exp",
    matchScore: 85,
    skillsScore: 88,
    experienceScore: 82,
    educationScore: 85,
    skills: ["React", "TypeScript", "GraphQL", "AWS", "Docker"],
    strengths: [
      "6 years senior-level experience",
      "Full-stack capabilities",
      "Cloud architecture knowledge",
    ],
    recommendations: [
      "Strong technical candidate",
      "Schedule technical deep-dive",
    ],
    isDemo: true,
  },
  {
    id: "5",
    name: "Lisa Weber",
    initials: "L",
    email: "lisa.weber@mail.at",
    location: "Vienna, AT",
    experience: "3 years exp",
    matchScore: 72,
    skillsScore: 70,
    experienceScore: 68,
    educationScore: 80,
    skills: ["Angular", "TypeScript", "RxJS", "Java"],
    strengths: [
      "3 years of Angular experience",
      "Strong TypeScript skills",
      "Java backend knowledge",
    ],
    recommendations: [
      "Consider for Angular projects",
      "May need React training",
    ],
    isDemo: true,
  },
]

function getScoreColor(score: number) {
  if (score >= 80) return "text-primary"
  if (score >= 60) return "text-amber-500"
  return "text-destructive"
}

export function JobCandidatesTab({ jobId, jobTitle }: JobCandidatesTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState("match")

  const filteredCandidates = mockCandidates
    .filter((c) => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => b.matchScore - a.matchScore)

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Candidate Pool</h2>
          <p className="text-muted-foreground text-sm">
            {filteredCandidates.length} candidates for {jobTitle}
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {filteredCandidates.length} Total
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search candidates by name, email, skills, location..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Candidates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Candidates</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="interviewed">Interviewed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Match Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">Match Score</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date Added</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidates List */}
      <div className="space-y-4">
        {filteredCandidates.map((candidate) => (
          <Card 
            key={candidate.id} 
            className="border border-slate-200 bg-white rounded-xl hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="p-6">
              <div className="flex flex-col xl:flex-row gap-6">
                {/* Left: Candidate Info */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-12 w-12 bg-primary text-primary-foreground">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {candidate.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-lg">{candidate.name}</h3>
                        {candidate.isDemo && (
                          <Badge variant="outline" className="text-xs">Demo Data</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4" />
                          {candidate.email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {candidate.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4" />
                          {candidate.experience}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {candidate.skills.map((skill) => (
                      <span 
                        key={skill} 
                        className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-teal-100 transition-colors cursor-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Strengths and Recommendations */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm text-primary">Strengths</span>
                      </div>
                      <ul className="space-y-1">
                        {candidate.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary mt-1">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        <span className="font-medium text-sm text-amber-500">Recommendations</span>
                      </div>
                      <ul className="space-y-1">
                        {candidate.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-amber-500 mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Right: Match Score */}
                <div className="xl:w-64 xl:border-l xl:pl-6 xl:border-border">
                  <div className="text-center xl:text-right mb-4">
                    <p className={`text-4xl font-bold ${getScoreColor(candidate.matchScore)}`}>
                      {candidate.matchScore}%
                    </p>
                    <p className="text-sm text-muted-foreground">Overall Match</p>
                  </div>

                  {/* Score Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Skills</span>
                      <div className="flex items-center gap-2">
                        <Progress value={candidate.skillsScore} className="w-20 h-2" />
                        <span className="w-10 text-right font-medium">{candidate.skillsScore}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Experience</span>
                      <div className="flex items-center gap-2">
                        <Progress value={candidate.experienceScore} className="w-20 h-2" />
                        <span className="w-10 text-right font-medium">{candidate.experienceScore}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Education</span>
                      <div className="flex items-center gap-2">
                        <Progress value={candidate.educationScore} className="w-20 h-2" />
                        <span className="w-10 text-right font-medium">{candidate.educationScore}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Shortlist
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Calendar className="mr-2 h-4 w-4" />
                      Interview
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
