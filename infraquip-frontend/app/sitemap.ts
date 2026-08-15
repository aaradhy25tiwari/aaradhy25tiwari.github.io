import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://infraquip.in";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface SitemapMachine {
  slug: string;
  updated_at: string;
}

interface SitemapCategory {
  slug: string;
}

async function fetchMachineSlugs(): Promise<SitemapMachine[]> {
  try {
    const res = await fetch(`${API_URL}/sitemap/machines`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchCategories(): Promise<SitemapCategory[]> {
  try {
    const res = await fetch(`${API_URL}/categories`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [machines, categories] = await Promise.all([
    fetchMachineSlugs(),
    fetchCategories(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/machines`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/machines?category=${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const machineRoutes: MetadataRoute.Sitemap = machines.map((m) => ({
    url: `${BASE_URL}/machines/${m.slug}`,
    lastModified: new Date(m.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...machineRoutes];
}
