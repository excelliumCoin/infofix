import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma paketlerini server bundle'a dışarıdan ekle
  serverExternalPackages: ["@prisma/client", "prisma"],

  // React Compiler (Next 16'da üst düzeyde)
  reactCompiler: true,
};

export default nextConfig;
