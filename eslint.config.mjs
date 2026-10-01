import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

// Offizielle Next.js-Regeln (Core Web Vitals und TypeScript).
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Neue Regel aus dem React-Compiler-Umfeld: bemängelt setState in
      // useEffect, ein verbreitetes und hier funktionierendes Muster (Daten
      // laden, Formular aus Props befüllen). 17 Stellen umzubauen hätte
      // Risiko ohne Nutzen. Als Warnung sichtbar, blockiert aber nicht.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vom Bundler eingebundene Fremddatei (pdfjs-Worker), nicht unser Code.
    "lib/pdfjs-worker.mjs",
    "scripts/**",
  ]),
])
