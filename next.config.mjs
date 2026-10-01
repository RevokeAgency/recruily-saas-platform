/** @type {import('next').NextConfig} */
const nextConfig = {
  // Typfehler brechen den Build ab. Früher stand hier ignoreBuildErrors: true,
  // Fehler landeten so ungebremst in Produktion. Geprüft wird zusätzlich in
  // der GitHub-Action (.github/workflows/ci.yml).
  images: {
    unoptimized: true,
  },
  // Keep the native/heavy CV-photo deps out of the bundler; load them at runtime.
  // The pdfjs worker is pulled into the bundle via a require.resolve() literal in
  // lib/cv-photo.ts (outputFileTracingIncludes reproducibly crashes the Vercel
  // build here, so we can't use it).
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
}

export default nextConfig
