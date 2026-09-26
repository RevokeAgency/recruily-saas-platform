import JSZip from "jszip"
import { DOMParser, XMLSerializer } from "@xmldom/xmldom"

import { mergeAdjacent, type DocumentFinding, type FindingReason, type FindingSource } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Versteckter Text in Word-Dateien.
//
// mammoth liest jeden Textlauf, auch ausgeblendete, weiße und 1-pt-Schrift.
// Deshalb werden solche Läufe aus dem Dokument entfernt, bevor mammoth es
// liest. Berücksichtigt werden direkte Formatierung, Zeichen- und
// Absatzformatvorlagen samt Vererbung (basedOn) und die Dokument-Standards.
//
// Weiße Schrift ist nicht immer ein Trick: Viele Vorlagen setzen weißen Text
// auf eine dunkle Tabellenzelle oder ein Textfeld. Deren Hintergrund lässt sich
// hier nicht zuverlässig bestimmen (Tabellenformatvorlagen, Zeichnungsobjekte).
// Weiß gilt deshalb nur als versteckt, wenn nichts darunter liegen kann: keine
// Tabelle, kein Textfeld, keine Schattierung, kein farbiger Seitenhintergrund.
// ─────────────────────────────────────────────────────────────────────────────

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
const PARTS = ["word/document.xml", "word/footnotes.xml", "word/endnotes.xml"]
/** Halbe Punkte: 6 = 3 pt, dieselbe Grenze wie im PDF. */
const MIN_SIZE_HALF_PT = 6

// xmldom bringt eigene DOM-Typen mit, die nicht mit lib.dom übereinstimmen.
// Hier werden nur wenige, stabile Eigenschaften gebraucht.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type El = any

interface RunProps {
  vanish?: boolean
  size?: number
  white?: boolean
  shaded?: boolean
}

interface StyleDef {
  basedOn?: string
  run: RunProps
  paraShaded?: boolean
}

function child(el: El, name: string): El | null {
  if (!el) return null
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && n.namespaceURI === W && n.localName === name) return n
  }
  return null
}

function val(el: El | null): string | null {
  return el ? el.getAttributeNS(W, "val") || el.getAttribute("w:val") || null : null
}

function attr(el: El | null, name: string): string | null {
  return el ? el.getAttributeNS(W, name) || el.getAttribute(`w:${name}`) || null : null
}

function isOn(el: El | null): boolean | undefined {
  if (!el) return undefined
  const v = val(el)
  return !(v === "0" || v === "false" || v === "off")
}

function nearWhite(hex: string | null): boolean {
  if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return false
  return [0, 2, 4].every((i) => parseInt(hex.slice(i, i + 2), 16) >= 0xf0)
}

/** Schattierung, die tatsächlich eine Farbe unter den Text legt. */
function hasFill(shd: El | null): boolean {
  if (!shd) return false
  const fill = attr(shd, "fill")
  if (fill && fill.toLowerCase() !== "auto" && !nearWhite(fill)) return true
  const pattern = val(shd)
  return !!pattern && pattern !== "clear" && pattern !== "nil"
}

function readRunProps(rPr: El | null): RunProps {
  if (!rPr) return {}
  const props: RunProps = {}
  const vanish = isOn(child(rPr, "vanish"))
  if (vanish !== undefined) props.vanish = vanish
  const sz = Number(val(child(rPr, "sz")))
  if (Number.isFinite(sz) && sz > 0) props.size = sz
  const color = child(rPr, "color")
  if (color) {
    const theme = attr(color, "themeColor")
    const shaded = attr(color, "themeShade")
    props.white = theme ? /^(background1|light1)$/i.test(theme) && !shaded : nearWhite(val(color))
  }
  const highlight = val(child(rPr, "highlight"))
  if (hasFill(child(rPr, "shd")) || (highlight && !/^(none|white)$/i.test(highlight))) props.shaded = true
  return props
}

function readStyles(xml: string | null): { styles: Map<string, StyleDef>; defaults: RunProps } {
  const styles = new Map<string, StyleDef>()
  let defaults: RunProps = {}
  if (!xml) return { styles, defaults }
  const doc = new DOMParser().parseFromString(xml, "text/xml")
  const rPrDefault = doc.getElementsByTagNameNS(W, "rPrDefault")[0]
  if (rPrDefault) defaults = readRunProps(child(rPrDefault, "rPr"))
  const list = doc.getElementsByTagNameNS(W, "style")
  for (let i = 0; i < list.length; i++) {
    const s = list[i]
    const id = attr(s, "styleId")
    if (!id) continue
    styles.set(id, {
      basedOn: val(child(s, "basedOn")) ?? undefined,
      run: readRunProps(child(s, "rPr")),
      paraShaded: hasFill(child(child(s, "pPr"), "shd")),
    })
  }
  return { styles, defaults }
}

/** Formatvorlage samt Vererbung auflösen, die nächste Ebene gewinnt. */
function resolveStyle(styles: Map<string, StyleDef>, id: string | null): { run: RunProps; paraShaded: boolean } {
  const chain: StyleDef[] = []
  let cur = id
  while (cur && chain.length < 12) {
    const s = styles.get(cur)
    if (!s) break
    chain.unshift(s)
    cur = s.basedOn ?? null
  }
  return {
    run: chain.reduce<RunProps>((acc, s) => ({ ...acc, ...s.run }), {}),
    paraShaded: chain.some((s) => s.paraShaded),
  }
}

function hasAncestor(el: El, names: string[]): boolean {
  for (let n = el.parentNode; n; n = n.parentNode) {
    if (n.nodeType === 1 && names.includes(n.localName)) return true
  }
  return false
}

function ancestor(el: El, name: string): El | null {
  for (let n = el.parentNode; n; n = n.parentNode) {
    if (n.nodeType === 1 && n.namespaceURI === W && n.localName === name) return n
  }
  return null
}

function runText(run: El): string {
  let text = ""
  const ts = run.getElementsByTagNameNS(W, "t")
  for (let i = 0; i < ts.length; i++) text += ts[i].textContent ?? ""
  return text
}

/**
 * Entfernt versteckte Textläufe aus einer DOCX und liefert die bereinigte
 * Datei plus Befunde. Unverändert zurück, wenn nichts versteckt ist oder die
 * Datei sich nicht lesen lässt.
 */
export async function stripHiddenDocx(
  buffer: Buffer,
  source: FindingSource,
): Promise<{ buffer: Buffer; findings: DocumentFinding[] }> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    return { buffer, findings: [] }
  }

  const { styles, defaults } = readStyles((await zip.file("word/styles.xml")?.async("string")) ?? null)
  const found: DocumentFinding[] = []
  let changed = false

  for (const part of PARTS) {
    const file = zip.file(part)
    if (!file) continue
    const doc = new DOMParser().parseFromString(await file.async("string"), "text/xml")

    // Farbiger Seitenhintergrund: Dann kann weiße Schrift sichtbar sein.
    const bg = doc.getElementsByTagNameNS(W, "background")[0]
    const darkPage = !!bg && !nearWhite(attr(bg, "color")) && attr(bg, "color")?.toLowerCase() !== "auto"

    let partChanged = false
    const runs: El[] = []
    const list = doc.getElementsByTagNameNS(W, "r")
    for (let i = 0; i < list.length; i++) runs.push(list[i])

    for (const run of runs) {
      const text = runText(run)
      if (!text.trim()) continue

      const para = ancestor(run, "p")
      const pPr = child(para, "pPr")
      const pStyle = resolveStyle(styles, val(child(pPr, "pStyle")))
      const rPr = child(run, "rPr")
      const rStyle = resolveStyle(styles, val(child(rPr, "rStyle")))
      const props: RunProps = { ...defaults, ...pStyle.run, ...rStyle.run, ...readRunProps(rPr) }

      let reason: FindingReason | null = null
      if (props.vanish) reason = "ausgeblendet"
      else if (props.size != null && props.size < MIN_SIZE_HALF_PT) reason = "winzig"
      else if (
        props.white &&
        !props.shaded &&
        !darkPage &&
        !pStyle.paraShaded &&
        !hasFill(child(pPr, "shd")) &&
        !hasAncestor(run, ["tbl", "txbxContent", "textbox", "AlternateContent"])
      ) {
        reason = "unsichtbar"
      }
      if (!reason) continue

      found.push({ source, reason, excerpt: text })
      run.parentNode?.removeChild(run)
      partChanged = true
    }

    if (partChanged) {
      changed = true
      zip.file(part, new XMLSerializer().serializeToString(doc))
    }
  }

  if (!changed) return { buffer, findings: [] }
  const cleaned = await zip.generateAsync({ type: "nodebuffer" })
  return { buffer: cleaned, findings: mergeAdjacent(found) }
}
