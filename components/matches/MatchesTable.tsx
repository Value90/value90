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

    {
      accessorFn: (row) =>
        getTeamName(row.homeTeamId),

      header:
        "Local",

      cell: ({ row }) =>
        getTeamName(
          row.original
            .homeTeamId
        ),

      filterFn: (row, _columnId, filterValue) => {
        const teamName =
          getTeamName(
            row.original.homeTeamId
          );

        return teamName
          .toLocaleLowerCase("es")
          .includes(
            String(filterValue ?? "")
              .toLocaleLowerCase("es")
          );
      },
    },

    {
      accessorFn: (row) =>
        getTeamName(row.awayTeamId),

      header:
        "Visitante",

      cell: ({ row }) =>
        getTeamName(
          row.original
            .awayTeamId
        ),

      filterFn: (row, _columnId, filterValue) => {
        const teamName =
          getTeamName(
            row.original.awayTeamId
          );

        return teamName
          .toLocaleLowerCase("es")
          .includes(
            String(filterValue ?? "")
              .toLocaleLowerCase("es")
          );
      },
    },

    {
      id: "score",

      header:
        "Resultado",

      cell: ({ row }) => (
        <span className="font-semibold">
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

    {
      accessorKey:
        "stadium",

      header:
        "Estadio",

      cell: ({ row }) =>
        row.original
          .stadium ||
        "—",
    },

    {
      accessorKey:
        "status",

      header:
        "Estado",
    },

    {
      id: "actions",

      header:
        "Acciones",

      enableSorting:
        false,

      cell: ({ row }) => (
        <div className="flex gap-2">

          <button
            type="button"
            onClick={() =>
              onEdit(
                row.original
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
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
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
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
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
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
      <div className="rounded-xl border bg-white p-6 shadow">
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
    <DataTable
      data={filteredMatches}
      columns={columns}
      toolbarActions={

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
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500"
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

      }
    />
  );
}