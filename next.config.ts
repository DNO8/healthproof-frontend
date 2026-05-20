import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = {
  /* config options here */
  reactCompiler: true,
  serverActions: {
    bodySizeLimit: "50mb",
  },
} as NextConfig;

export default withNextIntl(nextConfig);
