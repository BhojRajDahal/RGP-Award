import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not mirror client console.* into the dev terminal (noisy with expected 401s, etc.)
  logging: {
    browserToTerminal: false,
  },
  typescript: {
    // TypeScript errors will now fail the build - fix all errors before deploying
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // Ensure Fast Refresh is enabled
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  // Improve file watching on Windows (only for development)
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding once the first file changed
      }
    }
    return config
  },
  // App lives in this folder; avoids wrong workspace root when parent repo has another lockfile
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    // Proxy /api/* to backend to avoid CORS in dev. Set API_PROXY_TARGET to your backend (ngrok or local).
    const target = process.env.API_PROXY_TARGET || "http://localhost:5000"
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ]
  },
  async headers() {
    // Strict CSP can block fetch/XHR to `/api/*` or dev tooling in some setups.
    // Apply full browser security headers only in production builds.
    if (process.env.NODE_ENV !== "production") {
      return []
    }
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https:; frame-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ]
  },
}

export default nextConfig
