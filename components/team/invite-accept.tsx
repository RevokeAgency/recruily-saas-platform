"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Mail, Users } from "lucide-react"
import { toast } from "sonner"

import { RvBrandMark } from "@/components/landing/rv-brand-mark"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

import type { InviteState as State } from "@/lib/team/model"

interface Props {
  token: string
  state: State
  company: string | null
  inviter: string | null
  inviteEmail: string | null
  signedInEmail: string | null
}

const CLOSED: Record<Exclude<State, "open">, { title: string; text: string }> = {
  invalid: { title: "Einladung nicht gefunden", text: "Der Link ist unvollständig oder wurde zurückgezogen. Bitte lass dich neu einladen." },
  used: { title: "Einladung schon verwendet", text: "Diese Einladung wurde bereits angenommen. Melde dich einfach an." },
  expired: { title: "Einladung abgelaufen", text: "Der Link ist nicht mehr gültig. Bitte lass dich neu einladen." },
}

const labelClass = "text-[var(--rv-ink-soft)] mb-1.5 block text-sm font-medium"

export function InviteAccept({ token, state, company, inviter, inviteEmail, signedInEmail }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<"register" | "login">("register")
  const [busy, setBusy] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)
  const [form, setForm] = useState({ firstName: "", lastName: "", password: "", agb: false })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const header = (
    <Link href="/" className="mb-8 flex justify-center">
      <RvBrandMark />
    </Link>
  )

  if (state !== "open") {
    const c = CLOSED[state]
    return (
      <div className="text-center">
        {header}
        <h1 className="mb-2.5 text-xl font-bold text-foreground">{c.title}</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Zur Startseite</Link>
        </Button>
      </div>
    )
  }

  const email = inviteEmail ?? ""
  const intro = (
    <>
      {header}
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--app-green-wash)]">
        <Users className="h-6 w-6 text-[var(--rv-green-deep)]" strokeWidth={1.75} />
      </div>
      <h1 className="mb-1.5 text-center text-xl font-bold text-foreground">Einladung ins Team</h1>
      <p className="mb-8 text-center text-sm leading-relaxed text-muted-foreground">
        {inviter} lädt dich ein, bei <strong className="text-foreground">{company}</strong> mitzuarbeiten.
        Du legst eigene Stellen an und siehst die, die fürs Team freigegeben sind. Dein Kalender bleibt dein eigener.
      </p>
    </>
  )

  async function accept() {
    setBusy(true)
    const res = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? "Beitritt fehlgeschlagen.")
      setBusy(false)
      return
    }
    toast.success(`Willkommen im Team von ${company}`)
    router.push("/dashboard")
    router.refresh()
  }

  async function signOut() {
    setBusy(true)
    await createClient().auth.signOut()
    router.refresh()
    setBusy(false)
  }

  if (signedInEmail) {
    const matches = signedInEmail.toLowerCase() === email
    return (
      <div>
        {intro}
        {matches ? (
          <Button onClick={accept} disabled={busy} className="w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Team beitreten
          </Button>
        ) : (
          <>
            <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800">
              Du bist als <strong>{signedInEmail}</strong> angemeldet. Die Einladung gilt für <strong>{email}</strong>.
              Melde dich ab und mit dieser Adresse wieder an.
            </p>
            <Button onClick={signOut} disabled={busy} variant="outline" className="w-full">
              Abmelden
            </Button>
          </>
        )}
      </div>
    )
  }

  if (confirmSent) {
    return (
      <div className="text-center">
        {header}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--app-green-wash)]">
          <Mail className="h-6 w-6 text-[var(--rv-green-deep)]" strokeWidth={1.75} />
        </div>
        <h1 className="mb-2.5 text-xl font-bold text-foreground">E-Mail bestätigen</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Wir haben dir eine Bestätigung an <strong className="text-foreground">{email}</strong> geschickt.
          Nach dem Klick auf den Link kommst du hierher zurück und trittst dem Team bei.
        </p>
      </div>
    )
  }

  async function register(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 6) return toast.error("Das Passwort muss mindestens 6 Zeichen lang sein")
    if (!form.agb) return toast.error("Bitte akzeptiere die AGB")
    setBusy(true)
    const { data, error } = await createClient().auth.signUp({
      email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/team/einladung/${token}`)}`,
        data: { first_name: form.firstName, last_name: form.lastName },
      },
    })
    setBusy(false)
    if (error) return toast.error(error.message)
    // Ohne Bestätigungspflicht ist die Sitzung sofort da.
    if (data.session) router.refresh()
    else setConfirmSent(true)
  }

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await createClient().auth.signInWithPassword({ email, password: form.password })
    setBusy(false)
    if (error) return toast.error("Anmeldung fehlgeschlagen. Bitte prüfe dein Passwort.")
    router.refresh()
  }

  return (
    <div>
      {intro}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1 text-sm font-medium">
        {(["register", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 transition-colors ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {m === "register" ? "Konto anlegen" : "Ich habe ein Konto"}
          </button>
        ))}
      </div>

      <form onSubmit={mode === "register" ? register : login} className="space-y-4">
        {mode === "register" && (
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <Label htmlFor="firstName" className={labelClass}>Vorname</Label>
              <Input id="firstName" value={form.firstName} onChange={set("firstName")} required />
            </div>
            <div>
              <Label htmlFor="lastName" className={labelClass}>Nachname</Label>
              <Input id="lastName" value={form.lastName} onChange={set("lastName")} required />
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="email" className={labelClass}>E-Mail</Label>
          <Input id="email" type="email" value={email} readOnly disabled />
        </div>
        <div>
          <Label htmlFor="password" className={labelClass}>Passwort</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={set("password")}
            placeholder={mode === "register" ? "Mindestens 6 Zeichen" : ""}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
            minLength={6}
          />
        </div>
        {mode === "register" && (
          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="agb"
              checked={form.agb}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, agb: checked === true }))}
              className="mt-0.5"
            />
            <Label htmlFor="agb" className="block cursor-pointer text-sm leading-relaxed font-normal text-muted-foreground">
              Ich akzeptiere die{" "}
              <Link href="/agb" target="_blank" rel="noopener" className="text-[var(--rv-green-deep)] hover:underline">
                Allgemeinen Geschäftsbedingungen
              </Link>{" "}
              und habe die{" "}
              <Link href="/datenschutz" target="_blank" rel="noopener" className="text-[var(--rv-green-deep)] hover:underline">
                Datenschutzerklärung
              </Link>{" "}
              gelesen.
            </Label>
          </div>
        )}
        <Button type="submit" disabled={busy} className="mt-6 w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "register" ? "Konto anlegen" : "Anmelden"}
        </Button>
        {mode === "login" && (
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/reset" className="text-[var(--rv-green-deep)] hover:underline">Passwort vergessen?</Link>
          </p>
        )}
      </form>
    </div>
  )
}
