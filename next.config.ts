import type { NextConfig } from "next";

// Prod CORS_ORIGINS doesn't include localhost, so proxy API calls server-side
// (no Origin header) instead of hitting CloudFront from the browser.
const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone server so the Docker image
  // doesn't need the full node_modules tree at runtime.
  output: "standalone",
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://d1glhclb7uoptr.cloudfront.net/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
