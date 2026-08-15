import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Image Optimization ────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth avatars
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // 24h
    deviceSizes: [375, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ── Security Headers ──────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://checkout.razorpay.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://maps.gstatic.com https://maps.googleapis.com https://lh3.googleusercontent.com",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.infraquip.com",
              "frame-src https://api.razorpay.com",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // ── Redirects ─────────────────────────────────────────────────
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/vendor",
        permanent: false,
      },
    ];
  },

  // ── API Proxy (Bypass CORS & Firewall during dev) ──────────────
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:8000/api/v1/:path*",
      },
    ];
  },

  // ── TypeScript & Lint ─────────────────────────────────────────
  typescript: {
    ignoreBuildErrors: false,
  },

  // ── Compression ───────────────────────────────────────────────
  compress: true,
  
  // ── Allowed Dev Origins ─────────────────────────────────────────
  allowedDevOrigins: ["192.168.1.9"],

  // ── Powered by header ─────────────────────────────────────────
  poweredByHeader: false,

  // ── Bundle analyzer (set ANALYZE=true to enable) ──────────────
  // ...(process.env.ANALYZE === "true" && { analyzeServer: true }),
};

export default nextConfig;
