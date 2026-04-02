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
}

export default nextConfig
