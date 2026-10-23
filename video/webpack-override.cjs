// Webpack-Anpassungen für Studio, Render und scripts/stills.mjs (bundle()
// liest remotion.config.ts nicht, deshalb liegt das hier gemeinsam).
// CommonJS, weil Remotion die Config als CJS bündelt.
//
// - Tailwind v4, damit die Video-Szenen die Klassen und Tokens der App nutzen
// - "@/…" zeigt wie in der App auf das Repo-Root, so lassen sich
//   components/ui/* direkt importieren
// - react/react-dom immer aus video/node_modules, sonst lägen zwei Reacts im Bundle
const path = require("node:path")
const { enableTailwind } = require("@remotion/tailwind-v4")

// Remotion bündelt die Config, __dirname zeigt dann nicht mehr hierher.
// Remotion läuft immer aus video/, also gilt das Arbeitsverzeichnis.
const videoDir = process.cwd()
const repoRoot = path.resolve(videoDir, "..")
const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`, { paths: [videoDir] }))

const webpackOverride = (config) => {
  const withTailwind = enableTailwind(config)
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...(withTailwind.resolve && withTailwind.resolve.alias ? withTailwind.resolve.alias : {}),
        "@": repoRoot,
        react: pkgDir("react"),
        "react-dom": pkgDir("react-dom"),
      },
    },
  }
}

module.exports = { webpackOverride }
