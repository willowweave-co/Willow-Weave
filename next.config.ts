import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
