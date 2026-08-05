import { fileURLToPath } from "node:url"

// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsame pdfjs-Laufzeitumgebung.
//
// pdfjs braucht zwei Dinge, die in einer Serverless-Umgebung nicht von selbst
// vorhanden sind:
//
//  1. Die Worker-Datei. Der Bundler erfasst sie nicht automatisch (pdfjs lädt
//     sie dynamisch) und schreibt require.resolve() in eine Modul-ID um →
//     "Invalid workerSrc type". Deshalb liegt der Worker im Repo und wird über
//     new URL() referenziert, was der Bundler als Asset mit echtem Dateipfad
//     ausgibt.
//  2. Ein paar Browser-Globals (DOMMatrix, Path2D, …), die @napi-rs/canvas
//     bereitstellt. Fehlen sie, scheitert pdfjs, sobald ein PDF Schriften oder
//     Vektorinhalte enthält — also praktisch immer.
//
// Beide Punkte wurden ursprünglich nur in der Foto-Extraktion berücksichtigt.
// Die Textextraktion lief deshalb in Serverless still ins Leere. Dieses Modul
// stellt sicher, dass jeder pdfjs-Pfad dieselbe, funktionierende Umgebung hat.
// ─────────────────────────────────────────────────────────────────────────────

let WORKER_SRC: string | undefined
try {
  WORKER_SRC = fileURLToPath(new URL("./pdfjs-worker.mjs", import.meta.url))
} catch {
  /* fällt auf die Standardauflösung von pdfjs zurück */
}

/** Legt die von pdfjs erwarteten Browser-Globals an (idempotent). */
export async function ensurePdfGlobals(): Promise<void> {
  const canvas = await import("@napi-rs/canvas")
  const g = globalThis as unknown as Record<string, unknown>
  if (!g.DOMMatrix && canvas.DOMMatrix) g.DOMMatrix = canvas.DOMMatrix
  if (!g.Path2D && canvas.Path2D) g.Path2D = canvas.Path2D
  if (!g.ImageData && canvas.ImageData) g.ImageData = canvas.ImageData
  if (!g.DOMPoint && canvas.DOMPoint) g.DOMPoint = canvas.DOMPoint
}

/**
 * Lädt pdfjs mit korrekt gesetztem Worker und vorbereiteten Globals.
 * Jeder PDF-Pfad der Anwendung sollte ausschließlich hierüber gehen.
 */
export async function loadPdfjs(): Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> {
  await ensurePdfGlobals()
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  if (WORKER_SRC) pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC
  return pdfjs
}

/**
 * Rendert die ersten Seiten eines PDFs als PNG — der Weg für **gescannte**
 * Lebensläufe, die keine Textebene besitzen. Der reine Textpfad liefert dort
 * nichts; ein Bildmodell kann sie dagegen lesen.
 *
 * Best-effort: liefert bei jedem Problem ein leeres Array.
 */
export async function renderPdfPagesToPng(pdf: Buffer, maxPages = 2): Promise<Buffer[]> {
  try {
    const canvas = await import("@napi-rs/canvas")
    const pdfjs = await loadPdfjs()
    const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: true }).promise
    const pages = Math.min(doc.numPages, maxPages)
    const out: Buffer[] = []
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i)
      // Skalierung 2 = gut lesbar für OCR, ohne die Bilder unnötig groß zu machen.
      const viewport = page.getViewport({ scale: 2 })
      const cv = canvas.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const ctx = cv.getContext("2d")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: ctx as any, viewport, canvas: cv as any }).promise
      out.push(cv.toBuffer("image/png"))
    }
    return out
  } catch (err) {
    console.error("[pdf-runtime] Seiten-Rendering fehlgeschlagen:", err)
    return []
  }
}
