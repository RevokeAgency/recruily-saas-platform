import type { MetadataRoute } from "next"

/** Für „Zum Startbildschirm hinzufügen“ auf Android und Chrome. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Revetly",
    short_name: "Revetly",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0c1a16",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
