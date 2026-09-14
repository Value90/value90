"use client";

import { useEffect, useState } from "react";

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
   * ESTADO DEL MENÚ MÓVIL
   * ============================================================
   */

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

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

      // Si estamos en móvil, cerramos el menú.
      setMobileMenuOpen(false);
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
   * CERRAR CON ESC
   * ============================================================
   */

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape" &&
        mobileMenuOpen
      ) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [mobileMenuOpen]);

  /*
   * ============================================================
   * BLOQUEAR SCROLL DEL BODY EN MÓVIL
   * ============================================================
   */

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  /*
   * ============================================================
   * NAVEGACIÓN
   * ============================================================
   */

  const handlePageChange = (
    targetPage: string
  ) => {
    setPage(targetPage);

    // En móvil cerramos el menú después de navegar.
    setMobileMenuOpen(false);
  };

  /*
   * ============================================================
   * MENÚ
   * ============================================================
   */

  const menu = [
    {
      id: "dashboard",
      label: "Dashboard",
    },

    {
      id: "progreso",
      label: "Progreso",
    },

    {
      id: "matches",
      label: "Partidos",
    },

    {
      id: "participations",
      label: "Participaciones",
    },

    {
      id: "player-match-stats",
      label: "PlayerMatchStats",
    },

    {
      id: "match-ratings",
      label: "Valoraciones",
    },

    {
      id: "datos-v90",
      label: "Datos V90",
    },

    {
      id: "rankings",
      label: "Rankings",
    },

    {
      id: "market",
      label: "Mercado",
    },

    {
      id: "players",
      label: "Jugadores",
    },

    {
      id: "teams",
      label: "Equipos",
    },

    {
      id: "countries",
      label: "Países",
    },

    {
      id: "stages",
      label: "Jornadas / Fases",
    },

    {
      id: "competitions",
      label: "Competiciones",
    },

    {
      id: "seasons",
      label: "Temporadas",
    },

    {
      id: "positions",
      label: "Posiciones",
    },

    {
      id: "settings",
      label: "Configuración",
    },
  ];

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <>
      {/* ========================================================
          BOTÓN MENÚ MÓVIL
          ======================================================== */}

      <button
        type="button"
        onClick={() =>
          setMobileMenuOpen(
            !mobileMenuOpen
          )
        }
        aria-label={
          mobileMenuOpen
            ? "Cerrar menú"
            : "Abrir menú"
        }
        aria-expanded={mobileMenuOpen}
        className="fixed left-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-xl text-white shadow-lg transition hover:bg-slate-700 md:hidden"
      >
        {mobileMenuOpen ? "×" : "☰"}
      </button>

      {/* ========================================================
          FONDO OSCURO MÓVIL
          ======================================================== */}

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() =>
            setMobileMenuOpen(false)
          }
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* ========================================================
          SIDEBAR
          ======================================================== */}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          h-full
          w-64
          shrink-0
          overflow-y-auto
          bg-slate-800
          text-white
          shadow-xl
          transition-transform
          duration-200
          ease-out

          md:relative
          md:z-auto
          md:w-64
          md:translate-x-0
          md:shadow-none

          ${
            mobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* ======================================================
            CABECERA DEL SIDEBAR EN MÓVIL
            ====================================================== */}

        <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-800 px-4 py-4 md:hidden">
          <div className="pl-14">
            <div className="text-lg font-bold">
              Value90
            </div>

            <div className="text-xs text-slate-400">
              Panel de administración
            </div>
          </div>
        </div>

        {/* ======================================================
            NAVEGACIÓN
            ====================================================== */}

        <nav className="flex flex-col gap-1 p-3">

          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                handlePageChange(
                  item.id
                )
              }
              className={`
                w-full
                cursor-pointer
                rounded-lg
                p-3
                text-left
                text-sm
                transition

                ${
                  page === item.id
                    ? "bg-slate-700 text-white"
                    : "text-slate-200 hover:bg-slate-700 hover:text-white"
                }
              `}
            >
              {item.label}
            </button>
          ))}

        </nav>
      </aside>
    </>
  );
}