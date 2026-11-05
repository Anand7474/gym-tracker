import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves the app at /gym-tracker/. Override with BASE_PATH=/ for other hosts.
const base = process.env.BASE_PATH ?? "/gym-tracker/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Gym Tracker",
        short_name: "Gym",
        description: "Day-by-day workout, diet and progress tracker",
        theme_color: "#1d4fd8",
        background_color: "#e9ecef",
        display: "standalone",
        orientation: "portrait",
        start_url: base,
        scope: base,
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, handler: "CacheFirst",
            options: { cacheName: "fonts", expiration: { maxEntries: 20, maxAgeSeconds: 31536000 } } },
          { urlPattern: /^https:\/\/i\.ytimg\.com\/.*/, handler: "CacheFirst",
            options: { cacheName: "video-thumbs", expiration: { maxEntries: 120, maxAgeSeconds: 2592000 } } },
        ],
      },
    }),
  ],
});
