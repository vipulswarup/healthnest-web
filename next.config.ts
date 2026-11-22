import type { NextConfig } from "next";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const pdfWorkerSrc = join(__dirname, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const pdfWorkerDestDir = join(__dirname, "public");
const pdfWorkerDest = join(pdfWorkerDestDir, "pdf.worker.min.mjs");
if (existsSync(pdfWorkerSrc)) {
  mkdirSync(pdfWorkerDestDir, { recursive: true });
  copyFileSync(pdfWorkerSrc, pdfWorkerDest);
}

const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  process.env.NODE_ENV !== "production" ? "'unsafe-eval'" : "",
].filter(Boolean).join(" ");

const securityHeaders = [
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com",
      "font-src 'self' data:",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "frame-src 'self' blob: https://*.r2.cloudflarestorage.com",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(), microphone=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const privatePageSources = [
  "/dashboard",
  "/dashboard/:path*",
  "/patients",
  "/patients/:path*",
  "/health-records",
  "/health-records/:path*",
  "/medications",
  "/medications/:path*",
  "/documents",
  "/documents/:path*",
  "/reports",
  "/reports/:path*",
  "/households",
  "/households/:path*",
  "/bp",
  "/bp/:path*",
  "/growth",
  "/growth/:path*",
  "/vaccinations",
  "/vaccinations/:path*",
  "/visit-notes",
  "/visit-notes/:path*",
  "/for-the-doctor",
  "/for-the-doctor/:path*",
  "/beta-acknowledgement",
  "/auth/:path*",
  "/share/:path*",
  "/care/:path*",
  "/care-shares",
  "/settings",
  "/settings/:path*",
];

const nextConfig: NextConfig = {
  // This repository is nested under an asset repository with its own lockfile.
  // Pin Turbopack to this application so dependency and environment discovery is deterministic.
  turbopack: {
    root: __dirname,
  },
  transpilePackages: ['pdfjs-dist', '@cantoo/pdf-lib'],
  // Keep libheif's WebAssembly loader intact in server functions. Bundling it
  // triggers a dynamic-require warning and is unnecessary for this Node-only path.
  serverExternalPackages: ['heic-convert', '@napi-rs/canvas'],
  outputFileTracingIncludes: {
    '/api/**': [
      './node_modules/pdfjs-dist/cmaps/**',
      './node_modules/pdfjs-dist/standard_fonts/**',
    ],
  },
  async redirects() {
    const publicPositioningRedirects = [
      {
        source: '/personal-health-record-app-india',
        destination: '/personal-health-record-app',
        permanent: true,
      },
      {
        source: '/best-personal-health-record-apps-india',
        destination: '/personal-health-record-app',
        permanent: true,
      },
      {
        source: '/guides/abha-vs-personal-health-record',
        destination: '/personal-health-record-app',
        permanent: true,
      },
    ];

    return process.env.NODE_ENV === 'production'
      ? [
          ...publicPositioningRedirects,
          {
            source: '/:path*',
            has: [{ type: 'header' as const, key: 'x-forwarded-proto', value: 'http' }],
            destination: 'https://www.sanovault.com/:path*',
            permanent: true,
          },
        ]
      : publicPositioningRedirects;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      ...privatePageSources.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
};

export default nextConfig;
