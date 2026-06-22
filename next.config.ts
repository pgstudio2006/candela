import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
