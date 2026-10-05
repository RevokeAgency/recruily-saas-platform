import { fileURLToPath } from "node:url"
import {
  Circle,
  Defs,
  Document,
  Font,
  Image,
  LinearGradient,
  Page,
  Path,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer"

import type { ReportCandidate, ReportData } from "./model"

// ─────────────────────────────────────────────────────────────────────────────
// Revetly Report als PDF (A4). Aufbau:
//   Shortlist (ab zwei Kandidaten): Deckblatt mit Ranking.
//   Je Kandidat: Kopf mit Match-Ring, Was passt, Match im Detail, Werdegang,
//   Skills und Ausbildung, Interviewfragen, Interview-Ergebnis.
// Kopfzeile mit dem Logo des Kunden, Fußzeile mit "erstellt mit Revetly".
// Schrift und Farben aus dem Designsystem (Plus Jakarta Sans, Grün/Cyan).
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  ink: "#0C1A16",
  text: "#33443F",
  muted: "#5E736D",
  faint: "#8A9E98",
  line: "#E3ECE8",
  mist: "#F4F8F6",
  green: "#16C77C",
  greenDeep: "#0E9F63",
  greenWash: "#E7F8F0",
  cyan: "#22C1EE",
  red: "#C0362C",
  redWash: "#FDEEEC",
  amber: "#B7791F",
}

// Schriften über new URL() mit festen Pfaden: So gibt der Bundler sie als
// Dateien mit echtem Pfad aus und sie liegen auch in der Serverless-Funktion
// (wie der pdfjs-Worker in lib/pdf-runtime.ts). outputFileTracingIncludes
// bricht den Vercel-Build hier ab, siehe next.config.mjs.
const FONT_FILES = {
  r400: new URL("./fonts/plus-jakarta-sans-latin-400-normal.woff", import.meta.url),
  r500: new URL("./fonts/plus-jakarta-sans-latin-500-normal.woff", import.meta.url),
  r600: new URL("./fonts/plus-jakarta-sans-latin-600-normal.woff", import.meta.url),
  r700: new URL("./fonts/plus-jakarta-sans-latin-700-normal.woff", import.meta.url),
  r800: new URL("./fonts/plus-jakarta-sans-latin-800-normal.woff", import.meta.url),
  e400: new URL("./fonts/plus-jakarta-sans-latin-ext-400-normal.woff", import.meta.url),
  e700: new URL("./fonts/plus-jakarta-sans-latin-ext-700-normal.woff", import.meta.url),
}

let fontsReady = false
function registerFonts() {
  if (fontsReady) return
  const f = (u: URL) => fileURLToPath(u)
  Font.register({
    family: "Jakarta",
    fonts: [
      { src: f(FONT_FILES.r400), fontWeight: 400 },
      { src: f(FONT_FILES.r500), fontWeight: 500 },
      { src: f(FONT_FILES.r600), fontWeight: 600 },
      { src: f(FONT_FILES.r700), fontWeight: 700 },
      { src: f(FONT_FILES.r800), fontWeight: 800 },
    ],
  })
  // Zeichen außerhalb von Latin-1 (etwa ł, ő, č in Namen) aus dem Ext-Schnitt.
  Font.register({
    family: "JakartaExt",
    fonts: [
      { src: f(FONT_FILES.e400), fontWeight: 400 },
      { src: f(FONT_FILES.e700), fontWeight: 700 },
    ],
  })
  // Keine automatische Silbentrennung: Die englischen Regeln zerreißen
  // deutsche Wörter an falschen Stellen.
  Font.registerHyphenationCallback((word) => [word])
  fontsReady = true
}

const FONT = ["Jakarta", "JakartaExt"]

const s = StyleSheet.create({
  page: { fontFamily: FONT, fontSize: 9.5, color: C.text, paddingTop: 84, paddingBottom: 62, paddingHorizontal: 44, lineHeight: 1.45 },
  header: { position: "absolute", top: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerRight: { fontSize: 7.5, color: C.faint, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700 },
  issuerName: { fontSize: 11, fontWeight: 800, color: C.ink, letterSpacing: -0.2 },
  // Feste Höhe, Breite folgt dem Seitenverhältnis bis höchstens 190 pt. Der
  // Rand des Logos ist vorher abgeschnitten (lib/report/image.ts).
  logo: { height: 32, maxWidth: 190, objectFit: "contain", objectPosition: "left" },
  rule: { position: "absolute", top: 66, left: 44, right: 44 },
  footer: { position: "absolute", top: 841.89 - 46, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.faint, borderTopWidth: 0.6, borderTopColor: C.line, paddingTop: 8 },
  eyebrow: { fontSize: 7.5, fontWeight: 800, color: C.greenDeep, letterSpacing: 1.6, textTransform: "uppercase" },
  h1: { fontSize: 24, fontWeight: 800, color: C.ink, letterSpacing: -0.6, lineHeight: 1.15, marginTop: 6 },
  h2: { fontSize: 11, fontWeight: 800, color: C.ink, letterSpacing: -0.1, marginBottom: 7 },
  meta: { fontSize: 9, color: C.muted, marginTop: 4 },
  section: { marginTop: 18 },
  panel: { backgroundColor: C.mist, borderRadius: 10, borderWidth: 0.6, borderColor: C.line, padding: 12 },
  small: { fontSize: 8, color: C.muted },
  chip: { fontSize: 8, color: C.ink, backgroundColor: C.mist, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7, marginRight: 4, marginBottom: 4 },
})

// ── Bausteine ────────────────────────────────────────────────────────────────

function GradientRule({ width = 507, height = 1.6 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={C.green} />
          <Stop offset="1" stopColor={C.cyan} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#rule)" />
    </Svg>
  )
}

// Ziffern haben keine Unterlänge, die Textbox der Schrift aber schon. Damit
// Zahl oder Initialen optisch mittig im Kreis sitzen, wird sie um diesen Anteil der
// Schriftgröße verschoben (am gerenderten PDF nachgemessen).
const NUM_SHIFT = -0.355

/** Ring mit dem Match in der Mitte. Der Bogen wächst mit dem Wert. */
function ScoreRing({ score, size = 70 }: { score: number | null; size?: number }) {
  const stroke = 6
  const r = (size - stroke) / 2
  const cx = size / 2
  const value = Math.max(0, Math.min(100, score ?? 0))
  const angle = (value / 100) * 2 * Math.PI
  const end = { x: cx + r * Math.sin(angle), y: cx - r * Math.cos(angle) }
  const large = value > 50 ? 1 : 0
  const arc = value >= 99.5
    ? null
    : `M ${cx} ${cx - r} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Farbverläufe auf Linien kann react-pdf nicht, deshalb Vollfarbe. */}
        <Circle cx={cx} cy={cx} r={r} stroke={C.line} strokeWidth={stroke} fill="none" />
        {score != null && (arc
          ? <Path d={arc} stroke={C.green} strokeWidth={stroke} fill="none" strokeLinecap="round" />
          : <Circle cx={cx} cy={cx} r={r} stroke={C.green} strokeWidth={stroke} fill="none" />)}
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: size * 0.32, fontWeight: 800, color: C.ink, letterSpacing: -0.8, lineHeight: 1, marginTop: size * 0.32 * NUM_SHIFT }}>{score ?? "–"}</Text>
      </View>
    </View>
  )
}

function Bar({ value, width = 120 }: { value: number | null; width?: number }) {
  const w = Math.max(0, Math.min(100, value ?? 0)) / 100 * width
  return (
    <Svg width={width} height={6}>
      <Defs>
        <LinearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={C.green} />
          <Stop offset="1" stopColor={C.cyan} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={6} rx={3} ry={3} fill={C.line} />
      {value != null && w > 0 && <Rect x="0" y="0" width={Math.max(w, 6)} height={6} rx={3} ry={3} fill="url(#bar)" />}
    </Svg>
  )
}

function Check() {
  return (
    <Svg width={9} height={9} viewBox="0 0 24 24" style={{ marginTop: 2.5, marginRight: 6 }}>
      <Path d="M4 12.5l5 5L20 6.5" stroke={C.greenDeep} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Dots({ value }: { value: number | null }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, marginLeft: 2.5, backgroundColor: value != null && i <= value ? C.green : C.line }} />
      ))}
    </View>
  )
}

function Hint({ label, text }: { label: string; text: string }) {
  return (
    <Text style={{ fontSize: 7.8, color: C.muted, marginTop: 1.5 }}>
      <Text style={{ fontWeight: 700, color: C.text }}>{label}: </Text>
      {text}
    </Text>
  )
}

/** Fünf leere Kreise mit Ziffern zum Ankreuzen, dazu Linien für Notizen. */
function AnswerFields() {
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: C.muted, width: 58 }}>Bewertung</Text>
        {[1, 2, 3, 4, 5].map((n) => (
          <View key={n} style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 0.9, borderColor: C.faint }} />
            <Text style={{ fontSize: 7.5, color: C.muted, marginLeft: 3, lineHeight: 1 }}>{n}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", marginTop: 4 }}>
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: C.muted, width: 58, paddingTop: 9 }}>Notizen</Text>
        <View style={{ flex: 1 }}>
          <WriteLines count={2} />
        </View>
      </View>
    </View>
  )
}

function WriteLines({ count }: { count: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ height: 17, borderBottomWidth: 0.6, borderBottomColor: C.line }} />
      ))}
    </View>
  )
}

function Avatar({ c, size = 58 }: { c: ReportCandidate; size?: number }) {
  if (c.photo) {
    // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image hat kein alt
    return <Image src={c.photo} style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover" }} />
  }
  const initials = c.title.startsWith("Profil ")
    ? c.code.replace("K-", "").slice(0, 2)
    : c.title.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="av" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={C.green} />
            <Stop offset="1" stopColor={C.cyan} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#av)" />
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: size * 0.32, fontWeight: 800, color: C.ink, lineHeight: 1, marginTop: size * 0.32 * NUM_SHIFT }}>{initials || "?"}</Text>
      </View>
    </View>
  )
}

function Chrome({ data }: { data: ReportData }) {
  return (
    <>
      <View style={s.header} fixed>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image hat kein alt */}
        {data.logo ? <Image src={data.logo} style={s.logo} /> : <Text style={s.issuerName}>{data.issuer || " "}</Text>}
        <Text style={s.headerRight}>{data.anonymous ? "Anonymes Profil · Vertraulich" : "Vertraulich"}</Text>
      </View>
      <View style={s.rule} fixed>
        <GradientRule />
      </View>
      <View style={s.footer} fixed>
        <Text>{[data.issuer, "erstellt mit Revetly", dateDe(data.createdAt)].filter(Boolean).join("  ·  ")}</Text>
        <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
      </View>
    </>
  )
}

function dateDe(d: Date) {
  return d.toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Vienna" })
}

// ── Deckblatt der Shortlist ──────────────────────────────────────────────────

function Cover({ data }: { data: ReportData }) {
  const withInterview = data.candidates.some((c) => c.interview?.score != null)
  return (
    <Page size="A4" style={s.page}>
      <Chrome data={data} />
      <Text style={s.eyebrow}>Shortlist</Text>
      <Text style={s.h1}>{data.jobTitle}</Text>
      <Text style={s.meta}>
        {[data.jobLocation, `${data.candidates.length} Kandidaten`, dateDe(data.createdAt)].filter(Boolean).join("  ·  ")}
      </Text>

      <View style={[s.section, { marginTop: 26 }]}>
        <View style={{ flexDirection: "row", paddingBottom: 6, borderBottomWidth: 0.8, borderBottomColor: C.line }}>
          <Text style={[s.small, { width: 26, fontWeight: 700 }]}>#</Text>
          <Text style={[s.small, { flex: 1, fontWeight: 700 }]}>Kandidat</Text>
          <Text style={[s.small, { width: 150, fontWeight: 700 }]}>Revetly Match</Text>
          {withInterview && <Text style={[s.small, { width: 60, fontWeight: 700, textAlign: "right" }]}>Interview</Text>}
        </View>
        {data.candidates.map((c, i) => (
          <View key={c.code} wrap={false} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 0.6, borderBottomColor: C.line }}>
            <Text style={{ width: 26, fontSize: 12, fontWeight: 800, color: i === 0 && !c.knockout ? C.greenDeep : C.faint }}>{i + 1}</Text>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 10.5, fontWeight: 700, color: C.ink }}>{c.title}</Text>
              <Text style={s.small}>
                {[c.headline, c.location, c.years != null ? `${c.years} J. Erfahrung` : null].filter(Boolean).join("  ·  ")}
              </Text>
              {c.knockout && <Text style={{ fontSize: 7.5, color: C.red, fontWeight: 700, marginTop: 2 }}>K.O.-Kriterium nicht erfüllt</Text>}
            </View>
            <View style={{ width: 150, flexDirection: "row", alignItems: "center" }}>
              <Bar value={c.score} width={104} />
              <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: 800, color: C.ink }}>{c.score ?? "–"}</Text>
            </View>
            {withInterview && (
              <Text style={{ width: 60, textAlign: "right", fontSize: 11, fontWeight: 700, color: c.interview?.score != null ? C.ink : C.faint }}>
                {c.interview?.score ?? "–"}
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={[s.panel, { marginTop: 22 }]}>
        <Text style={{ fontSize: 8.5, fontWeight: 700, color: C.ink, marginBottom: 3 }}>So entsteht das Ranking</Text>
        <Text style={s.small}>
          Revetly gleicht die Unterlagen mit den Anforderungen der Stelle ab, auf neun Ebenen von Hard Skills bis Kultur,
          jede Einschätzung mit Beleg aus den Unterlagen. Ist ein Gespräch bewertet, fließt es in den Match ein.
          Das Ranking ist eine Entscheidungshilfe. Wer eingeladen wird, entscheiden Menschen.
        </Text>
      </View>
    </Page>
  )
}

// ── Profilseite ──────────────────────────────────────────────────────────────

function Profile({ data, c }: { data: ReportData; c: ReportCandidate }) {
  const sec = data.sections
  const contact = [c.email, c.phone].filter(Boolean).join("  ·  ")
  const meta = [c.headline, c.location, c.years != null ? `${c.years} Jahre Erfahrung` : null].filter(Boolean).join("  ·  ")
  const hasSide = c.education.length > 0 || c.certifications.length > 0 || c.languages.length > 0

  return (
    <Page size="A4" style={s.page}>
      <Chrome data={data} />

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Avatar c={c} />
        <View style={{ flex: 1, marginLeft: 14, paddingRight: 12 }}>
          <Text style={s.eyebrow}>{data.jobTitle}</Text>
          <Text style={[s.h1, { fontSize: 21 }]}>{c.title}</Text>
          {meta ? <Text style={s.meta}>{meta}</Text> : null}
          {contact ? <Text style={[s.meta, { color: C.text }]}>{contact}</Text> : null}
        </View>
        <View style={{ alignItems: "center" }}>
          <ScoreRing score={c.score} />
          <Text style={[s.small, { marginTop: 4, fontWeight: 700 }]}>Revetly Match</Text>
          {c.interview?.score != null && <Text style={[s.small, { marginTop: 1 }]}>Interview {c.interview.score}</Text>}
        </View>
      </View>

      {c.knockout && (
        <View style={{ marginTop: 14, backgroundColor: C.redWash, borderRadius: 10, padding: 10 }}>
          <Text style={{ fontSize: 8.5, fontWeight: 700, color: C.red, marginBottom: 2 }}>K.O.-Kriterium nicht erfüllt</Text>
          {c.knockoutReasons.map((r, i) => <Text key={i} style={{ fontSize: 8.5, color: C.red }}>{r}</Text>)}
        </View>
      )}

      {sec.strengths && (c.strengths.length > 0 || c.summary) && (
        <View style={s.section}>
          {c.strengths.length > 0 && (
            <View style={[s.panel, { backgroundColor: C.greenWash, borderColor: "#CDEFDF" }]}>
              <Text style={[s.h2, { marginBottom: 6 }]}>Was passt</Text>
              {c.strengths.map((t, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 3 }}>
                  <Check />
                  <Text style={{ flex: 1, color: C.ink }}>{t}</Text>
                </View>
              ))}
            </View>
          )}
          {c.summary && (
            <View style={{ marginTop: 12 }}>
              <Text style={s.h2}>Kurzprofil</Text>
              <Text>{c.summary}</Text>
            </View>
          )}
        </View>
      )}

      {sec.match && c.categories.some((x) => x.score != null) && (
        <View style={s.section}>
          <Text style={s.h2}>Match im Detail</Text>
          {c.categories.filter((x) => x.score != null).map((x) => (
            <View key={x.label} wrap={false} style={{ flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
              <Text style={{ width: 92, fontWeight: 700, color: C.ink, fontSize: 8.8 }}>{x.label}</Text>
              <View style={{ width: 100, paddingTop: 3.5 }}><Bar value={x.score} width={82} /></View>
              <Text style={{ width: 26, fontWeight: 800, color: C.ink, fontSize: 9 }}>{x.score}</Text>
              <Text style={{ flex: 1, fontSize: 8, color: C.muted }}>{truncate(x.reason, 210)}</Text>
            </View>
          ))}
          {c.prognosis && (
            <Text style={[s.small, { marginTop: 7 }]}>
              <Text style={{ fontWeight: 700, color: C.ink }}>Prognose  </Text>{c.prognosis}
            </Text>
          )}
        </View>
      )}

      {sec.strengths && c.stations.length > 0 && (
        <View style={s.section} wrap={false}>
          <Text style={s.h2}>Werdegang</Text>
          {c.stations.map((st, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 5 }}>
              <Text style={{ width: 110, fontSize: 8.5, color: C.muted }}>{st.period}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 700, color: C.ink }}>{st.role}</Text>
                {st.company ? <Text style={s.small}>{st.company}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {sec.strengths && (c.skills.length > 0 || hasSide) && (
        <View style={[s.section, { flexDirection: "row" }]} wrap={false}>
          {c.skills.length > 0 && (
            <View style={{ flex: 1.2, paddingRight: hasSide ? 18 : 0 }}>
              <Text style={s.h2}>Skills</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {c.skills.map((k) => <Text key={k} style={s.chip}>{k}</Text>)}
              </View>
            </View>
          )}
          {hasSide && (
            <View style={{ flex: 1 }}>
              {c.education.length > 0 && (
                <>
                  <Text style={s.h2}>Ausbildung</Text>
                  {c.education.slice(0, 4).map((e, i) => <Text key={i} style={{ marginBottom: 2 }}>{e}</Text>)}
                </>
              )}
              {c.certifications.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={s.h2}>Zertifikate</Text>
                  {c.certifications.map((e, i) => <Text key={i} style={{ marginBottom: 2 }}>{e}</Text>)}
                </View>
              )}
              {c.languages.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={s.h2}>Sprachen</Text>
                  <Text>{c.languages.map((l) => (l.level ? `${l.language} (${l.level})` : l.language)).join(", ")}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {sec.questions && c.questions.length > 0 && (
        <View style={s.section}>
          <Text style={s.h2}>{c.interview ? "Interviewfragen" : "Interviewleitfaden"}</Text>
          {!c.interview && (
            <Text style={[s.small, { marginTop: -3, marginBottom: 8 }]}>
              Zum Ausfüllen im Gespräch. Bewertung pro Frage: 1 = schwach, 5 = stark.
            </Text>
          )}
          {c.questions.map((q, i) => (
            <View key={i} wrap={false} style={{ flexDirection: "row", marginBottom: c.interview ? 6 : 12 }}>
              <Text style={{ width: 18, fontWeight: 800, color: C.greenDeep }}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                {q.competency ? <Text style={{ fontSize: 7.5, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: 0.8 }}>{q.competency}</Text> : null}
                <Text style={{ color: C.ink }}>{q.question}</Text>
                {/* Noch kein Gespräch: Felder für Bewertung und Notizen, damit
                    der Report als Vorlage im Vorstellungsgespräch taugt. */}
                {!c.interview && (q.lookFor || q.weak || q.strong) && (
                  <View style={{ marginTop: 4 }}>
                    {q.lookFor && <Hint label="Worauf achten" text={q.lookFor} />}
                    {q.weak && <Hint label="Schwach, 1 bis 2" text={q.weak} />}
                    {q.strong && <Hint label="Stark, 4 bis 5" text={q.strong} />}
                  </View>
                )}
                {!c.interview && <AnswerFields />}
              </View>
            </View>
          ))}
          {!c.interview && (
            <View wrap={false} style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 8.5, fontWeight: 700, color: C.ink }}>Gesamteindruck</Text>
              <WriteLines count={4} />
            </View>
          )}
        </View>
      )}

      {sec.interview && c.interview && (
        <View style={s.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Text style={s.h2}>Interview-Ergebnis</Text>
            {c.interview.score != null && <Text style={{ fontSize: 11, fontWeight: 800, color: C.ink }}>{c.interview.score} / 100</Text>}
          </View>
          {c.interview.ratings.map((r, i) => (
            <View key={i} wrap={false} style={{ paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ flex: 1, color: C.ink, paddingRight: 10 }}>{r.question}</Text>
                <Dots value={r.rating} />
              </View>
              {r.notes ? <Text style={[s.small, { marginTop: 2 }]}>{r.notes}</Text> : null}
            </View>
          ))}
          {c.interview.notes && (
            <View style={[s.panel, { marginTop: 8 }]}>
              <Text style={{ fontSize: 8.5, fontWeight: 700, color: C.ink, marginBottom: 2 }}>Notizen</Text>
              <Text style={{ fontSize: 8.8 }}>{c.interview.notes}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={[s.small, { marginTop: 18, fontSize: 7.5, color: C.faint }]}>
        Automatisch erstellte Einschätzung auf Basis der Bewerbungsunterlagen. Sie ist eine Entscheidungshilfe und ersetzt
        kein persönliches Gespräch.
      </Text>
    </Page>
  )
}

function truncate(text: string | null, max: number): string {
  if (!text) return ""
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(" ") > max * 0.6 ? cut.lastIndexOf(" ") : max)} …`
}

export function ReportDocument({ data }: { data: ReportData }) {
  const title = data.candidates.length > 1 ? `Shortlist ${data.jobTitle}` : `${data.candidates[0]?.title ?? "Profil"} · ${data.jobTitle}`
  return (
    <Document title={title} author={data.issuer || "Revetly"} creator="Revetly" producer="Revetly" language="de-AT">
      {data.candidates.length > 1 && <Cover data={data} />}
      {data.candidates.map((c) => <Profile key={c.code} data={data} c={c} />)}
    </Document>
  )
}

export async function renderReport(data: ReportData): Promise<Buffer> {
  registerFonts()
  return renderToBuffer(<ReportDocument data={data} />)
}
