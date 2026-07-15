import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // page copy/policies (content.json) and friends are read from disk at
  // runtime — make sure they ship inside the serverless bundle on Vercel
  outputFileTracingIncludes: {
    "/**": ["./data/*.json"],
  },
  images: {
    // Custom loader: Shopify CDN + Cloudinary do the resizing/format work,
    // so Vercel's image-optimization quota is never consumed.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Note on script-src: Next inlines its hydration payload, so a
            // nonce would be the only way to drop 'unsafe-inline' — and nonces
            // force every page to render dynamically, which would undo the ISR
            // caching the storefront depends on. We accept 'unsafe-inline' for
            // scripts and buy the rest of the value: no third-party script
            // origins, no plugins, no framing, no <base> hijack, no form
            // exfiltration to another origin.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://res.cloudinary.com https://cdn.shopify.com",
              "media-src 'self' https://res.cloudinary.com",
              "font-src 'self' data:",
              // Supabase REST + realtime websocket
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Preserve old Shopify page URLs so existing links keep working
      { source: "/pages/about-us", destination: "/about", permanent: true },
      { source: "/pages/philosophy-behind-logo", destination: "/philosophy", permanent: true },
      { source: "/collections/all", destination: "/products", permanent: true },
      { source: "/policies/contact-information", destination: "/contact", permanent: true },
    ];
  },
};

export default nextConfig;
