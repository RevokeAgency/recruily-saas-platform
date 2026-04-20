"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { FileText, Upload } from "lucide-react"

interface JobApplicationsTabProps {
  jobId: string
}

export function JobApplicationsTab({ jobId }: JobApplicationsTabProps) {
  // For now, show empty state - will be connected to real data later
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Applications</h2>
          <p className="text-muted-foreground text-sm">
            Review and manage incoming job applications
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Import Applications
        </Button>
      </div>

      {/* Empty State */}
      <Card className="border border-border">
        <CardContent className="py-16">
          <EmptyState
            icon={FileText}
            title="No applications yet"
            description="Applications from candidates who apply directly to this job posting will appear here."
            actionLabel="Share Job Posting"
            actionHref="#"
          />
        </CardContent>
      </Card>
    </div>
  )
}
