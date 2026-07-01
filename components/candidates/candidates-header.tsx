"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, RefreshCw } from "lucide-react"
import { PageHero, HeroGhostButton } from "@/components/app/page-hero"

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
      <PageHero
        eyebrow="Kandidaten"
        title="Dein Kandidatenpool"
        subtitle="Alle Talente an einem Ort — durchsuchen, filtern und mit Jobs matchen."
        actions={
          <>
            {onRefresh && (
              <HeroGhostButton onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Aktualisieren
              </HeroGhostButton>
            )}
            <Button asChild>
              <Link href="/candidates/new">
                <Plus className="mr-2 h-4 w-4" />
                Kandidat hinzufügen
              </Link>
            </Button>
          </>
        }
      />

      <div className="reveal flex flex-col sm:flex-row gap-4">
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
