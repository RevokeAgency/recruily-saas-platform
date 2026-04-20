"use client"

import { useSWRConfig } from "swr"
import { CandidatesHeader } from "@/components/candidates/candidates-header"
import { CandidatesList } from "@/components/candidates/candidates-list"

export default function CandidatesPage() {
  const { mutate } = useSWRConfig()

  const handleRefresh = () => {
    mutate("/api/candidates")
  }

  return (
    <div className="p-8 lg:p-10 space-y-8">
      <CandidatesHeader onRefresh={handleRefresh} />
      <CandidatesList />
    </div>
  )
}
