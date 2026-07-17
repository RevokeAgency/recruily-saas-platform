"use client"

import { useState } from "react"
import { mutate } from "swr"
import { CandidatesHeader } from "@/components/candidates/candidates-header"
import { CandidatesList } from "@/components/candidates/candidates-list"
import { RevealGroup } from "@/components/app/reveal-group"

export default function CandidatesPage() {
  const [filter, setFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const handleRefresh = async () => {
    // Force revalidation by passing undefined as data and revalidate: true
    await mutate("/api/candidates", undefined, { revalidate: true })
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <RevealGroup className="relative z-[1] space-y-6 p-6 lg:p-8">
        <CandidatesHeader
          onRefresh={handleRefresh}
          filter={filter}
          onFilterChange={setFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <div className="reveal">
          <CandidatesList filter={filter} searchQuery={searchQuery} />
        </div>
      </RevealGroup>
    </div>
  )
}
