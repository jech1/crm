import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // FullCalendar v6 injects its CSS via JavaScript. Without transpilePackages,
  // Next.js bundles it as an external CJS module and the CSS injection never
  // runs, leaving the calendar container blank.
  transpilePackages: [
    "@fullcalendar/core",
    "@fullcalendar/react",
    "@fullcalendar/daygrid",
    "@fullcalendar/timegrid",
    "@fullcalendar/interaction",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "uploadthing.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent the app from being embedded in an iframe (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Stop browsers from MIME-sniffing the response type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Only send the origin on cross-origin requests, no full URL
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Force HTTPS for 2 years once the browser has seen the site (prod only)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ]
  },
}

export default nextConfig
