"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DataTable from "@/components/shared/tables/DataTable";

import {
  getMatchRatings,
  type MatchRating,
} from "@/services/match-rating.service";

import { getMatches } from "@/services/match.service";
import { getPlayers } from "@/services/player.service";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import {
  getParticipations,
  type Participation,
} from "@/services/participation.service";

interface MatchRatingsTableProps {
  onEdit: (matchRating: MatchRating) => void;
  onDelete: (matchRating: MatchRating) => void;
}

export default function MatchRatingsTable({
  onEdit,
  onDelete,
}: MatchRatingsTableProps) {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [matchRatings, setMatchRatings] =
    useState<MatchRating[]>([]);

  const [matches, setMatches] =
    useState<
      Awaited<ReturnType<typeof getMatches>>
    >([]);

  const [players, setPlayers] =
    useState<
      Awaited<ReturnType<typeof getPlayers>>
    >([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [teamsLoading, setTeamsLoading] =
    useState(true);

  /*
   * ============================================================
   * BUSCADOR EXCLUSIVO DE JUGADORES
   * ============================================================
   */

  const [playerSearch, setPlayerSearch] =
    useState("");

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
          matchRatingsData,
          matchesData,
          playersData,
          teamsData,
          participationsData,
        ] = await Promise.all([
          getMatchRatings(),
          getMatches(),
          getPlayers(),
          getTeams(),
          getParticipations(),
        ]);

        if (!mounted) {
          return;
        }

        setMatchRatings(matchRatingsData);
        setMatches(matchesData);
        setPlayers(playersData);
        setTeams(teamsData);
        setParticipations(
          participationsData
        );
      } catch (error) {
        console.error(
          "Error cargando datos de valoraciones:",
          error
        );

        if (!mounted) {
          return;
        }

        setMatchRatings([]);
        setMatches([]);
        setPlayers([]);
        setTeams([]);
        setParticipations([]);
      } finally {
        if (mounted) {
          setTeamsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * FILTRAR POR NOMBRE DEL JUGADOR
   * ============================================================
   */

  const filteredMatchRatings =
    useMemo(() => {
      const search =
        playerSearch
          .trim()
          .toLocaleLowerCase("es");

      if (!search) {
        return matchRatings;
      }

      return matchRatings.filter(
        (matchRating) => {
          const player =
            players.find(
              (item) =>
                item.id ===
                matchRating.playerId
            );

          const playerName =
            player?.name
              ?.toLocaleLowerCase(
                "es"
              ) ?? "";

          return playerName.includes(
            search
          );
        }
      );
    }, [
      matchRatings,
      players,
      playerSearch,
    ]);

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
          row: { original: MatchRating };
        }) => {
          const match = matches.find(
            (item) =>
              item.id ===
              row.original.matchId
          );

          if (!match) {
            return "—";
          }

          if (teamsLoading) {
            return "Cargando...";
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

          return (
            <span className="whitespace-nowrap text-xs">
              {homeTeam?.shortName ?? "?"} -{" "}
              {awayTeam?.shortName ?? "?"}
            </span>
          );
        },

        meta: {
          className: "w-[110px]",
        },
      },

      /*
       * ========================================================
       * JUGADOR
       * ========================================================
       */

      {
        accessorKey: "playerId",

        header: "Jugador",

        cell: ({
          row,
        }: {
          row: { original: MatchRating };
        }) => {
          const player = players.find(
            (item) =>
              item.id ===
              row.original.playerId
          );

          return (
            <span className="whitespace-nowrap text-xs font-medium">
              {player?.name ??
                "Jugador no encontrado"}
            </span>
          );
        },

        meta: {
          className: "min-w-[130px]",
        },
      },

      /*
       * ========================================================
       * EQUIPO
       * ========================================================
       */

      {
        id: "team",

        header: "Equipo",

        accessorFn: (
          matchRating: MatchRating
        ) => {
          const participation =
            participations.find(
              (item) =>
                item.id ===
                matchRating.participationId
            );

          if (!participation) {
            return "";
          }

          const team = teams.find(
            (item) =>
              item.id ===
              participation.teamId
          );

          return (
            team?.shortName ??
            team?.name ??
            ""
          );
        },

        cell: ({
          row,
        }: {
          row: {
            original: MatchRating;
          };
        }) => {
          if (teamsLoading) {
            return "Cargando...";
          }

          const participation =
            participations.find(
              (item) =>
                item.id ===
                row.original
                  .participationId
            );

          if (!participation) {
            return "—";
          }

          const team = teams.find(
            (item) =>
              item.id ===
              participation.teamId
          );

          return (
            <span className="whitespace-nowrap text-xs">
              {team?.shortName ??
                team?.name ??
                "—"}
            </span>
          );
        },

        meta: {
          className: "w-[100px]",
        },
      },

      /*
       * ========================================================
       * MARCA
       * ========================================================
       */

      {
        accessorKey: "marcaRating",

        header: "Marca",

        cell: ({
          row,
        }: {
          row: { original: MatchRating };
        }) => (
          <span className="text-xs">
            {row.original.marcaRating ??
              "—"}
          </span>
        ),

        meta: {
          className: "w-[65px]",
        },
      },

      /*
       * ========================================================
       * AS
       * ========================================================
       */

      {
        accessorKey: "asRating",

        header: "AS",

        cell: ({
          row,
        }: {
          row: { original: MatchRating };
        }) => (
          <span className="text-xs">
            {row.original.asRating ??
              "—"}
          </span>
        ),

        meta: {
          className: "w-[55px]",
        },
      },

      /*
       * ========================================================
       * SOFASCORE
       * ========================================================
       */

      {
        accessorKey: "sofascoreRating",

        header: "SofaScore",

        cell: ({
          row,
        }: {
          row: { original: MatchRating };
        }) => (
          <span className="text-xs">
            {row.original
              .sofascoreRating ??
              "—"}
          </span>
        ),

        meta: {
          className: "w-[80px]",
        },
      },

      /*
       * ========================================================
       * FLASHSCORE
       * ========================================================
       */

      {
        accessorKey: "flashscoreRating",

        header: "FlashScore",

        cell: ({
          row,
        }: {
          row: { original: MatchRating };
        }) => (
          <span className="text-xs">
            {row.original
              .flashscoreRating ??
              "—"}
          </span>
        ),

        meta: {
          className: "w-[80px]",
        },
      },

      /*
       * ========================================================
       * MEDIA EXTERNA
       * ========================================================
       */

      {
        accessorKey: "externalAverage",

        header: "Media externa",

        cell: ({
          row,
        }: {
          row: { original: MatchRating };
        }) => (
          <span className="text-xs font-semibold">
            {row.original.externalAverage !==
              null &&
            row.original.externalAverage !==
              undefined
              ? row.original.externalAverage.toFixed(
                  3
                )
              : "—"}
          </span>
        ),

        meta: {
          className: "w-[90px]",
        },
      },

      /*
       * ========================================================
       * V90 PARTIDO
       * ========================================================
       */

      {
        accessorKey:
          "value90MatchRating",

        header: "V90 partido",

        cell: ({
          row,
        }: {
          row: { original: MatchRating };
        }) => (
          <span className="text-xs">
            {row.original
              .value90MatchRating !==
              null &&
            row.original
              .value90MatchRating !==
              undefined
              ? row.original.value90MatchRating.toFixed(
                  2
                )
              : "—"}
          </span>
        ),

        meta: {
          className: "w-[85px]",
        },
      },

      /*
       * ========================================================
       * VALORACIÓN FINAL
       * ========================================================
       */

      {
        accessorKey: "finalMatchRating",

        header: "Valoración final",

        cell: ({
          row,
        }: {
          row: { original: MatchRating };
        }) => (
          <span className="text-xs">
            {row.original
              .finalMatchRating !==
              null &&
            row.original
              .finalMatchRating !==
              undefined
              ? row.original.finalMatchRating.toFixed(
                  2
                )
              : "—"}
          </span>
        ),

        meta: {
          className: "w-[95px]",
        },
      },

      /*
       * ========================================================
       * CONFIANZA
       * ========================================================
       */

      {
        accessorKey: "confidence",

        header: "Confianza",

        cell: ({
          row,
        }: {
          row: { original: MatchRating };
        }) => (
          <span className="text-xs">
            {row.original.confidence !==
              null &&
            row.original.confidence !==
              undefined
              ? row.original.confidence.toFixed(
                  2
                )
              : "—"}
          </span>
        ),

        meta: {
          className: "w-[75px]",
        },
      },

      /*
       * ========================================================
       * ACCIONES
       * ========================================================
       */

      {
        id: "actions",

        header: "Acciones",

        enableSorting: false,

        cell: ({
          row,
        }: {
          row: { original: MatchRating };
        }) => (
          <div className="flex items-center gap-1 whitespace-nowrap">

            <button
              type="button"
              onClick={() =>
                onEdit(row.original)
              }
              className="rounded-md bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() =>
                onDelete(row.original)
              }
              className="rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Eliminar
            </button>

          </div>
        ),

        meta: {
          className: "w-[130px]",
        },
      },
    ],
    [
      onEdit,
      onDelete,
      matches,
      players,
      teams,
      participations,
      teamsLoading,
    ]
  );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 space-y-4">

      {/* ======================================================
          BUSCADOR
          ====================================================== */}

      <div className="flex w-full min-w-0 items-center justify-between">

        <input
          type="text"
          placeholder="Buscar jugador..."
          value={playerSearch}
          onChange={(event) =>
            setPlayerSearch(
              event.target.value
            )
          }
          className="w-full min-w-0 max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
        />

      </div>

      {/* ======================================================
          TABLA
          ====================================================== */}

      <div className="w-full min-w-0 overflow-hidden [&_th]:whitespace-nowrap [&_th]:px-2 [&_th]:py-2.5 [&_th]:text-xs [&_td]:whitespace-nowrap [&_td]:px-2 [&_td]:py-2.5 sm:[&_th]:px-3 sm:[&_th]:py-3 sm:[&_td]:px-3 sm:[&_td]:py-3">
        <DataTable
          columns={columns}
          data={filteredMatchRatings}
          showSearch={false}
          initialSorting={[
            {
              id: "externalAverage",
              desc: true,
            },
          ]}
        />
      </div>

    </div>
  );
}