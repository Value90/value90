"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DataTable from "@/components/shared/tables/DataTable";

import {
  getParticipations,
  type Participation,
} from "@/services/participation.service";

import { getMatches } from "@/services/match.service";
import { getPlayers } from "@/services/player.service";

import { useTeams } from "@/hooks/useTeams";

interface ParticipationsTableProps {
  onEdit: (participation: Participation) => void;
  onDelete: (participation: Participation) => void;
}

export default function ParticipationsTable({
  onEdit,
  onDelete,
}: ParticipationsTableProps) {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [matches, setMatches] =
    useState<
      Awaited<ReturnType<typeof getMatches>>
    >([]);

  const [players, setPlayers] =
    useState<
      Awaited<ReturnType<typeof getPlayers>>
    >([]);

  /*
   * ============================================================
   * EQUIPOS
   * ============================================================
   */

  const { teams } = useTeams();

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [
          participationsData,
          matchesData,
          playersData,
        ] = await Promise.all([
          getParticipations(),
          getMatches(),
          getPlayers(),
        ]);

        if (!mounted) {
          return;
        }

        setParticipations(
          participationsData
        );

        setMatches(matchesData);

        setPlayers(playersData);
      } catch (error) {
        console.error(
          "Error cargando datos de participaciones:",
          error
        );

        if (!mounted) {
          return;
        }

        setParticipations([]);
        setMatches([]);
        setPlayers([]);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * COLUMNAS
   * ============================================================
   */

  const columns = useMemo(
    () => [
      /*
       * ========================================================
       * PARTIDO
       * ========================================================
       */

      {
        accessorKey: "matchId",

        header: "Partido",

        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => {
          const match = matches.find(
            (item) =>
              item.id ===
              row.original.matchId
          );

          if (!match) {
            return "Partido no encontrado";
          }

          const homeTeam = teams.find(
            (team) =>
              team.id ===
              match.homeTeamId
          );

          const awayTeam = teams.find(
            (team) =>
              team.id ===
              match.awayTeamId
          );

          return `${homeTeam?.shortName ?? "?"} - ${
            awayTeam?.shortName ?? "?"
          }`;
        },
      },

      /*
       * ========================================================
       * JUGADOR
       *
       * IMPORTANTE:
       * accessorFn hace que el buscador de DataTable
       * busque por el nombre del jugador y no por playerId.
       * ========================================================
       */

      {
        id: "playerName",

        accessorFn: (
          participation: Participation
        ) => {
          const player = players.find(
            (item) =>
              item.id ===
              participation.playerId
          );

          return player?.name ?? "";
        },

        header: "Jugador",

        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => {
          const player = players.find(
            (item) =>
              item.id ===
              row.original.playerId
          );

          return (
            player?.name ??
            "Jugador no encontrado"
          );
        },
      },

      /*
       * ========================================================
       * EQUIPO
       * ========================================================
       */

      {
        accessorKey: "teamId",

        header: "Equipo",

        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => {
          const team = teams.find(
            (team) =>
              team.id ===
              row.original.teamId
          );

          return (
            team?.shortName ?? "?"
          );
        },
      },

      /*
       * ========================================================
       * POSICIÓN
       * ========================================================
       */

      {
        accessorKey: "positionId",

        header: "Posición",

        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) =>
          row.original.positionId,
      },

      /*
       * ========================================================
       * DORSAL
       * ========================================================
       */

      {
        accessorKey: "shirtNumber",

        header: "Dorsal",
      },

      /*
       * ========================================================
       * TITULAR
       * ========================================================
       */

      {
        accessorKey: "isStartingXI",

        header: "Titular",

        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) =>
          row.original.isStartingXI
            ? "Sí"
            : "No",
      },

      /*
       * ========================================================
       * MINUTOS
       * ========================================================
       */

      {
        accessorKey: "minutesPlayed",

        header: "Minutos",
      },

      /*
       * ========================================================
       * CAPITÁN
       * ========================================================
       */

      {
        accessorKey: "captain",

        header: "Capitán",

        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) =>
          row.original.captain
            ? "Sí"
            : "No",
      },

      /*
       * ========================================================
       * ENTRADA
       * ========================================================
       */

      {
        accessorKey:
          "substituteInMinute",

        header: "Entrada",

        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) =>
          row.original
            .substituteInMinute ??
          "—",
      },

      /*
       * ========================================================
       * SALIDA
       * ========================================================
       */

      {
        accessorKey:
          "substituteOutMinute",

        header: "Salida",

        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) =>
          row.original
            .substituteOutMinute ??
          "—",
      },

      /*
       * ========================================================
       * ACCIONES
       * ========================================================
       */

      {
        id: "actions",

        header: "Acciones",

        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                onEdit(row.original)
              }
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() =>
                onDelete(row.original)
              }
              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Eliminar
            </button>
          </div>
        ),
      },
    ],
    [
      onEdit,
      onDelete,
      matches,
      players,
      teams,
    ]
  );

  /*
   * ============================================================
   * TABLA
   * ============================================================
   */

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={participations}
      />
    </div>
  );
}