import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};

    // Map the workspace package name to its source directory.
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@flyai/agents": path.resolve(__dirname, "../agents"),
    };

    // The agents workspace uses Node ESM-style .js imports pointing at .ts sources.
    // Webpack doesn't try .ts when it sees .js, so we tell it to: .js → [.ts, .js].
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".js"],
      ".mjs": [".mts", ".mjs"],
    };

    return config;
  },
};

export default nextConfig;
