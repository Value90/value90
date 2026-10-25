import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);
const metadataBase = (() => {
  if (!configuredSiteUrl) return undefined;
  try { return new URL(configuredSiteUrl); } catch { return undefined; }
})();

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Value90 | Rendimiento y valor del fútbol",
    template: "%s | Value90",
  },
  description: "Consulta rankings, jugadores, equipos y partidos de fútbol con datos de rendimiento Value90.",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Value90",
    title: "Value90 | Rendimiento y valor del fútbol",
    description: "Consulta rankings, jugadores, equipos y partidos con datos de rendimiento Value90.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
