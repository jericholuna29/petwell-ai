import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: process.cwd(),
  },
  /* config options here */
};

export default nextConfig;
