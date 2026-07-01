import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { RvBrandMark } from "@/components/landing/rv-brand-mark"

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/">
            <RvBrandMark />
          </Link>
        </div>

        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-6 h-6 text-red-600" strokeWidth={1.75} />
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2.5">
          Authentifizierungsfehler
        </h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Es gab ein Problem bei der Authentifizierung. Der Link ist möglicherweise abgelaufen
          oder ungültig. Bitte versuchen Sie es erneut.
        </p>

        <div className="space-y-3">
          <Link href="/auth/register">
            <Button className="w-full">
              Neu registrieren
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Zurück zur Startseite
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
