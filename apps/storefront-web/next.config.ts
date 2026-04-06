import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@zeroclick/domain", "@zeroclick/ui"],
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
