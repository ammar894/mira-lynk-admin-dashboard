import type { NextConfig } from "next";

// Prod CORS_ORIGINS doesn't include localhost, so proxy API calls server-side
// (no Origin header) instead of hitting CloudFront from the browser.
const nextConfig: NextConfig = {
  // Served at https://d1glhclb7uoptr.cloudfront.net/admin, not the domain
  // root -- without this, the app's own JS/CSS/route links resolve at "/"
  // and the page loads blank behind the /admin path.
  basePath: "/admin",
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
