import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: "Value90 | Rendimiento y valor del fútbol",
    template: "%s | Value90",
  },
  description: "Consulta rankings, estadísticas, jugadores, equipos y partidos de fútbol con datos de rendimiento Value90.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
