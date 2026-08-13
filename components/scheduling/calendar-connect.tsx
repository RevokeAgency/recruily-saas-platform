"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CalendarPlus, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export type CalendarProvider = "google" | "microsoft"

const LABELS: Record<CalendarProvider, string> = {
  google: "Google Workspace",
  microsoft: "Microsoft 365",
}

const FEHLERTEXTE: Record<string, string> = {
  "kein-schluessel": "Die Kalenderanbindung ist noch nicht freigeschaltet (SCHEDULING_TOKEN_KEY fehlt).",
  "nicht-eingerichtet": "Für diesen Anbieter sind noch keine Zugangsdaten hinterlegt.",
  "state-ungueltig": "Die Anfrage war nicht mehr gültig. Bitte noch einmal versuchen.",
  unvollstaendig: "Der Anbieter hat die Anfrage abgebrochen.",
  oauth: "Die Verbindung ist beim Anbieter gescheitert.",
  speichern: "Die Verbindung konnte nicht gespeichert werden.",
  access_denied: "Die Freigabe wurde abgelehnt.",
}

/**
 * Startet die Kalenderanbindung in einem Popup und meldet das Ergebnis zurück.
 *
 * Warum Popup und nicht einfach weiterleiten: OAuth verlässt die Seite. Wer
 * mitten im Einladen eines Bewerbers steht, käme sonst auf einer anderen Seite
 * wieder heraus und müsste von vorn anfangen. Mit dem Popup bleibt der Dialog
 * offen und füllt sich einfach auf, sobald das Fenster zugeht.
 *
 * Blockiert der Browser das Popup, wird auf die normale Weiterleitung
 * ausgewichen und der aktuelle Pfad als Rückkehrziel mitgegeben.
 */
export function useCalendarConnect(onConnected: () => void) {
  const [busy, setBusy] = useState<CalendarProvider | null>(null)
  const fensterRef = useRef<Window | null>(null)
  const pollRef = useRef<number | null>(null)

  const aufraeumen = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
    fensterRef.current = null
    setBusy(null)
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Nur Nachrichten der eigenen Herkunft annehmen. Ohne diese Prüfung
      // könnte jede fremde Seite eine erfolgreiche Verbindung vortäuschen.
      if (event.origin !== window.location.origin) return
      const data = event.data as { typ?: string; ok?: boolean; fehler?: string } | null
      if (!data || data.typ !== "revetly-kalender") return

      aufraeumen()
      if (data.ok) {
        toast.success("Kalender verbunden")
        onConnected()
      } else {
        toast.error(FEHLERTEXTE[data.fehler ?? ""] ?? "Die Kalenderverbindung ist gescheitert.")
      }
    }

    window.addEventListener("message", onMessage)
    return () => {
      window.removeEventListener("message", onMessage)
      if (pollRef.current !== null) window.clearInterval(pollRef.current)
    }
  }, [aufraeumen, onConnected])

  const verbinden = useCallback(
    (provider: CalendarProvider) => {
      const weiter = encodeURIComponent(window.location.pathname + window.location.search)
      const popupUrl = `/api/calendar/connect/${provider}?popup=1&weiter=${weiter}`

      const breite = 520
      const hoehe = 700
      const links = Math.max(0, Math.round(window.screenX + (window.outerWidth - breite) / 2))
      const oben = Math.max(0, Math.round(window.screenY + (window.outerHeight - hoehe) / 2))

      const fenster = window.open(
        popupUrl,
        "revetly-kalender",
        `width=${breite},height=${hoehe},left=${links},top=${oben}`,
      )

      if (!fenster) {
        // Popup blockiert: normale Weiterleitung, danach kommt der Kunde auf
        // diese Seite zurück.
        window.location.href = `/api/calendar/connect/${provider}?weiter=${weiter}`
        return
      }

      fensterRef.current = fenster
      setBusy(provider)

      // Schließt jemand das Fenster von Hand, kommt keine Nachricht. Ohne diese
      // Beobachtung bliebe der Knopf für immer im Ladezustand.
      pollRef.current = window.setInterval(() => {
        if (fensterRef.current?.closed) aufraeumen()
      }, 700)
    },
    [aufraeumen],
  )

  return { verbinden, busy }
}

export function CalendarConnectButtons({
  verfuegbar,
  vorhanden,
  onConnected,
  size = "default",
}: {
  verfuegbar: { google: boolean; microsoft: boolean; encryptionReady: boolean }
  /** Bereits verbundene Anbieter, ändert nur die Beschriftung. */
  vorhanden?: CalendarProvider[]
  onConnected: () => void
  size?: "default" | "sm"
}) {
  const { verbinden, busy } = useCalendarConnect(onConnected)
  const bereits = vorhanden ?? []

  return (
    <div className="flex flex-wrap gap-2.5">
      {(["google", "microsoft"] as const).map((provider) => (
        <Button
          key={provider}
          variant="outline"
          size={size}
          onClick={() => verbinden(provider)}
          disabled={!verfuegbar.encryptionReady || !verfuegbar[provider] || busy !== null}
        >
          {busy === provider ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarPlus className="h-4 w-4" />
          )}
          {bereits.includes(provider) ? `Weiteres ${LABELS[provider]}-Konto` : `${LABELS[provider]} verbinden`}
        </Button>
      ))}
    </div>
  )
}
