import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://infraquip.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/machines", "/machines/*", "/pricing", "/about", "/contact"],
        disallow: [
          "/dashboard/",
          "/api/",
          "/enquire/",
          "/reset-password",
          "/forgot-password",
        ],
      },
      {
        // Block AI training crawlers
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Google-Extended",
          "CCBot",
          "anthropic-ai",
          "Claude-Web",
        ],
        disallow: ["/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
