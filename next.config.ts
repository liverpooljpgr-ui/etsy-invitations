import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the PDF export drives a headless Chrome from the server (lib/invitation-pdf.ts): keep these packages out of the bundle
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // the browser files are read at run time, so the build must be told to ship them with this route
  outputFileTracingIncludes: { "/api/invitations/\\[id\\]/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"] },
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
