# Revetly — Design Handoff (Landing → Next.js/V0 Platform)

> **Zweck dieses Dokuments:** Anleitung für eine (ggf. frische) Claude-Code-Session, die
> im Repo `recruily-saas-platform` (Next.js 14 App Router + Tailwind + shadcn/ui) arbeitet.
> Es beschreibt, wie die fertige Landing-Page nach Next.js portiert und das Design auf
> Auth + Dashboard ausgeweitet wird — **ohne** die Matching-/Kandidaten-/API-Logik zu brechen.

## 0. Wichtigste Regel: Engine behalten, Haut neu bauen

| Wird umgestylt (Skin) | NIEMALS anfassen (Engine) |
| --- | --- |
| `app/page.tsx` (Landing → komplett ersetzen) | `app/api/**` (analyze-cv, jobs/match, matches, candidates, quota, scrape-url …) |
| `app/login`, `app/signup`, `app/onboarding`, `app/auth` (nur Optik) | `lib/**` (Supabase-Clients, AI-Pipeline), `middleware.ts` |
| `app/dashboard/**` (Layout, Farben, Typo, Cards) | `hooks/**` Datenlogik, `contexts/**` Auth-State |
| shadcn-Komponenten (Radii, Farben, Shadows) | DB-Schema, `supabase/**`, `database_setup*.sql` |

Restyling = `className`/Tailwind/Komponenten-Optik ändern. **Props, Daten-Contracts und State bleiben identisch.**
Nach jeder Phase: `npm run build` (bzw. pnpm) laufen lassen, damit nichts bricht. Inkrementell committen.

## 1. Referenz-Quelle
Die fertige Landing liegt als **eigenständige Vanilla-HTML-Datei** in `reference/revetly-landing/index.html`.
Sie enthält alle Styles + JS inline und ist die **Single Source of Truth** fürs Design.
→ **Nicht** als statische Datei ins Routing legen. **Nachbauen** als React/Tailwind-Komponenten.

## 2. Design-Tokens (nach `tailwind.config` + CSS-Variablen übernehmen)

```
--cyan:        #22C1EE      --ink:        #0C1A16 (fast-schwarz, nie #000)
--green:       #16C77C      --ink-soft:   #2C3D38
--cyan-deep:   #0E96C4      --muted:      #506A63 (WCAG-AA-geprüft)
--green-deep:  #0E9F62      --mist:       #F1F6F4 (heller Grün-Grau-BG)
--white:       #FFFFFF      --mist-2:     #E7F0EC
--line:        rgba(12,26,22,.10)     --line-strong: rgba(12,26,22,.16)
--grad:        linear-gradient(130deg, #22C1EE 0%, #16C77C 100%)

Radii:   20 / 30 / 38 px, pill 999px
Ease:    cubic-bezier(0.16, 1, 0.3, 1)   (Haupt-Ease für alle Transitions)
Shadows: tinted (nie reines Schwarz), sm/md/lg gestaffelt
```

**Font:** Plus Jakarta Sans, **selbst gehostet** (Variable woff2, weights 400–800).
Dateien: `reference/revetly-landing/fonts/*.woff2` + `fonts.css`. In Next.js via `next/font/local`
einbinden — **kein** Google-Fonts-Hotlink (DSGVO!).

## 3. Zu portierende Komponenten & Animationen (aus index.html)

- **Floating Glass Pill Nav** — abgesetzt, `backdrop-filter`, morpht beim Scrollen (Höhe/Opacity/Radius). Logo mittig. Links mit Hover-Pill. „Anmelden" = Gradient-Ring-Button, primärer CTA = Gradient + Glow + Arrow-Nudge + Shine.
- **Hero** — Full-Bleed-Foto (`hero-1800.jpg`/`hero-1100.jpg` via `srcset`), Teal-Scrim links, **Ken-Burns**-Zoom, **schwebende Papier-Shards**, **Wort-für-Wort Blur-Reveal** der Headline, Scroll-Cue. Trust-Row (DSGVO/EU AI Act/DE-Server).
- **Reveal-on-Scroll** — `IntersectionObserver`, `data-dir="left|right|scale"`, Scale+Blur-Materialisierung, gestaffelt (`.s1–.s5`).
- **Pricing** — Monats/Jahres-**Toggle** (Segmented, Slider-Thumb, Blur-maskierter Preiswechsel), **5 Tiers** (Free/Starter/Growth[featured, spinning Gradient-Border]/Pro/Enterprise), **Feature-Matrix im Modal** (Button öffnet Dialog; Scale+Fade, Backdrop-Blur, Fokus-Trap, sticky Header/erste Spalte, Growth-Spalte grün). Preise: 99/249/499 €/Monat, jährlich 990/2.490/4.990 (2 Monate gratis).
- **FAQ-Accordion** — ein offen, `aria-expanded`/`aria-controls`/`role=region`.
- **Weitere:** Testimonial-Karussell (3D-Stack), Kinetic-Marquee (scroll-velocity), 3D-Tilt-Cards, Spotlight-Cards (Cursor-Glow), Count-up-Zahlen.

**Motion-Prinzipien (Emil Kowalski):** nur `transform`/`opacity` animieren; `:active { scale(.97) }`;
kein `transition: all`; `@media (hover:hover)`-Guards; `prefers-reduced-motion` respektieren;
Custom-Ease statt Default; Blur zum Maskieren von Crossfades.

## 4. Bereits erledigt (in der Landing, mit-portieren)
OG-/Twitter-Tags + `og-image.jpg`, Favicons (16/32 + apple-touch), JSON-LD (Organization,
SoftwareApplication+Offers, FAQPage), Canonical, `theme-color`. A11y: Kontrast-Fixes, Fokus-Trap, ARIA.

## 5. Bewusst offen (echte Daten/Entscheidungen nötig)
Impressum/Datenschutz/AGB (Rechtstexte), echte CTA-Ziele/Routes, echte Testimonials/Logos/Kennzahlen
(aktuell Platzhalter — als „Beispiel" kennzeichnen oder ersetzen), Unsplash-CTA-Foto lokalisieren.

## 6. Empfohlene Reihenfolge
1. Audit + saubere-Struktur-Vorschlag (read-only) → Risiko-Karte.
2. Design-Tokens + Shared-Component-Lib (Button, Card, Pill-Nav, Modal) in Tailwind/shadcn.
3. Landing als `app/page.tsx` neu bauen (alle Animationen).
4. Auth-Screens restylen (Logik unangetastet).
5. Dashboard inkrementell restylen — Komponente für Komponente, nach jeder `build`.
