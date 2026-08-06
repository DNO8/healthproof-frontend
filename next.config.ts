import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = {
  /* config options here */
  // reactCompiler disabled locally due to high memory usage / IDE freezes
  reactCompiler: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
} as NextConfig;

export default withNextIntl(nextConfig);
