import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(configDir, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  async rewrites() {
    return [
      {
        source: "/trpc/:path*",
        destination: "http://localhost:8000/trpc/:path*",
      },
      {
        source: "/api-auth/:path*",
        destination: "http://localhost:8000/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
