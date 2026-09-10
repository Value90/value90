"use client";

import { useEffect, useState } from "react";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import AdminContent from "@/components/layout/AdminContent";

export default function Home() {
  /*
   * ============================================================
   * PÁGINA ACTUAL
   * ============================================================
   */

  const [page, setPage] =
    useState("dashboard");

  /*
   * ============================================================
   * EQUIPO A EDITAR
   *
   * ProgresoPage enviará el ID del equipo mediante
   * el evento "edit-team".
   * ============================================================
   */

  const [editTeamId, setEditTeamId] =
    useState<number | null>(null);

  /*
   * ============================================================
   * ESCUCHAR PETICIÓN DE EDITAR EQUIPO
   * ============================================================
   */

  useEffect(() => {
    const handleEditTeam = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          teamId: number;
        }>;

      const teamId =
        customEvent.detail?.teamId;

      if (
        teamId === undefined ||
        teamId === null
      ) {
        return;
      }

      /*
       * Guardamos el equipo que queremos editar.
       */

      setEditTeamId(teamId);

      /*
       * Cambiamos automáticamente
       * a la página Equipos.
       */

      setPage("teams");
    };

    window.addEventListener(
      "edit-team",
      handleEditTeam
    );

    return () => {
      window.removeEventListener(
        "edit-team",
        handleEditTeam
      );
    };
  }, []);

  /*
   * ============================================================
   * CUANDO TEAMSPAGE HA RECIBIDO EL ID
   * ============================================================
   */

  const handleEditTeamHandled = () => {
    setEditTeamId(null);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="flex h-screen flex-col">

      {/* ======================================================
          CABECERA FIJA
          ====================================================== */}

      <Header />

      {/* ======================================================
          ZONA INFERIOR
          ====================================================== */}

      <div className="flex min-h-0 flex-1">

        {/* ====================================================
            SIDEBAR
            ==================================================== */}

        <Sidebar
          page={page}
          setPage={(newPage) => {
            /*
             * Si el usuario navega manualmente a otra
             * sección, eliminamos cualquier equipo pendiente
             * de edición.
             */

            setEditTeamId(null);

            setPage(newPage);
          }}
        />

        {/* ====================================================
            CONTENIDO
            ==================================================== */}

        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-100">

          <AdminContent
            page={page}
            editTeamId={editTeamId}
            onEditTeamHandled={
              handleEditTeamHandled
            }
          />

        </main>

      </div>

    </div>
  );
}