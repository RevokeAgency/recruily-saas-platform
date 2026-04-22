"use client"

import { mutate } from "swr"
import { CandidatesHeader } from "@/components/candidates/candidates-header"
import { CandidatesList } from "@/components/candidates/candidates-list"

export default function CandidatesPage() {
  const handleRefresh = async () => {
    // Force revalidation by passing undefined as data and revalidate: true
    await mutate("/api/candidates", undefined, { revalidate: true })
  }

  return (
    <div className="p-8 lg:p-10 space-y-8">
      <CandidatesHeader onRefresh={handleRefresh} />
      <CandidatesList />
    </div>
  )
}
