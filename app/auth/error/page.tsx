import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
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
            <Button className="w-full bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg">
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
