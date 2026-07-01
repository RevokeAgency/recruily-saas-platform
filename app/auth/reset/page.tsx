"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { RvBrandMark } from "@/components/landing/rv-brand-mark"
import { AuthSplitLayout } from "@/components/auth/auth-split-layout"

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback?next=/settings`,
      })

      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }

      setSent(true)
    } catch (error) {
      toast.error("Ein Fehler ist aufgetreten")
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthSplitLayout>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--app-green-wash)] flex items-center justify-center mx-auto mb-6">
            <Mail className="w-6 h-6 text-[var(--rv-green-deep)]" strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2.5">E-Mail gesendet</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Wir haben dir einen Link zum Zurücksetzen deines Passworts an <strong className="text-foreground">{email}</strong> gesendet.
            Bitte überprüfe deinen Posteingang.
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Zurück zur Startseite
            </Button>
          </Link>
        </div>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout>
      <Link href="/" className="mb-8 flex justify-center">
        <RvBrandMark />
      </Link>

      <h1 className="text-xl font-bold text-foreground text-center mb-1.5">
        Passwort zurücksetzen
      </h1>
      <p className="text-muted-foreground text-center text-sm mb-8">
        Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-[var(--rv-ink-soft)] mb-1.5 block text-sm font-medium">E-Mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="max@beispiel.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Wird gesendet..." : "Link senden"}
        </Button>
      </form>

      <Link
        href="/"
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Anmeldung
      </Link>
    </AuthSplitLayout>
  )
}
