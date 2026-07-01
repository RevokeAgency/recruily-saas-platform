# Revetly — Auth + Dashboard Redesign Brief

> **Für die Claude-Building-Session (Repo: recruily-saas-platform).**
> Ziel: Auth + Dashboard von „generisches shadcn-Default" auf **dasselbe Premium-Niveau wie die Landing**
> heben — als **eigenständiges Produkt-UI**, nicht als Marketing-Kopie. Alles wirkt wie EIN Produkt.
>
> Voranstellen: `/design-taste-frontend` + `/emil-design-eng` invoken und deren Prinzipien anwenden.

## 0. Die wichtigste Regel: Produkt-UI ≠ Landing
Die Landing ist cinematisches Marketing (große Radien 20–38px, Ken-Burns, viel Motion).
Das **Dashboard ist ein Werkzeug, das täglich benutzt wird** → ruhig, präzise, dicht, funktional.
**NICHT** die Marketing-Deko ins Dashboard kopieren. Vorbild: **Linear / Vercel / Stripe Dashboard**.
Geteilt wird nur das **Marken-Fundament** (Farben, Font, Gradient), nicht die Marketing-Ästhetik.

`DESIGN_VARIANCE 5 · MOTION_INTENSITY 3 · VISUAL_DENSITY 6` fürs Produkt (Landing war 7/6/4).

## 1. Engine/Skin-Grenze (unverändert)
Nur Präsentation. **Niemals** `app/api/**`, `lib/**` (außer UI/Design), `hooks/**`-Datenlogik
(`use-jobs`, `use-candidates`, `use-quota`, `use-organisations`, `use-auth`, `use-subscription`),
`middleware.ts`, `contexts/**`-Auth-State, `supabase/**`, `*.sql`. Props/Daten-Contracts bleiben identisch.
Eigene Branch, nach jeder Fläche `pnpm build` + Live-Test, inkrementell committen.

## 2. Was konkret falsch ist (aus den Screenshots) → Fix
| Problem jetzt | Fix |
| --- | --- |
| **Grün als Vollfläche überall** (aktive Nav = solide grüne Pille, alle Buttons solide grün, Icon-Kreise grün) | Grün wird **Akzent**, nicht Füllung. Neutrale Basis + Grün sparsam für Aktiv/Positiv/Fokus. |
| **Boxige Marketing-Radien** auf Cards | Tightere Produkt-Radien (Cards 16px, Controls 10px). |
| **Generisches Quadrat-Logo** | Echte Revetly-R-Marke (aus `apple-touch-icon.png` / Landing-Logo). |
| **Schwache Hierarchie**, viel toter Raum | Klare Typo-Skala, `tabular-nums`, dichter (VISUAL_DENSITY 6). |
| **Flache, übersättigte grüne Buttons** (Anmelden, Neuen Job) | Definiertes Button-System: primär = Gradient/Ink, sekundär = Ghost. |
| **Flache Cards ohne Tiefe** | 1px Border + getönter Diffusions-Shadow + optional Inner-Highlight. |

## 3. App-Design-Tokens (zusätzlich zu den Marken-Tokens)
Marken-Fundament bleibt: `--cyan #22C1EE`, `--green #16C77C`, `--green-deep #0E9F62`,
`--ink #0C1A16`, `--ink-soft #2C3D38`, `--muted #506A63`, `--grad`, Plus Jakarta Sans.

Neu fürs Produkt-UI (eigene Radius-/Density-Skala, **nicht** die Landing-Radien nehmen):
```
App-BG:        #F7FAF9  (sehr subtiles Off-White, Surfaces sind reines Weiß)
Radius:        Card 16px · Control/Input 10px · Badge/Pill 999px
Shadow-Card:   0 1px 2px rgba(12,26,22,.04), 0 8px 24px -12px rgba(12,26,22,.08)  (getönt, dezent)
Border:        1px solid rgba(12,26,22,.08)   (--line)
Focus-Ring:    0 0 0 3px rgba(22,199,124,.25) + border --green
Green-Wash:    rgba(22,199,124,.10)  (für aktive/positive Flächen)
Spacing:       4/8-Basis, konsequent
Numbers:       IMMER font-variant-numeric: tabular-nums
```

**Grün-Regel (kritisch):** Grün nur für → aktive Nav, positive Deltas/Trends, Fokus-Ringe,
kleine Status-Dots, den EINEN primären CTA pro Screen. **Keine** großflächigen grünen Füllungen.
Basis ist neutral (Weiß/Ink/Line).

## 4. Komponenten-Spezifikationen

### Sidebar
- Echte R-Marke + „Revetly" oben. Border-right `--line`, Surface weiß.
- Nav-Item: Icon (Line, stroke 1.75) + Label, Radius 10px, `--ink-soft`.
  **Aktiv:** `green-wash`-Hintergrund + `--green-deep`-Text + 3px Gradient-Bar links —
  **NICHT** die solide grüne Vollpille.
- KI-Matches-Widget: dünner Progress (Gradient-Fill), `tabular-nums`, klein & ruhig.
- User-Profil unten: Avatar (Initialen auf Gradient), Name/Email truncated, dezent.

### Topbar (falls vorhanden)
- Schlank, weiß, `--line`-Border unten. Seitentitel + evtl. Suche/Aktion rechts. Ruhig.

### Stat-Cards (die 4 KPI-Kacheln)
- Weiß, Radius 16px, `--line` + Card-Shadow. Padding großzügig aber rhythmisch (`p-6`).
- **Aufbau:** kleines Label oben (uppercase, 0.7rem, tracked, `--muted`) → große Zahl
  (`tabular-nums`, tight tracking, `--ink`) → Delta/Kontext klein darunter (grün ↑ = positiv, sonst muted).
- Icon: **dezentes Line-Icon** oben rechts (`--muted`), **kein** gefüllter grüner Kreis.
- Optional: winzige Sparkline / oder ein 2px Gradient-Top-Accent. Hover: leichter Shadow-Lift.

### Buttons (Produkt-System, distinkt von den Landing-Pills)
- **Primär:** Marken-Gradient (oder `--ink`), Radius 10px, Höhe ~40px, `:active scale(.98)`,
  dezenter Shadow. **Nur der wichtigste CTA pro Screen.**
- **Sekundär:** Weiß, `--line`-Border, `--ink`-Text, Hover `--mist`.
- **Ghost/Icon:** transparent, Hover `green-wash`.
- Konsistente Höhe/Padding/Icon-Abstand. Loading-State (Spinner + disabled).

### Inputs / Forms
- Label oben (`--ink-soft`, 0.85rem, medium). Input: Radius 10px, `--line`-Border, Höhe ~44px,
  Placeholder `--muted`. **Fokus:** Green-Ring (siehe Token) + Border-Shift, 150ms ease-out.
- Fehler: `--line` → rot, Fehlertext klein darunter. Helper-Text optional.

### Tabellen / Listen (Jobs, Kandidaten, Matches)
- `divide-y` statt schwerer Card-Boxen; Header-Row `--muted` uppercase klein.
- Row-Hover `--mist`. Score/Zahlen `tabular-nums`. Status als dezente Badge (green-wash/…).
- Aktionen als Ghost-Icon-Buttons. Dichter als jetzt, aber atmend.

### Badges / Status
- Pill, Radius 999px, klein. Positiv = green-wash + green-deep; neutral = mist + ink-soft;
  Warnung/Fehler = eigene gedämpfte Töne. Nie grelles Vollgrün.

### Empty / Loading / Error States (das, was Default-UIs vergessen)
- **Loading:** Skeleton-Loader in der **Form des echten Layouts** (Card-/Row-Skelette), kein Spinner-Kreis.
- **Empty:** komponierter Leerzustand (Icon + kurzer Satz + primärer CTA), z.B. „Noch keine Jobs — Ersten Job anlegen".
- **Error:** inline, klar, mit Retry.

## 5. Auth (Login-Modal + /login /register /reset)
Aktuell: generisches Modal, übersättigter grüner Vollbutton, Quadrat-Logo. Fix:
- **Voll-Seiten (/login /register):** **Split-Screen** — links das Formular (ruhig, zentriert,
  max-w ~420px), rechts ein Marken-Panel (subtiler animierter Mesh-Gradient in Cyan/Grün **oder**
  ein Landing-Still) mit einem kurzen Value-Statement. Das verbindet Auth optisch mit der Premium-Landing.
- **Modal:** kompakt, aber poliert — echte R-Marke, saubere Inputs mit Green-Fokus-Ring,
  primärer Button = Gradient/Ink (nicht flaches Vollgrün), sekundäre Links dezent.
- **States:** Loading (Button-Spinner), inline-Fehler, Success. `:active scale(.97)`.
- „Angemeldet bleiben"-Checkbox als custom, markenkonform (green-check), nicht Default-Grau.

## 6. Motion (Emil-Prinzipien, ruhig)
- Nur `transform`/`opacity`. UI-Transitions 150–250ms ease-out. `:active scale(.97–.98)`.
- **Kein** Marketing-Motion im Dashboard (kein Ken-Burns, keine schweren Reveals). Höchstens ein
  einmaliger, dezenter Stagger beim ersten Mount von Listen/Cards (30–60ms). `prefers-reduced-motion` respektieren.
- Skeletons mit sanftem Shimmer. Fokus/Hover/Press müssen sich responsiv anfühlen.

## 7. Konsistenz-System (überall gleich anwenden)
Eine Radius-Skala, eine Shadow-Set, eine Spacing-Skala (4/8), **eine** Icon-Familie + Stroke-Width,
`tabular-nums` für alle Zahlen, eine Button-Hierarchie, eine Badge-Sprache. In `globals.css`/Tokens
zentralisieren, damit Dashboard + Auth + künftige Screens automatisch stimmig sind.

## 8. Prozess
1. Design-Skills invoken, App-Tokens + geteilte Produkt-Komponenten (Button, Input, Card, Badge,
   Sidebar-Item, StatCard, EmptyState, Skeleton) zuerst bauen.
2. Dann Fläche für Fläche: **Auth** → **Dashboard-Shell (Sidebar/Topbar)** → **Übersicht/KPIs** →
   **Jobs** → **Kandidaten** → **Matches** → **Abonnement/Einstellungen**.
3. Nach jeder Fläche: `pnpm build` + Live-Test (Daten müssen weiter laden) + Screenshot.
4. Daten-Contracts/Props unangetastet — nur Optik/Struktur der Präsentation.

## 9. Definition of Done
Auth + Dashboard sehen aus wie dasselbe Premium-Produkt wie die Landing: neutral-elegante Basis,
Grün als präziser Akzent, klare Hierarchie, echte States, ruhige Motion — kein „2010er-Admin-Template",
sondern Linear/Vercel-Klasse. Kein Vollgrün-Overkill, keine Marketing-Radien im Tool.
