"use client";

import { useEffect, useState } from "react";

interface SidebarProps {
  page: string;
  setPage: (page: string) => void;
  onLogout: () => void;
  loggingOut?: boolean;
}

const configurationItems = [
  { id: "settings", label: "General" },
  { id: "countries", label: "Países" },
  { id: "stages", label: "Jornadas / Fases" },
  { id: "competitions", label: "Competiciones" },
  { id: "seasons", label: "Temporadas" },
  { id: "positions", label: "Posiciones" },
];
const configurationPages = ["settings", ...configurationItems.map((item) => item.id)];

export default function Sidebar({
  page,
  setPage,
  onLogout,
  loggingOut = false,
}: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [configurationOpen, setConfigurationOpen] = useState(
    configurationPages.includes(page)
  );

  useEffect(() => {
    const handleNavigatePage = (event: Event) => {
      const customEvent = event as CustomEvent<{ page?: string }>;
      const targetPage = customEvent.detail?.page;

      if (!targetPage) return;

      setPage(targetPage);
      setMobileMenuOpen(false);
    };

    window.addEventListener("navigate-page", handleNavigatePage);
    return () => window.removeEventListener("navigate-page", handleNavigatePage);
  }, [setPage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mobileMenuOpen) setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (configurationPages.includes(page)) setConfigurationOpen(true);
  }, [page]);

  const handlePageChange = (targetPage: string) => {
    setPage(targetPage);
    setMobileMenuOpen(false);
  };

  const menu = [
    { id: "dashboard", label: "Dashboard" },
    { id: "progreso", label: "Progreso" },
    { id: "matches", label: "Partidos" },
    { id: "match-data", label: "Datos del partido" },
    { id: "participations", label: "Participaciones" },
    { id: "player-match-stats", label: "PlayerMatchStats" },
    { id: "match-ratings", label: "Valoraciones" },
    { id: "datos-v90", label: "Datos V90" },
    { id: "rankings", label: "Rankings" },
    { id: "market", label: "Mercado" },
    { id: "players", label: "Jugadores" },
    { id: "teams", label: "Equipos" },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={mobileMenuOpen}
        className="fixed left-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-xl text-white shadow-lg transition hover:bg-slate-700 md:hidden"
      >
        {mobileMenuOpen ? "×" : "☰"}
      </button>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-full w-64 shrink-0 overflow-y-auto bg-slate-800 text-white shadow-xl transition-transform duration-200 ease-out md:relative md:z-auto md:w-64 md:translate-x-0 md:shadow-none ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-800 px-4 py-4 md:hidden">
          <div className="pl-14">
            <div className="text-lg font-bold">Value90</div>
            <div className="text-xs text-slate-400">Panel de administración</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-3" aria-label="Navegación de administración">
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handlePageChange(item.id)}
              aria-current={page === item.id ? "page" : undefined}
              className={`w-full cursor-pointer rounded-lg p-3 text-left text-sm transition ${
                page === item.id
                  ? "bg-slate-700 text-white"
                  : "text-slate-200 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}

          <div>
            <button
              type="button"
              onClick={() => {
                setConfigurationOpen((open) => !open);
              }}
              aria-expanded={configurationOpen}
              className={`flex w-full items-center justify-between rounded-lg p-3 text-left text-sm transition ${
                configurationPages.includes(page)
                  ? "bg-slate-700 text-white"
                  : "text-slate-200 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <span>Configuración</span>
              <span aria-hidden="true" className="text-xs">{configurationOpen ? "▲" : "▼"}</span>
            </button>
            {configurationOpen && (
              <div className="ml-3 mt-1 space-y-1 border-l border-slate-600 pl-3">
                {configurationItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePageChange(item.id)}
                    aria-current={page === item.id ? "page" : undefined}
                    className={`w-full rounded-lg p-3 text-left text-sm transition ${
                      page === item.id
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="border-t border-slate-700 p-3">
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="w-full rounded-lg border border-red-400/40 px-3 py-3 text-left text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>
    </>
  );
}