import { JobsList } from "@/components/jobs/jobs-list"
import { JobsHeader } from "@/components/jobs/jobs-header"

export default function JobsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <JobsHeader />
      <JobsList />
    </div>
  )
}
