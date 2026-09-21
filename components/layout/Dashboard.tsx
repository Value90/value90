"use client";

import { useEffect, useState } from "react";

import { getPlayers } from "@/services/player.service";
import { getTeams } from "@/services/team.service";
import { getMatches } from "@/services/match.service";
import { getCompetitions } from "@/services/competition.service";
import { getSeasons } from "@/services/season.service";
import { getStages } from "@/services/stage.service";
import { getParticipations } from "@/services/participation.service";
import { getPlayerMatchStats } from "@/services/player-match-stat.service";
import { getMatchRatings } from "@/services/match-rating.service";

import {
  getPlayerV90MatchSummary,
  type PlayerV90MatchSummary,
} from "@/services/v90-match.service";

import StatCard from "@/components/dashboard/StatCard";

export default function Dashboard() {
  /*
   * ============================================================
   * ESTADO
   * ============================================================
   */

  const [teamCount, setTeamCount] = useState(0);

  const [teamsLoading, setTeamsLoading] =
    useState(true);

  const [competitionCount, setCompetitionCount] =
    useState(0);

  const [dashboardCompetitions, setDashboardCompetitions] =
    useState<Awaited<ReturnType<typeof getCompetitions>>>([]);

  const [
    competitionsLoading,
    setCompetitionsLoading,
  ] = useState(true);

  const [seasonCount, setSeasonCount] =
    useState(0);

  const [seasonsLoading, setSeasonsLoading] =
    useState(true);

  const [playerCount, setPlayerCount] =
    useState(0);

  const [playersLoading, setPlayersLoading] =
    useState(true);

  const [stageCount, setStageCount] =
    useState(0);

  const [dashboardStages, setDashboardStages] =
    useState<Awaited<ReturnType<typeof getStages>>>([]);

  const [stagesLoading, setStagesLoading] =
    useState(true);

  const [matchCount, setMatchCount] =
    useState(0);

  const [dashboardMatches, setDashboardMatches] =
    useState<Awaited<ReturnType<typeof getMatches>>>([]);

  const [matchesLoading, setMatchesLoading] =
    useState(true);

  const [participationCount, setParticipationCount] =
    useState(0);

  const [
    participationsLoading,
    setParticipationsLoading,
  ] = useState(true);

  const [playerMatchStatCount, setPlayerMatchStatCount] =
    useState(0);

  const [
    playerMatchStatsLoading,
    setPlayerMatchStatsLoading,
  ] = useState(true);

  const [matchRatingCount, setMatchRatingCount] =
    useState(0);

  const [dashboardMatchRatings, setDashboardMatchRatings] =
    useState<Awaited<ReturnType<typeof getMatchRatings>>>([]);

  const [
    matchRatingsLoading,
    setMatchRatingsLoading,
  ] = useState(true);

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

  /*
   * ============================================================
   * MEDIA EXTERNA
   * ============================================================
   */

  const [externalAverage, setExternalAverage] =
    useState<number | null>(null);

  /*
   * ============================================================
   * CARGAR EQUIPOS DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    const loadTeams = async () => {
      try {
        setTeamsLoading(true);

        const teams = await getTeams();

        setTeamCount(teams.length);
      } catch (error) {
        console.error(
          "Error obteniendo equipos para el dashboard:",
          error
        );

        setTeamCount(0);
      } finally {
        setTeamsLoading(false);
      }
    };

    loadTeams();
  }, []);

  /*
   * ============================================================
   * CARGAR COMPETICIONES DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    const loadCompetitions = async () => {
      try {
        setCompetitionsLoading(true);

        const competitions =
          await getCompetitions();

        setCompetitionCount(
          competitions.length
        );
        setDashboardCompetitions(competitions);
      } catch (error) {
        console.error(
          "Error obteniendo competiciones para el dashboard:",
          error
        );

        setCompetitionCount(0);
      } finally {
        setCompetitionsLoading(false);
      }
    };

    loadCompetitions();
  }, []);

  /*
   * ============================================================
   * CARGAR TEMPORADAS DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    const loadSeasons = async () => {
      try {
        setSeasonsLoading(true);

        const seasons = await getSeasons();

        setSeasonCount(seasons.length);
      } catch (error) {
        console.error(
          "Error obteniendo temporadas para el dashboard:",
          error
        );

        setSeasonCount(0);
      } finally {
        setSeasonsLoading(false);
      }
    };

    loadSeasons();
  }, []);

  /*
   * ============================================================
   * CARGAR JUGADORES DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setPlayersLoading(true);

        const players = await getPlayers();

        setPlayerCount(players.length);
      } catch (error) {
        console.error(
          "Error obteniendo jugadores para el dashboard:",
          error
        );

        setPlayerCount(0);
      } finally {
        setPlayersLoading(false);
      }
    };

    loadPlayers();
  }, []);

  /*
   * ============================================================
   * CARGAR JORNADAS / FASES DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    const loadStages = async () => {
      try {
        setStagesLoading(true);

        const stages = await getStages();

        setStageCount(stages.length);
        setDashboardStages(stages);
      } catch (error) {
        console.error(
          "Error obteniendo jornadas / fases para el dashboard:",
          error
        );

        setStageCount(0);
      } finally {
        setStagesLoading(false);
      }
    };

    loadStages();
  }, []);

  /*
   * ============================================================
   * CARGAR PARTIDOS DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setMatchesLoading(true);

        const matches =
          await getMatches();

        setMatchCount(
          matches.length
        );
        setDashboardMatches(matches);
      } catch (error) {
        console.error(
          "Error obteniendo partidos para el dashboard:",
          error
        );

        setMatchCount(0);
      } finally {
        setMatchesLoading(false);
      }
    };

    loadMatches();
  }, []);

  /*
   * ============================================================
   * CARGAR PARTICIPACIONES DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    const loadParticipations = async () => {
      try {
        setParticipationsLoading(true);

        const participations =
          await getParticipations();

        setParticipationCount(
          participations.length
        );
      } catch (error) {
        console.error(
          "Error obteniendo participaciones para el dashboard:",
          error
        );

        setParticipationCount(0);
      } finally {
        setParticipationsLoading(false);
      }
    };

    loadParticipations();
  }, []);

  /*
   * ============================================================
   * CARGAR ESTADÍSTICAS DE PARTIDO DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    const loadPlayerMatchStats = async () => {
      try {
        setPlayerMatchStatsLoading(true);

        const playerMatchStats =
          await getPlayerMatchStats();

        setPlayerMatchStatCount(
          playerMatchStats.length
        );
      } catch (error) {
        console.error(
          "Error obteniendo estadísticas de partido para el dashboard:",
          error
        );

        setPlayerMatchStatCount(0);
      } finally {
        setPlayerMatchStatsLoading(false);
      }
    };

    loadPlayerMatchStats();
  }, []);

  /*
   * ============================================================
   * CARGAR MATCH RATINGS DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    const loadMatchRatings = async () => {
      try {
        setMatchRatingsLoading(true);

        const matchRatings =
          await getMatchRatings();

        /*
         * ======================================================
         * TOTAL DE MATCH RATINGS
         * ======================================================
         */

        setMatchRatingCount(
          matchRatings.length
        );
        setDashboardMatchRatings(matchRatings);

        /*
         * ======================================================
         * MEDIA EXTERNA
         * ======================================================
         *
         * Solo utilizamos registros que tengan
         * externalAverage calculado.
         *
         * Los valores null se ignoran.
         * ======================================================
         */

        const externalValues =
          matchRatings
            .map(
              (rating) =>
                rating.externalAverage
            )
            .filter(
              (
                value
              ): value is number =>
                value !== null &&
                value !== undefined &&
                !Number.isNaN(value)
            );

        if (
          externalValues.length ===
          0
        ) {
          setExternalAverage(null);
        } else {
          const average =
            externalValues.reduce(
              (sum, value) =>
                sum + value,
              0
            ) /
            externalValues.length;

          setExternalAverage(
            Math.round(
              (average +
                Number.EPSILON) *
                100
            ) / 100
          );
        }
      } catch (error) {
        console.error(
          "Error obteniendo valoraciones de partido para el dashboard:",
          error
        );

        setMatchRatingCount(0);
        setExternalAverage(null);
      } finally {
        setMatchRatingsLoading(false);
      }
    };

    loadMatchRatings();
  }, []);

  /*
   * ============================================================
   * CARGAR MOTOR V90
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadV90 = async () => {
      try {
        setV90Loading(true);

        const summary = await getPlayerV90MatchSummary();

        if (mounted) {
          setV90Summary(summary);
        }
      } catch (error) {
        console.error(
          "Error obteniendo métricas V90 para el dashboard:",
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
        }
      } finally {
        if (mounted) {
          setV90Loading(false);
        }
      }
    };

    loadV90();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * VALOR A MOSTRAR — MEDIA EXTERNA
   * ============================================================
   */

  /*
   * ============================================================
   * PENDIENTES V90
   * ============================================================
   */

  const matchIdsWithRatings = new Set(
    dashboardMatchRatings.map((rating) => rating.matchId)
  );

  const pendingMatchCount = dashboardMatches.filter(
    (match) => !matchIdsWithRatings.has(match.id)
  ).length;

  const oldestPendingStage = [...dashboardStages]
    .filter((stage) => {
      const stageMatches = dashboardMatches.filter(
        (match) => match.stageId === stage.id
      );

      return (
        stageMatches.length > 0 &&
        stageMatches.every((match) => !matchIdsWithRatings.has(match.id))
      );
    })
    .sort((a, b) => {
      const getNumber = (name: string) =>
        Number(name.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);

      return getNumber(a.name) - getNumber(b.name);
    })[0];

  const oldestPendingCompetition = oldestPendingStage
    ? dashboardCompetitions.find((competition) => {
        const stageMatch = dashboardMatches.find(
          (match) => match.stageId === oldestPendingStage.id
        );

        return competition.id === stageMatch?.competitionId;
      })
    : undefined;

  const externalAverageDisplay =
    matchRatingsLoading
      ? "..."
      : externalAverage !== null
        ? externalAverage.toFixed(2)
        : "—";

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full p-4 sm:p-5 md:p-6 lg:p-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-7 sm:mb-8 md:mb-10">

        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl md:text-4xl">
          Bienvenido a Value90
        </h1>

        <p className="mt-1.5 text-sm text-slate-600 sm:mt-2">
          Panel de administración
        </p>

      </div>

      {/* ======================================================
          1. MOTOR V90
          ====================================================== */}

      <section className="mb-8 sm:mb-9 md:mb-10">

        <div className="mb-4 sm:mb-5">

          <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
            Motor V90
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Métricas reales generadas por el motor de valoración V90.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-5">

          <StatCard
            title="V90 medio jugadores"
            value={
              v90Loading
                ? "..."
                : v90Summary.playerV90Average !== null
                  ? v90Summary.playerV90Average.toFixed(2)
                  : "—"
            }
          />

          <StatCard
            title="V90 medio partido"
            value={
              v90Loading
                ? "..."
                : v90Summary.v90MatchAverage !== null
                  ? v90Summary.v90MatchAverage.toFixed(2)
                  : "—"
            }
          />

          <StatCard
            title="Calculados"
            value={
              v90Loading
                ? "..."
                : v90Summary.calculated.toString()
            }
          />

          <StatCard
            title="Partidos pendientes"
            value={
              v90Loading || matchesLoading || matchRatingsLoading
                ? "..."
                : pendingMatchCount.toString()
            }
          />

          <StatCard
            title="Jornada pendiente"
            compactValue
            value={
              v90Loading || matchesLoading || matchRatingsLoading || stagesLoading
                ? "..."
                : oldestPendingStage
                  ? `${oldestPendingStage.name.replace(/jornada/gi, "J").replace(/\s+/g, "")}${oldestPendingCompetition ? ` ${oldestPendingCompetition.name}` : ""}`
                  : "—"
            }
          />

        </div>

      </section>


      {/* ======================================================
          2. DATOS DEPORTIVOS
          ====================================================== */}

      <section className="mb-8 sm:mb-9 md:mb-10">

        <div className="mb-4 sm:mb-5">

          <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
            Datos deportivos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Información registrada sobre partidos,
            participaciones y estadísticas.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-5">

          <StatCard
            title="Jugadores"
            value={
              playersLoading
                ? "..."
                : playerCount.toString()
            }
          />

          <StatCard
            title="Equipos"
            value={
              teamsLoading
                ? "..."
                : teamCount.toString()
            }
          />

          <StatCard
            title="Partidos"
            value={
              matchesLoading
                ? "..."
                : matchCount.toString()
            }
          />

          <StatCard
            title="Participaciones"
            value={
              participationsLoading
                ? "..."
                : participationCount.toString()
            }
          />

          <StatCard
            title="Estadísticas de partido"
            value={
              playerMatchStatsLoading
                ? "..."
                : playerMatchStatCount.toString()
            }
          />

        </div>

      </section>

      {/* ======================================================
          3. DATOS MAESTROS
          ====================================================== */}

      <section>

        <div className="mb-4 sm:mb-5">

          <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
            Datos maestros
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Catálogos y estructuras que sirven
            de base para el resto de la aplicación.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-4">

          <StatCard
            title="Competiciones"
            value={
              competitionsLoading
                ? "..."
                : competitionCount.toString()
            }
          />

          <StatCard
            title="Temporadas"
            value={
              seasonsLoading
                ? "..."
                : seasonCount.toString()
            }
          />

          <StatCard
            title="Jornadas / Fases"
            value={
              stagesLoading
                ? "..."
                : stageCount.toString()
            }
          />

        </div>

      </section>

    </div>
  );
}