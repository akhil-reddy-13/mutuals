import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run demo:build` / `demo:start` use a separate build folder so a production demo build never clobbers a
  // running `npm run dev` (both would otherwise write .next/).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Let phones on the same wifi load the dev server (npm run dev:lan).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "100.*.*.*", "*.local"],
};

export default nextConfig;
