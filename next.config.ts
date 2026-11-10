import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the PDF export drives a headless Chrome from the server (lib/invitation-pdf.ts): keep these packages out of the bundle
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
