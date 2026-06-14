"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { RevetlyLogo } from "@/components/landing/revetly-logo"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message === "Invalid login credentials" 
          ? "Ungültige Anmeldedaten" 
          : error.message)
        setLoading(false)
        return
      }

      toast.success("Erfolgreich angemeldet!")
      onOpenChange(false)
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      toast.error("Ein Fehler ist aufgetreten")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center">
            <RevetlyLogo />
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Willkommen zurück
          </DialogTitle>
          <p className="text-slate-600 text-sm">
            Melden Sie sich an, um fortzufahren
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="login-email" className="text-slate-700">E-Mail</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="max@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 rounded-lg border-slate-200"
            />
          </div>

          <div>
            <Label htmlFor="login-password" className="text-slate-700">Passwort</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5 rounded-lg border-slate-200"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <Label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">
                Angemeldet bleiben
              </Label>
            </div>
            <Link
              href="/auth/reset"
              className="text-sm text-[#4EB0BE] hover:underline"
              onClick={() => onOpenChange(false)}
            >
              Passwort vergessen?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4EB0BE] hover:bg-[#3A8F9C] text-white rounded-lg"
          >
            {loading ? "Wird angemeldet..." : "Anmelden"}
          </Button>
        </form>

        <div className="text-center text-sm text-slate-600 mt-4">
          {"Noch kein Konto? "}
          <Link
            href="/auth/register"
            className="text-[#4EB0BE] font-medium hover:underline"
            onClick={() => onOpenChange(false)}
          >
            Registrieren
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
