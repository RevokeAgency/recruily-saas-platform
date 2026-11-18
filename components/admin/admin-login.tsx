"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react"

import { RvButton } from "@/components/landing/rv-button"
import { createClient } from "@/lib/supabase/client"

const FIELD =
  "w-full rounded-2xl border border-[var(--app-line)] bg-white px-4 py-3 text-[.95rem] text-foreground outline-none transition-colors focus:border-[var(--rv-green-deep)] focus-visible:ring-2 focus-visible:ring-[var(--rv-green)]/30"
const LABEL = "mb-1.5 block text-sm font-medium text-foreground"

export type AdminLoginStep = "credentials" | "enroll" | "verify" | "forbidden"

/**
 * Anmeldung für /admin in drei Schritten: Passwort, beim ersten Mal den
 * zweiten Faktor einrichten (QR-Code für die Authenticator-App), danach bei
 * jeder Anmeldung den Code bestätigen. Welcher Schritt dran ist, entscheidet
 * der Server (lib/admin/access.ts) und gibt ihn als `step` mit.
 */
export function AdminLogin({ step, adminEmail, signedInAs }: { step: AdminLoginStep; adminEmail: string; signedInAs?: string | null }) {
  const [supabase] = useState(createClient)
  const [email, setEmail] = useState(adminEmail)
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [enrollment, setEnrollment] = useState<{ factorId: string; qr: string; secret: string } | null>(null)
  const started = useRef(false)

  // Zweiten Faktor einrichten: alte, nie bestätigte Versuche aufräumen, dann
  // einen neuen QR-Code holen. Die Ref verhindert einen doppelten Start.
  useEffect(() => {
    if (step !== "enroll" || started.current) return
    started.current = true
    void (async () => {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      for (const f of factors?.all ?? []) {
        if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
      const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Revetly Admin" })
      if (e || !data) {
        setError(`Der zweite Faktor ließ sich nicht einrichten: ${e?.message ?? "unbekannter Fehler"}`)
        return
      }
      setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
    })()
  }, [step, supabase])

  /** Bricht nach `ms` ab, damit der Knopf nie endlos lädt. */
  const withTimeout = <T,>(p: Promise<T>, ms = 20_000): Promise<T> =>
    Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))])

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { data, error: e2 } = await withTimeout(supabase.auth.signInWithPassword({ email: email.trim(), password }))
      if (e2 || !data.user) {
        setError("E-Mail oder Passwort stimmt nicht.")
        setBusy(false)
        return
      }
      if (data.user.email?.toLowerCase() !== adminEmail) {
        await supabase.auth.signOut()
        setError("Dieses Konto hat keinen Zugang zum Admin-Bereich.")
        setBusy(false)
        return
      }
      // Seite neu laden statt router.refresh: Die Seite lädt sichtbar neu,
      // und ein Fehler beim Laden bleibt nicht hinter einem Ladezeichen hängen.
      window.location.reload()
    } catch {
      setError("Keine Antwort vom Server. Bitte versuch es noch einmal.")
      setBusy(false)
    }
  }

  const confirmCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      let factorId = enrollment?.factorId
      if (!factorId) {
        const { data } = await withTimeout(supabase.auth.mfa.listFactors())
        factorId = data?.totp.find((f) => f.status === "verified")?.id
      }
      if (!factorId) {
        setError("Kein zweiter Faktor gefunden. Lade die Seite neu.")
        setBusy(false)
        return
      }
      const { error: e2 } = await withTimeout(
        supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, "") }),
      )
      if (e2) {
        setError(
          /invalid|code/i.test(e2.message)
            ? "Der Code stimmt nicht. Nimm den aktuellen Code aus der App."
            : `Bestätigung fehlgeschlagen: ${e2.message}`,
        )
        setBusy(false)
        return
      }
      setDone(true)
      window.location.reload()
    } catch {
      setError("Keine Antwort vom Server. Lade die Seite neu und versuch es noch einmal.")
      setBusy(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-16">
      <div className="w-full max-w-[420px] rounded-[24px] border border-[var(--app-line)] bg-white p-7 shadow-[var(--app-shadow-card)]">
        <Image src="/revetly/logo-520.webp" alt="Revetly" width={116} height={28} className="h-7 w-auto" priority />
        <p className="mt-6 text-[.72rem] font-bold tracking-[.1em] text-[var(--rv-green-deep)] uppercase">Admin</p>

        {step === "forbidden" && (
          <>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Kein Zugang</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Du bist als <span className="font-medium text-foreground">{signedInAs ?? "unbekannt"}</span> angemeldet.
              Der Admin-Bereich ist nur für {adminEmail}.
            </p>
            <RvButton onClick={signOut} variant="light" className="mt-6 w-full">
              <LogOut className="h-4 w-4" />
              Abmelden und mit dem Admin-Konto anmelden
            </RvButton>
          </>
        )}

        {step === "credentials" && (
          <form onSubmit={signIn} className="mt-1 space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Anmelden</h1>
            <div>
              <label htmlFor="admin-email" className={LABEL}>E-Mail</label>
              <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} required />
            </div>
            <div>
              <label htmlFor="admin-password" className={LABEL}>Passwort</label>
              <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} required />
            </div>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            <RvButton type="submit" variant="light" disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Weiter
            </RvButton>
          </form>
        )}

        {(step === "enroll" || step === "verify") && (
          <form onSubmit={confirmCode} className="mt-1 space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {step === "enroll" ? "Zweiten Faktor einrichten" : "Code bestätigen"}
            </h1>
            {step === "enroll" ? (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Scanne den QR-Code mit einer Authenticator-App, zum Beispiel Google Authenticator oder 1Password,
                  und gib den sechsstelligen Code ein. Das ist nur beim ersten Mal nötig.
                </p>
                {enrollment ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--app-line)] bg-[var(--rv-mist)] p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={enrollment.qr} alt="QR-Code für die Authenticator-App" width={180} height={180} className="rounded-lg bg-white p-2" />
                    <p className="text-center text-xs text-muted-foreground">
                      Kein Scan möglich? Schlüssel von Hand eingeben:
                      <span className="mt-1 block font-mono text-[.8rem] break-all text-foreground">{enrollment.secret}</span>
                    </p>
                  </div>
                ) : (
                  !error && <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                )}
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">Gib den aktuellen Code aus deiner Authenticator-App ein.</p>
            )}
            <div>
              <label htmlFor="admin-code" className={LABEL}>Code</label>
              <input
                id="admin-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${FIELD} text-center font-mono text-lg tracking-[.3em]`}
                required
              />
            </div>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            {done && <p role="status" className="text-sm font-medium text-[var(--rv-green-deep)]">Bestätigt. Die Übersicht wird geladen.</p>}
            <RvButton type="submit" variant="light" disabled={busy || (step === "enroll" && !enrollment)} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Bestätigen
            </RvButton>
            <button type="button" onClick={signOut} className="w-full text-center text-sm text-muted-foreground underline hover:text-foreground">
              Abmelden
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
