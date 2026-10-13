"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Mail, Minus, Plus, RotateCw, Users, X } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PLANS, extraSeatPriceLabel, type PlanId } from "@/lib/plans"

interface Person { id: string; name: string; email: string | null }
interface TeamData {
  role: "owner" | "member"
  active: boolean
  me: string
  canBuyExtraSeats: boolean
  owner: Person & { plan: PlanId; extraSeats: number; company: string | null }
  members: Array<Person & { active: boolean; joinedAt: string }>
  invites: Array<{ id: string; email: string; createdAt: string; expiresAt: string }>
  seats: { limit: number | null; used: number; free: number | null }
}

type Loaded = { state: "ready" | "migration" | "error"; data?: TeamData }

async function fetchTeam(): Promise<Loaded> {
  try {
    const res = await fetch("/api/team")
    if (res.status === 503) return { state: "migration" }
    if (!res.ok) return { state: "error" }
    return { state: "ready", data: (await res.json()) as TeamData }
  } catch {
    return { state: "error" }
  }
}

const dateDe = (iso: string) =>
  new Date(iso).toLocaleDateString("de-AT", { day: "numeric", month: "short", year: "numeric" })

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?"
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--app-green-wash)] text-xs font-bold text-[var(--rv-green-deep)]">
      {initials(name)}
    </span>
  )
}

/**
 * Team in den Einstellungen (Migration 035). Der Inhaber lädt ein, entfernt
 * und bucht Plätze dazu. Mitglieder sehen das Team und können es verlassen.
 */
export function TeamCard() {
  const router = useRouter()
  const [data, setData] = useState<TeamData | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "migration" | "error">("loading")
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ kind: "remove" | "leave"; person: Person } | null>(null)
  const [seatTarget, setSeatTarget] = useState<number | null>(null)

  const apply = useCallback((r: Loaded) => {
    setState(r.state)
    if (r.data) {
      setData(r.data)
      setSeatTarget(r.data.owner.extraSeats)
    }
  }, [])

  const load = useCallback(async () => apply(await fetchTeam()), [apply])

  useEffect(() => {
    let alive = true
    fetchTeam().then((r) => alive && apply(r))
    return () => {
      alive = false
    }
  }, [apply])

  async function invite(target: string) {
    setBusy(`invite:${target}`)
    const res = await fetch("/api/team/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: target }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) return toast.error(body.error ?? "Einladung fehlgeschlagen.")
    if (body.sent === false) toast.warning("Einladung angelegt, aber die Mail konnte nicht verschickt werden.")
    else toast.success(body.resend ? `Einladung an ${target} erneut verschickt` : `Einladung an ${target} verschickt`)
    setEmail("")
    load()
  }

  async function revoke(id: string) {
    setBusy(`revoke:${id}`)
    const res = await fetch(`/api/team/invites/${id}`, { method: "DELETE" })
    setBusy(null)
    if (!res.ok) return toast.error("Konnte die Einladung nicht zurückziehen.")
    toast.success("Einladung zurückgezogen")
    load()
  }

  async function removeMember(person: Person, leaving: boolean) {
    setBusy(`member:${person.id}`)
    const res = await fetch(`/api/team/members/${person.id}`, { method: "DELETE" })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    setConfirm(null)
    if (!res.ok) return toast.error(body.error ?? "Das hat nicht geklappt.")
    if (leaving) {
      toast.success("Du hast das Team verlassen")
      router.push("/dashboard")
      router.refresh()
      return
    }
    toast.success(`${person.name} wurde entfernt`)
    load()
  }

  async function saveSeats() {
    if (seatTarget == null) return
    setBusy("seats")
    const res = await fetch("/api/stripe/seats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: seatTarget }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) return toast.error(body.error ?? "Plätze konnten nicht geändert werden.")
    toast.success(seatTarget === 0 ? "Zusatzplätze gekündigt" : `${seatTarget} Zusatzplätze gebucht`)
    load()
  }

  const header = (
    <CardHeader>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-green-wash)]">
          <Users className="h-4 w-4 text-[var(--rv-green-deep)]" strokeWidth={2} />
        </span>
        <CardTitle className="text-lg">Team</CardTitle>
        {data && (
          <Badge variant="secondary" className="ml-2 rounded-full">
            {data.seats.limit === null ? `${data.seats.used} Nutzer` : `${data.seats.used} von ${data.seats.limit} Plätzen`}
          </Badge>
        )}
      </div>
      <CardDescription>
        {data?.role === "member"
          ? `Du arbeitest im Team von ${data.owner.company || data.owner.name}. Abo und Plätze verwaltet der Inhaber.`
          : "Alle im Team sehen dieselben Stellen und Kandidaten. Kalender und Benachrichtigungen bleiben pro Person."}
      </CardDescription>
    </CardHeader>
  )

  if (state !== "ready" || !data) {
    return (
      <Card className="reveal border border-border shadow-card">
        {header}
        <CardContent>
          {state === "loading" && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
          {state === "migration" && (
            <p className="text-sm text-muted-foreground">Teamzugänge werden gerade eingerichtet und sind in Kürze verfügbar.</p>
          )}
          {state === "error" && <p className="text-sm text-muted-foreground">Das Team konnte nicht geladen werden.</p>}
        </CardContent>
      </Card>
    )
  }

  const isOwner = data.role === "owner"
  const full = data.seats.free !== null && data.seats.free <= 0
  const plan = PLANS[data.owner.plan] ?? PLANS.free
  const seatPrice = extraSeatPriceLabel("monthly")
  const seatsChanged = seatTarget !== data.owner.extraSeats

  return (
    <Card className="reveal border border-border shadow-card">
      {header}
      <CardContent className="space-y-5">
        {!data.active && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
            Dein Platz im Team ist gerade gesperrt, weil das Team weniger Plätze hat als Mitglieder. Sobald ein Platz frei
            wird, bist du automatisch wieder dabei.
          </p>
        )}

        <ul className="divide-y divide-border rounded-2xl border border-border">
          <li className="flex items-center gap-3 px-4 py-3">
            <Avatar name={data.owner.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{data.owner.name}</p>
              <p className="truncate text-xs text-muted-foreground">{data.owner.email}</p>
            </div>
            <Badge variant="secondary" className="rounded-full">Inhaber</Badge>
          </li>
          {data.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {m.name}
                  {m.id === data.me && <span className="font-normal text-muted-foreground"> (du)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.email} · dabei seit {dateDe(m.joinedAt)}
                </p>
              </div>
              {!m.active && <Badge variant="outline" className="rounded-full border-amber-300 text-amber-700">Gesperrt</Badge>}
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirm({ kind: "remove", person: m })}
                  aria-label={`${m.name} entfernen`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {!isOwner && m.id === data.me && (
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setConfirm({ kind: "leave", person: m })}>
                  Verlassen
                </Button>
              )}
            </li>
          ))}
          {data.invites.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-muted">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{i.email}</p>
                <p className="truncate text-xs text-muted-foreground">Eingeladen, gültig bis {dateDe(i.expiresAt)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy !== null}
                onClick={() => invite(i.email)}
                aria-label={`Einladung an ${i.email} erneut senden`}
              >
                {busy === `invite:${i.email}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                disabled={busy !== null}
                onClick={() => revoke(i.id)}
                aria-label={`Einladung an ${i.email} zurückziehen`}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>

        {isOwner && (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault()
              if (email.trim()) invite(email.trim())
            }}
          >
            <Input
              type="email"
              placeholder="name@firma.at"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={full || busy !== null}
              aria-label="E-Mail-Adresse der Person"
            />
            <Button type="submit" disabled={full || busy !== null || !email.trim()} className="h-10 rounded-full px-5">
              {busy === `invite:${email.trim()}` && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Einladen
            </Button>
          </form>
        )}

        {isOwner && full && !data.canBuyExtraSeats && plan.seats !== null && (
          <p className="text-sm text-muted-foreground">
            Im Plan {plan.label} ist {plan.seats === 1 ? "ein Nutzer" : `für ${plan.seats} Nutzer`} Platz.{" "}
            <Link href="/subscription" className="font-semibold text-[var(--rv-green-deep)] hover:underline">
              Plan wechseln
            </Link>
            , um mehr Personen einzuladen.
          </p>
        )}

        {isOwner && data.canBuyExtraSeats && seatTarget !== null && (
          <>
            <Separator />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">Zusätzliche Nutzer</p>
                <p className="text-sm text-muted-foreground">
                  {plan.seats} Nutzer sind im Plan {plan.label} enthalten, jeder weitere kostet {seatPrice} im Monat.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  disabled={busy !== null || seatTarget <= 0}
                  onClick={() => setSeatTarget((n) => Math.max(0, (n ?? 0) - 1))}
                  aria-label="Einen Platz weniger"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-base font-bold tabular-nums" aria-live="polite">{seatTarget}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  disabled={busy !== null || seatTarget >= 50}
                  onClick={() => setSeatTarget((n) => Math.min(50, (n ?? 0) + 1))}
                  aria-label="Einen Platz mehr"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  className="ml-2 h-10 rounded-full px-5"
                  disabled={busy !== null || !seatsChanged}
                  onClick={saveSeats}
                >
                  {busy === "seats" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Übernehmen
                </Button>
              </div>
            </div>
            {seatsChanged && (
              <p className="text-xs text-muted-foreground">
                Die Änderung wird anteilig für den laufenden Zeitraum abgerechnet, über dieselbe Zahlungsart wie dein Abo.
              </p>
            )}
          </>
        )}
      </CardContent>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "leave" ? "Team verlassen?" : `${confirm?.person.name} entfernen?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "leave"
                ? "Du verlierst den Zugriff auf Stellen und Kandidaten des Teams. Dein Konto bleibt bestehen."
                : "Die Person verliert sofort den Zugriff auf Stellen und Kandidaten. Was sie bearbeitet hat, bleibt im Team erhalten."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirm && removeMember(confirm.person, confirm.kind === "leave")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirm?.kind === "leave" ? "Verlassen" : "Entfernen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
