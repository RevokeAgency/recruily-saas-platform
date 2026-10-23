import { random } from "remotion"

import type { Layout } from "../config/layout"
import { JOB, RANKED, UNSORTED_ORDER } from "../data/mock"

/** Mittelpunkt der Bühne. */
export function stageCenter(L: Layout) {
  return { x: L.stage.x + L.stage.w / 2, y: L.stage.y + L.stage.h / 2 }
}

/** Liegeposition einer Karte im Stapel (Mittelpunkt, Drehung). */
export function stackPose(L: Layout, i: number) {
  const c = stageCenter(L)
  return {
    x: c.x + (random(`sx-${i}`) - 0.5) * 26,
    y: c.y + (random(`sy-${i}`) - 0.5) * 18 + 50 - i * 0.9,
    rot: (random(`sr-${i}`) - 0.5) * 9,
  }
}

/** Rasterzelle einer Karte nach dem Auffächern (Mittelpunkt, Maßstab). */
export function gridPose(L: Layout, i: number) {
  const { cols, rows, gap } = L.grid
  const cellW = Math.min(
    (L.stage.w - gap * (cols - 1)) / cols,
    ((L.stage.h - gap * (rows - 1)) / rows) * (L.card.w / L.card.h),
  )
  const cellH = cellW * (L.card.h / L.card.w)
  const totalW = cols * cellW + (cols - 1) * gap
  const totalH = rows * cellH + (rows - 1) * gap
  const col = i % cols
  const row = Math.floor(i / cols)
  return {
    x: L.stage.x + (L.stage.w - totalW) / 2 + col * (cellW + gap) + cellW / 2,
    y: L.stage.y + (L.stage.h - totalH) / 2 + row * (cellH + gap) + cellH / 2,
    scale: cellW / L.card.w,
  }
}

/** Geometrie der Rangliste (Kopf, Zeilen, Fußzeile), vertikal auf der Bühne zentriert. */
export function listGeometry(L: Layout) {
  const { rows, rowH, headerH, footerH, gap } = L.list
  const total = headerH + rows * (rowH + gap) + footerH
  const top = L.stage.y + (L.stage.h - total) / 2
  return {
    top,
    headerY: top,
    rowY: (slot: number) => top + headerH + slot * (rowH + gap),
    footerY: top + headerH + rows * (rowH + gap),
    w: L.stage.w,
    rowH,
    total,
  }
}

/** Die im jeweiligen Format sichtbaren Kandidaten (Rang 0..rows-1). */
export function visibleRanked(L: Layout) {
  return RANKED.slice(0, L.list.rows)
}

/** Unsortierte Startreihenfolge, nur mit den sichtbaren Rängen. */
export function unsortedSlots(L: Layout): number[] {
  const order = UNSORTED_ORDER.filter((r) => r < L.list.rows)
  // slotOf[rank] = Platz in der unsortierten Liste
  const slotOf: number[] = []
  order.forEach((rank, slot) => {
    slotOf[rank] = slot
  })
  return slotOf
}

export function remainingCount(L: Layout): number {
  return JOB.total - L.list.rows
}
