"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { reportClientError } from "@/components/app/error-reporter"

/**
 * Fängt Fehler innerhalb der Anwendung ab. Die Navigation bleibt stehen,
 * ersetzt wird nur der Inhaltsbereich — der Kunde kann also weiterarbeiten,
 * statt vor einer weißen Seite zu sitzen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportClientError(error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Diese Seite konnte nicht geladen werden
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Der Fehler wurde automatisch gemeldet. Deine Daten sind davon nicht betroffen.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Button onClick={reset}>
            <RotateCw className="h-4 w-4" />
            Erneut versuchen
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Zum Dashboard</Link>
          </Button>
        </div>
        {error.digest && (
          <p className="mt-5 text-[11px] text-muted-foreground">Kennung: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
