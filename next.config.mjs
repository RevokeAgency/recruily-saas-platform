/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Keep the native/heavy CV-photo deps out of the bundler; load them at runtime.
  // serverExternalPackages copies the whole package (incl. pdfjs' standard_fonts)
  // into the serverless output, so no extra file-tracing config is needed.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
}

export default nextConfig
