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
}

export default nextConfig
