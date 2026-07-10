/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Keep the native/heavy CV-photo deps out of the bundler; load them at runtime.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  // pdfjs loads its worker + standard fonts dynamically at runtime, which the
  // tracer misses. Force just those two into the bundle for the routes that
  // render CV PDFs. Paths follow the (pnpm) symlink to the real files; no
  // glob over the .pnpm store (that tripped the Vercel build tracer).
  outputFileTracingIncludes: {
    "/api/candidates/[id]/photo": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**",
    ],
    "/api/candidates/[id]/upload": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**",
    ],
    "/api/public/apply": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**",
    ],
    "/api/inbound/email": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/standard_fonts/**",
    ],
  },
}

export default nextConfig
