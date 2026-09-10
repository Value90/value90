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
   *
   * Navegamos a la página existente:
   *
   * hist-player-teams
   *
   * El Sidebar escucha este evento y cambia la página.
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
    <div className="w-full p-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-8 flex items-start justify-between">

        <div>

          <h1 className="text-3xl font-bold">
            Equipos
          </h1>

          <p className="mt-2 text-slate-600">
            Gestión de equipos de Value90
          </p>

        </div>

        {!showForm && (
          <div className="flex items-center gap-3">

            {/* NUEVO EQUIPO */}

            <button
              type="button"
              onClick={handleNewTeam}
              className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              + Nuevo equipo
            </button>

            {/* HISTORIAL EQUIPOS */}

            <button
              type="button"
              onClick={handleTeamHistory}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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
        <p className="mb-6 text-slate-700">
          Total de equipos:{" "}

          <span className="font-semibold">
            {teams.length}
          </span>
        </p>
      )}

      {/* ======================================================
          FORMULARIO / TABLA
          ====================================================== */}

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