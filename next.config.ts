import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/extract-text": ["./node_modules/pdfjs-dist/legacy/build/*.mjs"],
  },
};

export default nextConfig;
