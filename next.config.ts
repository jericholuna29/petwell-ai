import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "export",
  devIndicators: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  /* config options here */
};

export default nextConfig;
