import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { RvBrandMark } from "@/components/landing/rv-brand-mark"

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--rv-mist)] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/">
            <RvBrandMark />
          </Link>
        </div>

        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Authentifizierungsfehler
        </h1>
        <p className="text-slate-600 mb-6">
          Es gab ein Problem bei der Authentifizierung. Der Link ist möglicherweise abgelaufen 
          oder ungültig. Bitte versuchen Sie es erneut.
        </p>
        
        <div className="space-y-3">
          <Link href="/auth/register">
            <Button className="w-full rounded-lg">
              Neu registrieren
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full rounded-lg">
              Zurück zur Startseite
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
