"use client"

import { useState } from "react"
import { AlertTriangle, CalendarSync, Link2Off, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export interface CalendarAccount {
  id: string
  provider: "google" | "microsoft"
  account_email: string | null
  busy_enabled: boolean
  write_enabled: boolean
  last_error: string | null
  last_error_at: string | null
}

export interface SchedulingSetup {
  encryptionReady: boolean
  google: boolean
  microsoft: boolean
}

const PROVIDER_LABEL = { google: "Google Workspace", microsoft: "Microsoft 365" } as const

export function CalendarAccountsCard({
  accounts,
  setup,
  onChanged,
}: {
  accounts: CalendarAccount[]
  setup: SchedulingSetup
  onChanged: () => void
}) {
  const [busyId, setBusyId] = useState<string | null>(null)

  const toggle = async (id: string, field: "busyEnabled" | "writeEnabled", value: boolean) => {
    setBusyId(id)
    try {
      const res = await fetch("/api/calendar/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: value }),
      })
      if (!res.ok) throw new Error()
      onChanged()
    } catch {
      toast.error("Einstellung konnte nicht gespeichert werden")
    } finally {
      setBusyId(null)
    }
  }

  const disconnect = async (id: string) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/calendar/accounts?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Verbindung getrennt")
      onChanged()
    } catch {
      toast.error("Verbindung konnte nicht getrennt werden")
    } finally {
      setBusyId(null)
    }
  }

  const canConnect = setup.encryptionReady

  return (
    <Card className="reveal s1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarSync className="h-5 w-5" />
          Kalender verbinden
        </CardTitle>
        <CardDescription>
          Optional. Ohne Verbindung funktioniert die Buchung trotzdem, Revetly rechnet dann nur mit
          den hier gebuchten Terminen. Mit Verbindung werden deine echten Termine als belegt
          erkannt und neue Buchungen landen direkt in deinem Kalender.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!setup.encryptionReady && (
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">Kalenderanbindung noch nicht freigeschaltet</p>
              <p className="mt-0.5 text-amber-800">
                Es fehlt der Schlüssel <code className="rounded bg-amber-100 px-1">SCHEDULING_TOKEN_KEY</code>,
                mit dem die Zugänge verschlüsselt gespeichert werden. Ohne ihn speichert Revetly
                bewusst gar nichts.
              </p>
            </div>
          </div>
        )}

        {accounts.length > 0 && (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-xl border border-[var(--app-line)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {PROVIDER_LABEL[account.provider]}
                      </span>
                      {account.last_error ? (
                        <Badge variant="outline" className="border-red-200 text-red-600">
                          Verbindung prüfen
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-[var(--rv-green)] text-[var(--rv-green-deep)]">
                          Aktiv
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {account.account_email ?? "Konto"}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnect(account.id)}
                    disabled={busyId === account.id}
                  >
                    {busyId === account.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2Off className="h-4 w-4" />
                    )}
                    Trennen
                  </Button>
                </div>

                {account.last_error && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    Letzter Fehler: {account.last_error.slice(0, 200)}. Meist hilft es, die
                    Verbindung zu trennen und neu herzustellen.
                  </p>
                )}

                <div className="mt-4 flex flex-col gap-3 border-t border-[var(--app-line)] pt-3 sm:flex-row sm:gap-8">
                  <div className="flex items-center gap-2.5">
                    <Switch
                      id={`busy-${account.id}`}
                      checked={account.busy_enabled}
                      onCheckedChange={(v) => toggle(account.id, "busyEnabled", v)}
                      disabled={busyId === account.id}
                    />
                    <Label htmlFor={`busy-${account.id}`} className="text-sm font-normal">
                      Belegte Zeiten berücksichtigen
                    </Label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Switch
                      id={`write-${account.id}`}
                      checked={account.write_enabled}
                      onCheckedChange={(v) => toggle(account.id, "writeEnabled", v)}
                      disabled={busyId === account.id}
                    />
                    <Label htmlFor={`write-${account.id}`} className="text-sm font-normal">
                      Termine hier eintragen
                    </Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild disabled={!canConnect || !setup.google}>
            <a href="/api/calendar/connect/google">
              {accounts.some((a) => a.provider === "google") ? "Weiteres Google-Konto" : "Google Workspace verbinden"}
            </a>
          </Button>
          <Button variant="outline" asChild disabled={!canConnect || !setup.microsoft}>
            <a href="/api/calendar/connect/microsoft">
              {accounts.some((a) => a.provider === "microsoft") ? "Weiteres Microsoft-Konto" : "Microsoft 365 verbinden"}
            </a>
          </Button>
        </div>

        {(!setup.google || !setup.microsoft) && setup.encryptionReady && (
          <p className="text-xs text-muted-foreground">
            {!setup.google && !setup.microsoft
              ? "Beide Anbieter sind noch nicht eingerichtet."
              : !setup.google
                ? "Google ist noch nicht eingerichtet."
                : "Microsoft ist noch nicht eingerichtet."}{" "}
            Die Zugangsdaten dafür werden einmalig als Umgebungsvariablen hinterlegt.
          </p>
        )}

        <div className="flex gap-2.5 rounded-xl bg-[var(--app-green-wash)] px-4 py-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-[var(--rv-green-deep)]" />
          <p>
            Revetly liest ausschließlich, wann du belegt bist, nicht worum es geht. Kalenderinhalte
            werden nicht gespeichert, die Zugänge liegen verschlüsselt. Google und Microsoft sind
            Anbieter außerhalb der EU: Ohne Verbindung verlassen deine Termindaten die EU nicht.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
