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

import { getPlayers } from "@/services/player.service";
import { getMatches } from "@/services/match.service";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import {
  getParticipations,
  type Participation,
} from "@/services/participation.service";

import {
  getCompetitions,
  type Competition,
} from "@/services/competition.service";

type RankingMode =
  | "total"
  | "historical";

type SortDirection =
  | "asc"
  | "desc"
  | null;

type SortKey =
  | "playerName"
  | "matches"
  | "marca"
  | "as"
  | "sofascore"
  | "flashscore"
  | "externalAverage"
  | "value90MatchRating"
  | "finalMatchRating";

interface RankingTotal {
  playerId: number;
  playerName: string;

  marca: number | null;
  as: number | null;
  sofascore: number | null;
  flashscore: number | null;
  externalAverage: number | null;
  value90MatchRating: number | null;
  finalMatchRating: number | null;

  matches: number;
}

interface RankingHistorical {
  id: number;
  playerId: number;
  playerName: string;

  match: string;
  team: string;

  marca: number | null;
  as: number | null;
  sofascore: number | null;
  flashscore: number | null;
  externalAverage: number | null;
  value90MatchRating: number | null;
  finalMatchRating: number | null;
}

export default function RankingsPage() {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [matchRatings, setMatchRatings] =
    useState<MatchRating[]>([]);

  const [players, setPlayers] =
    useState<
      Awaited<ReturnType<typeof getPlayers>>
    >([]);

  const [matches, setMatches] =
    useState<
      Awaited<ReturnType<typeof getMatches>>
    >([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [loading, setLoading] =
    useState(true);

  /*
   * ============================================================
   * PAGINACIÓN
   * ============================================================
   */

  const PAGE_SIZE = 10;

  const [currentPage, setCurrentPage] =
    useState(1);

  /*
   * ============================================================
   * ESTADO
   * ============================================================
   */

  const [mode, setMode] =
    useState<RankingMode>("total");

  const [search, setSearch] =
    useState("");

  /*
   * ============================================================
   * FILTRO COMPETICIÓN
   * ============================================================
   *
   * "" = Todas las competiciones
   * number = competición seleccionada
   * ============================================================
   */

  const [
    selectedCompetitionId,
    setSelectedCompetitionId,
  ] = useState<number | "">("");

  /*
   * ============================================================
   * ORDENACIÓN TOTAL
   *
   * POR DEFECTO:
   * Media externa DESC
   * ============================================================
   */

  const [totalSortKey, setTotalSortKey] =
    useState<SortKey>(
      "externalAverage"
    );

  const [totalSortDirection, setTotalSortDirection] =
    useState<SortDirection>("desc");

  /*
   * ============================================================
   * ORDENACIÓN HISTÓRICO
   * ============================================================
   */

  const [
    historicalSortKey,
    setHistoricalSortKey,
  ] = useState<SortKey>(
    "externalAverage"
  );

  const [
    historicalSortDirection,
    setHistoricalSortDirection,
  ] = useState<SortDirection>("desc");

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

        const [
          matchRatingsData,
          playersData,
          matchesData,
          teamsData,
          participationsData,
          competitionsData,
        ] = await Promise.all([
          getMatchRatings(),
          getPlayers(),
          getMatches(),
          getTeams(),
          getParticipations(),
          getCompetitions(),
        ]);

        if (!mounted) {
          return;
        }

        setMatchRatings(
          matchRatingsData
        );

        setPlayers(
          playersData
        );

        setMatches(
          matchesData
        );

        setTeams(
          teamsData
        );

        setParticipations(
          participationsData
        );

        setCompetitions(
          competitionsData
        );
      } catch (error) {
        console.error(
          "Error cargando rankings:",
          error
        );

        if (!mounted) {
          return;
        }

        setMatchRatings([]);
        setPlayers([]);
        setMatches([]);
        setTeams([]);
        setParticipations([]);
        setCompetitions([]);
      } finally {
        if (mounted) {
          setLoading(false);
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
   * MAPAS
   * ============================================================
   */

  const playersMap = useMemo(() => {
    return new Map(
      players.map((player) => [
        player.id,
        player.name,
      ])
    );
  }, [players]);

  const teamsMap = useMemo(() => {
    return new Map(
      teams.map((team) => [
        team.id,
        team.shortName ?? team.name,
      ])
    );
  }, [teams]);

  const matchesMap = useMemo(() => {
    return new Map(
      matches.map((match) => [
        match.id,
        match,
      ])
    );
  }, [matches]);

  const participationsMap =
    useMemo(() => {
      return new Map(
        participations.map(
          (participation) => [
            participation.id,
            participation,
          ]
        )
      );
    }, [participations]);

  /*
   * ============================================================
   * COMPETICIONES DISPONIBLES
   * ============================================================
   *
   * Solo mostramos competiciones que tienen al menos un
   * Match Rating asociado.
   *
   * Se ordenan alfabéticamente.
   * ============================================================
   */

  const availableCompetitions =
    useMemo(() => {
      const competitionIds =
        new Set<number>();

      matchRatings.forEach(
        (rating) => {
          const match =
            matchesMap.get(
              rating.matchId
            );

          if (
            match?.competitionId !==
              null &&
            match?.competitionId !==
              undefined
          ) {
            competitionIds.add(
              match.competitionId
            );
          }
        }
      );

      return competitions
        .filter((competition) =>
          competitionIds.has(
            competition.id
          )
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "es"
          )
        );
    }, [
      competitions,
      matchRatings,
      matchesMap,
    ]);

  /*
   * ============================================================
   * MEDIA
   * ============================================================
   */

  const average = (
    values: (
      | number
      | null
      | undefined
    )[]
  ): number | null => {
    const validValues =
      values.filter(
        (
          value
        ): value is number =>
          value !== null &&
          value !== undefined
      );

    if (
      validValues.length === 0
    ) {
      return null;
    }

    return (
      validValues.reduce(
        (
          total,
          value
        ) =>
          total + value,
        0
      ) / validValues.length
    );
  };

  /*
   * ============================================================
   * VALORACIONES FILTRADAS POR COMPETICIÓN
   * ============================================================
   */

  const filteredMatchRatings =
    useMemo(() => {
      if (
        selectedCompetitionId === ""
      ) {
        return matchRatings;
      }

      return matchRatings.filter(
        (rating) => {
          const match =
            matchesMap.get(
              rating.matchId
            );

          return (
            match?.competitionId ===
            selectedCompetitionId
          );
        }
      );
    }, [
      matchRatings,
      matchesMap,
      selectedCompetitionId,
    ]);

  /*
   * ============================================================
   * RANKING TOTAL
   * ============================================================
   */

  const totalRanking = useMemo(() => {
    const grouped =
      new Map<
        number,
        MatchRating[]
      >();

    for (
      const rating of
        filteredMatchRatings
    ) {
      const existing =
        grouped.get(
          rating.playerId
        ) ?? [];

      existing.push(rating);

      grouped.set(
        rating.playerId,
        existing
      );
    }

    const result: RankingTotal[] =
      [];

    grouped.forEach(
      (
        ratings,
        playerId
      ) => {
        result.push({
          playerId,

          playerName:
            playersMap.get(
              playerId
            ) ??
            "Jugador no encontrado",

          marca: average(
            ratings.map(
              (rating) =>
                rating.marcaRating
            )
          ),

          as: average(
            ratings.map(
              (rating) =>
                rating.asRating
            )
          ),

          sofascore: average(
            ratings.map(
              (rating) =>
                rating.sofascoreRating
            )
          ),

          flashscore: average(
            ratings.map(
              (rating) =>
                rating.flashscoreRating
            )
          ),

          externalAverage:
            average(
              ratings.map(
                (rating) =>
                  rating.externalAverage
              )
            ),

          value90MatchRating:
            average(
              ratings.map(
                (rating) =>
                  rating.value90MatchRating
              )
            ),

          finalMatchRating:
            average(
              ratings.map(
                (rating) =>
                  rating.finalMatchRating
              )
            ),

          matches:
            ratings.length,
        });
      }
    );

    return result;
  }, [
    filteredMatchRatings,
    playersMap,
  ]);

  /*
   * ============================================================
   * RANKING HISTÓRICO
   * ============================================================
   */

  const historicalRanking =
    useMemo(() => {
      return filteredMatchRatings.map(
        (rating) => {
          const participation =
            participationsMap.get(
              rating.participationId
            );

          const match =
            matchesMap.get(
              rating.matchId
            );

          let matchName =
            "Partido no encontrado";

          if (match) {
            const homeTeam =
              teamsMap.get(
                match.homeTeamId
              ) ?? "?";

            const awayTeam =
              teamsMap.get(
                match.awayTeamId
              ) ?? "?";

            matchName =
              `${homeTeam} - ${awayTeam}`;
          }

          return {
            id: rating.id,

            playerId:
              rating.playerId,

            playerName:
              playersMap.get(
                rating.playerId
              ) ??
              "Jugador no encontrado",

            match:
              matchName,

            team:
              teamsMap.get(
                participation?.teamId ??
                  0
              ) ?? "—",

            marca:
              rating.marcaRating,

            as:
              rating.asRating,

            sofascore:
              rating.sofascoreRating,

            flashscore:
              rating.flashscoreRating,

            externalAverage:
              rating.externalAverage,

            value90MatchRating:
              rating.value90MatchRating,

            finalMatchRating:
              rating.finalMatchRating,
          };
        }
      );
    }, [
      filteredMatchRatings,
      playersMap,
      matchesMap,
      teamsMap,
      participationsMap,
    ]);

  /*
   * ============================================================
   * FILTRO POR JUGADOR
   * ============================================================
   */

  const filteredTotalRanking =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLocaleLowerCase(
            "es"
          );

      if (!text) {
        return totalRanking;
      }

      return totalRanking.filter(
        (row) =>
          row.playerName
            .toLocaleLowerCase(
              "es"
            )
            .includes(text)
      );
    }, [
      totalRanking,
      search,
    ]);

  const filteredHistoricalRanking =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLocaleLowerCase(
            "es"
          );

      if (!text) {
        return historicalRanking;
      }

      return historicalRanking.filter(
        (row) =>
          row.playerName
            .toLocaleLowerCase(
              "es"
            )
            .includes(text)
      );
    }, [
      historicalRanking,
      search,
    ]);

  /*
   * ============================================================
   * ORDENACIÓN TOTAL
   * ============================================================
   */

  const sortedTotalRanking =
    useMemo(() => {
      const rows = [
        ...filteredTotalRanking,
      ];

      if (
        !totalSortKey ||
        !totalSortDirection
      ) {
        return rows;
      }

      rows.sort((a, b) => {
        const aValue =
          a[totalSortKey];

        const bValue =
          b[totalSortKey];

        if (
          aValue === null ||
          aValue === undefined
        ) {
          return 1;
        }

        if (
          bValue === null ||
          bValue === undefined
        ) {
          return -1;
        }

        if (
          typeof aValue ===
          "string"
        ) {
          const result =
            aValue.localeCompare(
              String(bValue),
              "es"
            );

          return totalSortDirection ===
            "asc"
            ? result
            : -result;
        }

        const result =
          Number(aValue) -
          Number(bValue);

        return totalSortDirection ===
          "asc"
          ? result
          : -result;
      });

      return rows;
    }, [
      filteredTotalRanking,
      totalSortKey,
      totalSortDirection,
    ]);

  /*
   * ============================================================
   * ORDENACIÓN HISTÓRICO
   * ============================================================
   */

  const sortedHistoricalRanking =
    useMemo(() => {
      const rows = [
        ...filteredHistoricalRanking,
      ];

      if (
        !historicalSortKey ||
        !historicalSortDirection
      ) {
        return rows;
      }

      rows.sort((a, b) => {
        let aValue:
          | string
          | number
          | null = null;

        let bValue:
          | string
          | number
          | null = null;

        if (
          historicalSortKey ===
          "playerName"
        ) {
          aValue =
            a.playerName;

          bValue =
            b.playerName;
        }

        if (
          historicalSortKey ===
          "marca"
        ) {
          aValue = a.marca;
          bValue = b.marca;
        }

        if (
          historicalSortKey ===
          "as"
        ) {
          aValue = a.as;
          bValue = b.as;
        }

        if (
          historicalSortKey ===
          "sofascore"
        ) {
          aValue =
            a.sofascore;

          bValue =
            b.sofascore;
        }

        if (
          historicalSortKey ===
          "flashscore"
        ) {
          aValue =
            a.flashscore;

          bValue =
            b.flashscore;
        }

        if (
          historicalSortKey ===
          "externalAverage"
        ) {
          aValue =
            a.externalAverage;

          bValue =
            b.externalAverage;
        }

        if (
          historicalSortKey ===
          "value90MatchRating"
        ) {
          aValue =
            a.value90MatchRating;

          bValue =
            b.value90MatchRating;
        }

        if (
          historicalSortKey ===
          "finalMatchRating"
        ) {
          aValue =
            a.finalMatchRating;

          bValue =
            b.finalMatchRating;
        }

        if (
          aValue === null ||
          aValue === undefined
        ) {
          return 1;
        }

        if (
          bValue === null ||
          bValue === undefined
        ) {
          return -1;
        }

        if (
          typeof aValue ===
          "string"
        ) {
          const result =
            aValue.localeCompare(
              String(bValue),
              "es"
            );

          return historicalSortDirection ===
            "asc"
            ? result
            : -result;
        }

        const result =
          Number(aValue) -
          Number(bValue);

        return historicalSortDirection ===
          "asc"
          ? result
          : -result;
      });

      return rows;
    }, [
      filteredHistoricalRanking,
      historicalSortKey,
      historicalSortDirection,
    ]);

  /*
   * ============================================================
   * CAMBIAR ORDEN TOTAL
   * ============================================================
   */

  const handleTotalSort = (
    key: SortKey
  ) => {
    if (totalSortKey !== key) {
      setTotalSortKey(key);

      setTotalSortDirection(
        "desc"
      );

      return;
    }

    if (
      totalSortDirection ===
      "desc"
    ) {
      setTotalSortDirection(
        "asc"
      );

      return;
    }

    if (
      totalSortDirection ===
      "asc"
    ) {
      setTotalSortDirection(
        null
      );

      return;
    }

    setTotalSortDirection(
      "desc"
    );
  };

  /*
   * ============================================================
   * CAMBIAR ORDEN HISTÓRICO
   * ============================================================
   */

  const handleHistoricalSort = (
    key: SortKey
  ) => {
    if (
      historicalSortKey !==
      key
    ) {
      setHistoricalSortKey(
        key
      );

      setHistoricalSortDirection(
        "desc"
      );

      return;
    }

    if (
      historicalSortDirection ===
      "desc"
    ) {
      setHistoricalSortDirection(
        "asc"
      );

      return;
    }

    if (
      historicalSortDirection ===
      "asc"
    ) {
      setHistoricalSortDirection(
        null
      );

      return;
    }

    setHistoricalSortDirection(
      "desc"
    );
  };

  /*
   * ============================================================
   * PAGINACIÓN DE RESULTADOS
   * ============================================================
   *
   * La paginación se aplica DESPUÉS del filtro y de la ordenación,
   * de forma que el ranking completo mantiene su orden correcto.
   */

  useEffect(() => {
    setCurrentPage(1);
  }, [
    mode,
    search,
    selectedCompetitionId,
    totalSortKey,
    totalSortDirection,
    historicalSortKey,
    historicalSortDirection,
  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        sortedTotalRanking.length /
          PAGE_SIZE
      )
    );

  const historicalTotalPages =
    Math.max(
      1,
      Math.ceil(
        sortedHistoricalRanking.length /
          PAGE_SIZE
      )
    );

  const paginatedTotalRanking =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        PAGE_SIZE;

      return sortedTotalRanking.slice(
        start,
        start + PAGE_SIZE
      );
    }, [
      sortedTotalRanking,
      currentPage,
    ]);

  const paginatedHistoricalRanking =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        PAGE_SIZE;

      return sortedHistoricalRanking.slice(
        start,
        start + PAGE_SIZE
      );
    }, [
      sortedHistoricalRanking,
      currentPage,
    ]);

  const getVisiblePages = (
    pageCount: number
  ): (number | "ellipsis-left" | "ellipsis-right")[] => {
    if (pageCount <= 7) {
      return Array.from(
        { length: pageCount },
        (_, index) => index + 1
      );
    }

    if (currentPage <= 4) {
      return [
        1,
        2,
        3,
        4,
        5,
        "ellipsis-right",
        pageCount,
      ];
    }

    if (currentPage >= pageCount - 3) {
      return [
        1,
        "ellipsis-left",
        pageCount - 4,
        pageCount - 3,
        pageCount - 2,
        pageCount - 1,
        pageCount,
      ];
    }

    return [
      1,
      "ellipsis-left",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "ellipsis-right",
      pageCount,
    ];
  };

  const renderPagination = (
    pageCount: number
  ) => {
    if (pageCount <= 1) {
      return null;
    }

    const pages =
      getVisiblePages(pageCount);

    return (
      <div className="flex w-full flex-wrap items-center justify-end gap-1 border-t border-slate-200 bg-slate-50 px-3 py-3 sm:flex-nowrap sm:px-4 sm:py-4">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() =>
            setCurrentPage((page) =>
              Math.max(1, page - 1)
            )
          }
          className="mr-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
        >
          ← Anterior
        </button>

        {pages.map((page, index) => {
          if (
            page ===
              "ellipsis-left" ||
            page ===
              "ellipsis-right"
          ) {
            return (
              <span
                key={`${page}-${index}`}
                className="px-1.5 text-xs font-medium text-slate-500 sm:px-2 sm:text-sm"
              >
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              type="button"
              onClick={() =>
                setCurrentPage(page)
              }
              className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-medium transition ${
                currentPage === page
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          type="button"
          disabled={
            currentPage === pageCount
          }
          onClick={() =>
            setCurrentPage((page) =>
              Math.min(
                pageCount,
                page + 1
              )
            )
          }
          className="ml-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
        >
          Siguiente →
        </button>
      </div>
    );
  };

  /*
   * ============================================================
   * CABECERA ORDENABLE
   * ============================================================
   */


  const SortHeader = ({
    label,
    sortKey,
    currentKey,
    direction,
    onSort,
  }: {
    label: string;
    sortKey: SortKey;
    currentKey: SortKey;
    direction: SortDirection;
    onSort: (
      key: SortKey
    ) => void;
  }) => {
    const active =
      currentKey === sortKey;

    return (
      <button
        type="button"
        onClick={() =>
          onSort(sortKey)
        }
        className="flex w-full items-center justify-center gap-1 font-semibold hover:text-slate-950"
      >
        <span>
          {label}
        </span>

        <span className="text-xs">
          {active &&
          direction === "desc"
            ? "↓"
            : active &&
                direction ===
                  "asc"
              ? "↑"
              : "↕"}
        </span>
      </button>
    );
  };

  /*
   * ============================================================
   * FORMATEAR
   *
   * Marca / AS / SofaScore / FlashScore → 2 decimales
   * Media externa / V90 / Valoración final → 3 decimales
   * ============================================================
   */

  const formatValue = (
    value: number | null
  ) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "—";
    }

    return value.toFixed(2);
  };

  const formatThreeDecimals = (
    value: number | null
  ) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "—";
    }

    return value.toFixed(3);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 p-3 sm:p-5 md:p-6">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-5 sm:mb-6">

        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
          Rankings
        </h1>

        <p className="mt-1 text-sm text-slate-600 sm:mt-2 sm:text-base">
          Clasificación de jugadores
          basada en sus valoraciones
          de partido.
        </p>

      </div>

      {/* ======================================================
          FILTROS
          ====================================================== */}

      <div className="mb-5 flex w-full min-w-0 flex-col gap-3 md:flex-row md:items-center">

        {/* ====================================================
            BUSCAR
            ==================================================== */}

        <input
          type="text"
          placeholder="Buscar jugador..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          className="w-full min-w-0 max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
        />

        {/* ====================================================
            COMPETICIÓN
            ==================================================== */}

        <select
          value={
            selectedCompetitionId
          }
          onChange={(event) =>
            setSelectedCompetitionId(
              event.target.value ===
                ""
                ? ""
                : Number(
                    event.target
                      .value
                  )
            )
          }
          className="w-full min-w-0 max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 sm:px-4"
        >
          <option value="">
            Todas las competiciones
          </option>

          {availableCompetitions.map(
            (competition) => (
              <option
                key={
                  competition.id
                }
                value={
                  competition.id
                }
              >
                {competition.name}
              </option>
            )
          )}
        </select>

        {/* ====================================================
            TOTAL / HISTÓRICO
            ==================================================== */}

        <div className="flex w-full overflow-hidden rounded-lg border border-slate-300 bg-white sm:w-auto">

          <button
            type="button"
            onClick={() =>
              setMode("total")
            }
            className={`flex-1 px-4 py-2 text-sm font-medium sm:flex-none sm:px-5 ${
              mode === "total"
                ? "bg-slate-800 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Total
          </button>

          <button
            type="button"
            onClick={() =>
              setMode(
                "historical"
              )
            }
            className={`flex-1 border-l border-slate-300 px-4 py-2 text-sm font-medium sm:flex-none sm:px-5 ${
              mode ===
              "historical"
                ? "bg-slate-800 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Histórico
          </button>

        </div>

      </div>

      {/* ======================================================
          CARGANDO
          ====================================================== */}

      {loading ? (

        <div className="w-full min-w-0 rounded-xl border bg-white p-5 text-center text-sm text-slate-500 shadow sm:p-8 sm:text-base">
          Cargando rankings...
        </div>

      ) : mode === "total" ? (

        /* ====================================================
           TOTAL
           ==================================================== */

        <div className="w-full min-w-0 overflow-hidden rounded-xl border bg-white shadow">

          <div className="w-full overflow-x-auto overscroll-x-contain"><table className="w-full min-w-[900px] table-fixed">

            <thead className="bg-slate-100">

              <tr>

                <th className="w-[18%] whitespace-nowrap p-2 text-left text-xs text-slate-700 sm:p-3 sm:text-sm">

                  <SortHeader
                    label="Jugador"
                    sortKey="playerName"
                    currentKey={
                      totalSortKey
                    }
                    direction={
                      totalSortDirection
                    }
                    onSort={
                      handleTotalSort
                    }
                  />

                </th>

                <th className="w-[7%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3 sm:text-sm">

                  <SortHeader
                    label="Partidos"
                    sortKey="matches"
                    currentKey={
                      totalSortKey
                    }
                    direction={
                      totalSortDirection
                    }
                    onSort={
                      handleTotalSort
                    }
                  />

                </th>

                <th className="w-[8%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3 sm:text-sm">

                  <SortHeader
                    label="Marca"
                    sortKey="marca"
                    currentKey={
                      totalSortKey
                    }
                    direction={
                      totalSortDirection
                    }
                    onSort={
                      handleTotalSort
                    }
                  />

                </th>

                <th className="w-[8%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3 sm:text-sm">

                  <SortHeader
                    label="AS"
                    sortKey="as"
                    currentKey={
                      totalSortKey
                    }
                    direction={
                      totalSortDirection
                    }
                    onSort={
                      handleTotalSort
                    }
                  />

                </th>

                <th className="w-[11%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3 sm:text-sm">

                  <SortHeader
                    label="SofaScore"
                    sortKey="sofascore"
                    currentKey={
                      totalSortKey
                    }
                    direction={
                      totalSortDirection
                    }
                    onSort={
                      handleTotalSort
                    }
                  />

                </th>

                <th className="w-[11%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3 sm:text-sm">

                  <SortHeader
                    label="FlashScore"
                    sortKey="flashscore"
                    currentKey={
                      totalSortKey
                    }
                    direction={
                      totalSortDirection
                    }
                    onSort={
                      handleTotalSort
                    }
                  />

                </th>

                <th className="w-[13%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3 sm:text-sm">

                  <SortHeader
                    label="Media externa"
                    sortKey="externalAverage"
                    currentKey={
                      totalSortKey
                    }
                    direction={
                      totalSortDirection
                    }
                    onSort={
                      handleTotalSort
                    }
                  />

                </th>

                <th className="w-[10%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3 sm:text-sm">

                  <SortHeader
                    label="V90"
                    sortKey="value90MatchRating"
                    currentKey={
                      totalSortKey
                    }
                    direction={
                      totalSortDirection
                    }
                    onSort={
                      handleTotalSort
                    }
                  />

                </th>

                <th className="w-[14%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3 sm:text-sm">

                  <SortHeader
                    label="Valoración final"
                    sortKey="finalMatchRating"
                    currentKey={
                      totalSortKey
                    }
                    direction={
                      totalSortDirection
                    }
                    onSort={
                      handleTotalSort
                    }
                  />

                </th>

              </tr>

            </thead>

            <tbody>

              {sortedTotalRanking.length ===
              0 ? (

                <tr>

                  <td
                    colSpan={9}
                    className="p-8 text-center text-slate-500"
                  >
                    No se encontraron
                    jugadores.
                  </td>

                </tr>

              ) : (

                paginatedTotalRanking.map(
                  (row) => (

                    <tr
                      key={
                        row.playerId
                      }
                      className="border-t hover:bg-slate-50"
                    >

                      <td className="truncate whitespace-nowrap p-2 text-sm font-medium text-slate-800 sm:p-3">
                        {row.playerName}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-sm sm:p-3">
                        {row.matches}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-sm sm:p-3">
                        {formatValue(
                          row.marca
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-sm sm:p-3">
                        {formatValue(
                          row.as
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-sm sm:p-3">
                        {formatValue(
                          row.sofascore
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-sm sm:p-3">
                        {formatValue(
                          row.flashscore
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-sm font-semibold sm:p-3">
                        {formatThreeDecimals(
                          row.externalAverage
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-sm font-semibold sm:p-3">
                        {formatThreeDecimals(
                          row.value90MatchRating
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-sm font-semibold sm:p-3">
                        {formatThreeDecimals(
                          row.finalMatchRating
                        )}
                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table></div>

          {renderPagination(totalPages)}

        </div>

      ) : (

        /* ====================================================
           HISTÓRICO
           ==================================================== */

        <div className="w-full min-w-0 overflow-hidden rounded-xl border bg-white shadow">

          <div className="w-full overflow-x-auto overscroll-x-contain"><table className="w-full min-w-[900px] table-fixed">

            <thead className="bg-slate-100">

              <tr>

                <th className="w-[14%] whitespace-nowrap p-2 text-left text-xs text-slate-700 sm:p-3">

                  <SortHeader
                    label="Jugador"
                    sortKey="playerName"
                    currentKey={
                      historicalSortKey
                    }
                    direction={
                      historicalSortDirection
                    }
                    onSort={
                      handleHistoricalSort
                    }
                  />

                </th>

                <th className="w-[20%] whitespace-nowrap p-2 text-left text-xs text-slate-700 sm:p-3">
                  Partido
                </th>

                <th className="w-[12%] whitespace-nowrap p-2 text-left text-xs text-slate-700 sm:p-3">
                  Equipo
                </th>

                <th className="w-[7%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3">

                  <SortHeader
                    label="Marca"
                    sortKey="marca"
                    currentKey={
                      historicalSortKey
                    }
                    direction={
                      historicalSortDirection
                    }
                    onSort={
                      handleHistoricalSort
                    }
                  />

                </th>

                <th className="w-[6%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3">

                  <SortHeader
                    label="AS"
                    sortKey="as"
                    currentKey={
                      historicalSortKey
                    }
                    direction={
                      historicalSortDirection
                    }
                    onSort={
                      handleHistoricalSort
                    }
                  />

                </th>

                <th className="w-[9%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3">

                  <SortHeader
                    label="SofaScore"
                    sortKey="sofascore"
                    currentKey={
                      historicalSortKey
                    }
                    direction={
                      historicalSortDirection
                    }
                    onSort={
                      handleHistoricalSort
                    }
                  />

                </th>

                <th className="w-[9%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3">

                  <SortHeader
                    label="FlashScore"
                    sortKey="flashscore"
                    currentKey={
                      historicalSortKey
                    }
                    direction={
                      historicalSortDirection
                    }
                    onSort={
                      handleHistoricalSort
                    }
                  />

                </th>

                <th className="w-[10%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3">

                  <SortHeader
                    label="Media ext."
                    sortKey="externalAverage"
                    currentKey={
                      historicalSortKey
                    }
                    direction={
                      historicalSortDirection
                    }
                    onSort={
                      handleHistoricalSort
                    }
                  />

                </th>

                <th className="w-[6%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3">

                  <SortHeader
                    label="V90"
                    sortKey="value90MatchRating"
                    currentKey={
                      historicalSortKey
                    }
                    direction={
                      historicalSortDirection
                    }
                    onSort={
                      handleHistoricalSort
                    }
                  />

                </th>

                <th className="w-[7%] whitespace-nowrap p-2 text-center text-xs text-slate-700 sm:p-3">

                  <SortHeader
                    label="Final"
                    sortKey="finalMatchRating"
                    currentKey={
                      historicalSortKey
                    }
                    direction={
                      historicalSortDirection
                    }
                    onSort={
                      handleHistoricalSort
                    }
                  />

                </th>

              </tr>

            </thead>

            <tbody>

              {sortedHistoricalRanking.length ===
              0 ? (

                <tr>

                  <td
                    colSpan={10}
                    className="p-6 text-center text-sm text-slate-500"
                  >
                    No se encontraron
                    valoraciones.
                  </td>

                </tr>

              ) : (

                paginatedHistoricalRanking.map(
                  (row) => (

                    <tr
                      key={row.id}
                      className="border-t hover:bg-slate-50"
                    >

                      <td className="truncate whitespace-nowrap p-2 text-xs font-medium text-slate-800 sm:text-sm">
                        {row.playerName}
                      </td>

                      <td
                        className="truncate whitespace-nowrap p-2 text-xs sm:text-sm"
                        title={row.match}
                      >
                        {row.match}
                      </td>

                      <td
                        className="truncate whitespace-nowrap p-2 text-xs sm:text-sm"
                        title={row.team}
                      >
                        {row.team}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-xs sm:text-sm">
                        {formatValue(
                          row.marca
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-xs sm:text-sm">
                        {formatValue(
                          row.as
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-xs sm:text-sm">
                        {formatValue(
                          row.sofascore
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-xs sm:text-sm">
                        {formatValue(
                          row.flashscore
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-xs font-semibold sm:text-sm">
                        {formatThreeDecimals(
                          row.externalAverage
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-xs font-semibold sm:text-sm">
                        {formatThreeDecimals(
                          row.value90MatchRating
                        )}
                      </td>

                      <td className="whitespace-nowrap p-2 text-center text-xs font-semibold sm:text-sm">
                        {formatThreeDecimals(
                          row.finalMatchRating
                        )}
                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table></div>

          {renderPagination(
            historicalTotalPages
          )}

        </div>

      )}

    </div>
  );
}