"use client"

import { JobsList, useJobsRefresh } from "@/components/jobs/jobs-list"
import { JobsHeader } from "@/components/jobs/jobs-header"
import { RevealGroup } from "@/components/app/reveal-group"

export default function JobsPage() {
  return (
    <div className="relative min-h-full overflow-hidden">
      <RevealGroup className="relative z-[1] space-y-6 p-6 lg:p-8">
        <JobsPageContent />
      </RevealGroup>
    </div>
  )
}

function JobsPageContent() {
  const refresh = useJobsRefresh()

  return (
    <>
      <JobsHeader onRefresh={() => refresh()} />
      <div className="reveal">
        <JobsList />
      </div>
    </>
  )
}
