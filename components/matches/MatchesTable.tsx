"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DataTable from "@/components/shared/tables/DataTable";

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
      if (!selectedCompetitionId) {
        return matches;
      }

      return matches.filter(
        (match) =>
          match.competitionId ===
          selectedCompetitionId
      );
    }, [
      matches,
      selectedCompetitionId,
    ]);

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
      "es-ES"
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
            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-red-200 bg-white px-1.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 sm:rounded-lg sm:px-2.5 sm:text-sm"
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

      <div className="w-full">

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

      </div>

      {/* ======================================================
          TABLA RESPONSIVE
          ====================================================== */}

      <div className="matches-responsive-table w-full min-w-0 max-w-full overflow-hidden">

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
            width: 16%;
          }

          .matches-responsive-table :global(th:nth-child(2)),
          .matches-responsive-table :global(td:nth-child(2)) {
            width: 10%;
          }

          .matches-responsive-table :global(th:nth-child(3)),
          .matches-responsive-table :global(td:nth-child(3)) {
            width: 15%;
          }

          .matches-responsive-table :global(th:nth-child(4)),
          .matches-responsive-table :global(td:nth-child(4)) {
            width: 15%;
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
            width: 18%;
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
            width: 17%;
          }

          .matches-responsive-table :global(th:nth-child(2)),
          .matches-responsive-table :global(td:nth-child(2)) {
            width: 11%;
          }

          .matches-responsive-table :global(th:nth-child(3)),
          .matches-responsive-table :global(td:nth-child(3)) {
            width: 15%;
          }

          .matches-responsive-table :global(th:nth-child(4)),
          .matches-responsive-table :global(td:nth-child(4)) {
            width: 15%;
          }

          .matches-responsive-table :global(th:nth-child(5)),
          .matches-responsive-table :global(td:nth-child(5)) {
            width: 9%;
            text-align: center;
          }

          .matches-responsive-table :global(th:nth-child(6)),
          .matches-responsive-table :global(td:nth-child(6)) {
            width: 11%;
          }

          .matches-responsive-table :global(th:nth-child(7)),
          .matches-responsive-table :global(td:nth-child(7)) {
            width: 8%;
          }

          .matches-responsive-table :global(th:nth-child(8)),
          .matches-responsive-table :global(td:nth-child(8)) {
            width: 14%;
          }

          .matches-responsive-table :global(td:nth-child(8) > div) {
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
            width: 16%;
          }

          .matches-responsive-table :global(th:nth-child(3)),
          .matches-responsive-table :global(td:nth-child(3)) {
            width: 22%;
          }

          .matches-responsive-table :global(th:nth-child(4)),
          .matches-responsive-table :global(td:nth-child(4)) {
            width: 22%;
          }

          .matches-responsive-table :global(th:nth-child(5)),
          .matches-responsive-table :global(td:nth-child(5)) {
            width: 15%;
            text-align: center;
          }

          .matches-responsive-table :global(th:nth-child(8)),
          .matches-responsive-table :global(td:nth-child(8)) {
            width: 25%;
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
            width: 17%;
          }

          .matches-responsive-table :global(th:nth-child(3)),
          .matches-responsive-table :global(td:nth-child(3)) {
            width: 21%;
          }

          .matches-responsive-table :global(th:nth-child(4)),
          .matches-responsive-table :global(td:nth-child(4)) {
            width: 21%;
          }

          .matches-responsive-table :global(th:nth-child(5)),
          .matches-responsive-table :global(td:nth-child(5)) {
            width: 15%;
          }

          .matches-responsive-table :global(th:nth-child(8)),
          .matches-responsive-table :global(td:nth-child(8)) {
            width: 26%;
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