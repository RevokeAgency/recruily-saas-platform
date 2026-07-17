"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Mail } from "lucide-react"
import { toast } from "sonner"
import { assignInboundEmail } from "@/app/actions/inbound"

export interface InboxEmail {
  id: string
  from_address: string | null
  to_address: string | null
  subject: string | null
  status: string
  reason: string | null
  created_at: string
}

const statusLabel: Record<string, string> = {
  unassigned: "Nicht zugeordnet",
  no_cv: "Kein CV erkannt",
  error: "Fehler",
}

export function InboxItem({ item, jobs }: { item: InboxEmail; jobs: { id: string; title: string }[] }) {
  const [jobId, setJobId] = useState("")
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleAssign = () => {
    if (!jobId) return
    startTransition(async () => {
      const res = await assignInboundEmail(item.id, jobId)
      if (res.ok) {
        setDone(true)
        toast.success("Bewerbung zugewiesen — wird gescort")
      } else {
        toast.error(res.error || "Zuweisung fehlgeschlagen")
      }
    })
  }

  if (done) return null

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[rgba(34,193,238,.12)]">
            <Mail className="h-4 w-4 text-[var(--rv-cyan-deep)]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-foreground">
                {item.subject || "(kein Betreff)"}
              </span>
              <Badge variant="neutral" className="rounded-full">
                {statusLabel[item.status] ?? item.status}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              von {item.from_address || "unbekannt"} · an {item.to_address}
            </p>
            {item.reason && <p className="mt-0.5 text-xs text-muted-foreground">{item.reason}</p>}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger className="h-10 w-48 rounded-full">
              <SelectValue placeholder="Job wählen" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-10 rounded-full px-4" onClick={handleAssign} disabled={!jobId || pending}>
            {pending ? "Weise zu…" : "Zuweisen"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
