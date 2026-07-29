import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There is a stray package-lock.json in the home directory; without this, Turbopack
  // infers ~/ as the workspace root and warns on every start.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    qualities: [75, 95],
  },
};

export default nextConfig;
