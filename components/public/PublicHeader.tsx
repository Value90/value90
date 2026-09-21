"use client";

import { useState } from "react";

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { label: "Inicio", href: "/public" },
    { label: "Jugadores", href: "#jugadores" },
    { label: "Equipos", href: "#equipos" },
    { label: "Partidos", href: "#partidos" },
    { label: "Competiciones", href: "#competiciones" },
    { label: "Rankings", href: "#rankings" },
    { label: "Estadísticas", href: "#estadisticas" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">

        {/* LOGO */}
        <a
          href="/public"
          className="group flex items-center gap-2"
          aria-label="Value90 inicio"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-black tracking-tight text-white transition group-hover:bg-emerald-700">
            V
          </div>

          <div className="leading-none">
            <div className="text-[21px] font-extrabold tracking-[-0.04em] text-slate-900">
              VALUE<span className="text-emerald-600">90</span>
            </div>

            <div className="mt-1 hidden text-[8px] font-semibold tracking-[0.16em] text-slate-400 sm:block">
              FOOTBALL DATA & PLAYER VALUE
            </div>
          </div>
        </a>

        {/* DESKTOP NAVIGATION */}
        <nav className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`text-sm font-medium transition ${
                item.label === "Inicio"
                  ? "font-semibold text-emerald-600"
                  : "text-slate-600 hover:text-emerald-600"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* RIGHT ACTIONS */}
        <div className="hidden items-center gap-3 lg:flex">

          {/* SEARCH */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Buscar"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
          </button>

          {/* DARK MODE */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Cambiar tema"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          </button>

          {/* LOGIN */}
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Acceder
          </button>
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menú"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* MOBILE NAVIGATION */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <nav className="mx-auto flex max-w-[1440px] flex-col px-5 py-4 sm:px-8">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="border-b border-slate-100 py-3 text-sm font-medium text-slate-700 last:border-b-0 hover:text-emerald-600"
              >
                {item.label}
              </a>
            ))}

            <button
              type="button"
              className="mt-4 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Acceder
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}