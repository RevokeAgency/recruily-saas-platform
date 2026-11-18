import { Loader2 } from "lucide-react"

// Während die Übersicht ihre Zahlen holt (Datenbank und Stripe).
export default function AdminLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Übersicht wird geladen
      </p>
    </main>
  )
}
