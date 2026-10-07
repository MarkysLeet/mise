import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  cacheOnFrontEndNav: true,
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'offlineCache',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 24 * 60 * 60 // 24 hours
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ]
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {}, // Avoid Next.js 16 Turbopack PWA bug
};

export default withPWA(nextConfig);
