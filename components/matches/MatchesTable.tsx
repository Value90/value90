"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DataTable from "@/components/shared/tables/DataTable";
import { sortStagesDescending } from "@/lib/stage-order";

import {
  getMatches,
  type Match,
} from "@/services/match.service";

import {
  getCompetitions,
  type Competition,
} from "@/services/competition.service";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import { getStages, type Stage } from "@/services/stage.service";
import { getSeasons, type Season } from "@/services/season.service";

import type { ColumnDef } from "@tanstack/react-table";

interface MatchesTableProps {
  onEdit: (match: Match) => void;
  onDelete: (match: Match) => void;
}

export default function MatchesTable({
  onEdit,
  onDelete,
}: MatchesTableProps) {
  /*
   * ============================================================
   * PARTIDOS
   * ============================================================
   */

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [matchesLoading, setMatchesLoading] =
    useState(true);

  const [matchesError, setMatchesError] =
    useState("");
  const [highlightlyMatchIds, setHighlightlyMatchIds] = useState<Set<number>>(new Set());
  const [syncingMatchId, setSyncingMatchId] = useState<number | null>(null);
  const [syncMessage, setSyncMessage] = useState("");

  /*
   * ============================================================
   * COMPETICIONES
   * ============================================================
   */

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [
    competitionsLoading,
    setCompetitionsLoading,
  ] = useState(true);

  /*
   * ============================================================
   * EQUIPOS
   * ============================================================
   */

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [teamsLoading, setTeamsLoading] =
    useState(true);

  /*
   * ============================================================
   * FILTRO DE COMPETICIÓN
   * ============================================================
   */

  const [
    selectedCompetitionId,
    setSelectedCompetitionId,
  ] = useState(0);

  const [stages, setStages] = useState<Stage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState(0);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(0);

  /*
   * ============================================================
   * CARGAR PARTIDOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadMatches = async () => {
      try {
        setMatchesLoading(true);
        setMatchesError("");

        const data =
          await getMatches();

        if (!mounted) {
          return;
        }

        setMatches(data);
      } catch (error) {
        console.error(
          "Error obteniendo partidos:",
          error
        );

        if (!mounted) {
          return;
        }

        setMatches([]);

        setMatchesError(
          "No se pudieron cargar los partidos."
        );
      } finally {
        if (mounted) {
          setMatchesLoading(false);
        }
      }
    };

    loadMatches();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/admin/sports/sync", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "No se pudo consultar el estado de sincronización.");
        if (mounted) setHighlightlyMatchIds(new Set<number>((payload.matches ?? []).map((item: { matchId: number }) => Number(item.matchId))));
      })
      .catch((error) => console.error("No se pudieron cargar los partidos asociados a Highlightly:", error));
    return () => { mounted = false; };
  }, []);

  async function importMatchFromHighlightly(matchId: number) {
    setSyncingMatchId(matchId);
    setSyncMessage("");
    try {
      const response = await fetch("/api/admin/sports/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "No se pudieron importar los datos.");
      const detail = payload.results?.find((item: { matchId: number }) => Number(item.matchId) === matchId);
      setSyncMessage(detail?.ownRatings
        ? `Partido actualizado: resultado, participaciones, estadísticas y ${detail.ownRatings} valoraciones propias.`
        : "Partido actualizado. No se generó valoración propia: " + (detail?.ownRatingNote ?? "faltan estadísticas o entrenamiento con 11 jornadas."));
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "No se pudieron importar los datos.");
    } finally {
      setSyncingMatchId(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    getSeasons()
      .then((data) => {
        if (mounted) setSeasons(data);
      })
      .catch((error) => {
        console.error("Error obteniendo temporadas:", error);
        if (mounted) setSeasons([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSeasonId && seasons.length) {
      const activeSeason = seasons.find((season) => season.active);
      if (activeSeason) setSelectedSeasonId(activeSeason.id);
    }
  }, [seasons, selectedSeasonId]);

  useEffect(() => {
    let mounted = true;

    getStages()
      .then((data) => {
        if (mounted) setStages(data);
      })
      .catch((error) => {
        console.error("Error obteniendo jornadas / fases:", error);
        if (mounted) setStages([]);
      })
      .finally(() => {
        if (mounted) setStagesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * CARGAR COMPETICIONES
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadCompetitions =
      async () => {
        try {
          setCompetitionsLoading(true);

          const data =
            await getCompetitions();

          if (!mounted) {
            return;
          }

          setCompetitions(data);
        } catch (error) {
          console.error(
            "Error obteniendo competiciones:",
            error
          );

          if (!mounted) {
            return;
          }

          setCompetitions([]);
        } finally {
          if (mounted) {
            setCompetitionsLoading(false);
          }
        }
      };

    loadCompetitions();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * CARGAR EQUIPOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadTeams = async () => {
      try {
        setTeamsLoading(true);

        const data =
          await getTeams();

        if (!mounted) {
          return;
        }

        setTeams(data);
      } catch (error) {
        console.error(
          "Error obteniendo equipos:",
          error
        );

        if (!mounted) {
          return;
        }

        setTeams([]);
      } finally {
        if (mounted) {
          setTeamsLoading(false);
        }
      }
    };

    loadTeams();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * PARTIDOS FILTRADOS
   * ============================================================
   */

  const filteredMatches =
    useMemo(() => {
      return matches.filter(
        (match) => (!selectedSeasonId || match.seasonId === selectedSeasonId)
          && (!selectedCompetitionId || match.competitionId === selectedCompetitionId)
          && (!selectedStageId || match.stageId === selectedStageId)
      );
    }, [
      matches,
      selectedSeasonId,
      selectedCompetitionId,
      selectedStageId,
    ]);

  const availableStages = useMemo(() => {
    const stageIds = new Set(matches
      .filter((match) => (!selectedSeasonId || match.seasonId === selectedSeasonId)
        && (!selectedCompetitionId || match.competitionId === selectedCompetitionId))
      .map((match) => match.stageId)
      .filter((stageId): stageId is number => stageId > 0));

    return sortStagesDescending(stages.filter((stage) => stageIds.has(stage.id)));
  }, [matches, selectedSeasonId, selectedCompetitionId, stages]);

  /*
   * ============================================================
   * NOMBRE DE COMPETICIÓN
   * ============================================================
   */

  const getCompetitionName = (
    competitionId: number
  ) => {
    if (competitionsLoading) {
      return "Cargando...";
    }

    const competition =
      competitions.find(
        (item) =>
          item.id ===
          competitionId
      );

    return (
      competition?.name ??
      "Sin competición"
    );
  };

  /*
   * ============================================================
   * NOMBRE DE EQUIPO
   * ============================================================
   */

  const getTeamName = (
    teamId: number
  ) => {
    if (teamsLoading) {
      return "Cargando...";
    }

    const team =
      teams.find(
        (item) =>
          item.id === teamId
      );

    return (
      team?.name ??
      "Sin equipo"
    );
  };

  /*
   * ============================================================
   * FORMATEAR FECHA
   * ============================================================
   */

  const formatMatchDate = (
    value: string
  ) => {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Fecha no válida";
    }

    return date.toLocaleDateString(
      "es-ES",
      { timeZone: "Europe/Madrid" }
    );
  };

  /*
   * ============================================================
   * COLUMNAS
   * ============================================================
   */

  const columns: ColumnDef<
    Match,
    unknown
  >[] = [
    /*
     * ========================================================
     * COMPETICIÓN
     * ========================================================
     */

    {
      accessorKey:
        "competitionId",

      header:
        "Competición",

      cell: ({ row }) =>
        getCompetitionName(
          row.original
            .competitionId
        ),
    },

    /*
     * ========================================================
     * FECHA
     * ========================================================
     */

    {
      accessorKey:
        "date",

      header:
        "Fecha",

      cell: ({ row }) =>
        formatMatchDate(
          row.original.date
        ),
    },

    /*
     * ========================================================
     * LOCAL
     * ========================================================
     */

    {
      accessorFn: (row) =>
        getTeamName(
          row.homeTeamId
        ),

      header:
        "Local",

      cell: ({ row }) =>
        getTeamName(
          row.original
            .homeTeamId
        ),

      filterFn: (
        row,
        _columnId,
        filterValue
      ) => {
        const teamName =
          getTeamName(
            row.original
              .homeTeamId
          );

        return teamName
          .toLocaleLowerCase(
            "es"
          )
          .includes(
            String(
              filterValue ?? ""
            )
              .toLocaleLowerCase(
                "es"
              )
          );
      },
    },

    /*
     * ========================================================
     * VISITANTE
     * ========================================================
     */

    {
      accessorFn: (row) =>
        getTeamName(
          row.awayTeamId
        ),

      header:
        "Visitante",

      cell: ({ row }) =>
        getTeamName(
          row.original
            .awayTeamId
        ),

      filterFn: (
        row,
        _columnId,
        filterValue
      ) => {
        const teamName =
          getTeamName(
            row.original
              .awayTeamId
          );

        return teamName
          .toLocaleLowerCase(
            "es"
          )
          .includes(
            String(
              filterValue ?? ""
            )
              .toLocaleLowerCase(
                "es"
              )
          );
      },
    },

    /*
     * ========================================================
     * RESULTADO
     * ========================================================
     */

    {
      id: "score",

      header:
        "Resultado",

      cell: ({ row }) => (
        <span className="font-semibold whitespace-nowrap">
          {
            row.original
              .homeScore
          }
          {" - "}
          {
            row.original
              .awayScore
          }
        </span>
      ),
    },

    /*
     * ========================================================
     * ESTADIO
     * ========================================================
     */

    {
      accessorKey:
        "stadium",

      header:
        "Estadio",

      cell: ({ row }) =>
        row.original.stadium ||
        "—",
    },

    /*
     * ========================================================
     * ESTADO
     * ========================================================
     */

    {
      accessorKey:
        "status",

      header:
        "Estado",

      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.status}
        </span>
      ),
    },

    /*
     * ========================================================
     * ACCIONES
     * ========================================================
     */

    {
      id: "actions",

      header:
        "Acciones",

      enableSorting:
        false,

      cell: ({ row }) => (
        <div className="flex w-full min-w-0 items-center gap-1 whitespace-nowrap sm:gap-2">

          {highlightlyMatchIds.has(row.original.id) && (
            <button
              type="button"
              onClick={() => void importMatchFromHighlightly(row.original.id)}
              disabled={syncingMatchId !== null}
              aria-label={`Importar resultado y valoraciones de ${getTeamName(row.original.homeTeamId)} contra ${getTeamName(row.original.awayTeamId)}`}
              className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-emerald-300 bg-emerald-50 px-1.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60 sm:rounded-lg sm:px-2.5 sm:text-sm"
            >
              {syncingMatchId === row.original.id ? "Importando…" : "Importar"}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              onEdit(
                row.original
              )
            }
            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-slate-300 bg-white px-1.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 sm:rounded-lg sm:px-2.5 sm:text-sm"
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
            disabled={syncingMatchId === row.original.id}
            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-red-200 bg-white px-1.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 sm:rounded-lg sm:px-2.5 sm:text-sm"
          >
            Eliminar
          </button>

        </div>
      ),
    },
  ];

  /*
   * ============================================================
   * ERROR
   * ============================================================
   */

  if (matchesError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:p-6">
        {matchesError}
      </div>
    );
  }

  /*
   * ============================================================
   * CARGANDO
   * ============================================================
   */

  if (
    matchesLoading
  ) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm text-slate-500">
          Cargando partidos...
        </p>
      </div>
    );
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 space-y-4 overflow-hidden">

      {/* ======================================================
          FILTRO DE COMPETICIÓN
          ====================================================== */}

      <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">

        <select
          value={selectedSeasonId}
          onChange={(event) => {
            setSelectedSeasonId(Number(event.target.value));
            setSelectedStageId(0);
          }}
          aria-label="Filtrar por temporada"
          className="w-full min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500"
        >
          <option value={0}>Todas las temporadas</option>
          {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
        </select>

        <select
          value={
            selectedCompetitionId
          }
          onChange={(event) => {
            setSelectedCompetitionId(
              Number(
                event.target.value
              )
            );
            setSelectedStageId(0);
          }}
          className="w-full min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 sm:w-auto sm:min-w-[220px] sm:px-3"
        >

          <option value={0}>
            Todas las competiciones
          </option>

          {competitions
            .filter(
              (competition) =>
                competition.active
            )
            .sort(
              (a, b) =>
                a.name.localeCompare(
                  b.name,
                  "es"
                )
            )
            .map(
              (competition) => (
                <option
                  key={
                    competition.id
                  }
                  value={
                    competition.id
                  }
                >
                  {
                    competition.name
                  }
                </option>
              )
            )}

        </select>

        <select
          value={selectedStageId}
          onChange={(event) => setSelectedStageId(Number(event.target.value))}
          disabled={stagesLoading || availableStages.length === 0}
          aria-label="Filtrar por jornada o fase"
          className="w-full min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-50 sm:min-w-[220px]"
        >
          <option value={0}>Todas las jornadas / fases</option>
          {availableStages.map((stage) => (
            <option key={stage.id} value={stage.id}>{stage.name}</option>
          ))}
        </select>

      </div>

      {/* ======================================================
          TABLA RESPONSIVE
          ====================================================== */}

      <div className="matches-responsive-table w-full min-w-0 max-w-full overflow-hidden">

        {syncMessage && <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{syncMessage}</p>}

        <DataTable
          data={
            filteredMatches
          }
          columns={
            columns
          }
        />

      </div>

      {/* ======================================================
          ESTILOS RESPONSIVE
          ====================================================== */}

      <style jsx>{`
        /*
         * ======================================================
         * TABLA BASE
         * ======================================================
         *
         * El DataTable compartido tiene sus propios contenedores.
         * Aquí impedimos que la tabla provoque un ancho mayor que
         * el disponible y dejamos que el contenido se adapte.
         */

        .matches-responsive-table {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
        }

        .matches-responsive-table :global(table) {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          table-layout: fixed;
        }

        .matches-responsive-table :global(th),
        .matches-responsive-table :global(td) {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .matches-responsive-table :global(th) {
          line-height: 1.2;
        }

        /*
         * ======================================================
         * ESCRITORIO
         * ======================================================
         */

        @media (min-width: 1024px) {
          .matches-responsive-table :global(th),
          .matches-responsive-table :global(td) {
            padding: 0.75rem 0.65rem;
            font-size: 0.875rem;
          }

          /*
           * Reparto de ancho de las columnas.
           */

          .matches-responsive-table :global(th:nth-child(1)),
          .matches-responsive-table :global(td:nth-child(1)) {
            width: 14%;
          }

          .matches-responsive-table :global(th:nth-child(2)),
          .matches-responsive-table :global(td:nth-child(2)) {
            width: 9%;
          }

          .matches-responsive-table :global(th:nth-child(3)),
          .matches-responsive-table :global(td:nth-child(3)) {
            width: 14%;
          }

          .matches-responsive-table :global(th:nth-child(4)),
          .matches-responsive-table :global(td:nth-child(4)) {
            width: 14%;
          }

          .matches-responsive-table :global(th:nth-child(5)),
          .matches-responsive-table :global(td:nth-child(5)) {
            width: 8%;
            text-align: center;
          }

          .matches-responsive-table :global(th:nth-child(6)),
          .matches-responsive-table :global(td:nth-child(6)) {
            width: 9%;
          }

          .matches-responsive-table :global(th:nth-child(7)),
          .matches-responsive-table :global(td:nth-child(7)) {
            width: 7%;
          }

          .matches-responsive-table :global(th:nth-child(8)),
          .matches-responsive-table :global(td:nth-child(8)) {
            width: 25%;
          }

          .matches-responsive-table :global(td:nth-child(8) > div) {
            justify-content: flex-start;
          }

          .matches-responsive-table :global(td:nth-child(3)),
          .matches-responsive-table :global(td:nth-child(4)),
          .matches-responsive-table :global(td:nth-child(6)) {
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .matches-responsive-table :global(td:nth-child(8) > div) {
            width: 100%;
            min-width: 0;
            max-width: 100%;
          }
        }

        /*
         * ======================================================
         * TABLET
         * ======================================================
         */

        @media (min-width: 768px) and (max-width: 1023px) {
          .matches-responsive-table :global(table) {
            width: 100% !important;
            min-width: 0 !important;
          }

          .matches-responsive-table :global(th),
          .matches-responsive-table :global(td) {
            padding: 0.6rem 0.4rem;
            font-size: 0.75rem;
          }

          .matches-responsive-table :global(th) {
            white-space: normal;
          }

          .matches-responsive-table :global(td:nth-child(1)),
          .matches-responsive-table :global(td:nth-child(3)),
          .matches-responsive-table :global(td:nth-child(4)),
          .matches-responsive-table :global(td:nth-child(6)) {
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .matches-responsive-table :global(th:nth-child(1)),
          .matches-responsive-table :global(td:nth-child(1)) {
            width: 14%;
          }

          .matches-responsive-table :global(th:nth-child(2)),
          .matches-responsive-table :global(td:nth-child(2)) {
            width: 10%;
          }

          .matches-responsive-table :global(th:nth-child(3)),
          .matches-responsive-table :global(td:nth-child(3)) {
            width: 14%;
          }

          .matches-responsive-table :global(th:nth-child(4)),
          .matches-responsive-table :global(td:nth-child(4)) {
            width: 14%;
          }

          .matches-responsive-table :global(th:nth-child(5)),
          .matches-responsive-table :global(td:nth-child(5)) {
            width: 9%;
            text-align: center;
          }

          .matches-responsive-table :global(th:nth-child(6)),
          .matches-responsive-table :global(td:nth-child(6)) {
            width: 10%;
          }

          .matches-responsive-table :global(th:nth-child(7)),
          .matches-responsive-table :global(td:nth-child(7)) {
            width: 7%;
          }

          .matches-responsive-table :global(th:nth-child(8)),
          .matches-responsive-table :global(td:nth-child(8)) {
            width: 22%;
          }

          .matches-responsive-table :global(td:nth-child(8) > div) {
            flex-direction: column;
            align-items: stretch;
            gap: 0.25rem;
          }

          .matches-responsive-table :global(td:nth-child(8) button) {
            padding: 0.35rem 0.45rem;
            font-size: 0.7rem;
          }
        }

        /*
         * ======================================================
         * MÓVIL
         * ======================================================
         *
         * En móvil no intentamos meter las 8 columnas.
         * Ocultamos la información secundaria y dejamos visibles
         * los datos necesarios para identificar el partido y actuar.
         */

        @media (max-width: 767px) {
          .matches-responsive-table :global(table) {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed;
          }

          /*
           * Columnas ocultas:
           *
           * 1 = Competición
           * 6 = Estadio
           * 7 = Estado
           *
           * Visibles:
           *
           * 2 = Fecha
           * 3 = Local
           * 4 = Visitante
           * 5 = Resultado
           * 8 = Acciones
           */

          .matches-responsive-table :global(th:nth-child(1)),
          .matches-responsive-table :global(td:nth-child(1)),
          .matches-responsive-table :global(th:nth-child(6)),
          .matches-responsive-table :global(td:nth-child(6)),
          .matches-responsive-table :global(th:nth-child(7)),
          .matches-responsive-table :global(td:nth-child(7)) {
            display: none;
          }

          .matches-responsive-table :global(th),
          .matches-responsive-table :global(td) {
            padding: 0.6rem 0.3rem;
            font-size: 0.7rem;
          }

          .matches-responsive-table :global(th) {
            line-height: 1.15;
            white-space: normal;
          }

          /*
           * Distribución de las 5 columnas visibles.
           */

          .matches-responsive-table :global(th:nth-child(2)),
          .matches-responsive-table :global(td:nth-child(2)) {
            width: 14%;
          }

          .matches-responsive-table :global(th:nth-child(3)),
          .matches-responsive-table :global(td:nth-child(3)) {
            width: 20%;
          }

          .matches-responsive-table :global(th:nth-child(4)),
          .matches-responsive-table :global(td:nth-child(4)) {
            width: 20%;
          }

          .matches-responsive-table :global(th:nth-child(5)),
          .matches-responsive-table :global(td:nth-child(5)) {
            width: 15%;
            text-align: center;
          }

          .matches-responsive-table :global(th:nth-child(8)),
          .matches-responsive-table :global(td:nth-child(8)) {
            width: 31%;
          }

          /*
           * Los nombres de los equipos se cortan dentro de su celda.
           */

          .matches-responsive-table :global(td:nth-child(2)),
          .matches-responsive-table :global(td:nth-child(3)),
          .matches-responsive-table :global(td:nth-child(4)) {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          /*
           * Acciones compactas y siempre dentro de su columna.
           */

          .matches-responsive-table :global(td:nth-child(8) > div) {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 0.3rem;
            width: 100%;
            min-width: 0;
          }

          .matches-responsive-table :global(td:nth-child(8) button) {
            width: 100%;
            min-width: 0;
            padding: 0.35rem 0.2rem;
            font-size: 0.65rem;
            line-height: 1.2;
          }

          /*
           * Buscador interno del DataTable.
           */

          .matches-responsive-table :global(input) {
            width: 100%;
            min-width: 0;
            max-width: 100%;
          }

          /*
           * Evitamos que cualquier elemento interno del DataTable
           * fuerce el ancho del contenedor.
           */

          .matches-responsive-table :global(div) {
            min-width: 0;
          }
        }

        /*
         * ======================================================
         * MÓVILES MUY PEQUEÑOS
         * ======================================================
         */

        @media (max-width: 380px) {
          .matches-responsive-table :global(th),
          .matches-responsive-table :global(td) {
            padding-left: 0.2rem;
            padding-right: 0.2rem;
            font-size: 0.65rem;
          }

          .matches-responsive-table :global(th:nth-child(2)),
          .matches-responsive-table :global(td:nth-child(2)) {
            width: 15%;
          }

          .matches-responsive-table :global(th:nth-child(3)),
          .matches-responsive-table :global(td:nth-child(3)) {
            width: 19%;
          }

          .matches-responsive-table :global(th:nth-child(4)),
          .matches-responsive-table :global(td:nth-child(4)) {
            width: 19%;
          }

          .matches-responsive-table :global(th:nth-child(5)),
          .matches-responsive-table :global(td:nth-child(5)) {
            width: 15%;
          }

          .matches-responsive-table :global(th:nth-child(8)),
          .matches-responsive-table :global(td:nth-child(8)) {
            width: 32%;
          }

          .matches-responsive-table :global(td:nth-child(8) button) {
            padding: 0.3rem 0.15rem;
            font-size: 0.6rem;
          }
        }
      `}</style>

    </div>
  );
}
