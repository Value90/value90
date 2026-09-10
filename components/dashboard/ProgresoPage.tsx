"use client";

import { useEffect, useMemo, useState } from "react";

import { getSeasons } from "@/services/season.service";
import { getCompetitions } from "@/services/competition.service";
import { getTeams } from "@/services/team.service";
import { getStages } from "@/services/stage.service";
import { getMatches } from "@/services/match.service";
import { getParticipations } from "@/services/participation.service";
import { getMatchRatings } from "@/services/match-rating.service";
import { getPlayerMatchStats } from "@/services/player-match-stat.service";
import {
  getHistPlayerTeamsByTeamAndSeason,
} from "@/services/hist-player-team.service";

import type { Season } from "@/services/season.service";
import type { Competition } from "@/services/competition.service";
import type { Team } from "@/services/team.service";
import type { Stage } from "@/services/stage.service";
import type { Match } from "@/services/match.service";
import type { Participation } from "@/services/participation.service";
import type { MatchRating } from "@/services/match-rating.service";
import type { PlayerMatchStat } from "@/services/player-match-stat.service";
import type { HistPlayerTeam } from "@/services/hist-player-team.service";

type Tab = "teams" | "stages";

interface TeamProgress {
  team: Team;
  hasSquad: boolean;
  playerCount: number;
  hasCountry: boolean;
  hasStadium: boolean;
}

interface StageProgress {
  stage: Stage;
  matchCount: number;
  participationTeamCount: number;
  matchRatingCount: number;
  participationCount: number;
}

interface MatchProgress {
  match: Match;
  homeTeamName: string;
  awayTeamName: string;
  hasParticipationHome: boolean;
  hasParticipationAway: boolean;
  hasRatingHome: boolean;
  hasRatingAway: boolean;
  hasStatsHome: boolean;
  hasStatsAway: boolean;
}

export default function ProgresoPage() {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [stages, setStages] =
    useState<Stage[]>([]);

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [matchRatings, setMatchRatings] =
    useState<MatchRating[]>([]);

  const [playerMatchStats, setPlayerMatchStats] =
    useState<PlayerMatchStat[]>([]);

  const [selectedSeasonId, setSelectedSeasonId] =
    useState<number | "">("");

  const [selectedCompetitionId, setSelectedCompetitionId] =
    useState<number | "">("");

  const [selectedStageId, setSelectedStageId] =
    useState<number | "">("");

  const [activeTab, setActiveTab] =
    useState<Tab>("teams");

  const [loading, setLoading] =
    useState(true);

  /*
   * ============================================================
   * PLANTILLAS
   * ============================================================
   */

  const [squadData, setSquadData] =
    useState<Record<number, HistPlayerTeam[]>>({});

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [
          seasonsData,
          competitionsData,
          teamsData,
          stagesData,
          matchesData,
          participationsData,
          matchRatingsData,
          playerMatchStatsData,
        ] = await Promise.all([
          getSeasons(),
          getCompetitions(),
          getTeams(),
          getStages(),
          getMatches(),
          getParticipations(),
          getMatchRatings(),
          getPlayerMatchStats(),
        ]);

        setSeasons(seasonsData);
        setCompetitions(competitionsData);
        setTeams(teamsData);
        setStages(stagesData);
        setMatches(matchesData);
        setParticipations(participationsData);
        setMatchRatings(matchRatingsData);
        setPlayerMatchStats(playerMatchStatsData);

        if (seasonsData.length > 0) {
          setSelectedSeasonId(
            seasonsData[0].id
          );
        }
      } catch (error) {
        console.error(
          "Error cargando datos de progreso:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /*
   * ============================================================
   * COMPETICIONES DISPONIBLES
   *
   * Incluimos:
   * - Ligas
   * - Selecciones
   *
   * Una competición aparece si está relacionada con la
   * temporada mediante partidos o equipos.
   * ============================================================
   */

  const availableCompetitions =
    useMemo(() => {
      if (selectedSeasonId === "") {
        return [];
      }

      const competitionIds = new Set<number>();

      /*
       * Una competición pertenece a la temporada si tiene
       * partidos registrados en esa temporada.
       */
      matches
        .filter(
          (match) =>
            match.seasonId === selectedSeasonId
        )
        .forEach((match) => {
          competitionIds.add(match.competitionId);
        });

      /*
       * También añadimos competiciones asociadas directamente
       * a equipos que tienen plantilla en la temporada.
       *
       * La plantilla es la referencia para que una selección
       * pueda aparecer aunque todavía no tenga partidos cargados.
       */
      teams.forEach((team) => {
        if (
          team.competitionId !== null &&
          team.competitionId !== undefined
        ) {
          competitionIds.add(team.competitionId);
        }
      });

      return competitions
        .filter((competition) =>
          competitionIds.has(competition.id)
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name)
        );
    }, [
      selectedSeasonId,
      competitions,
      matches,
      teams,
    ]);

  /*
   * ============================================================
   * CAMBIO DE TEMPORADA
   * ============================================================
   */

  const handleSeasonChange = (
    value: string
  ) => {
    const seasonId =
      value === ""
        ? ""
        : Number(value);

    setSelectedSeasonId(seasonId);
    setSelectedCompetitionId("");
    setSelectedStageId("");
    setSquadData({});
  };

  /*
   * ============================================================
   * JORNADAS DISPONIBLES
   * ============================================================
   */

  const availableStages = useMemo(() => {
    if (selectedSeasonId === "") return [];

    return stages
      .filter((stage) => stage.seasonId === selectedSeasonId)
      .filter((stage) =>
        selectedCompetitionId === ""
          ? true
          : matches.some(
              (match) =>
                match.seasonId === selectedSeasonId &&
                match.stageId === stage.id &&
                match.competitionId === selectedCompetitionId
            )
      )
      .sort((a, b) => {
        const numberA = Number(a.name.match(/\d+/)?.[0] ?? -1);
        const numberB = Number(b.name.match(/\d+/)?.[0] ?? -1);
        return numberA !== numberB
          ? numberB - numberA
          : b.displayOrder - a.displayOrder;
      });
  }, [stages, matches, selectedSeasonId, selectedCompetitionId]);

  const handleStageChange = (value: string) => {
    setSelectedStageId(value === "" ? "" : Number(value));
  };

  /*
   * ============================================================
   * EQUIPOS
   * ============================================================
   */

  const teamProgress = useMemo<
    TeamProgress[]
  >(() => {
    if (selectedSeasonId === "") {
      return [];
    }

    /*
     * Para una temporada, los equipos que tienen plantilla
     * registrada son equipos válidos aunque no tengan todavía
     * partidos cargados.
     */
    const teamsWithSeasonSquad = new Set<number>(
      Object.entries(squadData)
        .filter(([, squad]) => squad.length > 0)
        .map(([teamId]) => Number(teamId))
    );

    /*
     * Equipos que aparecen en partidos de la competición
     * seleccionada. Esto permite incluir selecciones aunque
     * su competitionId no esté configurado de forma permanente.
     */
    const teamsFromSelectedCompetition =
      new Set<number>();

    if (selectedCompetitionId !== "") {
      matches
        .filter(
          (match) =>
            match.seasonId === selectedSeasonId &&
            match.competitionId === selectedCompetitionId
        )
        .forEach((match) => {
          teamsFromSelectedCompetition.add(
            match.homeTeamId
          );
          teamsFromSelectedCompetition.add(
            match.awayTeamId
          );
        });
    }

    let filteredTeams = teams.filter((team) => {
      if (selectedCompetitionId === "") {
        return (
          team.competitionId !== null &&
          team.competitionId !== undefined
        ) || teamsWithSeasonSquad.has(team.id);
      }

      return (
        team.competitionId === selectedCompetitionId ||
        teamsFromSelectedCompetition.has(team.id)
      );
    });

    return filteredTeams
      .map((team) => ({
        team,

        hasSquad:
          teamsWithSeasonSquad.has(team.id),

        playerCount:
          squadData[team.id]?.length ?? 0,

        hasCountry:
          team.countryId !== null &&
          team.countryId !== undefined,

        hasStadium:
          Boolean(
            team.stadium &&
            team.stadium.trim() !== ""
          ),
      }))
      .sort((a, b) =>
        a.team.name.localeCompare(
          b.team.name
        )
      );
  }, [
    teams,
    matches,
    selectedCompetitionId,
    selectedSeasonId,
    squadData,
  ]);

  /*
   * ============================================================
   * CARGAR PLANTILLAS
   * ============================================================
   */

  useEffect(() => {
    if (selectedSeasonId === "") {
      setSquadData({});
      return;
    }

    const loadSquads = async () => {
      try {
        const result: Record<
          number,
          HistPlayerTeam[]
        > = {};

        /*
         * IMPORTANTE:
         * No filtramos aquí por competición.
         *
         * hist_player_teams guarda equipo + temporada, pero
         * no guarda competition_id. Por tanto primero debemos
         * cargar las plantillas de TODOS los equipos de la
         * temporada y después aplicar el filtro de competición.
         */
        await Promise.all(
          teams.map(async (team) => {
            const squad =
              await getHistPlayerTeamsByTeamAndSeason(
                team.id,
                selectedSeasonId
              );

            if (squad.length > 0) {
              result[team.id] = squad;
            }
          })
        );

        setSquadData(result);
      } catch (error) {
        console.error(
          "Error obteniendo plantillas:",
          error
        );

        setSquadData({});
      }
    };

    loadSquads();
  }, [
    selectedSeasonId,
    teams,
  ]);

  /*
   * ============================================================
   * COMPLETAR DATOS DE EQUIPOS
   * ============================================================
   */

  const teamProgressWithSquads =
    useMemo<TeamProgress[]>(() => {
      return teamProgress;
    }, [teamProgress]);

  /*
   * ============================================================
   * JORNADAS
   * ============================================================
   *
   * IMPORTANTE:
   *
   * Las jornadas se ordenan por el número de jornada
   * que aparece en el nombre, de mayor a menor.
   *
   * Ejemplo:
   *
   * Jornada 4
   * Jornada 3
   * Jornada 2
   * Jornada 1
   *
   * De esta forma no dependemos de displayOrder,
   * que puede contener valores históricos diferentes.
   * ============================================================
   */

  const stageProgress =
    useMemo<StageProgress[]>(() => {
      if (selectedSeasonId === "") {
        return [];
      }

      const seasonStages =
        stages
          .filter(
            (stage) =>
              stage.seasonId ===
              selectedSeasonId
          )
          .sort((a, b) => {
            /*
             * Extraer el número de jornada
             * del nombre.
             *
             * Ejemplos:
             * "Jornada 4" -> 4
             * "Jornada 3" -> 3
             * "Jornada 2" -> 2
             * "Jornada 1" -> 1
             */

            const numberA =
              Number(
                a.name.match(/\d+/)?.[0] ??
                  -1
              );

            const numberB =
              Number(
                b.name.match(/\d+/)?.[0] ??
                  -1
              );

            /*
             * DESCENDENTE
             *
             * 4 → 3 → 2 → 1
             */

            if (
              numberA !== numberB
            ) {
              return numberB - numberA;
            }

            /*
             * Si no tienen número o tienen
             * el mismo número, usamos
             * displayOrder como desempate.
             */

            return (
              b.displayOrder -
              a.displayOrder
            );
          });

      return seasonStages.map(
        (stage) => {
          /*
           * ======================================================
           * PARTIDOS DE LA JORNADA
           * ======================================================
           */

          let stageMatches =
            matches.filter(
              (match) =>
                match.seasonId ===
                  selectedSeasonId &&
                match.stageId ===
                  stage.id
            );

          if (
            selectedCompetitionId !== ""
          ) {
            stageMatches =
              stageMatches.filter(
                (match) =>
                  match.competitionId ===
                  selectedCompetitionId
              );
          }

          const matchIds =
            new Set(
              stageMatches.map(
                (match) => match.id
              )
            );

          /*
           * ======================================================
           * PARTICIPACIONES DE LA JORNADA
           * ======================================================
           */

          const stageParticipations =
            participations.filter(
              (participation) =>
                matchIds.has(
                  participation.matchId
                )
            );

          /*
           * ======================================================
           * EQUIPOS CON PARTICIPACIONES
           * ======================================================
           */

          const participationTeamIds =
            new Set<number>();

          stageParticipations.forEach(
            (participation) => {
              if (
                participation.teamId !==
                  null &&
                participation.teamId !==
                  undefined
              ) {
                participationTeamIds.add(
                  participation.teamId
                );
              }
            }
          );

          /*
           * ======================================================
           * MATCH RATINGS
           * ======================================================
           */

          const matchRatingCount =
            matchRatings.filter(
              (rating) =>
                matchIds.has(
                  rating.matchId
                )
            ).length;

          return {
            stage,

            matchCount:
              stageMatches.length,

            participationTeamCount:
              participationTeamIds.size,

            participationCount:
              stageParticipations.length,

            matchRatingCount,
          };
        }
      );
    }, [
      selectedSeasonId,
      selectedCompetitionId,
      stages,
      matches,
      participations,
      matchRatings,
    ]);

  /*
   * ============================================================
   * PARTIDOS DE LA JORNADA SELECCIONADA
   * ============================================================
   */

 const matchProgress = useMemo<MatchProgress[]>(() => {
    if (
      selectedSeasonId === "" ||
      selectedStageId === ""
      ) {
    return [];
    }

    return matches
      .filter(
        (match) =>
          match.seasonId === selectedSeasonId &&
          match.stageId === selectedStageId
      )
      .filter((match) =>
        selectedCompetitionId === ""
          ? true
          : match.competitionId ===
            selectedCompetitionId
      )
      .sort((a, b) =>
        a.date.localeCompare(b.date)
      )
      .map((match) => {
        const matchParticipations =
          participations.filter(
            (participation) =>
              participation.matchId ===
              match.id
          );

        const homeParticipationIds =
          new Set(
            matchParticipations
              .filter(
                (participation) =>
                  participation.teamId ===
                  match.homeTeamId
              )
              .map(
                (participation) =>
                  participation.id
              )
          );

        const awayParticipationIds =
          new Set(
            matchParticipations
              .filter(
                (participation) =>
                  participation.teamId ===
                  match.awayTeamId
              )
              .map(
                (participation) =>
                  participation.id
              )
          );

        const hasParticipationHome =
          homeParticipationIds.size > 0;

        const hasParticipationAway =
          awayParticipationIds.size > 0;

        const hasRatingHome =
          matchRatings.some(
            (rating) =>
              rating.matchId === match.id &&
              homeParticipationIds.has(
                rating.participationId
              )
          );

        const hasRatingAway =
          matchRatings.some(
            (rating) =>
              rating.matchId === match.id &&
              awayParticipationIds.has(
                rating.participationId
              )
          );

        const hasStatsHome =
          playerMatchStats.some(
            (stat) =>
              homeParticipationIds.has(
                stat.participationId
              )
          );

        const hasStatsAway =
          playerMatchStats.some(
            (stat) =>
              awayParticipationIds.has(
                stat.participationId
              )
          );

        return {
          match,
          homeTeamName:
            teams.find(
              (team) =>
                team.id ===
                match.homeTeamId
            )?.name ??
            `Equipo ${match.homeTeamId}`,

          awayTeamName:
            teams.find(
              (team) =>
                team.id ===
                match.awayTeamId
            )?.name ??
            `Equipo ${match.awayTeamId}`,

          hasParticipationHome,
          hasParticipationAway,
          hasRatingHome,
          hasRatingAway,
          hasStatsHome,
          hasStatsAway,
        };
      });
  }, [
    matches,
    teams,
    participations,
    matchRatings,
    playerMatchStats,
    selectedSeasonId,
    selectedStageId,
    selectedCompetitionId,
  ]);

  /*
   * ============================================================
   * EDITAR EQUIPO
   * ============================================================
   */

  const handleEditTeam = (
    teamId: number
  ) => {
    window.dispatchEvent(
      new CustomEvent("edit-team", {
        detail: {
          teamId,
        },
      })
    );
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

      <div className="mb-8">

        <h1 className="text-4xl font-bold text-slate-800">
          Progreso
        </h1>

        <p className="mt-2 text-slate-600">
          Control de los datos registrados y
          pendientes de cada temporada.
        </p>

      </div>

      {/* ======================================================
          FILTROS
          ====================================================== */}

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

          {/* TEMPORADA */}

          <div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Temporada
            </label>

            <select
              value={selectedSeasonId}
              onChange={(event) =>
                handleSeasonChange(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500"
            >

              <option value="">
                Seleccionar temporada
              </option>

              {seasons.map(
                (season) => (
                  <option
                    key={season.id}
                    value={season.id}
                  >
                    {season.name}
                  </option>
                )
              )}

            </select>

          </div>

          {/* COMPETICIÓN */}

          <div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Liga / Selección
            </label>

            <select
              value={
                selectedCompetitionId
              }
              onChange={(event) =>
                setSelectedCompetitionId(
                  event.target.value === ""
                    ? ""
                    : Number(
                        event.target.value
                      )
                )
              }
              disabled={
                selectedSeasonId === ""
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none disabled:bg-slate-100"
            >

              <option value="">
                Todas
              </option>

              {availableCompetitions.map(
                (competition) => (
                  <option
                    key={competition.id}
                    value={competition.id}
                  >
                    {competition.name}
                  </option>
                )
              )}

            </select>

          </div>

          {/* JORNADA */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Jornada
            </label>

            <select
              value={selectedStageId}
              onChange={(event) => handleStageChange(event.target.value)}
              disabled={selectedSeasonId === ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none disabled:bg-slate-100"
            >
              <option value="">Todas</option>
              {availableStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* ======================================================
          TABS
          ====================================================== */}

      <div className="mb-6 flex gap-2 border-b border-slate-200">

        <button
          type="button"
          onClick={() =>
            setActiveTab("teams")
          }
          className={`px-5 py-3 text-sm font-semibold transition ${
            activeTab === "teams"
              ? "border-b-2 border-slate-800 text-slate-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Equipos
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("stages")
          }
          className={`px-5 py-3 text-sm font-semibold transition ${
            activeTab === "stages"
              ? "border-b-2 border-slate-800 text-slate-800"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Jornadas
        </button>

      </div>

      {/* ======================================================
          CARGANDO
          ====================================================== */}

      {loading ? (

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Cargando progreso...
        </div>

      ) : selectedSeasonId === "" ? (

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Selecciona una temporada para
          consultar el progreso.
        </div>

      ) : (

        <>

          {/* ==================================================
              EQUIPOS
              ================================================== */}

          {activeTab === "teams" && (

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-5 py-4">

                <h2 className="text-lg font-bold text-slate-800">
                  Progreso de equipos
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Estado de las plantillas y
                  datos básicos de cada equipo.
                </p>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full text-left text-sm">

                  <thead className="bg-slate-100 text-xs uppercase text-slate-600">

                    <tr>

                      <th className="px-5 py-3">
                        Equipo
                      </th>

                      <th className="px-5 py-3 text-center">
                        Plantilla
                      </th>

                      <th className="px-5 py-3 text-center">
                        Jugadores
                      </th>

                      <th className="px-5 py-3 text-center">
                        País
                      </th>

                      <th className="px-5 py-3 text-center">
                        Estadio
                      </th>

                      <th className="px-5 py-3 text-center">
                        Ir
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {teamProgressWithSquads.map(
                      (item) => (

                        <tr
                          key={item.team.id}
                          className="hover:bg-slate-50"
                        >

                          <td className="px-5 py-3 font-medium text-slate-800">
                            {item.team.name}
                          </td>

                          <td className="px-5 py-3 text-center">

                            <span
                              className={
                                item.hasSquad
                                  ? "font-semibold text-green-600"
                                  : "font-semibold text-red-600"
                              }
                            >
                              {item.hasSquad
                                ? "Sí"
                                : "No"}
                            </span>

                          </td>

                          <td className="px-5 py-3 text-center text-slate-700">
                            {item.playerCount}
                          </td>

                          <td className="px-5 py-3 text-center">

                            <span
                              className={
                                item.hasCountry
                                  ? "font-semibold text-green-600"
                                  : "font-semibold text-red-600"
                              }
                            >
                              {item.hasCountry
                                ? "Sí"
                                : "No"}
                            </span>

                          </td>

                          <td className="px-5 py-3 text-center">

                            <span
                              className={
                                item.hasStadium
                                  ? "font-semibold text-green-600"
                                  : "font-semibold text-red-600"
                              }
                            >
                              {item.hasStadium
                                ? "Sí"
                                : "No"}
                            </span>

                          </td>

                          <td className="px-5 py-3 text-center">

                            <button
                              type="button"
                              onClick={() =>
                                handleEditTeam(
                                  item.team.id
                                )
                              }
                              title="Editar equipo"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                            >
                              ↗
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                    {teamProgressWithSquads.length ===
                      0 && (

                      <tr>

                        <td
                          colSpan={6}
                          className="px-5 py-8 text-center text-slate-500"
                        >
                          No hay equipos para
                          los filtros seleccionados.
                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          )}

          {/* ==================================================
              JORNADAS
              ================================================== */}

          {activeTab === "stages" && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-800">Progreso de jornadas</h2>
                <p className="mt-1 text-sm text-slate-500">Control de partidos y datos registrados en cada jornada.</p>
              </div>

              {selectedStageId === "" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                      <tr><th className="px-5 py-3">Jornada</th><th className="px-5 py-3 text-center">Partidos</th><th className="px-5 py-3 text-center">Participaciones</th><th className="px-5 py-3 text-center">Match Rating</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stageProgress.map((item) => (
                        <tr key={item.stage.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-800">{item.stage.name}</td>
                          <td className="px-5 py-3 text-center text-slate-700">{item.matchCount}</td>
                          <td className="px-5 py-3 text-center text-slate-700">{item.participationTeamCount}</td>
                          <td className="px-5 py-3 text-center text-slate-700">{item.matchRatingCount}/{item.participationCount}</td>
                        </tr>
                      ))}
                      {stageProgress.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No hay jornadas para los filtros seleccionados.</td></tr>}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div>
                  <div className="border-b border-slate-100 px-5 py-4">
                    <h3 className="text-base font-bold text-slate-800">{availableStages.find((stage) => stage.id === selectedStageId)?.name ?? "Jornada seleccionada"}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                        <tr>
                          <th rowSpan={2} className="px-5 py-3 align-middle">Partido</th>
                          <th colSpan={2} className="px-5 py-2 text-center">Participación</th>
                          <th colSpan={2} className="px-5 py-2 text-center">Valoración</th>
                          <th colSpan={2} className="px-5 py-2 text-center">Estadísticas</th>
                        </tr>
                        <tr>
                          <th className="px-5 py-2 text-center">Local</th>
                          <th className="px-5 py-2 text-center">Visitante</th>
                          <th className="px-5 py-2 text-center">Local</th>
                          <th className="px-5 py-2 text-center">Visitante</th>
                          <th className="px-5 py-2 text-center">Local</th>
                          <th className="px-5 py-2 text-center">Visitante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {matchProgress.map((item) => (
                          <tr key={item.match.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 font-medium text-slate-800">{item.homeTeamName} vs {item.awayTeamName}</td>
                            <td className="px-5 py-3 text-center"><span className={item.hasParticipationHome ? "font-bold text-green-600" : "font-bold text-red-600"}>{item.hasParticipationHome ? "V" : "X"}</span></td>
                            <td className="px-5 py-3 text-center"><span className={item.hasParticipationAway ? "font-bold text-green-600" : "font-bold text-red-600"}>{item.hasParticipationAway ? "V" : "X"}</span></td>
                            <td className="px-5 py-3 text-center"><span className={item.hasRatingHome ? "font-bold text-green-600" : "font-bold text-red-600"}>{item.hasRatingHome ? "V" : "X"}</span></td>
                            <td className="px-5 py-3 text-center"><span className={item.hasRatingAway ? "font-bold text-green-600" : "font-bold text-red-600"}>{item.hasRatingAway ? "V" : "X"}</span></td>
                            <td className="px-5 py-3 text-center"><span className={item.hasStatsHome ? "font-bold text-green-600" : "font-bold text-red-600"}>{item.hasStatsHome ? "V" : "X"}</span></td>
                            <td className="px-5 py-3 text-center"><span className={item.hasStatsAway ? "font-bold text-green-600" : "font-bold text-red-600"}>{item.hasStatsAway ? "V" : "X"}</span></td>
                          </tr>
                        ))}
                        {matchProgress.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">No hay partidos para la jornada y los filtros seleccionados.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </>

      )}

    </div>
  );
}