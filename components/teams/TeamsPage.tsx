"use client";

import { useEffect, useState } from "react";

import TeamsTable from "@/components/teams/TeamsTable";
import TeamForm from "@/components/teams/TeamForm";
import DeleteTeamDialog from "@/components/teams/DeleteTeamDialog";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

interface TeamsPageProps {
  editTeamId?: number | null;
  onEditTeamHandled?: () => void;
}

export default function TeamsPage({
  editTeamId = null,
  onEditTeamHandled,
}: TeamsPageProps) {
  const [showForm, setShowForm] =
    useState(false);

  const [editingTeam, setEditingTeam] =
    useState<Team | undefined>(undefined);

  const [teamToDelete, setTeamToDelete] =
    useState<Team | undefined>(undefined);

  const [teams, setTeams] =
    useState<Team[]>([]);

  /*
   * ============================================================
   * CARGAR EQUIPOS
   * ============================================================
   */

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await getTeams();

        setTeams(data);
      } catch (error) {
        console.error(
          "Error cargando equipos:",
          error
        );
      }
    }

    loadTeams();
  }, []);

  /*
   * ============================================================
   * ABRIR EQUIPO DESDE PROGRESO
   * ============================================================
   */

  useEffect(() => {
    if (
      editTeamId === null ||
      editTeamId === undefined
    ) {
      return;
    }

    const team = teams.find(
      (item) => item.id === editTeamId
    );

    if (!team) {
      return;
    }

    setEditingTeam(team);
    setShowForm(true);

    onEditTeamHandled?.();
  }, [
    editTeamId,
    teams,
    onEditTeamHandled,
  ]);

  /*
   * ============================================================
   * NUEVO EQUIPO
   * ============================================================
   */

  const handleNewTeam = () => {
    setEditingTeam(undefined);
    setShowForm(true);
  };

  /*
   * ============================================================
   * HISTORIAL DE EQUIPOS
   * ============================================================
   */

  const handleTeamHistory = () => {
    window.dispatchEvent(
      new CustomEvent("navigate-page", {
        detail: {
          page: "hist-player-teams",
        },
      })
    );
  };

  /*
   * ============================================================
   * EDITAR EQUIPO DESDE LA TABLA
   * ============================================================
   */

  const handleEditTeam = (
    team: Team
  ) => {
    setEditingTeam(team);
    setShowForm(true);
  };

  /*
   * ============================================================
   * CERRAR FORMULARIO
   * ============================================================
   */

  const handleCloseForm = () => {
    setEditingTeam(undefined);
    setShowForm(false);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 p-3 sm:p-5 md:p-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-5 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">

        <div className="min-w-0">

          <h1 className="text-2xl font-bold sm:text-3xl">
            Equipos
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Gestión de equipos de Value90
          </p>

        </div>

        {!showForm && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">

            {/* NUEVO EQUIPO */}

            <button
              type="button"
              onClick={handleNewTeam}
              className="w-full rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
            >
              + Nuevo equipo
            </button>

            {/* HISTORIAL EQUIPOS */}

            <button
              type="button"
              onClick={handleTeamHistory}
              className="w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:w-auto"
            >
              Historial equipos
            </button>

          </div>
        )}

      </div>

      {/* ======================================================
          CONTADOR
          ====================================================== */}

      {!showForm && (
        <p className="mb-5 text-sm text-slate-700 sm:mb-6 sm:text-base">
          Total de equipos:{" "}

          <span className="font-semibold">
            {teams.length}
          </span>
        </p>
      )}

      {/* ======================================================
          FORMULARIO / TABLA
          ====================================================== */}

      <div className="w-full min-w-0">

        {showForm ? (
          <TeamForm
            team={editingTeam}
            onCancel={handleCloseForm}
          />
        ) : (
          <TeamsTable
            onEdit={handleEditTeam}
            onDelete={setTeamToDelete}
          />
        )}

      </div>

      {/* ======================================================
          DIÁLOGO DE ELIMINACIÓN
          ====================================================== */}

      {teamToDelete && (
        <DeleteTeamDialog
          team={teamToDelete}
          onCancel={() =>
            setTeamToDelete(undefined)
          }
        />
      )}

    </div>
  );
}