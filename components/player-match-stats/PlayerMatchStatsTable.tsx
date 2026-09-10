"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DataTable from "@/components/shared/tables/DataTable";

import {
  getPlayerMatchStats,
  type PlayerMatchStat,
} from "@/services/player-match-stat.service";

import { getMatches } from "@/services/match.service";
import { getPlayers } from "@/services/player.service";
import { getTeams } from "@/services/team.service";
import { getParticipations } from "@/services/participation.service";

interface PlayerMatchStatsTableProps {
  onEdit: (
    playerMatchStat: PlayerMatchStat
  ) => void;

  onDelete: (
    playerMatchStat: PlayerMatchStat
  ) => void;
}

type Category =
  | "Ofensivas"
  | "Defensivas"
  | "Distribución";

export default function PlayerMatchStatsTable({
  onEdit,
  onDelete,
}: PlayerMatchStatsTableProps) {
  const [
    playerMatchStats,
    setPlayerMatchStats,
  ] = useState<PlayerMatchStat[]>([]);

  const [matches, setMatches] =
    useState<
      Awaited<
        ReturnType<typeof getMatches>
      >
    >([]);

  const [players, setPlayers] =
    useState<
      Awaited<
        ReturnType<typeof getPlayers>
      >
    >([]);

  const [teams, setTeams] =
    useState<
      Awaited<
        ReturnType<typeof getTeams>
      >
    >([]);

  const [
    participations,
    setParticipations,
  ] = useState<
    Awaited<
      ReturnType<
        typeof getParticipations
      >
    >
  >([]);

  const [category, setCategory] =
    useState<Category>(
      "Ofensivas"
    );

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [
          statsData,
          matchesData,
          playersData,
          teamsData,
          participationsData,
        ] = await Promise.all([
          getPlayerMatchStats(),
          getMatches(),
          getPlayers(),
          getTeams(),
          getParticipations(),
        ]);

        if (!mounted) {
          return;
        }

        setPlayerMatchStats(
          statsData
        );

        setMatches(matchesData);
        setPlayers(playersData);
        setTeams(teamsData);
        setParticipations(
          participationsData
        );
      } catch (error) {
        console.error(
          "Error cargando estadísticas:",
          error
        );

        if (!mounted) {
          return;
        }

        setPlayerMatchStats([]);
        setMatches([]);
        setPlayers([]);
        setTeams([]);
        setParticipations([]);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * COLUMNAS BASE
   * ============================================================
   */

  const baseColumns = useMemo(
    () => [
      {
        id: "match",

        header: "Partido",

        cell: ({
          row,
        }: {
          row: {
            original: PlayerMatchStat;
          };
        }) => {
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

          const match =
            matches.find(
              (item) =>
                item.id ===
                participation.matchId
            );

          if (!match) {
            return "—";
          }

          const homeTeam =
            teams.find(
              (team) =>
                team.id ===
                match.homeTeamId
            );

          const awayTeam =
            teams.find(
              (team) =>
                team.id ===
                match.awayTeamId
            );

          return (
            <div className="text-center">
              {homeTeam?.shortName ??
                "?"}{" "}
              -{" "}
              {awayTeam?.shortName ??
                "?"}
            </div>
          );
        },
      },

      {
        id: "player",

        header: "Jugador",

        cell: ({
          row,
        }: {
          row: {
            original: PlayerMatchStat;
          };
        }) => {
          const participation =
            participations.find(
              (item) =>
                item.id ===
                row.original
                  .participationId
            );

          const player =
            players.find(
              (item) =>
                item.id ===
                participation?.playerId
            );

          return (
            <div className="text-center">
              {player?.name ?? "—"}
            </div>
          );
        },
      },
    ],
    [
      participations,
      matches,
      players,
      teams,
    ]
  );

  /*
   * ============================================================
   * CAMPOS POR CATEGORÍA
   * ============================================================
   */

  const categoryColumns =
    useMemo(() => {
      const numberColumn = (
        accessorKey: keyof PlayerMatchStat,
        header: string
      ) => ({
        accessorKey,
        header,

        cell: ({
          row,
        }: {
          row: {
            original: PlayerMatchStat;
          };
        }) => (
          <div className="text-center font-medium text-slate-700">
            {row.original[
              accessorKey
            ] ?? "—"}
          </div>
        ),
      });

      if (
        category ===
        "Ofensivas"
      ) {
        return [
          numberColumn(
            "goals",
            "Goles"
          ),
          numberColumn(
            "shots",
            "Tiros"
          ),
          numberColumn(
            "shotsOnTarget",
            "Tiros a puerta"
          ),
          numberColumn(
            "dribbles",
            "Regates"
          ),
          numberColumn(
            "dribblesCompleted",
            "Regates completados"
          ),
          numberColumn(
            "assists",
            "Asistencias"
          ),
        ];
      }

      if (
        category ===
        "Defensivas"
      ) {
        return [
          numberColumn(
            "duels",
            "Duelos"
          ),
          numberColumn(
            "duelsWon",
            "Duelos ganados"
          ),
          numberColumn(
            "clearances",
            "Despejes"
          ),
          numberColumn(
            "saves",
            "Paradas"
          ),
          numberColumn(
            "tackles",
            "Entradas"
          ),
          numberColumn(
            "recoveries",
            "Recuperaciones"
          ),
        ];
      }

      return [
        numberColumn(
          "passes",
          "Pases"
        ),
        numberColumn(
          "passesCompleted",
          "Pases completados"
        ),
        numberColumn(
          "errorsLeadingToGoal",
          "Errores que conllevan gol"
        ),
        numberColumn(
          "yellowCards",
          "Tarjetas amarillas"
        ),
        numberColumn(
          "redCards",
          "Tarjetas rojas"
        ),
      ];
    }, [category]);

  /*
   * ============================================================
   * ACCIONES
   * ============================================================
   */

  const actionColumn = useMemo(
    () => ({
      id: "actions",

      header: "Acciones",

      enableSorting: false,

      cell: ({
        row,
      }: {
        row: {
          original: PlayerMatchStat;
        };
      }) => (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() =>
              onEdit(
                row.original
              )
            }
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete(
                row.original
              )
            }
            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Eliminar
          </button>
        </div>
      ),
    }),
    [onEdit, onDelete]
  );

  /*
   * ============================================================
   * COLUMNAS FINALES
   * ============================================================
   */

  const columns = useMemo(
    () => [
      ...baseColumns,
      ...categoryColumns,
      actionColumn,
    ],
    [
      baseColumns,
      categoryColumns,
      actionColumn,
    ]
  );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div>

      {/* CATEGORÍAS */}

      <div className="mb-5 flex flex-wrap gap-2">

        <button
          type="button"
          onClick={() =>
            setCategory("Ofensivas")
          }
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
            category ===
            "Ofensivas"
              ? "bg-slate-800 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Ofensivas
        </button>

        <button
          type="button"
          onClick={() =>
            setCategory("Defensivas")
          }
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
            category ===
            "Defensivas"
              ? "bg-slate-800 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Defensivas
        </button>

        <button
          type="button"
          onClick={() =>
            setCategory(
              "Distribución"
            )
          }
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
            category ===
            "Distribución"
              ? "bg-slate-800 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Distribución
        </button>

      </div>

      <DataTable
        columns={columns}
        data={playerMatchStats}
      />
    </div>
  );
}