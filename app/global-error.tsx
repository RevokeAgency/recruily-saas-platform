"use client"

import { useEffect } from "react"

import { reportClientError } from "@/components/app/error-reporter"

/**
 * Letzte Auffanglinie für Fehler, die das Wurzel-Layout betreffen. Ersetzt in
 * diesem Fall das gesamte Dokument, deshalb stehen html und body hier drin.
 *
 * Bewusst ohne Design-Tokens und ohne Komponenten: Wenn das Layout selbst
 * gescheitert ist, kann man sich auf nichts davon verlassen.
 */
export default function GlobalError({
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
    <html lang="de">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#F4F7F6" }}>
        <div style={{ maxWidth: 460, margin: "18vh auto", padding: "0 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0C1A16", margin: "0 0 10px" }}>
            Da ist etwas schiefgelaufen
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#64707B", margin: "0 0 24px" }}>
            Der Fehler wurde automatisch gemeldet. Versuche es noch einmal, oder lade die Seite neu.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#16C77C",
              color: "#0C1A16",
              border: 0,
              borderRadius: 999,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
          {error.digest && (
            <p style={{ marginTop: 20, fontSize: 11, color: "#94a3b8" }}>Kennung: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  )
}
