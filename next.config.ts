import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Profile pictures for accounts created with Continue with Google. Google
    // serves them from numbered lh* subdomains, so the host is matched by
    // pattern rather than listed one by one. Nothing else is allowed through.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
