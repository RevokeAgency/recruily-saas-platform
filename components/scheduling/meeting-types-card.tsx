"use client"

import { useState } from "react"
import { Loader2, MapPin, Phone, Plus, Star, Trash2, Video } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LocationKind, MeetingType } from "@/lib/scheduling/types"

const KIND_LABELS: Record<LocationKind, string> = {
  video_auto: "Videocall, Link wird automatisch erzeugt",
  custom_link: "Eigener Videoraum",
  phone: "Telefonisch",
  onsite: "Vor Ort",
}

const KIND_ICONS: Record<LocationKind, React.ElementType> = {
  video_auto: Video,
  custom_link: Video,
  phone: Phone,
  onsite: MapPin,
}

const EMPTY = {
  id: undefined as string | undefined,
  name: "",
  description: "",
  durationMinutes: 30,
  locationKind: "video_auto" as LocationKind,
  locationValue: "",
  isDefault: false,
}

export function MeetingTypesCard({
  meetingTypes,
  hasCalendar,
  onChanged,
}: {
  meetingTypes: MeetingType[]
  hasCalendar: boolean
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const active = meetingTypes.filter((t) => t.active)

  const edit = (type: MeetingType) => {
    setDraft({
      id: type.id,
      name: type.name,
      description: type.description ?? "",
      durationMinutes: type.durationMinutes,
      locationKind: type.locationKind,
      locationValue: type.locationValue ?? "",
      isDefault: type.isDefault,
    })
    setOpen(true)
  }

  const create = () => {
    setDraft({ ...EMPTY, isDefault: active.length === 0 })
    setOpen(true)
  }

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Bitte gib der Terminart einen Namen.")
      return
    }
    if (draft.locationKind === "custom_link" && !draft.locationValue.trim()) {
      toast.error("Bitte hinterlege den Link zu deinem Videoraum.")
      return
    }
    if (draft.locationKind === "onsite" && !draft.locationValue.trim()) {
      toast.error("Bitte hinterlege die Adresse.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/scheduling/meeting-types", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen")
      setOpen(false)
      onChanged()
      toast.success(draft.id ? "Terminart aktualisiert" : "Terminart angelegt")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/scheduling/meeting-types?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      onChanged()
      toast.success("Terminart entfernt")
    } catch {
      toast.error("Terminart konnte nicht entfernt werden")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Terminarten</CardTitle>
              <CardDescription>
                Was du anbietest: Erstgespräch, Fachinterview, Probetag. Dauer und Ort hängen an der
                Terminart, nicht am einzelnen Bewerber.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={create}>
              <Plus className="h-4 w-4" />
              Neue Terminart
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {active.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Noch keine Terminart angelegt.
            </p>
          ) : (
            <div className="space-y-3">
              {active.map((type) => {
                const Icon = KIND_ICONS[type.locationKind]
                return (
                  <div
                    key={type.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--app-line)] p-4"
                  >
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-[var(--app-green-wash)]">
                      <Icon className="h-4.5 w-4.5 text-[var(--rv-green-deep)]" strokeWidth={2} />
                    </div>

                    <div className="min-w-[160px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{type.name}</span>
                        {type.isDefault && (
                          <Badge variant="outline" className="gap-1 border-[var(--rv-green)] text-[var(--rv-green-deep)]">
                            <Star className="h-3 w-3 fill-current" />
                            Standard
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {type.durationMinutes} Minuten · {KIND_LABELS[type.locationKind]}
                        {type.locationValue ? ` · ${type.locationValue}` : ""}
                      </p>
                    </div>

                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => edit(type)}>
                        Bearbeiten
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => remove(type.id)}
                        disabled={busyId === type.id || active.length === 1}
                        aria-label="Terminart entfernen"
                      >
                        {busyId === type.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Terminart bearbeiten" : "Neue Terminart"}</DialogTitle>
            <DialogDescription>
              Bewerber sehen Name, Dauer und Ort auf der Buchungsseite.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="mt-name" className="text-sm font-medium">Name</Label>
              <Input
                id="mt-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Erstgespräch"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Dauer</Label>
                <Select
                  value={String(draft.durationMinutes)}
                  onValueChange={(v) => setDraft((d) => ({ ...d, durationMinutes: Number(v) }))}
                >
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15, 20, 30, 45, 60, 90, 120].map((m) => (
                      <SelectItem key={m} value={String(m)}>{m} Minuten</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Ort</Label>
                <Select
                  value={draft.locationKind}
                  onValueChange={(v) => setDraft((d) => ({ ...d, locationKind: v as LocationKind }))}
                >
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video_auto">Videocall (automatisch)</SelectItem>
                    <SelectItem value="custom_link">Eigener Videoraum</SelectItem>
                    <SelectItem value="phone">Telefonisch</SelectItem>
                    <SelectItem value="onsite">Vor Ort</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {draft.locationKind === "video_auto" && !hasCalendar && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Für automatische Meet- oder Teams-Links braucht es einen verbundenen Kalender.
                Ohne Verbindung wird der Termin trotzdem gebucht, aber ohne Videolink. Ein eigener
                Videoraum funktioniert dagegen immer.
              </p>
            )}

            {(draft.locationKind === "custom_link" || draft.locationKind === "onsite") && (
              <div>
                <Label htmlFor="mt-loc" className="text-sm font-medium">
                  {draft.locationKind === "custom_link" ? "Link zum Videoraum" : "Adresse"}
                </Label>
                <Input
                  id="mt-loc"
                  value={draft.locationValue}
                  onChange={(e) => setDraft((d) => ({ ...d, locationValue: e.target.value }))}
                  placeholder={
                    draft.locationKind === "custom_link"
                      ? "https://meet.example.com/dein-raum"
                      : "Mariahilfer Straße 1, 1060 Wien"
                  }
                  className="mt-1.5"
                />
              </div>
            )}

            <div>
              <Label htmlFor="mt-desc" className="text-sm font-medium">Beschreibung</Label>
              <Textarea
                id="mt-desc"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Kurzes Kennenlernen, keine Vorbereitung nötig."
                rows={2}
                className="mt-1.5 resize-none"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(e) => setDraft((d) => ({ ...d, isDefault: e.target.checked }))}
                className="h-4 w-4 rounded border-[var(--app-line)] accent-[var(--rv-green)]"
              />
              Als Standard verwenden
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
