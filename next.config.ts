import type { NextConfig } from "next";

const cspDirectives = [
  "default-src 'self'",
  // TEMPORARY: nonce disabled — allow inline scripts for functionality
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://cdn.sender.net",
  // Styles
  "style-src 'self' 'unsafe-inline'",
  // Images
  "img-src 'self' data: blob: https:",
  // Fonts
  "font-src 'self'",
  // Connect
  "connect-src 'self' https://api.sender.net https://cdn.sender.net https://www.google.com",
  // Frames (reCAPTCHA)
  "frame-src https://www.google.com https://recaptcha.google.com",
  // Objects
  "object-src 'none'",
  // Base
  "base-uri 'self'",
  // Form actions
  "form-action 'self'",
  // Upgrade insecure requests
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  // COEP devre dışı: flagcdn.com gibi üçüncü parti kaynakları blokluyor
  // {
  //   key: "Cross-Origin-Embedder-Policy",
  //   value: "require-corp",
  // },
  {
    key: "Content-Security-Policy",
    value: cspDirectives,
  },
];

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Server-side only modules
  serverExternalPackages: ["@upstash/redis"],
};

export default nextConfig;
