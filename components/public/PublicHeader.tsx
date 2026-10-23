"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import PublicAdSense from "@/components/public/PublicAdSense";

const navigation = [
  { label: "Inicio", href: "/public" },
  { label: "Jugadores", href: "/public/jugadores" },
  { label: "Equipos", href: "/public/equipos" },
  { label: "Partidos", href: "/public/partidos" },
  { label: "Rankings", href: "/public/rankings" },
];

export default function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
    <PublicAdSense />
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[52px] max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-8 lg:px-10">
        <Link href="/public" className="flex shrink-0 items-center gap-2" aria-label="Value90, inicio">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-black text-white">V</span>
          <span className="text-lg font-black tracking-tight text-slate-900">VALUE<span className="text-emerald-600">90</span></span>
        </Link>

        <nav className="hidden items-center gap-4 xl:flex" aria-label="Navegación principal">
          {navigation.map((item) => {
            const active = item.href === "/public" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap text-sm transition ${active ? "font-bold text-emerald-700" : "font-medium text-slate-600 hover:text-emerald-700"}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/login" className="hidden rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 sm:inline-flex">
            Acceder
          </Link>
          <button type="button" onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 xl:hidden"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={mobileMenuOpen} aria-controls="public-mobile-menu">
            <span aria-hidden="true" className="text-2xl leading-none">{mobileMenuOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav id="public-mobile-menu" className="border-t border-slate-200 bg-white px-4 py-3 sm:px-8 xl:hidden" aria-label="Navegación móvil">
          <div className="mx-auto flex max-w-[1440px] flex-col">
            {navigation.map((item) => {
              const active = item.href === "/public" ? pathname === item.href : pathname.startsWith(item.href);
              return <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} aria-current={active ? "page" : undefined}
                className={`border-b border-slate-100 py-3 text-sm last:border-0 ${active ? "font-bold text-emerald-700" : "font-medium text-slate-700"}`}>
                {item.label}
              </Link>;
            })}
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="mt-3 rounded-lg bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white sm:hidden">Acceder</Link>
          </div>
        </nav>
      )}
    </header>
    </>
  );
}
