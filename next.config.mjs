import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(self), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

function supabaseHostname() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseHostname();
const isCapacitorBuild = process.env.IS_CAPACITOR === "true";

const nextConfig = {
  output: isCapacitorBuild ? "export" : undefined,
  trailingSlash: isCapacitorBuild,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    unoptimized: isCapacitorBuild,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/**",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https",
              hostname: supabaseHost,
              pathname: "/storage/v1/object/**",
            },
          ]
        : [
            {
              protocol: "https",
              hostname: "*.supabase.co",
              pathname: "/storage/v1/object/**",
            },
          ]),
    ],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  ...(!isCapacitorBuild
    ? {
        async headers() {
          return [
            {
              source: "/.well-known/apple-app-site-association",
              headers: [
                { key: "Content-Type", value: "application/json" },
                ...securityHeaders,
              ],
            },
            {
              source: "/.well-known/assetlinks.json",
              headers: [
                { key: "Content-Type", value: "application/json" },
                ...securityHeaders,
              ],
            },
            { source: "/(.*)", headers: securityHeaders },
          ];
        },
        async redirects() {
          return [
            { source: "/terms&conditions", destination: "/terms", permanent: true },
            { source: "/index.html", destination: "/", permanent: true },
          ];
        },
      }
    : {}),
  serverExternalPackages: ["@upstash/redis", "firebase-admin"],
};

const sentryConfig = withSentryConfig(nextConfig, {
  org: "kaify-mm",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});

export default isCapacitorBuild ? nextConfig : sentryConfig;
