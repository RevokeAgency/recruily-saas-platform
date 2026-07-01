"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, RefreshCw } from "lucide-react"

interface CandidatesHeaderProps {
  onRefresh?: () => void
  filter: string
  onFilterChange: (filter: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function CandidatesHeader({ 
  onRefresh, 
  filter, 
  onFilterChange,
  searchQuery,
  onSearchChange,
}: CandidatesHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Kandidaten</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Verwalte deinen Kandidatenpool
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
          )}
          <Button asChild>
            <Link href="/candidates/new">
              <Plus className="mr-2 h-4 w-4" />
              Kandidat hinzufügen
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kandidaten nach Name, Skills oder Standort suchen..."
            className="pl-11"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <Tabs value={filter} onValueChange={onFilterChange} className="w-auto">
          <TabsList className="h-11 bg-[var(--rv-mist)] rounded-[10px] p-1">
            <TabsTrigger value="all" className="rounded-[7px]">Alle</TabsTrigger>
            <TabsTrigger value="unmatched" className="rounded-[7px]">Unverknüpft</TabsTrigger>
            <TabsTrigger value="matched" className="rounded-[7px]">Gematcht</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
