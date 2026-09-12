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
  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [matches, setMatches] =
    useState<Awaited<ReturnType<typeof getMatches>>>([]);

  const [players, setPlayers] =
    useState<Awaited<ReturnType<typeof getPlayers>>>([]);

  const { teams } = useTeams();

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

        if (!mounted) return;

        setParticipations(participationsData);
        setMatches(matchesData);
        setPlayers(playersData);
      } catch (error) {
        console.error(
          "Error cargando datos de participaciones:",
          error
        );

        if (!mounted) return;

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

  const columns = useMemo(
    () => [
      {
        accessorKey: "matchId",
        header: "Partido",
        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => {
          const match = matches.find(
            (item) => item.id === row.original.matchId
          );

          if (!match) return "Partido no encontrado";

          const homeTeam = teams.find(
            (team) => team.id === match.homeTeamId
          );

          const awayTeam = teams.find(
            (team) => team.id === match.awayTeamId
          );

          return `${homeTeam?.shortName ?? "?"} - ${
            awayTeam?.shortName ?? "?"
          }`;
        },
        meta: {
          className: "min-w-[180px]",
        },
      },

      {
        id: "playerName",
        accessorFn: (participation: Participation) => {
          const player = players.find(
            (item) => item.id === participation.playerId
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
            (item) => item.id === row.original.playerId
          );

          return player?.name ?? "Jugador no encontrado";
        },
        meta: {
          className: "min-w-[170px]",
        },
      },

      {
        accessorKey: "teamId",
        header: "Equipo",
        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => {
          const team = teams.find(
            (team) => team.id === row.original.teamId
          );

          return team?.shortName ?? "?";
        },
        meta: {
          className: "min-w-[130px]",
        },
      },

      {
        accessorKey: "positionId",
        header: "Posición",
        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => row.original.positionId,
        meta: {
          className: "w-[90px]",
        },
      },

      {
        accessorKey: "shirtNumber",
        header: "Dorsal",
        meta: {
          className: "w-[80px]",
        },
      },

      {
        accessorKey: "isStartingXI",
        header: "Titular",
        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => (row.original.isStartingXI ? "Sí" : "No"),
        meta: {
          className: "w-[85px]",
        },
      },

      {
        accessorKey: "minutesPlayed",
        header: "Minutos",
        meta: {
          className: "w-[90px]",
        },
      },

      {
        accessorKey: "captain",
        header: "Capitán",
        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => (row.original.captain ? "Sí" : "No"),
        meta: {
          className: "w-[90px]",
        },
      },

      {
        accessorKey: "substituteInMinute",
        header: "Entrada",
        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => row.original.substituteInMinute ?? "—",
        meta: {
          className: "w-[90px]",
        },
      },

      {
        accessorKey: "substituteOutMinute",
        header: "Salida",
        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => row.original.substituteOutMinute ?? "—",
        meta: {
          className: "w-[90px]",
        },
      },

      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        cell: ({
          row,
        }: {
          row: { original: Participation };
        }) => (
          <div className="flex items-center gap-1 whitespace-nowrap">
            <button
              type="button"
              onClick={() => onEdit(row.original)}
              className="rounded-md bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 sm:px-3 sm:py-2 sm:text-sm"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() => onDelete(row.original)}
              className="rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 sm:px-3 sm:py-2 sm:text-sm"
            >
              Eliminar
            </button>
          </div>
        ),
        meta: {
          className: "min-w-[145px]",
        },
      },
    ],
    [onEdit, onDelete, matches, players, teams]
  );

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="w-full min-w-0 overflow-hidden [&_th]:whitespace-nowrap [&_th]:px-2 [&_th]:py-3 [&_th]:text-xs [&_td]:whitespace-nowrap [&_td]:px-2 [&_td]:py-3 sm:[&_th]:px-3 sm:[&_td]:px-3">
        <DataTable
          columns={columns}
          data={participations}
        />
      </div>
    </div>
  );
}
