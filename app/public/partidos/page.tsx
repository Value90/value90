"use client";

import { useEffect, useMemo, useState } from "react";

import PublicHeader from "@/components/public/PublicHeader";
import PublicPageHeader from "@/components/public/PublicPageHeader";

import {
  getCompetitions,
  type Competition,
} from "@/services/competition.service";

import {
  getSeasons,
  type Season,
} from "@/services/season.service";

import {
  getStages,
  type Stage,
} from "@/services/stage.service";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import {
  getMatches,
  type Match,
} from "@/services/match.service";

/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const MADRID_TIME_ZONE = "Europe/Madrid";

/*
 * ============================================================
 * UTILIDADES DE FECHA
 * ============================================================
 */

function getTodayMadrid(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year =
    parts.find((part) => part.type === "year")?.value ?? "";

  const month =
    parts.find((part) => part.type === "month")?.value ?? "";

  const day =
    parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function getMatchDateMadrid(
  date: string | null | undefined
): string {
  if (!date) {
    return "";
  }

  const dateOnlyMatch = date.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (dateOnlyMatch) {
    return date;
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsedDate);

  const year =
    parts.find((part) => part.type === "year")?.value ?? "";

  const month =
    parts.find((part) => part.type === "month")?.value ?? "";

  const day =
    parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function formatTodayDate(date: string): string {
  if (!date) {
    return "";
  }

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return "";
  }

  const parsedDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsedDate);
}

/*
 * ============================================================
 * UTILIDADES
 * ============================================================
 */

function getStageNumber(name: string): number {
  return Number(name.match(/\d+/)?.[0] ?? 0);
}

function getTeamInitials(teamName: string): string {
  const words = teamName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "??";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/*
 * ============================================================
 * SELECT DE FILTRO
 * ============================================================
 */

interface FilterSelectProps {
  label: string;
  value: string;
  options: {
    value: string;
    label: string;
  }[];
  onChange: (value: string) => void;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/*
 * ============================================================
 * GRUPO DE PARTIDOS
 * ============================================================
 */

interface MatchGroup {
  competitionId: number;
  seasonId: number;
  stageId: number;
  competitionName: string;
  seasonName: string;
  stageName: string;
  matches: Match[];
}

/*
 * ============================================================
 * PÁGINA
 * ============================================================
 */

export default function PublicMatchesPage() {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [stages, setStages] =
    useState<Stage[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  /*
   * ============================================================
   * ESTADO
   * ============================================================
   */

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [today, setToday] =
    useState(() => getTodayMadrid());

  /*
   * ============================================================
   * FILTROS
   * ============================================================
   */

  const [selectedCompetitionId, setSelectedCompetitionId] =
    useState("");

  const [selectedStageId, setSelectedStageId] =
    useState("");

  const [selectedTeamId, setSelectedTeamId] =
    useState("");

  /*
   * ============================================================
   * ACTUALIZACIÓN AUTOMÁTICA DEL DÍA
   * ============================================================
   */

  useEffect(() => {
    const updateToday = () => {
      setToday(getTodayMadrid());
    };

    const interval = window.setInterval(
      updateToday,
      60 * 1000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          matchesData,
          competitionsData,
          seasonsData,
          stagesData,
          teamsData,
        ] = await Promise.all([
          getMatches(),
          getCompetitions(),
          getSeasons(),
          getStages(),
          getTeams(),
        ]);

        if (!mounted) {
          return;
        }

        setMatches(matchesData);
        setCompetitions(competitionsData);
        setSeasons(seasonsData);
        setStages(stagesData);
        setTeams(teamsData);
      } catch (err) {
        console.error(
          "Error cargando partidos públicos:",
          err
        );

        if (!mounted) {
          return;
        }

        setMatches([]);
        setCompetitions([]);
        setSeasons([]);
        setStages([]);
        setTeams([]);

        setError(
          "No se pudieron cargar los partidos."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * PARTIDOS DE HOY
   * ============================================================
   */

  const todayMatches = useMemo(() => {
    return matches
      .filter(
        (match) =>
          getMatchDateMadrid(match.date) === today
      )
      .sort((a, b) => {
        const dateA =
          new Date(a.date).getTime();

        const dateB =
          new Date(b.date).getTime();

        return dateA - dateB;
      });
  }, [matches, today]);

  /*
   * ============================================================
   * COMPETICIONES
   *
   * TODAS las competiciones disponibles.
   * ============================================================
   */

  const competitionOptions = useMemo(() => {
    return [...competitions].sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "es",
        {
          sensitivity: "base",
        }
      )
    );
  }, [competitions]);

  /*
   * ============================================================
   * COMPETICIÓN SELECCIONADA
   * ============================================================
   */

  const selectedCompetition = useMemo(() => {
    if (!selectedCompetitionId) {
      return null;
    }

    return (
      competitions.find(
        (competition) =>
          competition.id ===
          Number(selectedCompetitionId)
      ) ?? null
    );
  }, [
    competitions,
    selectedCompetitionId,
  ]);

  /*
   * ============================================================
   * JORNADAS DISPONIBLES
   *
   * REGLA:
   *
   * SIN COMPETICIÓN:
   *   Todas las jornadas que aparecen en partidos.
   *
   * CON COMPETICIÓN:
   *   Solo las jornadas que realmente tienen partidos
   *   de esa competición.
   *
   * Esto evita, por ejemplo:
   *
   * LaLiga
   *   -> Jornada 1
   *   -> Jornada 2
   *   -> Jornada 3
   *
   * pero nunca:
   *   -> Dieciseisavos de final
   *   -> Octavos de final
   *
   * si esa competición no tiene esos stages.
   * ============================================================
   */

  const stageOptions = useMemo(() => {
    let relevantMatches = matches;

    /*
     * Si hay competición seleccionada,
     * limitamos primero sus partidos.
     */
    if (selectedCompetitionId) {
      relevantMatches =
        relevantMatches.filter(
          (match) =>
            match.competitionId ===
            Number(selectedCompetitionId)
        );
    }

    /*
     * Sacamos únicamente los stageId que realmente
     * existen en esos partidos.
     */
    const stageIdsWithMatches =
      new Set(
        relevantMatches.map(
          (match) => match.stageId
        )
      );

    return stages
      .filter((stage) =>
        stageIdsWithMatches.has(stage.id)
      )
      .sort((a, b) => {
        const numberA =
          getStageNumber(a.name);

        const numberB =
          getStageNumber(b.name);

        if (numberA !== numberB) {
          return numberA - numberB;
        }

        return a.name.localeCompare(
          b.name,
          "es",
          {
            sensitivity: "base",
          }
        );
      });
  }, [
    matches,
    stages,
    selectedCompetitionId,
  ]);

  /*
   * ============================================================
   * EQUIPOS DISPONIBLES
   *
   * SIN COMPETICIÓN:
   *   Todos los equipos que aparecen en partidos.
   *
   * CON COMPETICIÓN:
   *   Solo equipos que participan en esa competición.
   *
   * IMPORTANTE:
   * No utilizamos team.competitionId porque un club puede
   * jugar Champions y tener LaLiga como competición principal.
   *
   * Utilizamos los equipos que realmente aparecen en partidos.
   * ============================================================
   */

  const teamOptions = useMemo(() => {
    let relevantMatches = matches;

    /*
     * Primero filtramos por competición si existe.
     */
    if (selectedCompetitionId) {
      relevantMatches =
        relevantMatches.filter(
          (match) =>
            match.competitionId ===
            Number(selectedCompetitionId)
        );
    }

    /*
     * Si también hay jornada seleccionada,
     * reducimos todavía más los equipos.
     *
     * Así, al seleccionar:
     *
     * Champions -> Jornada 2
     *
     * aparecerán solamente los equipos que juegan
     * en esa jornada.
     */
    if (selectedStageId) {
      relevantMatches =
        relevantMatches.filter(
          (match) =>
            match.stageId ===
            Number(selectedStageId)
        );
    }

    const teamIds = new Set<number>();

    relevantMatches.forEach((match) => {
      teamIds.add(match.homeTeamId);
      teamIds.add(match.awayTeamId);
    });

    return teams
      .filter((team) =>
        teamIds.has(team.id)
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          "es",
          {
            sensitivity: "base",
          }
        )
      );
  }, [
    matches,
    teams,
    selectedCompetitionId,
    selectedStageId,
  ]);

  /*
   * ============================================================
   * PARTIDOS FILTRADOS
   *
   * SIN FILTROS:
   *   Solo partidos de hoy.
   *
   * CON FILTROS:
   *   Consulta sobre todos los partidos disponibles.
   * ============================================================
   */

  const filteredMatches = useMemo(() => {
    const hasFilters =
      selectedCompetitionId ||
      selectedStageId ||
      selectedTeamId;

    /*
     * Vista inicial:
     * solamente partidos de hoy.
     */
    if (!hasFilters) {
      return todayMatches;
    }

    /*
     * Consulta:
     * todos los partidos.
     */
    return matches
      .filter((match) => {
        /*
         * COMPETICIÓN
         */
        if (
          selectedCompetitionId &&
          match.competitionId !==
            Number(selectedCompetitionId)
        ) {
          return false;
        }

        /*
         * JORNADA
         */
        if (
          selectedStageId &&
          match.stageId !==
            Number(selectedStageId)
        ) {
          return false;
        }

        /*
         * EQUIPO
         */
        if (selectedTeamId) {
          const teamId =
            Number(selectedTeamId);

          if (
            match.homeTeamId !== teamId &&
            match.awayTeamId !== teamId
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA =
          new Date(a.date).getTime();

        const dateB =
          new Date(b.date).getTime();

        return dateB - dateA;
      });
  }, [
    matches,
    todayMatches,
    selectedCompetitionId,
    selectedStageId,
    selectedTeamId,
  ]);

  /*
   * ============================================================
   * AGRUPAR PARTIDOS
   *
   * TEMPORADA + COMPETICIÓN + JORNADA
   * ============================================================
   */

  const groupedMatches = useMemo(() => {
    const groups = new Map<
      string,
      MatchGroup
    >();

    filteredMatches.forEach((match) => {
      const competition =
        competitions.find(
          (item) =>
            item.id ===
            match.competitionId
        );

      const season =
        seasons.find(
          (item) =>
            item.id === match.seasonId
        );

      const stage =
        stages.find(
          (item) =>
            item.id === match.stageId
        );

      const competitionName =
        competition?.name ??
        "Sin competición";

      const seasonName =
        season?.name ??
        "Sin temporada";

      const stageName =
        stage?.name ??
        "Sin jornada";

      const groupKey =
        `${match.seasonId}-${match.competitionId}-${match.stageId}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          competitionId:
            match.competitionId,
          seasonId:
            match.seasonId,
          stageId:
            match.stageId,
          competitionName,
          seasonName,
          stageName,
          matches: [],
        });
      }

      groups
        .get(groupKey)!
        .matches.push(match);
    });

    return Array.from(
      groups.values()
    ).sort((a, b) => {
      /*
       * Competición
       */
      const competitionCompare =
        a.competitionName.localeCompare(
          b.competitionName,
          "es",
          {
            sensitivity: "base",
          }
        );

      if (competitionCompare !== 0) {
        return competitionCompare;
      }

      /*
       * Temporada
       */
      const seasonCompare =
        a.seasonName.localeCompare(
          b.seasonName,
          "es",
          {
            sensitivity: "base",
          }
        );

      if (seasonCompare !== 0) {
        return seasonCompare;
      }

      /*
       * Jornada
       */
      const stageNumberA =
        getStageNumber(a.stageName);

      const stageNumberB =
        getStageNumber(b.stageName);

      if (
        stageNumberA !== stageNumberB
      ) {
        return (
          stageNumberA -
          stageNumberB
        );
      }

      return a.stageName.localeCompare(
        b.stageName,
        "es",
        {
          sensitivity: "base",
        }
      );
    });
  }, [
    filteredMatches,
    competitions,
    seasons,
    stages,
  ]);

  /*
   * ============================================================
   * CAMBIOS DE FILTROS
   * ============================================================
   */

  const handleCompetitionChange = (
    value: string
  ) => {
    /*
     * Al cambiar competición eliminamos la jornada
     * y el equipo anteriores porque podrían no pertenecer
     * a la nueva competición.
     */
    setSelectedCompetitionId(value);
    setSelectedStageId("");
    setSelectedTeamId("");
  };

  const handleStageChange = (
    value: string
  ) => {
    /*
     * Al cambiar jornada reiniciamos el equipo,
     * porque el equipo anterior puede no participar
     * en la nueva jornada.
     */
    setSelectedStageId(value);
    setSelectedTeamId("");
  };

  const handleTeamChange = (
    value: string
  ) => {
    setSelectedTeamId(value);
  };

  const clearFilters = () => {
    setSelectedCompetitionId("");
    setSelectedStageId("");
    setSelectedTeamId("");
  };

  /*
   * ============================================================
   * EQUIPOS
   * ============================================================
   */

  const getTeam = (teamId: number) => {
    return teams.find(
      (team) => team.id === teamId
    );
  };

  const getTeamName = (
    teamId: number
  ) => {
    const team = getTeam(teamId);

    return (
      team?.name ??
      `Equipo #${teamId}`
    );
  };

  const getTeamShortName = (
    teamId: number
  ) => {
    const team = getTeam(teamId);

    const teamName =
      team?.name ??
      `Equipo #${teamId}`;

    return (
      team?.shortName ??
      getTeamInitials(teamName)
    );
  };

  /*
   * ============================================================
   * ESTADO DE FILTROS
   * ============================================================
   */

  const hasFilters =
    Boolean(selectedCompetitionId) ||
    Boolean(selectedStageId) ||
    Boolean(selectedTeamId);

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />

      <main>
        <PublicPageHeader
          eyebrow="Partidos"
          title="Partidos"
          description="Consulta los partidos y resultados de Value90."
        />

        <section className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          {/* =====================================================
              CABECERA
              ===================================================== */}

          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <span className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-600">
                  {hasFilters
                    ? "Consulta"
                    : "Hoy"}
                </span>
              </div>

              <h2 className="mt-2 text-xl font-black capitalize tracking-tight text-slate-900 sm:text-2xl">
                {hasFilters
                  ? "Resultados filtrados"
                  : formatTodayDate(today)}
              </h2>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3 text-center sm:min-w-[130px]">
              <div className="text-2xl font-black text-slate-900">
                {filteredMatches.length}
              </div>

              <div className="text-xs font-medium text-slate-500">
                {filteredMatches.length ===
                1
                  ? "partido"
                  : "partidos"}
              </div>
            </div>
          </div>

          {/* =====================================================
              FILTROS
              ===================================================== */}

          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Consultar partidos
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Selecciona una competición,
                jornada o equipo para consultar
                sus partidos.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {/* =================================================
                  COMPETICIÓN
                  ================================================= */}

              <FilterSelect
                label="Competición"
                value={
                  selectedCompetitionId
                }
                options={[
                  {
                    value: "",
                    label:
                      "Todas las competiciones",
                  },
                  ...competitionOptions.map(
                    (competition) => ({
                      value:
                        competition.id.toString(),
                      label:
                        competition.name,
                    })
                  ),
                ]}
                onChange={
                  handleCompetitionChange
                }
              />

              {/* =================================================
                  JORNADA
                  ================================================= */}

              <FilterSelect
                label="Jornada / fase"
                value={selectedStageId}
                options={[
                  {
                    value: "",
                    label:
                      "Todas las jornadas",
                  },
                  ...stageOptions.map(
                    (stage) => ({
                      value:
                        stage.id.toString(),
                      label: stage.name,
                    })
                  ),
                ]}
                onChange={
                  handleStageChange
                }
              />

              {/* =================================================
                  EQUIPO
                  ================================================= */}

              <FilterSelect
                label="Equipo"
                value={selectedTeamId}
                options={[
                  {
                    value: "",
                    label:
                      "Todos los equipos",
                  },
                  ...teamOptions.map(
                    (team) => ({
                      value:
                        team.id.toString(),
                      label: team.name,
                    })
                  ),
                ]}
                onChange={
                  handleTeamChange
                }
              />
            </div>

            {hasFilters && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-bold text-emerald-600 transition hover:text-emerald-700"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {/* =====================================================
              ERROR
              ===================================================== */}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* =====================================================
              CARGANDO
              ===================================================== */}

          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
              <div className="text-sm font-medium text-slate-500">
                Cargando partidos...
              </div>
            </div>
          )}

          {/* =====================================================
              SIN PARTIDOS
              ===================================================== */}

          {!loading &&
            groupedMatches.length ===
              0 && (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-400">
                  —
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  No hay partidos
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  No existen partidos que
                  coincidan con la consulta
                  seleccionada.
                </p>
              </div>
            )}

          {/* =====================================================
              GRUPOS DE PARTIDOS
              ===================================================== */}

          {!loading &&
            groupedMatches.length >
              0 && (
              <div className="space-y-8">
                {groupedMatches.map(
                  (group) => (
                    <section
                      key={`${group.seasonId}-${group.competitionId}-${group.stageId}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      {/* ==========================================
                          CABECERA ÚNICA
                          ========================================== */}

                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-sm font-bold text-slate-900 sm:text-base">
                            {
                              group.competitionName
                            }
                          </span>

                          <span className="text-slate-300">
                            •
                          </span>

                          <span className="text-sm text-slate-500">
                            Temporada{" "}
                            {
                              group.seasonName
                            }
                          </span>

                          <span className="text-slate-300">
                            •
                          </span>

                          <span className="text-sm font-semibold text-slate-500">
                            {group.stageName}
                          </span>
                        </div>
                      </div>

                      {/* ==========================================
                          PARTIDOS
                          ========================================== */}

                      <div>
                        {group.matches.map(
                          (
                            match,
                            index
                          ) => {
                            const homeName =
                              getTeamName(
                                match.homeTeamId
                              );

                            const awayName =
                              getTeamName(
                                match.awayTeamId
                              );

                            const homeShort =
                              getTeamShortName(
                                match.homeTeamId
                              );

                            const awayShort =
                              getTeamShortName(
                                match.awayTeamId
                              );

                            return (
                              <div
                                key={
                                  match.id
                                }
                                className={`px-5 py-6 sm:px-7 ${
                                  index !==
                                  group.matches
                                    .length -
                                    1
                                    ? "border-b border-slate-100"
                                    : ""
                                }`}
                              >
                                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
                                  {/* LOCAL */}

                                  <div className="flex min-w-0 items-center justify-end gap-3">
                                    <div className="min-w-0 text-right">
                                      <div className="truncate text-sm font-bold text-slate-900 sm:text-base">
                                        {
                                          homeName
                                        }
                                      </div>

                                      <div className="text-xs text-slate-400">
                                        Local
                                      </div>
                                    </div>

                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500">
                                      {
                                        homeShort
                                      }
                                    </div>
                                  </div>

                                  {/* RESULTADO */}

                                  <div className="flex min-w-[92px] flex-col items-center">
                                    <div className="flex items-center gap-2 text-3xl font-black tracking-tight text-slate-950">
                                      <span>
                                        {match.homeScore ??
                                          "—"}
                                      </span>

                                      <span className="text-xl font-medium text-slate-300">
                                        -
                                      </span>

                                      <span>
                                        {match.awayScore ??
                                          "—"}
                                      </span>
                                    </div>

                                    <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                      {match.status}
                                    </span>
                                  </div>

                                  {/* VISITANTE */}

                                  <div className="flex min-w-0 items-center justify-start gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500">
                                      {
                                        awayShort
                                      }
                                    </div>

                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-bold text-slate-900 sm:text-base">
                                        {
                                          awayName
                                        }
                                      </div>

                                      <div className="text-xs text-slate-400">
                                        Visitante
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </section>
                  )
                )}
              </div>
            )}
        </section>
      </main>
    </div>
  );
}