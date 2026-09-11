import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.10.3", "172.16.20.35"],
  /* config options here */
  reactCompiler: true,
  devIndicators: false,
};

export default nextConfig;
