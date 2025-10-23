import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma paketlerini server bundle'a dışarıdan ekle
  serverExternalPackages: ["@prisma/client", "prisma"],

  // Next 16'da üst düzeyde
  reactCompiler: true,

  // Next 16'da üst düzeyde: engine dosyalarını izlemeye dahil et
  outputFileTracingIncludes: {
    "/": [
      "./node_modules/.prisma/client",   // Prisma client + engine binary
      "./node_modules/@prisma/engines"  // Bazı sürümlerde motorlar burada
    ],
  },
};

export default nextConfig;
