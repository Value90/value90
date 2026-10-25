import type { MetadataRoute } from "next";

function getSiteUrl(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString().replace(/\/$/, "") : undefined;
  } catch { return undefined; }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return [];

  const pages: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
    ["/", "daily", 1],
    ["/public", "daily", 0.9],
    ["/public/jugadores", "daily", 0.8],
    ["/public/equipos", "weekly", 0.7],
    ["/public/partidos", "daily", 0.8],
    ["/public/rankings", "daily", 0.9],
    ["/public/aviso-legal", "yearly", 0.2],
    ["/public/privacidad", "yearly", 0.2],
    ["/public/cookies", "yearly", 0.2],
  ];

  return pages.map(([path, changeFrequency, priority]) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency,
    priority,
  }));
}
