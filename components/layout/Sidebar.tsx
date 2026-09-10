"use client";

import { useEffect } from "react";

interface SidebarProps {
  page: string;
  setPage: (page: string) => void;
}

export default function Sidebar({
  page,
  setPage,
}: SidebarProps) {

  /*
   * ============================================================
   * NAVEGACIÓN DESDE COMPONENTES INTERNOS
   * ============================================================
   *
   * Permite que componentes como TeamsPage puedan solicitar
   * una navegación sin duplicar la lógica principal de páginas.
   * ============================================================
   */

  useEffect(() => {
    const handleNavigatePage = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          page?: string;
        }>;

      const targetPage =
        customEvent.detail?.page;

      if (!targetPage) {
        return;
      }

      setPage(targetPage);
    };

    window.addEventListener(
      "navigate-page",
      handleNavigatePage
    );

    return () => {
      window.removeEventListener(
        "navigate-page",
        handleNavigatePage
      );
    };
  }, [setPage]);

  /*
   * ============================================================
   * MENÚ
   * ============================================================
   */

  const menu = [
    { id: "dashboard", label: "Dashboard" },

    { id: "progreso", label: "Progreso" },

    { id: "stages", label: "Jornadas / Fases" },
    { id: "matches", label: "Partidos" },
    { id: "participations", label: "Participaciones" },

    {
      id: "player-match-stats",
      label: "PlayerMatchStats",
    },

    {
      id: "match-ratings",
      label: "Valoraciones",
    },

    { id: "datos-v90", label: "Datos V90" },

    { id: "rankings", label: "Rankings" },
    { id: "market", label: "Mercado" },

    { id: "players", label: "Jugadores" },
    { id: "teams", label: "Equipos" },

    { id: "countries", label: "Países" },
    { id: "competitions", label: "Competiciones" },
    { id: "seasons", label: "Temporadas" },
    { id: "positions", label: "Posiciones" },

    { id: "settings", label: "Configuración" },
  ];

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <aside className="h-full w-64 shrink-0 overflow-y-auto bg-slate-800 text-white">

      <nav className="flex flex-col gap-1 p-3">

        {menu.map((item) => (
          <div
            key={item.id}
            onClick={() =>
              setPage(item.id)
            }
            className={`cursor-pointer rounded-lg p-3 transition ${
              page === item.id
                ? "bg-slate-700"
                : "hover:bg-slate-700"
            }`}
          >
            {item.label}
          </div>
        ))}

      </nav>

    </aside>
  );
}