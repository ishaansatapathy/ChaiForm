import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(configDir, "../..");

const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  async rewrites() {
    return [
      {
        source: "/trpc/:path*",
        destination: `${apiInternalUrl}/trpc/:path*`,
      },
      {
        source: "/api-auth/:path*",
        destination: `${apiInternalUrl}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
