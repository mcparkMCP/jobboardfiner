import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.jobboardfinder.com",
      },
      {
        protocol: "https",
        hostname: "**.jobboardfinder.com",
      },
    ],
  },
};

export default nextConfig;
