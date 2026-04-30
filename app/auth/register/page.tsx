"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
      toast.error("Bitte akzeptieren Sie die AGB")
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#0D9488]/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">E-Mail bestätigen</h1>
          <p className="text-slate-600 mb-6">
            Wir haben Ihnen eine Bestätigungs-E-Mail an <strong>{formData.email}</strong> gesendet. 
            Bitte klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full rounded-lg">
              Zurück zur Startseite
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Link href="/">
              <Image 
                src="/images/recruily-logo.png" 
                alt="Recruily" 
                width={180} 
                height={50} 
                className="h-12 w-auto"
              />
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Konto erstellen
          </h1>
          <p className="text-slate-600 text-center text-sm mb-8">
            Starten Sie kostenlos mit 10 KI-Matches pro Monat
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-slate-700">Vorname</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Max"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="mt-1.5 rounded-lg border-slate-200"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-slate-700">Nachname</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Mustermann"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="mt-1.5 rounded-lg border-slate-200"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-slate-700">E-Mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="max@beispiel.de"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1.5 rounded-lg border-slate-200"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-700">Passwort</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mindestens 6 Zeichen"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="mt-1.5 rounded-lg border-slate-200"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-slate-700">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Passwort wiederholen"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="mt-1.5 rounded-lg border-slate-200"
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
              <Label htmlFor="agb" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
                Ich akzeptiere die{" "}
                <Link href="/terms" className="text-[#0D9488] hover:underline">
                  Allgemeinen Geschäftsbedingungen
                </Link>{" "}
                und habe die{" "}
                <Link href="/privacy" className="text-[#0D9488] hover:underline">
                  Datenschutzerklärung
                </Link>{" "}
                gelesen.
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg mt-6"
            >
              {loading ? "Wird erstellt..." : "Konto erstellen"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-6">
            Bereits ein Konto?{" "}
            <Link href="/" className="text-[#0D9488] font-medium hover:underline">
              Anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
