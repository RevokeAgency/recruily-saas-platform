import type { Layout } from "../config/layout"

/**
 * Raster aller 80 Bewerbungen in der Totale (zentriert, passt ins Bild).
 * Für den Scan wird dasselbe Raster mit einer Kamera-Zoomstufe gezeigt.
 */
export function gridCell(L: Layout, i: number) {
  const { cols, rows, gap, maxH } = L.grid
  const cellH = (maxH - gap * (rows - 1)) / rows
  const cellW = cellH * (L.card.w / L.card.h)
  const totalW = cols * cellW + (cols - 1) * gap
  const col = i % cols
  const row = Math.floor(i / cols)
  return {
    x: (L.W - totalW) / 2 + col * (cellW + gap) + cellW / 2,
    y: (L.H - maxH) / 2 + row * (cellH + gap) + cellH / 2,
    scale: cellW / L.card.w,
    cellW,
    cellH,
  }
}

/** Bildschirmposition eines Punkts unter einer Kamera, die um die Bildmitte zoomt. */
export function zoomed(L: Layout, p: { x: number; y: number }, zoom: number, dx = 0, dy = 0) {
  return { x: L.W / 2 + (p.x - L.W / 2) * zoom + dx, y: L.H / 2 + (p.y - L.H / 2) * zoom + dy }
}

/** Geometrie der Rangliste, vertikal zentriert. */
export function listGeometry(L: Layout) {
  const { rows, rowH, gap, captionSize, w } = L.list
  const captionH = captionSize * 1.4 + 26
  const footerH = 56
  const total = captionH + rows * (rowH + gap) + footerH
  const top = (L.H - total) / 2
  const left = (L.W - w) / 2
  return {
    top,
    left,
    w,
    rowH,
    captionY: top,
    rowY: (slot: number) => top + captionH + slot * (rowH + gap),
    footerY: top + captionH + rows * (rowH + gap) + 8,
  }
}
