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
  getSeasons,
  type Season,
} from "@/services/season.service";

import {
  getCompetitions,
  type Competition,
} from "@/services/competition.service";

import {
  getStages,
  type Stage,
} from "@/services/stage.service";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import {
  getParticipations,
  type Participation,
} from "@/services/participation.service";

import {
  getPlayerV90MatchFacts,
  type PlayerV90MatchFact,
} from "@/services/v90-match.service";

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

  const [v90Facts, setV90Facts] =
    useState<PlayerV90MatchFact[]>([]);

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [stages, setStages] =
    useState<Stage[]>([]);

  const [teamsLoading, setTeamsLoading] =
    useState(true);

  /*
   * ============================================================
   * FILTROS
   * ============================================================
   */

  const [seasonId, setSeasonId] = useState(0);
  const [competitionId, setCompetitionId] = useState(0);
  const [stageId, setStageId] = useState(0);
  const [matchId, setMatchId] = useState(0);

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
          v90FactsData,
          seasonsData,
          competitionsData,
          stagesData,
        ] = await Promise.all([
          getMatchRatings(),
          getMatches(),
          getPlayers(),
          getTeams(),
          getParticipations(),
          getPlayerV90MatchFacts(),
          getSeasons(),
          getCompetitions(),
          getStages(),
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

        setV90Facts(
          v90FactsData
        );
        setSeasons(seasonsData);
        setCompetitions(competitionsData);
        setStages(stagesData);
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
        setV90Facts([]);
        setSeasons([]);
        setCompetitions([]);
        setStages([]);
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
   * OPCIONES DISPONIBLES DE LOS FILTROS
   * ============================================================
   */

  const availableSeasons = useMemo(() => {
    const seasonIds = new Set(matches.map((match) => match.seasonId));

    return seasons
      .filter((season) => seasonIds.has(season.id))
      .sort((a, b) => b.id - a.id);
  }, [matches, seasons]);

  const availableCompetitions = useMemo(() => {
    if (!seasonId) {
      return [];
    }

    const competitionIds = new Set(
      matches
        .filter((match) => match.seasonId === seasonId)
        .map((match) => match.competitionId)
    );

    return competitions
      .filter((competition) => competitionIds.has(competition.id))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [matches, competitions, seasonId]);

  const availableStages = useMemo(() => {
    if (!seasonId || !competitionId) {
      return [];
    }

    const stageIds = new Set(
      matches
        .filter(
          (match) =>
            match.seasonId === seasonId &&
            match.competitionId === competitionId &&
            match.stageId
        )
        .map((match) => match.stageId)
    );

    return stages
      .filter((stage) => stageIds.has(stage.id))
      .sort((a, b) => a.id - b.id);
  }, [matches, stages, seasonId, competitionId]);

  const availableMatches = useMemo(() => {
    if (!seasonId || !competitionId || !stageId) {
      return [];
    }

    return matches
      .filter(
        (match) =>
          match.seasonId === seasonId &&
          match.competitionId === competitionId &&
          match.stageId === stageId
      )
      .sort((a, b) => a.id - b.id);
  }, [matches, seasonId, competitionId, stageId]);

  const getMatchLabel = (match: (typeof matches)[number]) => {
    const homeTeam = teams.find((team) => team.id === match.homeTeamId);
    const awayTeam = teams.find((team) => team.id === match.awayTeamId);

    return `${homeTeam?.shortName ?? homeTeam?.name ?? "?"} - ${
      awayTeam?.shortName ?? awayTeam?.name ?? "?"
    }`;
  };

  /*
   * ============================================================
   * CAMBIOS DE FILTRO
   * ============================================================
   */

  const handleSeasonChange = (value: number) => {
    setSeasonId(value);
    setCompetitionId(0);
    setStageId(0);
    setMatchId(0);
  };

  const handleCompetitionChange = (value: number) => {
    setCompetitionId(value);
    setStageId(0);
    setMatchId(0);
  };

  const handleStageChange = (value: number) => {
    setStageId(value);
    setMatchId(0);
  };

  /*
   * ============================================================
   * FILTRAR VALORACIONES
   * ============================================================
   */

  const filteredMatchRatings = useMemo(() => {
    const search = playerSearch
      .trim()
      .toLocaleLowerCase("es");

    return matchRatings.filter((matchRating) => {
      const match = matches.find(
        (item) => item.id === matchRating.matchId
      );

      if (!match) {
        return false;
      }

      if (seasonId && match.seasonId !== seasonId) {
        return false;
      }

      if (
        competitionId &&
        match.competitionId !== competitionId
      ) {
        return false;
      }

      if (stageId && match.stageId !== stageId) {
        return false;
      }

      if (matchId && matchRating.matchId !== matchId) {
        return false;
      }

      if (search) {
        const player = players.find(
          (item) => item.id === matchRating.playerId
        );

        const playerName =
          player?.name?.toLocaleLowerCase("es") ?? "";

        if (!playerName.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [
    matchRatings,
    matches,
    players,
    playerSearch,
    seasonId,
    competitionId,
    stageId,
    matchId,
  ]);

  /*
   * ============================================================
   * DATOS V90 POR PARTICIPACIÓN
   * ============================================================
   */

  const v90ByParticipationId =
    useMemo(() => {
      const map = new Map<
        number,
        PlayerV90MatchFact
      >();

      for (const fact of v90Facts) {
        map.set(
          fact.participationId,
          fact
        );
      }

      return map;
    }, [v90Facts]);

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
        id: "v90Match",

        header: "V90 partido",

        accessorFn: (
          matchRating: MatchRating
        ) => {
          const fact =
            v90ByParticipationId.get(
              matchRating.participationId
            );

          return fact?.v90Match ?? null;
        },

        cell: ({
          row,
        }: {
          row: { original: MatchRating };
        }) => {
          const fact =
            v90ByParticipationId.get(
              row.original.participationId
            );

          if (!fact) {
            return (
              <span className="text-xs text-slate-400">
                Pendiente
              </span>
            );
          }

          if (fact.status === "ERROR") {
            return (
              <span
                className="text-xs font-semibold text-red-600"
                title={`Error en el cálculo V90 (${fact.calculationVersion})`}
              >
                Error
              </span>
            );
          }

          if (fact.status === "PENDING") {
            return (
              <span className="text-xs font-medium text-amber-600">
                Pendiente
              </span>
            );
          }

          return (
            <span
              className="text-xs font-bold text-slate-800"
              title={`Peso total: ${fact.totalWeight.toFixed(
                3
              )} · Versión: ${fact.calculationVersion}`}
            >
              {fact.v90Match.toFixed(2)}
            </span>
          );
        },

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
      v90ByParticipationId,
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
          FILTROS
          ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
              Filtrar valoraciones
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Selecciona temporada, competición, jornada y partido para ver únicamente sus valoraciones.
            </p>
          </div>

          {(seasonId || competitionId || stageId || matchId || playerSearch) && (
            <button
              type="button"
              onClick={() => {
                setSeasonId(0);
                setCompetitionId(0);
                setStageId(0);
                setMatchId(0);
                setPlayerSearch("");
              }}
              className="mt-2 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 sm:mt-0"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Temporada
            </label>
            <select
              value={seasonId}
              onChange={(event) =>
                handleSeasonChange(Number(event.target.value))
              }
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
            >
              <option value={0}>Todas las temporadas</option>
              {availableSeasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Competición
            </label>
            <select
              value={competitionId}
              onChange={(event) =>
                handleCompetitionChange(Number(event.target.value))
              }
              disabled={!seasonId}
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-slate-500 sm:px-4"
            >
              <option value={0}>
                {seasonId
                  ? "Todas las competiciones"
                  : "Selecciona primero una temporada"}
              </option>
              {availableCompetitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Jornada / fase
            </label>
            <select
              value={stageId}
              onChange={(event) =>
                handleStageChange(Number(event.target.value))
              }
              disabled={!seasonId || !competitionId}
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-slate-500 sm:px-4"
            >
              <option value={0}>
                {!competitionId
                  ? "Selecciona primero una competición"
                  : "Todas las jornadas / fases"}
              </option>
              {availableStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Partido
            </label>
            <select
              value={matchId}
              onChange={(event) =>
                setMatchId(Number(event.target.value))
              }
              disabled={!seasonId || !competitionId || !stageId}
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-slate-500 sm:px-4"
            >
              <option value={0}>
                {!stageId
                  ? "Selecciona primero una jornada / fase"
                  : "Todos los partidos"}
              </option>
              {availableMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  {getMatchLabel(match)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Jugador
          </label>
          <input
            type="text"
            placeholder="Buscar jugador..."
            value={playerSearch}
            onChange={(event) =>
              setPlayerSearch(event.target.value)
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 sm:max-w-md sm:px-4"
          />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-xs text-slate-500">
            {filteredMatchRatings.length === 1
              ? "1 valoración encontrada"
              : `${filteredMatchRatings.length} valoraciones encontradas`}
          </span>

          {matchId > 0 && (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              {getMatchLabel(
                matches.find((match) => match.id === matchId)!
              )}
            </span>
          )}
        </div>
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