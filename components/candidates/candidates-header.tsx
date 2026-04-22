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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Kandidaten</h1>
          <p className="text-slate-500 mt-1.5">
            Verwalte deinen Kandidatenpool
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onRefresh && (
            <Button 
              variant="outline" 
              onClick={onRefresh}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
          )}
          <Button asChild className="bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm">
            <Link href="/candidates/new">
              <Plus className="mr-2 h-4 w-4" />
              Kandidat hinzufügen
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Kandidaten nach Name, Skills oder Standort suchen..."
            className="pl-11 h-12 bg-white border-slate-200 rounded-xl"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <Tabs value={filter} onValueChange={onFilterChange} className="w-auto">
          <TabsList className="h-12 bg-slate-100 rounded-xl p-1">
            <TabsTrigger value="all" className="rounded-lg">Alle</TabsTrigger>
            <TabsTrigger value="unmatched" className="rounded-lg">Unverknüpft</TabsTrigger>
            <TabsTrigger value="matched" className="rounded-lg">Gematcht</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
