import { CandidatesHeader } from "@/components/candidates/candidates-header"
import { CandidatesList } from "@/components/candidates/candidates-list"

export default function CandidatesPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <CandidatesHeader />
      <CandidatesList />
    </div>
  )
}
