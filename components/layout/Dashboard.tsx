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

  const [stagesLoading, setStagesLoading] =
    useState(true);

  const [matchCount, setMatchCount] =
    useState(0);

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

  const [
    matchRatingsLoading,
    setMatchRatingsLoading,
  ] = useState(true);

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
   * VALOR A MOSTRAR — MEDIA EXTERNA
   * ============================================================
   */

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
    <div className="w-full p-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-10">

        <h1 className="text-4xl font-bold text-slate-800">
          Bienvenido a Value90
        </h1>

        <p className="mt-2 text-slate-600">
          Panel de administración
        </p>

      </div>

      {/* ======================================================
          1. MOTOR V90
          ====================================================== */}

      <section className="mb-10">

        <div className="mb-5">

          <h2 className="text-xl font-bold text-slate-800">
            Motor V90
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Métricas calculadas automáticamente
            por el motor de valoración V90.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">

          {/* ==================================================
              1. MATCH RATINGS
              ================================================== */}

          <StatCard
            title="Match Ratings"
            value={
              matchRatingsLoading
                ? "..."
                : matchRatingCount.toString()
            }
          />

          {/* ==================================================
              2. V90 MEDIO
              ================================================== */}

          <StatCard
            title="V90 Medio"
            value="—"
          />

          {/* ==================================================
              3. MEDIA EXTERNA
              ================================================== */}

          <StatCard
            title="Media externa"
            value={
              externalAverageDisplay
            }
          />

          {/* ==================================================
              4. V90 MATCH RATING
              ================================================== */}

          <StatCard
            title="V90 Match Rating"
            value="—"
          />

          {/* ==================================================
              5. CONFIANZA
              ================================================== */}

          <StatCard
            title="Confianza"
            value="—"
          />

        </div>

      </section>

      {/* ======================================================
          2. DATOS DEPORTIVOS
          ====================================================== */}

      <section className="mb-10">

        <div className="mb-5">

          <h2 className="text-xl font-bold text-slate-800">
            Datos deportivos
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Información registrada sobre partidos,
            participaciones y estadísticas.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">

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

        <div className="mb-5">

          <h2 className="text-xl font-bold text-slate-800">
            Datos maestros
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Catálogos y estructuras que sirven
            de base para el resto de la aplicación.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

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