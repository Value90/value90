"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getMatchRatings,
  type MatchRating,
} from "@/services/match-rating.service";

import {
  getPlayers,
  type Player,
} from "@/services/player.service";

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
  getMatches,
  getMatchesByStage,
  type Match,
} from "@/services/match.service";

import {
  getParticipations,
  type Participation,
} from "@/services/participation.service";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import {
  calculateV90Stage,
} from "@/services/v90-engine.service";

import {
  getPlayerV90MatchSummary,
  type PlayerV90MatchSummary,
} from "@/services/v90-match.service";

import StatCard from "@/components/dashboard/StatCard";

type StageMatchStatus =
  | "CALCULATED"
  | "PENDING"
  | "ERROR";

interface StageMatchResult {
  match: Match;
  homeTeamName: string;
  awayTeamName: string;
  participationCount: number;
  participationCalculated: number;
  participationPending: number;
  participationErrors: number;
  ratingsCount: number;
  status: StageMatchStatus;
  errors: string[];
  pendingMessages: string[];
}

export default function DatosV90Page() {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [matchRatings, setMatchRatings] =
    useState<MatchRating[]>([]);

  const [matchRatingsLoading, setMatchRatingsLoading] =
    useState(true);


  const [v90Summary, setV90Summary] =
    useState<PlayerV90MatchSummary>({
      total: 0,
      calculated: 0,
      pending: 0,
      errors: 0,
      v90MatchAverage: null,
      playerV90Average: null,
    });

  const [v90Loading, setV90Loading] =
    useState(true);

  const [v90LoadError, setV90LoadError] =
    useState("");

  /*
   * ============================================================
   * CARGAR DATOS DEL MOTOR V90
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadV90Data() {
      try {
        setV90Loading(true);
        setV90LoadError("");

        const summary = await getPlayerV90MatchSummary();

        if (mounted) {
          setV90Summary(summary);
        }
      } catch (error) {
        console.error(
          "Error cargando datos del motor V90:",
          error
        );

        if (mounted) {
          setV90Summary({
            total: 0,
            calculated: 0,
            pending: 0,
            errors: 0,
            v90MatchAverage: null,
            playerV90Average: null,
          });

          setV90LoadError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los datos del motor V90."
          );
        }
      } finally {
        if (mounted) {
          setV90Loading(false);
        }
      }
    }

    loadV90Data();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * JUGADORES
   *
   * getPlayers() trabaja con Supabase y devuelve
   * Promise<Player[]>.
   * ============================================================
   */

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [playersLoading, setPlayersLoading] =
    useState(true);

  /*
   * ============================================================
   * DATOS PARA EL CALCULADOR DE JORNADA
   * ============================================================
   */

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [stages, setStages] =
    useState<Stage[]>([]);

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [calculatorLoading, setCalculatorLoading] =
    useState(true);

  const [calculatorOpen, setCalculatorOpen] =
    useState(false);

  const [selectedSeasonId, setSelectedSeasonId] =
    useState<number | "">("");

  const [selectedCompetitionId, setSelectedCompetitionId] =
    useState<number | "">("");

  const [selectedStageId, setSelectedStageId] =
    useState<number | "">("");

  const [calculatingStage, setCalculatingStage] =
    useState(false);

  const [calculationDurationMs, setCalculationDurationMs] =
    useState<number | null>(null);

  const [calculatorError, setCalculatorError] =
    useState("");

  const [stageResults, setStageResults] =
    useState<StageMatchResult[]>([]);

  /*
   * ============================================================
   * CARGAR VALORACIONES DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadMatchRatings() {
      try {
        setMatchRatingsLoading(true);

        const data = await getMatchRatings();

        if (!mounted) {
          return;
        }

        setMatchRatings(data);
      } catch (error) {
        console.error(
          "Error cargando valoraciones para Datos V90:",
          error
        );

        if (mounted) {
          setMatchRatings([]);
        }
      } finally {
        if (mounted) {
          setMatchRatingsLoading(false);
        }
      }
    }

    loadMatchRatings();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * CARGAR JUGADORES DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadPlayers() {
      try {
        setPlayersLoading(true);

        const data = await getPlayers();

        if (!mounted) {
          return;
        }

        setPlayers(data);
      } catch (error) {
        console.error(
          "Error cargando jugadores para Datos V90:",
          error
        );

        if (mounted) {
          setPlayers([]);
        }
      } finally {
        if (mounted) {
          setPlayersLoading(false);
        }
      }
    }

    loadPlayers();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * CARGAR DATOS MAESTROS DEL CALCULADOR
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadCalculatorData() {
      try {
        setCalculatorLoading(true);

        const [
          seasonsData,
          competitionsData,
          stagesData,
          matchesData,
          participationsData,
          teamsData,
        ] = await Promise.all([
          getSeasons(),
          getCompetitions(),
          getStages(),
          getMatches(),
          getParticipations(),
          getTeams(),
        ]);

        if (!mounted) {
          return;
        }

        setSeasons(seasonsData);
        setCompetitions(competitionsData);
        setStages(stagesData);
        setMatches(matchesData);
        setParticipations(participationsData);
        setTeams(teamsData);
      } catch (error) {
        console.error(
          "Error cargando datos del calculador V90:",
          error
        );

        if (mounted) {
          setCalculatorError(
            "No se pudieron cargar los datos necesarios para calcular la jornada."
          );
        }
      } finally {
        if (mounted) {
          setCalculatorLoading(false);
        }
      }
    }

    loadCalculatorData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * OPCIONES DEL CALCULADOR
   * ============================================================
   */

  const availableSeasons = useMemo(() => {
    return seasons.filter((season) => season.active);
  }, [seasons]);

  const availableCompetitions = useMemo(() => {
    if (!selectedSeasonId) {
      return [];
    }

    const competitionIds = new Set(
      matches
        .filter(
          (match) =>
            match.seasonId === selectedSeasonId
        )
        .map((match) => match.competitionId)
    );

    return competitions
      .filter(
        (competition) =>
          competition.active &&
          competitionIds.has(competition.id)
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name, "es")
      );
  }, [competitions, matches, selectedSeasonId]);

  const availableStages = useMemo(() => {
    if (!selectedSeasonId || !selectedCompetitionId) {
      return [];
    }

    const stageIdsWithMatches = new Set(
      matches
        .filter(
          (match) =>
            match.seasonId === selectedSeasonId &&
            match.competitionId === selectedCompetitionId
        )
        .map((match) => match.stageId)
    );

    return stages
      .filter(
        (stage) =>
          stage.seasonId === selectedSeasonId &&
          stage.active &&
          stageIdsWithMatches.has(stage.id)
      )
      .sort((a, b) => {
        const aNumber = Number(
          a.name.match(/\d+/)?.[0] ?? 0
        );
        const bNumber = Number(
          b.name.match(/\d+/)?.[0] ?? 0
        );

        if (aNumber !== bNumber) {
          return aNumber - bNumber;
        }

        return a.name.localeCompare(b.name, "es");
      });
  }, [
    matches,
    selectedCompetitionId,
    selectedSeasonId,
    stages,
  ]);

  const selectedSeason = useMemo(() => {
    return seasons.find(
      (season) => season.id === selectedSeasonId
    );
  }, [seasons, selectedSeasonId]);

  const selectedCompetition = useMemo(() => {
    return competitions.find(
      (competition) =>
        competition.id === selectedCompetitionId
    );
  }, [competitions, selectedCompetitionId]);

  const selectedStage = useMemo(() => {
    return stages.find(
      (stage) => stage.id === selectedStageId
    );
  }, [stages, selectedStageId]);

  const getTeamName = (teamId: number) => {
    return (
      teams.find((team) => team.id === teamId)?.shortName ??
      teams.find((team) => team.id === teamId)?.name ??
      `Equipo #${teamId}`
    );
  };

  const resetStageSelection = () => {
    setSelectedStageId("");
    setStageResults([]);
    setCalculatorError("");
  };

  const handleSeasonChange = (value: string) => {
    setSelectedSeasonId(value ? Number(value) : "");
    setSelectedCompetitionId("");
    setSelectedStageId("");
    setStageResults([]);
    setCalculatorError("");
  };

  const handleCompetitionChange = (value: string) => {
    setSelectedCompetitionId(
      value ? Number(value) : ""
    );
    resetStageSelection();
  };

  const handleCalculateStage = async () => {
    setCalculatorError("");
    setStageResults([]);
    setCalculationDurationMs(null);

    if (!selectedSeasonId) {
      setCalculatorError("Selecciona una temporada.");
      return;
    }

    if (!selectedCompetitionId) {
      setCalculatorError("Selecciona una competición.");
      return;
    }

    if (!selectedStageId) {
      setCalculatorError("Selecciona una jornada.");
      return;
    }

    setCalculatingStage(true);

    try {
      /*
       * Para calcular una jornada consultamos directamente
       * Supabase con temporada + competición + jornada.
       *
       * Así el motor recibe exactamente los partidos de la
       * jornada seleccionada y no depende del listado global.
       */
      const stageMatches = await getMatchesByStage(
        selectedSeasonId,
        selectedCompetitionId,
        selectedStageId
      );

      if (stageMatches.length === 0) {
        setCalculatorError(
          "No existen partidos que correspondan a la selección indicada."
        );
        return;
      }


      /*
       * El motor por jornada carga los datos necesarios en bloque y
       * realiza el cálculo en memoria. Esto evita lanzar una cadena
       * de consultas a Supabase por cada jugador.
       */
      const calculation = await calculateV90Stage(
        stageMatches.map((match) => match.id)
      );

      setCalculationDurationMs(calculation.durationMs);

      if (!calculation.success && calculation.matches.length === 0) {
        setCalculatorError(calculation.message);
        return;
      }

      const results: StageMatchResult[] = stageMatches.map((match) => {
        const engineResult = calculation.matches.find(
          (result) => result.matchId === match.id
        );

        if (!engineResult) {
          return {
            match,
            homeTeamName: getTeamName(match.homeTeamId),
            awayTeamName: getTeamName(match.awayTeamId),
            participationCount: 0,
            participationCalculated: 0,
            participationPending: 0,
            participationErrors: 1,
            ratingsCount: 0,
            status: "ERROR",
            errors: [
              "El motor no devolvió resultado para este partido.",
            ],
            pendingMessages: [],
          };
        }

        const errors = engineResult.participationResults
          .filter((result) => result.status === "ERROR")
          .map((result) => {
            const playerName = getPlayerName(result.playerId);
            return `${playerName} · participación #${result.participationId}: ${result.message}`;
          });

        const pendingMessages = engineResult.participationResults
          .filter((result) => result.status === "PENDING")
          .map((result) => {
            const playerName = getPlayerName(result.playerId);
            return `${playerName} · participación #${result.participationId}: ${result.message}`;
          });

        const participationOk =
          engineResult.participationCount > 0 &&
          engineResult.calculated === engineResult.participationCount;

        const ratingOk =
          engineResult.participationCount > 0 &&
          engineResult.ratingsCount >= engineResult.participationCount;

        const status: StageMatchStatus =
          engineResult.errors > 0
            ? "ERROR"
            : participationOk && ratingOk
              ? "CALCULATED"
              : "PENDING";

        return {
          match,
          homeTeamName: getTeamName(match.homeTeamId),
          awayTeamName: getTeamName(match.awayTeamId),
          participationCount: engineResult.participationCount,
          participationCalculated: engineResult.calculated,
          participationPending: engineResult.pending,
          participationErrors: engineResult.errors,
          ratingsCount: engineResult.ratingsCount,
          status,
          errors,
          pendingMessages,
        };
      });

      setStageResults(results);

      /* Actualizamos las métricas superiores después del lote. */
      const [refreshedRatings, refreshedV90Summary] =
        await Promise.all([
          getMatchRatings(),
          getPlayerV90MatchSummary(),
        ]);

      setMatchRatings(refreshedRatings);
      setV90Summary(refreshedV90Summary);
    } catch (error) {
      console.error(
        "Error calculando jornada V90:",
        error
      );

      setCalculatorError(
        error instanceof Error
          ? error.message
          : "Se produjo un error inesperado durante el cálculo de la jornada."
      );
    } finally {
      setCalculatingStage(false);
    }
  };

  /*
   * ============================================================
   * JORNADAS Y PARTIDOS PENDIENTES DE VALORACIÓN V90
   * ============================================================
   */

  const ratedMatchIds = useMemo(() => {
    return new Set(
      matchRatings
        .map((rating) => rating.matchId)
        .filter((matchId): matchId is number => matchId !== null && matchId !== undefined)
    );
  }, [matchRatings]);

  const pendingMatchesCount = useMemo(() => {
    return matches.filter((match) => !ratedMatchIds.has(match.id)).length;
  }, [matches, ratedMatchIds]);

  const getStageNumber = (stage: Stage) => {
    return Number(stage.name.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
  };

  const oldestMissingStageLabel = useMemo(() => {
    const missingStages = stages
      .map((stage) => {
        const stageMatches = matches.filter((match) => match.stageId === stage.id);

        if (stageMatches.length === 0) {
          return null;
        }

        const hasRating = stageMatches.some((match) => ratedMatchIds.has(match.id));

        if (hasRating) {
          return null;
        }

        const competition = competitions.find(
          (item) => item.id === stageMatches[0].competitionId
        );

        return {
          stage,
          competitionName: competition?.name ?? "Competición desconocida",
        };
      })
      .filter(
        (item): item is { stage: Stage; competitionName: string } => item !== null
      )
      .sort((a, b) => {
        const numberDifference = getStageNumber(a.stage) - getStageNumber(b.stage);

        if (numberDifference !== 0) {
          return numberDifference;
        }

        return a.stage.name.localeCompare(b.stage.name, "es");
      });

    if (missingStages.length === 0) {
      return "—";
    }

    const oldest = missingStages[0];
    return `${oldest.stage.name} ${oldest.competitionName}`;
  }, [competitions, matches, ratedMatchIds, stages]);

  /*
   * ============================================================
   * MÉTRICAS DEL MOTOR V90
   * ============================================================
   */

  const totalRatings =
    matchRatings.length;

  const ratingsWithExternalAverage =
    useMemo(() => {
      return matchRatings.filter(
        (rating) =>
          rating.externalAverage !== null
      ).length;
    }, [matchRatings]);

  const v90Total =
    v90Summary.total;

  const v90Calculated =
    v90Summary.calculated;

  const v90Pending =
    v90Summary.pending;

  const v90Errors =
    v90Summary.errors;

  const externalAverage =
    useMemo(() => {
      const values = matchRatings
        .map(
          (rating) =>
            rating.externalAverage
        )
        .filter(
          (value): value is number =>
            value !== null
        );

      if (values.length === 0) {
        return null;
      }

      return values.reduce(
        (sum, value) =>
          sum + value,
        0
      ) / values.length;
    }, [matchRatings]);

  const v90MatchAverage =
    v90Summary.v90MatchAverage;

  const playerV90Average =
    v90Summary.playerV90Average;

  /*
   * ============================================================
   * ÚLTIMAS VALORACIONES
   * ============================================================
   */

  const recentRatings =
    useMemo(() => {
      return [...matchRatings]
        .sort(
          (a, b) =>
            b.id - a.id
        )
        .slice(0, 10);
    }, [matchRatings]);

  /*
   * ============================================================
   * REPRESENTACIÓN DE VALORES
   * ============================================================
   */

  const formatValue = (
    value: number | null,
    decimals = 2
  ) => {
    if (value === null) {
      return "—";
    }

    return value.toFixed(decimals);
  };

  /*
   * ============================================================
   * NOMBRE DEL JUGADOR
   * ============================================================
   */

  const getPlayerName = (
    playerId: number
  ) => {
    if (playersLoading) {
      return "Cargando...";
    }

    return (
      players.find(
        (player) =>
          player.id === playerId
      )?.name ??
      "Jugador desconocido"
    );
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

      <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            Datos V90
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Información generada y calculada por el
            motor de valoración V90.
          </p>

        </div>

      </div>


      {/* ======================================================
          1. CALCULADOR DE JORNADA V90
          ====================================================== */}

      <section className="mb-8 sm:mb-10">

        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
              Calcular jornada V90
            </h2>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Selecciona una temporada, competición y jornada para procesar todos sus partidos.
            </p>

          </div>

          {!calculatorOpen && (
            <button
              type="button"
              onClick={() => {
                setCalculatorOpen(true);
                setCalculatorError("");
              }}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            >
              ⚙ Calcular jornada V90
            </button>
          )}

        </div>

        {calculatorOpen && (
          <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">

            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">

              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Temporada
                </label>
                <select
                  value={selectedSeasonId}
                  onChange={(event) =>
                    handleSeasonChange(event.target.value)
                  }
                  disabled={calculatorLoading || calculatingStage}
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                >
                  <option value="">Selecciona temporada</option>
                  {availableSeasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Competición
                </label>
                <select
                  value={selectedCompetitionId}
                  onChange={(event) =>
                    handleCompetitionChange(event.target.value)
                  }
                  disabled={!selectedSeasonId || calculatorLoading || calculatingStage}
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                >
                  <option value="">Selecciona competición</option>
                  {availableCompetitions.map((competition) => (
                    <option key={competition.id} value={competition.id}>
                      {competition.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Jornada
                </label>
                <select
                  value={selectedStageId}
                  onChange={(event) => {
                    setSelectedStageId(
                      event.target.value
                        ? Number(event.target.value)
                        : ""
                    );
                    setStageResults([]);
                    setCalculatorError("");
                  }}
                  disabled={!selectedCompetitionId || calculatorLoading || calculatingStage}
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                >
                  <option value="">Selecciona jornada</option>
                  {availableStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {calculatorError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                {calculatorError}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setCalculatorOpen(false);
                  setStageResults([]);
                  setCalculatorError("");
                }}
                disabled={calculatingStage}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={handleCalculateStage}
                disabled={calculatingStage || calculatorLoading}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {calculatingStage
                  ? "Calculando..."
                  : "Calcular jornada V90"}
              </button>
            </div>

          </div>
        )}

        {stageResults.length > 0 && (
          <div className="mt-5 w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 bg-slate-50 px-3 py-4 sm:px-5">
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800">
                    {selectedSeason?.name ?? "Temporada"} · {selectedCompetition?.name ?? "Competición"} · {selectedStage?.name ?? "Jornada"}
                  </h3>
                  <p className="text-xs text-slate-500 sm:text-sm">
                    {stageResults.length} partido{stageResults.length === 1 ? "" : "s"} procesado{stageResults.length === 1 ? "" : "s"}.
                    {calculationDurationMs !== null && (
                      <> · Tiempo: {(calculationDurationMs / 1000).toFixed(2)} s</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 sm:px-4">PARTIDOS</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 sm:px-4">PARTICIPACIÓN</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 sm:px-4">VALORACIÓN</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 sm:px-4">ESTADO</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 sm:px-4">DETALLE</th>
                  </tr>
                </thead>
                <tbody>
                  {stageResults.map((result) => {
                    const participationOk =
                      result.participationCount > 0;

                    const ratingOk =
                      result.participationCount > 0 &&
                      result.ratingsCount >=
                        result.participationCount;

                    return (
                      <tr
                        key={result.match.id}
                        className="border-t border-slate-200 align-top"
                      >
                        <td className="px-3 py-3 font-semibold text-slate-800 sm:px-4 sm:py-3.5">
                          {result.homeTeamName} vs {result.awayTeamName}
                        </td>

                        <td className="px-3 py-3 text-center sm:px-4 sm:py-3.5">
                          <span
                            className={
                              participationOk
                                ? "font-bold text-emerald-600"
                                : "font-bold text-amber-600"
                            }
                            title={`${result.participationCalculated}/${result.participationCount} participaciones calculadas`}
                          >
                            {participationOk ? "✓" : "X"}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-center sm:px-4 sm:py-3.5">
                          <span
                            className={
                              ratingOk
                                ? "font-bold text-emerald-600"
                                : "font-bold text-amber-600"
                            }
                            title={`${result.ratingsCount}/${result.participationCount} valoraciones con media externa`}
                          >
                            {ratingOk ? "✓" : "X"}
                          </span>
                        </td>

                        <td className="px-3 py-3 sm:px-4 sm:py-3.5">
                          <span
                            className={
                              result.status === "CALCULATED"
                                ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                : result.status === "ERROR"
                                ? "inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700"
                                : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
                            }
                          >
                            {result.status === "CALCULATED"
                              ? "CALCULADO"
                              : result.status === "ERROR"
                              ? "ERROR"
                              : "PENDIENTE"}
                          </span>
                        </td>

                        <td className="max-w-[420px] px-3 py-3 text-xs text-slate-600 sm:px-4 sm:py-3.5">
                          {result.status === "ERROR" ? (
                            <div className="space-y-1.5">
                              {result.errors.map((message, index) => (
                                <div
                                  key={`${result.match.id}-error-${index}`}
                                  className="rounded-md bg-red-50 px-2.5 py-2 text-red-700"
                                >
                                  {message}
                                </div>
                              ))}
                            </div>
                          ) : result.status === "PENDING" ? (
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <div>
                                  {result.participationCount === 0
                                    ? "No existen participaciones."
                                    : `${result.participationCount} participaciones encontradas.`}
                                </div>
                                <div>
                                  {result.ratingsCount}/{result.participationCount} valoraciones con media externa.
                                </div>
                                <div>
                                  {result.participationCalculated}/{result.participationCount} participaciones calculadas por el motor V90.
                                </div>
                              </div>

                              {result.pendingMessages.length > 0 && (
                                <div className="rounded-md bg-amber-50 px-2.5 py-2 text-amber-800">
                                  <div className="mb-1 font-semibold">
                                    Motivo de espera
                                  </div>
                                  <div className="space-y-1">
                                    {Array.from(
                                      result.pendingMessages.reduce(
                                        (map, message) => {
                                          const separator = message.indexOf(": ");
                                          const reason =
                                            separator >= 0
                                              ? message.slice(separator + 2)
                                              : message;
                                          map.set(
                                            reason,
                                            (map.get(reason) ?? 0) + 1
                                          );
                                          return map;
                                        },
                                        new Map<string, number>()
                                      )
                                    ).map(([reason, count]) => (
                                      <div key={`${result.match.id}-${reason}`}>
                                        {count} × {reason}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">
                              Todas las participaciones han sido calculadas correctamente.
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </section>


      {/* ======================================================
          2. ESTADO DEL MOTOR
          ====================================================== */}

      <section className="mb-8 sm:mb-10">

        <div className="mb-4 sm:mb-5">
          <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
            Estado del motor V90
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Estado real de los registros generados por el motor V90.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total"
            value={v90Loading ? "..." : v90Total.toString()}
          />
          <StatCard
            title="Calculados"
            value={v90Loading ? "..." : v90Calculated.toString()}
          />
          <StatCard
            title="Partidos pendientes"
            value={calculatorLoading ? "..." : pendingMatchesCount.toString()}
          />
          <div className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm font-medium text-slate-500">
              Jornada pendiente
            </p>
            <p
              className="mt-3 min-w-0 break-words text-xs font-bold leading-5 text-slate-800 sm:text-sm"
              title={calculatorLoading ? "Cargando..." : oldestMissingStageLabel}
            >
              {calculatorLoading ? "..." : oldestMissingStageLabel}
            </p>
          </div>
        </div>

        {v90LoadError && !v90Loading && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
            <strong>Error cargando el motor V90:</strong> {v90LoadError}
          </div>
        )}
      </section>


      {/* ======================================================
          3. MEDIAS V90
          ====================================================== */}

      <section className="mb-8 sm:mb-10">

        <div className="mb-4 sm:mb-5">
          <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
            Medias V90
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Indicadores medios generados por el motor V90.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="V90 medio partido"
            value={v90Loading ? "..." : formatValue(v90MatchAverage)}
          />
          <StatCard
            title="V90 medio jugadores"
            value={v90Loading ? "..." : formatValue(playerV90Average)}
          />
          <StatCard
            title="Media externa"
            value={
              matchRatingsLoading
                ? "..."
                : externalAverage === null
                  ? "—"
                  : formatValue(externalAverage)
            }
          />
        </div>
      </section>


      {/* ======================================================
          4. RESUMEN DEL MOTOR
          ====================================================== */}

      <section className="mb-8 sm:mb-10">

        <div className="mb-4 sm:mb-5">
          <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
            Resumen del cálculo
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Indicadores de funcionamiento del motor V90.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
          <StatCard
            title="Tasa de cálculo"
            value={
              v90Loading
                ? "..."
                : v90Total > 0
                  ? `${((v90Calculated / v90Total) * 100).toFixed(1)}%`
                  : "—"
            }
          />
          <StatCard
            title="V90 con incidencia"
            value={
              v90Loading
                ? "..."
                : (v90Pending + v90Errors).toString()
            }
          />
        </div>
      </section>


      {/* ======================================================
          5. ÚLTIMAS VALORACIONES
          ====================================================== */}

      <section>

        <div className="mb-4 sm:mb-5">

          <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
            Últimas valoraciones procesadas
          </h2>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            Últimos registros disponibles en el motor V90.
          </p>

        </div>

        <div className="w-full min-w-0 overflow-hidden rounded-xl border bg-white shadow">

          <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">

            <table className="w-full min-w-[820px] whitespace-nowrap">

              <thead className="bg-slate-100">

                <tr>

                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 sm:px-4 sm:py-4 sm:text-sm">
                    Jugador
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 sm:px-4 sm:py-4 sm:text-sm">
                    Match Rating
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 sm:px-4 sm:py-4 sm:text-sm">
                    Media externa
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 sm:px-4 sm:py-4 sm:text-sm">
                    V90 Match
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 sm:px-4 sm:py-4 sm:text-sm">
                    Valoración final
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 sm:px-4 sm:py-4 sm:text-sm">
                    Confianza
                  </th>

                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 sm:px-4 sm:py-4 sm:text-sm">
                    Versión
                  </th>

                </tr>

              </thead>

              <tbody>

                {matchRatingsLoading ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="p-6 text-center text-sm text-slate-500 sm:p-8"
                    >
                      Cargando valoraciones...
                    </td>

                  </tr>

                ) : recentRatings.length === 0 ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="p-6 text-center text-sm text-slate-500 sm:p-8"
                    >
                      Todavía no existen valoraciones
                      procesadas por el motor V90.
                    </td>

                  </tr>

                ) : (

                  recentRatings.map(
                    (rating) => (

                      <tr
                        key={rating.id}
                        className="border-t hover:bg-slate-50"
                      >

                        <td className="px-3 py-3 font-medium text-sm text-slate-800 sm:px-4 sm:py-4">
                          {getPlayerName(
                            rating.playerId
                          )}
                        </td>

                        <td className="px-3 py-3 text-sm text-slate-700 sm:px-4 sm:py-4">
                          {formatValue(
                            rating.finalMatchRating
                          )}
                        </td>

                        <td className="px-3 py-3 text-sm text-slate-700 sm:px-4 sm:py-4">
                          {formatValue(
                            rating.externalAverage
                          )}
                        </td>

                        <td className="px-3 py-3 text-sm text-slate-700 sm:px-4 sm:py-4">
                          {formatValue(
                            rating.value90MatchRating
                          )}
                        </td>

                        <td className="px-3 py-3 text-sm text-slate-700 sm:px-4 sm:py-4">
                          {formatValue(
                            rating.finalMatchRating
                          )}
                        </td>

                        <td className="px-3 py-3 text-sm text-slate-700 sm:px-4 sm:py-4">
                          {formatValue(
                            rating.confidence
                          )}
                        </td>

                        <td className="px-3 py-3 text-sm text-slate-700 sm:px-4 sm:py-4">
                          {rating.calculationVersion ??
                            "—"}
                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

      </section>

    </div>
  );
}