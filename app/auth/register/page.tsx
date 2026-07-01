"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RvBrandMark } from "@/components/landing/rv-brand-mark"
import { AuthSplitLayout } from "@/components/auth/auth-split-layout"
import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agbAccepted: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error("Die Passwörter stimmen nicht überein")
      return
    }

    if (!formData.agbAccepted) {
      toast.error("Bitte akzeptiere die AGB")
      return
    }

    if (formData.password.length < 6) {
      toast.error("Das Passwort muss mindestens 6 Zeichen lang sein")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      })

      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }

      setShowConfirmation(true)
    } catch (error) {
      toast.error("Ein Fehler ist aufgetreten")
      setLoading(false)
    }
  }

  if (showConfirmation) {
    return (
      <AuthSplitLayout>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--app-green-wash)] flex items-center justify-center mx-auto mb-6">
            <Mail className="w-6 h-6 text-[var(--rv-green-deep)]" strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2.5">E-Mail bestätigen</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Wir haben dir eine Bestätigungs-E-Mail an <strong className="text-foreground">{formData.email}</strong> gesendet.
            Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
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
        Konto erstellen
      </h1>
      <p className="text-muted-foreground text-center text-sm mb-8">
        Starte kostenlos mit 10 KI-Matches pro Monat
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <Label htmlFor="firstName" className="text-[var(--rv-ink-soft)] mb-1.5 block text-sm font-medium">Vorname</Label>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Max"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="text-[var(--rv-ink-soft)] mb-1.5 block text-sm font-medium">Nachname</Label>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Mustermann"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email" className="text-[var(--rv-ink-soft)] mb-1.5 block text-sm font-medium">E-Mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="max@beispiel.de"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="password" className="text-[var(--rv-ink-soft)] mb-1.5 block text-sm font-medium">Passwort</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mindestens 6 Zeichen"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="text-[var(--rv-ink-soft)] mb-1.5 block text-sm font-medium">Passwort bestätigen</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Passwort wiederholen"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="agb"
            checked={formData.agbAccepted}
            onCheckedChange={(checked) =>
              setFormData(prev => ({ ...prev, agbAccepted: checked === true }))
            }
            className="mt-0.5"
          />
          <Label htmlFor="agb" className="text-sm text-muted-foreground leading-relaxed cursor-pointer font-normal">
            Ich akzeptiere die{" "}
            <Link href="/terms" className="text-[var(--rv-green-deep)] hover:underline">
              Allgemeinen Geschäftsbedingungen
            </Link>{" "}
            und habe die{" "}
            <Link href="/privacy" className="text-[var(--rv-green-deep)] hover:underline">
              Datenschutzerklärung
            </Link>{" "}
            gelesen.
          </Label>
        </div>

        <Button type="submit" disabled={loading} className="w-full mt-6">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Wird erstellt..." : "Konto erstellen"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Bereits ein Konto?{" "}
        <Link href="/" className="text-[var(--rv-green-deep)] font-medium hover:underline">
          Anmelden
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
