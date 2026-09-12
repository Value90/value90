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
        <div className="flex min-w-max items-center gap-2 whitespace-nowrap">

          <button
            type="button"
            onClick={() =>
              onEdit(
                row.original
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
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
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
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
    <div className="w-full space-y-4">

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
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500 sm:w-auto sm:min-w-[240px]"
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

      <div className="matches-responsive-table w-full">

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
         * TABLET
         * ======================================================
         */

        @media (min-width: 768px) and (max-width: 1023px) {
          .matches-responsive-table
            :global(table) {
            width: 100%;
            table-layout: fixed;
          }

          .matches-responsive-table
            :global(th),
          .matches-responsive-table
            :global(td) {
            padding: 0.75rem 0.5rem;
            font-size: 0.8125rem;
          }

          .matches-responsive-table
            :global(th) {
            line-height: 1.2;
          }

          .matches-responsive-table
            :global(td) {
            overflow-wrap: anywhere;
          }

          .matches-responsive-table
            :global(th:last-child),
          .matches-responsive-table
            :global(td:last-child) {
            width: 150px;
          }
        }

        /*
         * ======================================================
         * MÓVIL
         * ======================================================
         */

        @media (max-width: 767px) {
          .matches-responsive-table
            :global(table) {
            width: 100%;
            table-layout: fixed;
          }

          /*
           * Ocultamos en móvil las columnas menos importantes:
           *
           * 1 = Competición
           * 6 = Estadio
           * 7 = Estado
           *
           * Conservamos:
           *
           * 2 = Fecha
           * 3 = Local
           * 4 = Visitante
           * 5 = Resultado
           * 8 = Acciones
           */

          .matches-responsive-table
            :global(th:nth-child(1)),
          .matches-responsive-table
            :global(td:nth-child(1)),
          .matches-responsive-table
            :global(th:nth-child(6)),
          .matches-responsive-table
            :global(td:nth-child(6)),
          .matches-responsive-table
            :global(th:nth-child(7)),
          .matches-responsive-table
            :global(td:nth-child(7)) {
            display: none;
          }

          /*
           * Espaciado compacto.
           */

          .matches-responsive-table
            :global(th),
          .matches-responsive-table
            :global(td) {
            padding: 0.7rem 0.35rem;
            font-size: 0.75rem;
          }

          /*
           * Cabeceras.
           */

          .matches-responsive-table
            :global(th) {
            line-height: 1.15;
            white-space: normal;
          }

          /*
           * Distribución de columnas.
           *
           * Fecha       16%
           * Local       22%
           * Visitante   22%
           * Resultado   16%
           * Acciones    24%
           */

          .matches-responsive-table
            :global(th:nth-child(2)),
          .matches-responsive-table
            :global(td:nth-child(2)) {
            width: 16%;
          }

          .matches-responsive-table
            :global(th:nth-child(3)),
          .matches-responsive-table
            :global(td:nth-child(3)) {
            width: 22%;
          }

          .matches-responsive-table
            :global(th:nth-child(4)),
          .matches-responsive-table
            :global(td:nth-child(4)) {
            width: 22%;
          }

          .matches-responsive-table
            :global(th:nth-child(5)),
          .matches-responsive-table
            :global(td:nth-child(5)) {
            width: 16%;
            text-align: center;
          }

          .matches-responsive-table
            :global(th:nth-child(8)),
          .matches-responsive-table
            :global(td:nth-child(8)) {
            width: 24%;
          }

          /*
           * Equipos y fecha pueden ocupar varias líneas.
           */

          .matches-responsive-table
            :global(td:nth-child(2)),
          .matches-responsive-table
            :global(td:nth-child(3)),
          .matches-responsive-table
            :global(td:nth-child(4)) {
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          /*
           * Resultado centrado.
           */

          .matches-responsive-table
            :global(td:nth-child(5)) {
            text-align: center;
          }

          /*
           * Acciones siempre visibles y compactas.
           */

          .matches-responsive-table
            :global(td:nth-child(8) > div) {
            flex-direction: column;
            align-items: stretch;
            gap: 0.35rem;
            width: 100%;
            min-width: 0;
          }

          .matches-responsive-table
            :global(td:nth-child(8) button) {
            width: 100%;
            padding: 0.45rem 0.35rem;
            font-size: 0.7rem;
          }

          /*
           * Buscador de DataTable.
           */

          .matches-responsive-table
            :global(input) {
            width: 100%;
            max-width: none;
          }

          /*
           * Paginación.
           */

          .matches-responsive-table
            :global([class*="border-t"]) {
            gap: 0.75rem;
          }
        }

        /*
         * ======================================================
         * MÓVILES MUY PEQUEÑOS
         * ======================================================
         */

        @media (max-width: 380px) {
          .matches-responsive-table
            :global(th),
          .matches-responsive-table
            :global(td) {
            padding-left: 0.25rem;
            padding-right: 0.25rem;
            font-size: 0.7rem;
          }

          .matches-responsive-table
            :global(th:nth-child(2)),
          .matches-responsive-table
            :global(td:nth-child(2)) {
            width: 18%;
          }

          .matches-responsive-table
            :global(th:nth-child(3)),
          .matches-responsive-table
            :global(td:nth-child(3)) {
            width: 21%;
          }

          .matches-responsive-table
            :global(th:nth-child(4)),
          .matches-responsive-table
            :global(td:nth-child(4)) {
            width: 21%;
          }

          .matches-responsive-table
            :global(th:nth-child(5)),
          .matches-responsive-table
            :global(td:nth-child(5)) {
            width: 15%;
          }

          .matches-responsive-table
            :global(th:nth-child(8)),
          .matches-responsive-table
            :global(td:nth-child(8)) {
            width: 25%;
          }

          .matches-responsive-table
            :global(td:nth-child(8) button) {
            font-size: 0.65rem;
            padding: 0.4rem 0.2rem;
          }
        }
      `}</style>

    </div>
  );
}