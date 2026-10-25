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

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/public/"],
      disallow: ["/admin", "/login", "/api/", "/countries", "/positions"],
    },
    ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
  };
}
