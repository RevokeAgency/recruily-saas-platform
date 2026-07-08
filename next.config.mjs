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
  // Make sure pdfjs' standard fonts ship in the serverless bundle so rendering a
  // CV that uses the base-14 fonts works on Vercel (matched for both npm and
  // pnpm node_modules layouts).
  outputFileTracingIncludes: {
    "/api/**": [
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
      "./node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/standard_fonts/**/*",
    ],
  },
}

export default nextConfig
