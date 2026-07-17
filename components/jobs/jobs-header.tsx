"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, RefreshCw } from "lucide-react"
import { PageHero, HeroGhostButton } from "@/components/app/page-hero"

interface JobsHeaderProps {
  onRefresh?: () => void
}

export function JobsHeader({ onRefresh }: JobsHeaderProps) {
  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Stellenangebote"
        title="Deine Jobs"
        subtitle="Verwalte deine offenen Stellen und finde die passenden Kandidaten."
        actions={
          <>
            <HeroGhostButton onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </HeroGhostButton>
            <Button asChild className="h-10 rounded-full px-4">
              <Link href="/jobs/new">
                <Plus className="mr-2 h-4 w-4" />
                Job erstellen
              </Link>
            </Button>
          </>
        }
      />

      <div className="reveal flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Jobs nach Titel, Unternehmen oder Standort suchen..."
            className="pl-11 rounded-full bg-white"
          />
        </div>
        <div className="flex gap-3">
          <Select defaultValue="all">
            <SelectTrigger className="h-11 w-full rounded-full bg-white sm:w-40">
              <SelectValue placeholder="Alle Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="active">Aktiv</SelectItem>
              <SelectItem value="draft">Entwurf</SelectItem>
              <SelectItem value="archived">Archiviert</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="h-11 w-full rounded-full bg-white sm:w-40">
              <SelectValue placeholder="Alle Typen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              <SelectItem value="full-time">Vollzeit</SelectItem>
              <SelectItem value="part-time">Teilzeit</SelectItem>
              <SelectItem value="contract">Befristet</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
