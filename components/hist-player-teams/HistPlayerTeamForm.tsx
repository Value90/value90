"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSeasons,
  type Season,
} from "@/services/season.service";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import {
  getCompetitions,
  type Competition,
} from "@/services/competition.service";

import {
  getMatches,
  type Match,
} from "@/services/match.service";

import {
  getPlayers,
  type Player,
} from "@/services/player.service";

import {
  getPositions,
  type Position,
} from "@/services/position.service";

import {
  getHistPlayerTeamsByTeamAndSeason,
  saveHistPlayerTeamSquad,
} from "@/services/hist-player-team.service";

import {
  getTeamCompetitionsBySeason,
  type TeamCompetition,
} from "@/services/team-competition.service";

interface PlayerRow {
  playerId: number;
  selected: boolean;
  shirtNumber: string;
  positionId: number;
}

interface HistPlayerTeamFormProps {
  onSaved?: () => void | Promise<void>;
  onCancel?: () => void;
}

const PLAYERS_PER_PAGE = 20;

export default function HistPlayerTeamForm({
  onSaved,
  onCancel,
}: HistPlayerTeamFormProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [teamCompetitions, setTeamCompetitions] = useState<
    TeamCompetition[]
  >([]);

  const [seasonId, setSeasonId] = useState<number>(0);
  const [competitionId, setCompetitionId] = useState<number>(0);
  const [teamId, setTeamId] = useState<number>(0);

  const [rows, setRows] = useState<PlayerRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingSquad, setLoadingSquad] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [playerSearch, setPlayerSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const [errorPlayerIds, setErrorPlayerIds] = useState<Set<number>>(
    new Set()
  );

  /*
   * ============================================================
   * CARGAR DATOS INICIALES
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          seasonsData,
          competitionsData,
          matchesData,
          teamsData,
          playersData,
          positionsData,
        ] = await Promise.all([
          getSeasons(),
          getCompetitions(),
          getMatches(),
          getTeams(),
          getPlayers(),
          getPositions(),
        ]);

        if (!mounted) return;

        setSeasons(seasonsData);
        setCompetitions(competitionsData);
        setMatches(matchesData);
        setTeams(teamsData);
        setPlayers(playersData);
        setPositions(positionsData);
      } catch (err) {
        console.error("Error cargando datos:", err);

        if (mounted) {
          setError("No se pudieron cargar los datos necesarios.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * CARGAR RELACIONES EQUIPO-COMPETICIÓN
   * ============================================================
   */

  useEffect(() => {
    if (!seasonId) {
      setTeamCompetitions([]);
      return;
    }

    let mounted = true;

    async function loadTeamCompetitions() {
      try {
        const data = await getTeamCompetitionsBySeason(seasonId);

        if (mounted) {
          setTeamCompetitions(data);
        }
      } catch (err) {
        console.error(
          "Error cargando relaciones equipo-competición:",
          err
        );

        if (mounted) {
          setTeamCompetitions([]);
        }
      }
    }

    loadTeamCompetitions();

    return () => {
      mounted = false;
    };
  }, [seasonId]);

  /*
   * ============================================================
   * COMPETICIONES DISPONIBLES
   * ============================================================
   */

  const availableCompetitions = useMemo(() => {
    if (!seasonId) {
      return [];
    }

    return competitions
      .filter((competition) => competition.active === true)
      .sort((a, b) =>
        a.name.localeCompare(b.name, "es", {
          sensitivity: "base",
        })
      );
  }, [competitions, seasonId]);

  /*
   * ============================================================
   * COMPETICIÓN SELECCIONADA
   * ============================================================
   */

  const selectedCompetition = useMemo(() => {
    return competitions.find(
      (competition) => competition.id === competitionId
    );
  }, [competitions, competitionId]);

  /*
   * ============================================================
   * EQUIPOS DISPONIBLES
   * ============================================================
   */

  const availableTeams = useMemo(() => {
    if (!competitionId || !selectedCompetition) {
      return [];
    }

    const isNationalTeam =
      selectedCompetition.competitionType === "National Team";

    if (isNationalTeam) {
      return teams
        .filter((team) => team.active === true)
        .filter(
          (team) =>
            team.type?.toLocaleLowerCase("es") === "selección"
        )
        .sort((a, b) =>
          (a.shortName ?? a.name).localeCompare(
            b.shortName ?? b.name,
            "es",
            {
              sensitivity: "base",
            }
          )
        );
    }

    const teamIdsWithMatches = new Set(
      matches
        .filter(
          (match) =>
            match.seasonId === seasonId &&
            match.competitionId === competitionId
        )
        .flatMap((match) => [
          match.homeTeamId,
          match.awayTeamId,
        ])
    );

    const teamIdsWithCompetition = new Set(
      teamCompetitions
        .filter(
          (relation) =>
            relation.active === true &&
            relation.seasonId === seasonId &&
            relation.competitionId === competitionId
        )
        .map((relation) => relation.teamId)
    );

    return teams
      .filter((team) => team.active === true)
      .filter(
        (team) =>
          team.competitionId === competitionId ||
          teamIdsWithMatches.has(team.id) ||
          teamIdsWithCompetition.has(team.id)
      )
      .sort((a, b) =>
        (a.shortName ?? a.name).localeCompare(
          b.shortName ?? b.name,
          "es",
          {
            sensitivity: "base",
          }
        )
      );
  }, [
    teams,
    matches,
    seasonId,
    competitionId,
    selectedCompetition,
    teamCompetitions,
  ]);

  /*
   * ============================================================
   * JUGADORES ORDENADOS
   * ============================================================
   */

  const availablePlayers = useMemo(() => {
    return [...players].sort((a, b) =>
      a.name.localeCompare(b.name, "es", {
        sensitivity: "base",
      })
    );
  }, [players]);

  /*
   * ============================================================
   * CARGAR PLANTILLA EXISTENTE
   * ============================================================
   */

  useEffect(() => {
    if (!seasonId || !teamId) {
      setRows([]);
      setErrorPlayerIds(new Set());
      return;
    }

    let mounted = true;

    async function loadSquad() {
      try {
        setLoadingSquad(true);
        setError("");
        setSuccess("");
        setErrorPlayerIds(new Set());

        const existing =
          await getHistPlayerTeamsByTeamAndSeason(
            teamId,
            seasonId
          );

        if (!mounted) return;

        const existingMap = new Map(
          existing.map((item) => [item.playerId, item])
        );

        const newRows: PlayerRow[] = availablePlayers.map(
          (player) => {
            const history = existingMap.get(player.id);

            return {
              playerId: player.id,
              selected: Boolean(history),
              shirtNumber:
                history?.shirtNumber !== null &&
                history?.shirtNumber !== undefined
                  ? String(history.shirtNumber)
                  : "",
              positionId: history?.positionId ?? 0,
            };
          }
        );

        setRows(newRows);
        setPlayerSearch("");
        setCurrentPage(1);
        setShowSelectedOnly(false);
      } catch (err) {
        console.error("Error cargando plantilla:", err);

        if (mounted) {
          setError("No se pudo cargar la plantilla existente.");
        }
      } finally {
        if (mounted) {
          setLoadingSquad(false);
        }
      }
    }

    loadSquad();

    return () => {
      mounted = false;
    };
  }, [seasonId, teamId, availablePlayers]);

  /*
   * ============================================================
   * CAMBIAR TEMPORADA
   * ============================================================
   */

  const handleSeasonChange = (value: number) => {
    setSeasonId(value);
    setCompetitionId(0);
    setTeamId(0);
    setRows([]);
    setPlayerSearch("");
    setCurrentPage(1);
    setShowSelectedOnly(false);
    setError("");
    setSuccess("");
    setErrorPlayerIds(new Set());
  };

  /*
   * ============================================================
   * CAMBIAR COMPETICIÓN
   * ============================================================
   */

  const handleCompetitionChange = (value: number) => {
    setCompetitionId(value);
    setTeamId(0);
    setRows([]);
    setPlayerSearch("");
    setCurrentPage(1);
    setShowSelectedOnly(false);
    setError("");
    setSuccess("");
    setErrorPlayerIds(new Set());
  };

  /*
   * ============================================================
   * CAMBIAR EQUIPO
   * ============================================================
   */

  const handleTeamChange = (value: number) => {
    setTeamId(value);
    setRows([]);
    setPlayerSearch("");
    setCurrentPage(1);
    setShowSelectedOnly(false);
    setError("");
    setSuccess("");
    setErrorPlayerIds(new Set());
  };

  /*
   * ============================================================
   * BUSCADOR
   * ============================================================
   */

  const handlePlayerSearchChange = (value: string) => {
    setPlayerSearch(value);
    setCurrentPage(1);
  };

  /*
   * ============================================================
   * FILTRAR JUGADORES
   * ============================================================
   */

  const filteredPlayers = useMemo(() => {
    const search = playerSearch
      .trim()
      .toLocaleLowerCase("es");

    return availablePlayers.filter((player) => {
      const row = rows.find(
        (item) => item.playerId === player.id
      );

      if (showSelectedOnly && !row?.selected) {
        return false;
      }

      if (!search) {
        return true;
      }

      return player.name
        .toLocaleLowerCase("es")
        .includes(search);
    });
  }, [
    availablePlayers,
    playerSearch,
    rows,
    showSelectedOnly,
  ]);

  /*
   * ============================================================
   * PAGINACIÓN
   * ============================================================
   */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE)
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPlayers = useMemo(() => {
    const startIndex =
      (currentPage - 1) * PLAYERS_PER_PAGE;

    return filteredPlayers.slice(
      startIndex,
      startIndex + PLAYERS_PER_PAGE
    );
  }, [filteredPlayers, currentPage]);

  const pageNumbers = useMemo(() => {
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from(
        { length: totalPages },
        (_, index) => index + 1
      );
    }

    let startPage = Math.max(1, currentPage - 2);
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = totalPages - maxVisiblePages + 1;
    }

    return Array.from(
      {
        length: endPage - startPage + 1,
      },
      (_, index) => startPage + index
    );
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) {
      return;
    }

    setCurrentPage(page);
  };

  /*
   * ============================================================
   * SELECCIÓN DE JUGADORES
   * ============================================================
   */

  const handlePlayerSelected = (
    playerId: number,
    selected: boolean
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.playerId === playerId
          ? {
              ...row,
              selected,
            }
          : row
      )
    );

    if (!selected) {
      setErrorPlayerIds((current) => {
        const next = new Set(current);
        next.delete(playerId);
        return next;
      });
    }
  };

  const handleSelectAll = () => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        selected: true,
      }))
    );
  };

  const handleDeselectAll = () => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        selected: false,
      }))
    );

    setErrorPlayerIds(new Set());
  };

  const handleToggleSelected = () => {
    setShowSelectedOnly((current) => !current);
    setCurrentPage(1);
  };

  /*
   * ============================================================
   * CAMBIAR DORSAL
   * ============================================================
   */

  const handleShirtNumberChange = (
    playerId: number,
    value: string
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.playerId === playerId
          ? {
              ...row,
              shirtNumber: value,
            }
          : row
      )
    );

    setErrorPlayerIds((current) => {
      const next = new Set(current);
      next.delete(playerId);
      return next;
    });
  };

  /*
   * ============================================================
   * CAMBIAR POSICIÓN
   * ============================================================
   */

  const handlePositionChange = (
    playerId: number,
    value: number
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.playerId === playerId
          ? {
              ...row,
              positionId: value,
            }
          : row
      )
    );

    setErrorPlayerIds((current) => {
      const next = new Set(current);
      next.delete(playerId);
      return next;
    });
  };

  /*
   * ============================================================
   * CONTADORES
   * ============================================================
   */

  const selectedCount = rows.filter(
    (row) => row.selected
  ).length;

  /*
   * ============================================================
   * GUARDAR PLANTILLA
   * ============================================================
   */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setErrorPlayerIds(new Set());

    if (!seasonId) {
      setError("Selecciona una temporada.");
      return;
    }

    if (!competitionId) {
      setError("Selecciona una competición.");
      return;
    }

    if (!teamId) {
      setError("Selecciona un equipo o selección.");
      return;
    }

    const selectedRows = rows.filter(
      (row) => row.selected
    );

    if (selectedRows.length === 0) {
      setError("Selecciona al menos un jugador.");
      return;
    }

    const validationErrors = new Set<number>();
    const errorMessages: string[] = [];

    /*
     * VALIDAR POSICIONES Y DORSALES
     */

    for (const row of selectedRows) {
      const player = players.find(
        (item) => item.id === row.playerId
      );

      const playerName = player?.name ?? "El jugador";

      if (!row.positionId) {
        validationErrors.add(row.playerId);

        errorMessages.push(
          `${playerName}: falta seleccionar una posición.`
        );
      }

      if (row.shirtNumber !== "") {
        const shirtNumber = Number(row.shirtNumber);

        if (
          !Number.isInteger(shirtNumber) ||
          shirtNumber < 1 ||
          shirtNumber > 99
        ) {
          validationErrors.add(row.playerId);

          errorMessages.push(
            `${playerName}: el dorsal debe estar entre 1 y 99.`
          );
        }
      }
    }

    /*
     * COMPROBAR DORSALES DUPLICADOS
     */

    const shirtNumberMap = new Map<number, number[]>();

    for (const row of selectedRows) {
      if (row.shirtNumber === "") {
        continue;
      }

      const shirtNumber = Number(row.shirtNumber);

      if (
        !Number.isInteger(shirtNumber) ||
        shirtNumber < 1 ||
        shirtNumber > 99
      ) {
        continue;
      }

      const playerIds =
        shirtNumberMap.get(shirtNumber) ?? [];

      playerIds.push(row.playerId);
      shirtNumberMap.set(shirtNumber, playerIds);
    }

    shirtNumberMap.forEach((playerIds, shirtNumber) => {
      if (playerIds.length <= 1) {
        return;
      }

      playerIds.forEach((playerId) => {
        validationErrors.add(playerId);
      });

      const names = playerIds.map(
        (playerId) =>
          players.find((player) => player.id === playerId)
            ?.name ?? "Jugador"
      );

      errorMessages.push(
        `El dorsal ${shirtNumber} está repetido: ${names.join(
          ", "
        )}.`
      );
    });

    if (validationErrors.size > 0) {
      setErrorPlayerIds(validationErrors);
      setError(errorMessages.join(" "));
      return;
    }

    /*
     * GUARDAR Y SINCRONIZAR LA PLANTILLA
     */

    try {
      setSaving(true);

      const existing =
        await getHistPlayerTeamsByTeamAndSeason(
          teamId,
          seasonId
        );

      const selectedPlayerIds = new Set(
        selectedRows.map((row) => row.playerId)
      );

      const activeRecords = selectedRows.map((row) => ({
        playerId: row.playerId,
        teamId,
        seasonId,
        shirtNumber:
          row.shirtNumber !== ""
            ? Number(row.shirtNumber)
            : null,
        positionId: row.positionId || null,
        startDate: null,
        endDate: null,
        active: true,
      }));

      const inactiveRecords = existing
        .filter(
          (history) =>
            history.active === true &&
            !selectedPlayerIds.has(history.playerId)
        )
        .map((history) => ({
          playerId: history.playerId,
          teamId: history.teamId,
          seasonId: history.seasonId,
          shirtNumber: history.shirtNumber ?? null,
          positionId: history.positionId ?? null,
          startDate: history.startDate ?? null,
          endDate: history.endDate ?? null,
          active: false,
        }));

      const records = [
        ...activeRecords,
        ...inactiveRecords,
      ];

      await saveHistPlayerTeamSquad(records);

      setSuccess(
        `Plantilla guardada correctamente: ${selectedRows.length} jugadores activos.`
      );

      setErrorPlayerIds(new Set());

      if (onSaved) {
        await onSaved();
      }
    } catch (err) {
      console.error("Error guardando plantilla:", err);

      setError(
        "No se pudo guardar la plantilla. Comprueba los datos e inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================================================
   * ESTADO DE CARGA
   * ============================================================
   */

  if (loading) {
    return (
      <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
          Historial de plantilla
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Cargando datos...
        </p>
      </div>
    );
  }

  /*
   * ============================================================
   * RENDER PRINCIPAL
   * ============================================================
   */

  return (
    <div className="mx-auto w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 md:p-6">
      {/* CABECERA PRINCIPAL */}

      <div className="mb-5 sm:mb-6">
        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
          Historial de plantilla
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Selecciona una temporada, una competición y un equipo
          para introducir su plantilla.
        </p>
      </div>

      {/* MENSAJES */}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-5 sm:p-4">
          <strong className="font-semibold">
            Revisa los siguientes errores:
          </strong>

          <p className="mt-1 leading-6">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 sm:mb-5 sm:p-4">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 sm:space-y-6"
      >
        {/* DATOS DE LA PLANTILLA */}

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
            Datos de la plantilla
          </h3>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
            {/* TEMPORADA */}

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Temporada
              </label>

              <select
                value={seasonId}
                onChange={(event) =>
                  handleSeasonChange(
                    Number(event.target.value)
                  )
                }
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300 sm:px-4"
              >
                <option value={0}>
                  Seleccionar temporada
                </option>

                {seasons
                  .filter((season) => season.active === true)
                  .map((season) => (
                    <option
                      key={season.id}
                      value={season.id}
                    >
                      {season.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* COMPETICIÓN */}

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Competición
              </label>

              <select
                value={competitionId}
                onChange={(event) =>
                  handleCompetitionChange(
                    Number(event.target.value)
                  )
                }
                disabled={!seasonId}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300 disabled:bg-slate-100 sm:px-4"
              >
                <option value={0}>
                  {!seasonId
                    ? "Selecciona primero una temporada"
                    : "Seleccionar competición"}
                </option>

                {availableCompetitions.map((competition) => (
                  <option
                    key={competition.id}
                    value={competition.id}
                  >
                    {competition.name}
                  </option>
                ))}
              </select>
            </div>

            {/* EQUIPO O SELECCIÓN */}

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {selectedCompetition?.competitionType ===
                "National Team"
                  ? "Selección"
                  : "Equipo"}
              </label>

              <select
                value={teamId}
                onChange={(event) =>
                  handleTeamChange(
                    Number(event.target.value)
                  )
                }
                disabled={!seasonId || !competitionId}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300 disabled:bg-slate-100 sm:px-4"
              >
                <option value={0}>
                  {!seasonId
                    ? "Selecciona primero una temporada"
                    : !competitionId
                    ? "Selecciona primero una competición"
                    : selectedCompetition?.competitionType ===
                      "National Team"
                    ? "Seleccionar selección"
                    : "Seleccionar equipo"}
                </option>

                {availableTeams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {team.shortName ?? team.name} - {team.name}
                  </option>
                ))}
              </select>

              {competitionId > 0 &&
                availableTeams.length === 0 && (
                  <p className="mt-2 text-xs leading-5 text-amber-600">
                    {selectedCompetition?.competitionType ===
                    "National Team"
                      ? 'No hay selecciones activas con type "selección".'
                      : "No hay equipos activos asociados a esta competición."}
                  </p>
                )}
            </div>
          </div>
        </section>

        {/* PLANTILLA */}

        {teamId > 0 && seasonId > 0 && (
          <section className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* CABECERA DE JUGADORES */}

            <div className="border-b border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      Jugadores
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Seleccionados:{" "}
                      <strong>{selectedCount}</strong>
                    </p>
                  </div>

                  {/* BOTONES RESPONSIVE */}

                  <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      disabled={
                        loadingSquad || rows.length === 0
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      Seleccionar todos
                    </button>

                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      disabled={
                        loadingSquad || rows.length === 0
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      Quitar todos
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleSelected}
                      disabled={
                        loadingSquad ||
                        rows.length === 0 ||
                        selectedCount === 0
                      }
                      className={`w-full rounded-lg border px-3 py-2.5 text-xs font-semibold transition sm:w-auto ${
                        showSelectedOnly
                          ? "border-slate-800 bg-slate-800 text-white hover:bg-slate-700"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {showSelectedOnly
                        ? "Mostrar todos"
                        : "Mostrar seleccionados"}
                    </button>
                  </div>
                </div>

                {/* BUSCADOR */}

                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1 sm:max-w-xl">
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(event) =>
                        handlePlayerSearchChange(
                          event.target.value
                        )
                      }
                      placeholder="Buscar jugador..."
                      disabled={
                        loadingSquad || rows.length === 0
                      }
                      className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 pl-10 text-sm outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300 disabled:bg-slate-100 sm:px-4 sm:pl-10"
                    />

                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      🔎
                    </span>
                  </div>

                  {playerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlayerSearch("");
                        setCurrentPage(1);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 sm:w-auto"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* INFORMACIÓN Y FILTROS */}

                <div className="flex min-w-0 flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Mostrando{" "}
                    <strong>
                      {filteredPlayers.length === 0
                        ? 0
                        : (currentPage - 1) *
                            PLAYERS_PER_PAGE +
                          1}
                    </strong>{" "}
                    -{" "}
                    <strong>
                      {Math.min(
                        currentPage * PLAYERS_PER_PAGE,
                        filteredPlayers.length
                      )}
                    </strong>{" "}
                    de{" "}
                    <strong>{filteredPlayers.length}</strong>{" "}
                    jugadores
                  </span>

                  <div className="flex min-w-0 flex-wrap gap-3">
                    {showSelectedOnly && (
                      <span className="font-semibold text-slate-700">
                        Mostrando solo seleccionados
                      </span>
                    )}

                    {playerSearch && (
                      <span className="break-words">
                        Filtrado por:{" "}
                        <strong>"{playerSearch}"</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CONTENIDO DE LA TABLA */}

            {loadingSquad ? (
              <div className="p-5 text-center text-sm text-slate-500 sm:p-8">
                Cargando plantilla...
              </div>
            ) : rows.length === 0 ? (
              <div className="p-5 text-center text-sm text-slate-500 sm:p-8">
                No hay jugadores registrados.
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="p-6 text-center sm:p-8">
                <p className="text-sm font-medium text-slate-600">
                  {showSelectedOnly
                    ? "No hay jugadores seleccionados."
                    : "No se encontraron jugadores."}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setPlayerSearch("");
                    setCurrentPage(1);

                    if (showSelectedOnly) {
                      setShowSelectedOnly(false);
                    }
                  }}
                  className="mt-3 text-sm font-semibold text-slate-700 underline hover:text-slate-900"
                >
                  Mostrar todos los jugadores
                </button>
              </div>
            ) : (
              <>
                {/* CONTENEDOR RESPONSIVE CON SCROLL HORIZONTAL */}

                <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
                  <table className="w-full min-w-[680px] table-fixed text-sm">
                    <colgroup>
                      <col className="w-[70px]" />
                      <col className="w-[38%]" />
                      <col className="w-[125px]" />
                      <col className="w-[280px]" />
                    </colgroup>

                    <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-3 sm:px-4">
                          Incluir
                        </th>

                        <th className="px-3 py-3 sm:px-4">
                          Jugador
                        </th>

                        <th className="px-3 py-3 sm:px-4">
                          Dorsal
                        </th>

                        <th className="px-3 py-3 sm:px-4">
                          Posición
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {paginatedPlayers.map((player) => {
                        const row = rows.find(
                          (item) => item.playerId === player.id
                        );

                        if (!row) {
                          return null;
                        }

                        const hasError = errorPlayerIds.has(
                          row.playerId
                        );

                        return (
                          <tr
                            key={row.playerId}
                            className={
                              hasError
                                ? "bg-red-50"
                                : row.selected
                                ? "bg-white"
                                : "bg-slate-50"
                            }
                          >
                            {/* INCLUIR */}

                            <td className="px-3 py-3 sm:px-4">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={(event) =>
                                  handlePlayerSelected(
                                    row.playerId,
                                    event.target.checked
                                  )
                                }
                                className="h-4 w-4 cursor-pointer rounded border-slate-300"
                              />
                            </td>

                            {/* JUGADOR */}

                            <td
                              className={`px-3 py-3 sm:px-4 ${
                                hasError
                                  ? "text-red-700"
                                  : "text-slate-800"
                              }`}
                              title={player.name}
                            >
                              <div className="truncate font-medium">
                                {player.name}
                              </div>

                              {hasError && (
                                <span className="mt-1 block text-xs font-semibold text-red-600">
                                  ⚠ Revisar
                                </span>
                              )}
                            </td>

                            {/* DORSAL */}

                            <td className="px-3 py-3 sm:px-4">
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={row.shirtNumber}
                                onChange={(event) =>
                                  handleShirtNumberChange(
                                    row.playerId,
                                    event.target.value
                                  )
                                }
                                disabled={!row.selected}
                                placeholder="—"
                                className={`w-full max-w-[100px] rounded-lg border px-3 py-2 outline-none transition disabled:bg-slate-100 ${
                                  hasError
                                    ? "border-red-500 bg-red-50 text-red-700 focus:border-red-600"
                                    : "border-slate-300 focus:border-slate-500"
                                }`}
                              />
                            </td>

                            {/* POSICIÓN */}

                            <td className="px-3 py-3 sm:px-4">
                              <select
                                value={row.positionId}
                                onChange={(event) =>
                                  handlePositionChange(
                                    row.playerId,
                                    Number(event.target.value)
                                  )
                                }
                                disabled={!row.selected}
                                className={`w-full min-w-0 rounded-lg border bg-white px-3 py-2 outline-none transition disabled:bg-slate-100 ${
                                  hasError
                                    ? "border-red-500 bg-red-50 text-red-700 focus:border-red-600"
                                    : "border-slate-300 focus:border-slate-500"
                                }`}
                              >
                                <option value={0}>
                                  Seleccionar posición
                                </option>

                                {positions.map((position) => (
                                  <option
                                    key={position.id}
                                    value={position.id}
                                  >
                                    {position.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* PAGINACIÓN */}

                {totalPages > 1 && (
                  <div className="flex flex-col gap-3 border-t border-slate-200 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                    <button
                      type="button"
                      onClick={() =>
                        handlePageChange(currentPage - 1)
                      }
                      disabled={currentPage === 1}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                      Anterior
                    </button>

                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {pageNumbers.map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => handlePageChange(page)}
                          className={`min-w-9 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                            currentPage === page
                              ? "bg-slate-800 text-white"
                              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handlePageChange(currentPage + 1)
                      }
                      disabled={currentPage === totalPages}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* BOTONES INFERIORES */}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end sm:pt-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="w-full rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            disabled={
              saving ||
              loadingSquad ||
              !teamId ||
              !competitionId ||
              !seasonId ||
              rows.length === 0
            }
            className="w-full rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving
              ? "Guardando plantilla..."
              : "Guardar plantilla"}
          </button>
        </div>
      </form>
    </div>
  );
}