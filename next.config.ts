import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let phones on the same wifi load the dev server (npm run dev:lan). Without this, Next blocks dev assets
  // requested from a non-localhost origin. Wildcards cover typical home/campus/hackathon subnets.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "100.*.*.*", "*.local"],
};

export default nextConfig;
