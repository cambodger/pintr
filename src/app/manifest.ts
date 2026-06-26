import type { MetadataRoute } from "next";

/**
 * PWA web app manifest, served at /manifest.webmanifest. Next.js links it
 * from every page automatically. This is what makes "Add to Home Screen"
 * install the app standalone (no browser chrome) — required on iOS before
 * web push is allowed (iOS 16.4+).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "pintr",
    short_name: "pintr",
    description:
      "Find out the second a mate's in your city. Then get the pints in, ya cunt.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e27",
    theme_color: "#0a0e27",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
