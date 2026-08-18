"use client"

/**
 * Meldet einen Fehler aus dem Browser an die eigene Erfassung.
 *
 * Über sendBeacon, wo verfügbar: Der Aufruf überlebt damit auch, wenn die
 * Seite gerade verlassen oder neu geladen wird. Genau das passiert bei einem
 * Absturz regelmäßig, und ein normales fetch würde dabei abgebrochen.
 *
 * Best-effort in jeder Hinsicht. Scheitert das Melden, passiert nichts weiter.
 */
export function reportClientError(error: unknown, extra?: { route?: string }): void {
  if (typeof window === "undefined") return

  try {
    const payload = JSON.stringify({
      name: error instanceof Error ? error.name : "ClientError",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      route: extra?.route ?? window.location.pathname,
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/telemetry/error", new Blob([payload], { type: "application/json" }))
      return
    }

    void fetch("/api/telemetry/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    })
  } catch {
    /* Ein Fehler beim Melden bleibt folgenlos. */
  }
}
