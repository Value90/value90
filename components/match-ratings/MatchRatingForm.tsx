"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getMatchRatings,
  getMatchRatingByParticipationId,
  addMatchRating,
  updateMatchRating,
  calculateExternalAverage,
  type MatchRating,
} from "@/services/match-rating.service";

import {
  getMatches,
  type Match,
} from "@/services/match.service";

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
  getParticipations,
  type Participation,
} from "@/services/participation.service";

import {
  getPlayers,
  type Player,
} from "@/services/player.service";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import {
  getHistPlayerTeamsByTeamAndSeason,
} from "@/services/hist-player-team.service";

interface MatchRatingFormProps {
  matchRating?: MatchRating;
  onCancel: () => void;
  onSaved: () => void;
  initialInputMode?: "manual" | "import";
}


interface ImportRatingRow {
  playerName: string;
  player: Player | undefined;
  playerId: number | null;
  stageName: string;
  stageId: number | null;
  matchId: number | null;
  participationId: number | null;
  rating: number | null;
  status: "ok" | "player-missing" | "stage-missing" | "match-missing" | "participation-missing" | "invalid";
  message: string;
}

interface ImportColumn {
  index: number;
  label: string;
  stageName: string;
  stageKey: string;
  stageId: number | null;
  matchId: number | null;
}

interface OrderedParticipation {
  participation: Participation;
  player: Player | undefined;
  team: Team | undefined;
  positionId: number;
}

export default function MatchRatingForm({
  matchRating,
  onCancel,
  onSaved,
  initialInputMode = "manual",
}: MatchRatingFormProps) {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [stages, setStages] =
    useState<Stage[]>([]);

  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [matchRatings, setMatchRatings] =
    useState<MatchRating[]>([]);

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  /*
   * ============================================================
   * ESTADOS DE CARGA
   * ============================================================
   */

  const [
    competitionsLoading,
    setCompetitionsLoading,
  ] = useState(true);

  const [
    teamsLoading,
    setTeamsLoading,
  ] = useState(true);

  const [
    seasonsLoading,
    setSeasonsLoading,
  ] = useState(true);

  const [
    stagesLoading,
    setStagesLoading,
  ] = useState(true);

  const [
    participationsLoading,
    setParticipationsLoading,
  ] = useState(true);

  const [
    matchRatingsLoading,
    setMatchRatingsLoading,
  ] = useState(true);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  /*
   * ============================================================
   * FILTROS
   * ============================================================
   */

  const [
    competitionId,
    setCompetitionId,
  ] = useState<number>(0);

  const [
    seasonId,
    setSeasonId,
  ] = useState<number>(0);

  const [
    stageId,
    setStageId,
  ] = useState<number>(0);

  const [
    matchId,
    setMatchId,
  ] = useState<number>(
    matchRating?.matchId ?? 0
  );

  const [
    teamId,
    setTeamId,
  ] = useState<number>(0);

  /*
   * ============================================================
   * PARTICIPACIONES ORDENADAS
   * ============================================================
   */

  const [
    orderedParticipations,
    setOrderedParticipations,
  ] = useState<OrderedParticipation[]>([]);

  /*
   * ============================================================
   * PROGRESO
   *
   * IMPORTANTE:
   *
   * totalParticipations permanece FIJO durante
   * toda la carga del partido/equipo.
   *
   * completedParticipations representa cuántas
   * valoraciones ya estaban guardadas antes de
   * empezar o cuántas hemos guardado durante
   * esta sesión.
   * ============================================================
   */

  const [
    totalParticipations,
    setTotalParticipations,
  ] = useState(0);

  const [
    completedParticipations,
    setCompletedParticipations,
  ] = useState(0);

  /*
   * ============================================================
   * JUGADOR ACTUAL
   * ============================================================
   */

  const [
    currentPlayerIndex,
    setCurrentPlayerIndex,
  ] = useState(0);

  /*
   * ============================================================
   * NOTAS
   * ============================================================
   */

  const [
    marcaRating,
    setMarcaRating,
  ] = useState<string>(
    matchRating?.marcaRating !== null &&
      matchRating?.marcaRating !== undefined
      ? String(matchRating.marcaRating)
      : ""
  );

  const [
    asRating,
    setAsRating,
  ] = useState<string>(
    matchRating?.asRating !== null &&
      matchRating?.asRating !== undefined
      ? String(matchRating.asRating)
      : ""
  );

  const [
    sofascoreRating,
    setSofascoreRating,
  ] = useState<string>(
    matchRating?.sofascoreRating !== null &&
      matchRating?.sofascoreRating !== undefined
      ? String(matchRating.sofascoreRating)
      : ""
  );

  const [
    flashscoreRating,
    setFlashscoreRating,
  ] = useState<string>(
    matchRating?.flashscoreRating !== null &&
      matchRating?.flashscoreRating !== undefined
      ? String(matchRating.flashscoreRating)
      : ""
  );

  /*
   * ============================================================
   * ESTADO GENERAL
   * ============================================================
   */

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  /*
   * ============================================================
   * IMPORTACIÓN DESDE GOOGLE SHEETS
   * ============================================================
   */

  const [inputMode, setInputMode] =
    useState<"manual" | "import">(
      matchRating ? "manual" : initialInputMode
    );

  const [importSource, setImportSource] =
    useState<"Marca" | "AS" | "SofaScore" | "FlashScore">("Marca");

  const [importText, setImportText] =
    useState("");

  const [importColumns, setImportColumns] =
    useState<ImportColumn[]>([]);

  const [importPreview, setImportPreview] =
    useState<ImportRatingRow[]>([]);

  const [importAnalyzed, setImportAnalyzed] =
    useState(false);

  const [importing, setImporting] =
    useState(false);

  const [importMessage, setImportMessage] =
    useState("");

  /*
   * ============================================================
   * CARGAR DATOS PRINCIPALES
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [
          matchesData,
          stagesData,
          participationsData,
          playersData,
          matchRatingsData,
        ] = await Promise.all([
          getMatches(),
          getStages(),
          getParticipations(),
          getPlayers(),
          getMatchRatings(),
        ]);

        if (!mounted) {
          return;
        }

        setMatches(matchesData);
        setStages(stagesData);
        setParticipations(
          participationsData
        );
        setPlayers(playersData);
        setMatchRatings(
          matchRatingsData
        );
      } catch (error) {
        console.error(
          "Error cargando datos del formulario:",
          error
        );

        if (!mounted) {
          return;
        }

        setMatches([]);
        setStages([]);
        setParticipations([]);
        setPlayers([]);
        setMatchRatings([]);
      } finally {
        if (mounted) {
          setStagesLoading(false);
          setParticipationsLoading(false);
          setMatchRatingsLoading(false);
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
   * INICIALIZAR SELECTORES EN MODO EDICIÓN
   * ============================================================
   *
   * En edición matchRating ya contiene el partido y la participación,
   * pero los selectores empiezan en 0. Reconstruimos automáticamente
   * Temporada → Competición → Jornada/Fase → Partido → Equipo.
   * Las notas existentes se cargan también para poder editarlas.
   */

  useEffect(() => {
    if (!matchRating?.matchId) {
      return;
    }

    const selectedMatchData = matches.find(
      (match) => match.id === matchRating.matchId
    );

    if (!selectedMatchData) {
      return;
    }

    setMatchId(selectedMatchData.id);
    setSeasonId(selectedMatchData.seasonId);
    setCompetitionId(selectedMatchData.competitionId);
    setStageId(selectedMatchData.stageId ?? 0);

    const participation =
      participations.find(
        (item) => item.id === matchRating.participationId
      ) ??
      participations.find(
        (item) =>
          item.matchId === matchRating.matchId &&
          item.playerId === matchRating.playerId
      );

    if (participation) {
      setTeamId(participation.teamId);
    }

    setMarcaRating(
      matchRating.marcaRating !== null &&
        matchRating.marcaRating !== undefined
        ? String(matchRating.marcaRating)
        : ""
    );

    setAsRating(
      matchRating.asRating !== null &&
        matchRating.asRating !== undefined
        ? String(matchRating.asRating)
        : ""
    );

    setSofascoreRating(
      matchRating.sofascoreRating !== null &&
        matchRating.sofascoreRating !== undefined
        ? String(matchRating.sofascoreRating)
        : ""
    );

    setFlashscoreRating(
      matchRating.flashscoreRating !== null &&
        matchRating.flashscoreRating !== undefined
        ? String(matchRating.flashscoreRating)
        : ""
    );
  }, [matchRating, matches, participations]);

  /*
   * ============================================================
   * CARGAR TEMPORADAS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadSeasons() {
      try {
        setSeasonsLoading(true);

        const data = await getSeasons();

        if (mounted) {
          setSeasons(data);
        }
      } catch (error) {
        console.error(
          "Error cargando temporadas:",
          error
        );

        if (mounted) {
          setSeasons([]);
        }
      } finally {
        if (mounted) {
          setSeasonsLoading(false);
        }
      }
    }

    loadSeasons();

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

    async function loadCompetitions() {
      try {
        setCompetitionsLoading(true);

        const data =
          await getCompetitions();

        if (mounted) {
          setCompetitions(data);
        }
      } catch (error) {
        console.error(
          "Error cargando competiciones:",
          error
        );

        if (mounted) {
          setCompetitions([]);
        }
      } finally {
        if (mounted) {
          setCompetitionsLoading(false);
        }
      }
    }

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

    async function loadTeams() {
      try {
        setTeamsLoading(true);

        const data = await getTeams();

        if (mounted) {
          setTeams(data);
        }
      } catch (error) {
        console.error(
          "Error cargando equipos:",
          error
        );

        if (mounted) {
          setTeams([]);
        }
      } finally {
        if (mounted) {
          setTeamsLoading(false);
        }
      }
    }

    loadTeams();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * COMPETICIONES DISPONIBLES
   * ============================================================
   */

  const availableCompetitions =
    useMemo(() => {
      return competitions
        .filter((competition) => {
          if (!competition.active) {
            return false;
          }

          if (seasonId) {
            return matches.some(
              (match) =>
                match.seasonId === seasonId &&
                match.competitionId === competition.id
            );
          }

          return true;
        })
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "es",
            { sensitivity: "base" }
          )
        );
    }, [
      competitions,
      matches,
      seasonId,
      inputMode,
    ]);

  /*
   * ============================================================
   * TEMPORADAS DISPONIBLES
   * ============================================================
   */

  const availableSeasons =
    useMemo(() => {
      return seasons
        .filter(
          (season) =>
            season.active
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "es"
          )
        );
    }, [seasons]);

  /*
   * ============================================================
   * JORNADAS / FASES
   * ============================================================
   */

  const availableStages =
    useMemo(() => {
      if (!seasonId) {
        return [];
      }

      return stages
        .filter((stage) => {
          if (
            stage.seasonId !== seasonId ||
            !stage.active
          ) {
            return false;
          }

          if (!competitionId) {
            return true;
          }

          return matches.some(
            (match) =>
              match.seasonId === seasonId &&
              match.competitionId === competitionId &&
              match.stageId === stage.id
          );
        })
        .sort((a, b) => {
          const numberA = Number(
            a.name.match(/\d+/)?.[0] ?? 0
          );
          const numberB = Number(
            b.name.match(/\d+/)?.[0] ?? 0
          );

          if (numberA !== numberB) {
            return numberB - numberA;
          }

          return (b.displayOrder ?? 0) -
            (a.displayOrder ?? 0);
        });
    }, [
      stages,
      matches,
      seasonId,
      competitionId,
    ]);

  /*
   * ============================================================
   * PARTIDOS FILTRADOS
   * ============================================================
   */

  const availableMatches =
    useMemo(() => {
      return matches
        .filter((match) => {
          if (
            competitionId &&
            match.competitionId !==
              competitionId
          ) {
            return false;
          }

          if (
            seasonId &&
            match.seasonId !==
              seasonId
          ) {
            return false;
          }

          if (
            stageId &&
            match.stageId !==
              stageId
          ) {
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          const dateA =
            a.date
              ? new Date(a.date).getTime()
              : 0;

          const dateB =
            b.date
              ? new Date(b.date).getTime()
              : 0;

          return dateB - dateA;
        });
    }, [
      matches,
      competitionId,
      seasonId,
      stageId,
    ]);

  /*
   * ============================================================
   * PARTIDO SELECCIONADO
   * ============================================================
   */

  const selectedMatch =
    matches.find(
      (match) =>
        match.id === matchId
    );

  /*
   * ============================================================
   * EQUIPOS DEL PARTIDO
   * ============================================================
   */

  const availableMatchTeams =
    useMemo(() => {
      if (!selectedMatch) {
        return [];
      }

      const ids = [
        selectedMatch.homeTeamId,
        selectedMatch.awayTeamId,
      ];

      return teams
        .filter((team) =>
          ids.includes(team.id)
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "es"
          )
        );
    }, [
      selectedMatch,
      teams,
    ]);

  /*
   * ============================================================
   * EQUIPOS PARA IMPORTACIÓN
   * ============================================================
   * Se muestran como "nombre corto - nombre completo",
   * pero se ordenan por nombre completo.
   * ============================================================
   */

  const availableImportTeams =
    useMemo(() => {
      if (!seasonId || !competitionId) {
        return [];
      }

      return teams
        .filter((team) =>
          matches.some(
            (match) =>
              match.competitionId === competitionId &&
              match.seasonId === seasonId &&
              (match.homeTeamId === team.id ||
                match.awayTeamId === team.id)
          )
        )
        .sort((a, b) =>
          (a.shortName ?? a.name).localeCompare(
            b.shortName ?? b.name,
            "es",
            { sensitivity: "base" }
          )
        );
    }, [
      teams,
      matches,
      seasonId,
      competitionId,
    ]);

  /*
   * ============================================================
   * CARGAR Y ORDENAR PARTICIPACIONES
   * ============================================================
   */

  useEffect(() => {
    if (
      !matchId ||
      !teamId ||
      !seasonId
    ) {
      setOrderedParticipations([]);
      setCurrentPlayerIndex(0);
      setTotalParticipations(0);
      setCompletedParticipations(0);
      return;
    }

    if (matchRatingsLoading) {
      return;
    }

    let mounted = true;

    async function loadOrderedPlayers() {
      try {
        setHistoryLoading(true);
        setError("");

        /*
         * ======================================================
         * TODAS LAS PARTICIPACIONES DEL EQUIPO
         * ======================================================
         */

        const teamParticipations =
          participations.filter(
            (participation) =>
              participation.matchId ===
                matchId &&
              participation.teamId ===
                teamId
          );

        /*
         * ======================================================
         * FIJAR EL TOTAL
         *
         * MUY IMPORTANTE:
         *
         * Este valor NO depende de la lista de
         * pendientes y por tanto NO disminuye
         * cuando guardamos una valoración.
         * ======================================================
         */

        if (!matchRating) {
          const existingRatings =
            teamParticipations.filter(
              (participation) =>
                matchRatings.some(
                  (rating) =>
                    rating.participationId ===
                    participation.id
                )
            ).length;

          setTotalParticipations(
            teamParticipations.length
          );

          setCompletedParticipations(
            existingRatings
          );
        } else {
          /*
           * En edición trabajamos únicamente
           * con la valoración seleccionada.
           */

          setTotalParticipations(1);
          setCompletedParticipations(0);
        }

        /*
         * ======================================================
         * PARTICIPACIONES PENDIENTES
         * ======================================================
         */

        const pendingParticipations =
          teamParticipations.filter(
            (participation) => {
              /*
               * MODO EDICIÓN
               */

              if (matchRating) {
                return (
                  participation.id ===
                  matchRating.participationId
                );
              }

              /*
               * MODO NUEVA VALORACIÓN
               */

              const hasRating =
                matchRatings.some(
                  (rating) =>
                    rating.participationId ===
                    participation.id
                );

              return !hasRating;
            }
          );

        /*
         * ======================================================
         * NO HAY PARTICIPACIONES PENDIENTES
         * ======================================================
         */

        if (
          pendingParticipations.length ===
          0
        ) {
          if (mounted) {
            setOrderedParticipations([]);
            setCurrentPlayerIndex(0);
          }

          return;
        }

        /*
         * ======================================================
         * CARGAR HISTORIAL DEL EQUIPO
         * ======================================================
         */

        const history =
          await getHistPlayerTeamsByTeamAndSeason(
            teamId,
            seasonId
          );

        if (!mounted) {
          return;
        }

        const historyMap =
          new Map(
            history.map((item) => [
              item.playerId,
              item,
            ])
          );

        /*
         * ======================================================
         * CONSTRUIR RESULTADO
         * ======================================================
         */

        const result =
          pendingParticipations
            .map(
              (
                participation
              ) => {
                const player =
                  players.find(
                    (item) =>
                      item.id ===
                      participation.playerId
                  );

                const team =
                  teams.find(
                    (item) =>
                      item.id ===
                      participation.teamId
                  );

                const historyItem =
                  historyMap.get(
                    participation.playerId
                  );

                const positionId =
                  historyItem
                    ?.positionId ??
                  participation.positionId ??
                  999;

                return {
                  participation,
                  player,
                  team,
                  positionId,
                };
              }
            )
            .sort((a, b) => {
              if (
                a.positionId !==
                b.positionId
              ) {
                return (
                  a.positionId - b.positionId
                );
              }

              return (
                a.player?.name ?? ""
              ).localeCompare(
                b.player?.name ?? "",
                "es"
              );
            });

        setOrderedParticipations(
          result
        );

        setCurrentPlayerIndex(0);

        /*
         * ======================================================
         * LIMPIAR NOTAS EN NUEVA VALORACIÓN
         * ======================================================
         */

        if (!matchRating) {
          setMarcaRating("");
          setAsRating("");
          setSofascoreRating("");
          setFlashscoreRating("");
        }
      } catch (error) {
        console.error(
          "Error cargando jugadores del equipo:",
          error
        );

        if (mounted) {
          setOrderedParticipations([]);
          setError(
            "No se pudieron cargar los jugadores del equipo."
          );
        }
      } finally {
        if (mounted) {
          setHistoryLoading(false);
        }
      }
    }

    loadOrderedPlayers();

    return () => {
      mounted = false;
    };
  }, [
    matchId,
    teamId,
    seasonId,
    participations,
    players,
    teams,
    matchRatings,
    matchRatingsLoading,
    matchRating,
  ]);

  /*
   * ============================================================
   * PARTICIPACIÓN ACTUAL
   * ============================================================
   */

  const currentItem =
    orderedParticipations[
      currentPlayerIndex
    ];

  const currentParticipation =
    currentItem?.participation;

  const currentPlayer =
    currentItem?.player;

  const currentTeam =
    currentItem?.team;

  /*
   * ============================================================
   * CAMBIO DE COMPETICIÓN
   * ============================================================
   */

  const handleCompetitionChange = (
    value: number
  ) => {
    setCompetitionId(value);

    setStageId(0);
    setMatchId(0);
    setTeamId(0);

    setOrderedParticipations([]);
    setCurrentPlayerIndex(0);

    setTotalParticipations(0);
    setCompletedParticipations(0);

    clearRatings();
    setError("");
  };

  /*
   * ============================================================
   * CAMBIO DE TEMPORADA
   * ============================================================
   */

  const handleSeasonChange = (
    value: number
  ) => {
    setSeasonId(value);

    // En importación el orden es: temporada → competición.
    if (inputMode === "import") {
      setCompetitionId(0);
    }

    setStageId(0);
    setMatchId(0);
    setTeamId(0);

    setOrderedParticipations([]);
    setCurrentPlayerIndex(0);

    setTotalParticipations(0);
    setCompletedParticipations(0);

    clearRatings();
    setError("");
  };

  /*
   * ============================================================
   * CAMBIO DE JORNADA
   * ============================================================
   */

  const handleStageChange = (
    value: number
  ) => {
    setStageId(value);

    setMatchId(0);
    setTeamId(0);

    setOrderedParticipations([]);
    setCurrentPlayerIndex(0);

    setTotalParticipations(0);
    setCompletedParticipations(0);

    clearRatings();
    setError("");
  };

  /*
   * ============================================================
   * CAMBIO DE PARTIDO
   * ============================================================
   */

  const handleMatchChange = (
    value: number
  ) => {
    setMatchId(value);

    setTeamId(0);

    setOrderedParticipations([]);
    setCurrentPlayerIndex(0);

    setTotalParticipations(0);
    setCompletedParticipations(0);

    clearRatings();
    setError("");
  };

  /*
   * ============================================================
   * CAMBIO DE EQUIPO
   * ============================================================
   */

  const handleTeamChange = (
    value: number
  ) => {
    setTeamId(value);

    setOrderedParticipations([]);
    setCurrentPlayerIndex(0);

    setTotalParticipations(0);
    setCompletedParticipations(0);

    clearRatings();
    setError("");
  };

  /*
   * ============================================================
   * LIMPIAR NOTAS
   * ============================================================
   */

  const clearRatings = () => {
    setMarcaRating("");
    setAsRating("");
    setSofascoreRating("");
    setFlashscoreRating("");
  };

  /*
   * ============================================================
   * VALIDAR NOTA
   * ============================================================
   */

  const validateRating = (
    value: string,
    min: number,
    max: number,
    label: string
  ): boolean => {
    if (value === "") {
      return true;
    }

    const numericValue =
      Number(value);

    if (Number.isNaN(numericValue)) {
      setError(
        `${label} debe ser un número válido.`
      );

      return false;
    }

    if (
      numericValue < min ||
      numericValue > max
    ) {
      setError(
        `${label} debe estar entre ${min} y ${max}.`
      );

      return false;
    }

    return true;
  };

  /*
   * ============================================================
   * GUARDAR JUGADOR ACTUAL Y SIGUIENTE
   * ============================================================
   */

  const handleNext = async () => {
    setError("");

    if (!currentParticipation) {
      setError(
        "No hay ningún jugador seleccionado."
      );

      return;
    }

    /*
     * ========================================================
     * VALIDAR NOTAS
     * ========================================================
     */

    if (
      !validateRating(
        marcaRating,
        0,
        3,
        "La nota de Marca"
      )
    ) {
      return;
    }

    if (
      !validateRating(
        asRating,
        0,
        4,
        "La nota de AS"
      )
    ) {
      return;
    }

    if (
      !validateRating(
        sofascoreRating,
        0,
        10,
        "La nota de SofaScore"
      )
    ) {
      return;
    }

    if (
      !validateRating(
        flashscoreRating,
        0,
        10,
        "La nota de FlashScore"
      )
    ) {
      return;
    }

    /*
     * ========================================================
     * AL MENOS UNA NOTA
     * ========================================================
     */

    if (
      marcaRating === "" &&
      asRating === "" &&
      sofascoreRating === "" &&
      flashscoreRating === ""
    ) {
      setError(
        "Introduce al menos una valoración antes de continuar."
      );

      return;
    }

    /*
     * ========================================================
     * CONVERTIR NOTAS
     * ========================================================
     */

    const marcaValue =
      marcaRating === ""
        ? null
        : Number(marcaRating);

    const asValue =
      asRating === ""
        ? null
        : Number(asRating);

    const sofascoreValue =
      sofascoreRating === ""
        ? null
        : Number(sofascoreRating);

    const flashscoreValue =
      flashscoreRating === ""
        ? null
        : Number(flashscoreRating);

    /*
     * ========================================================
     * MEDIA EXTERNA
     * ========================================================
     *
     * El cálculo se realiza mediante la función centralizada
     * del servicio match-rating para mantener una única lógica.
     * ========================================================
     */

    const externalAverage =
      calculateExternalAverage(
        marcaValue,
        asValue,
        sofascoreValue,
        flashscoreValue
      );

    /*
     * ========================================================
     * DATOS A GUARDAR
     * ========================================================
     */

    const matchRatingData: Omit<
      MatchRating,
      "id"
    > = {
      matchId,

      playerId:
        currentParticipation.playerId,

      participationId:
        currentParticipation.id,

      marcaRating: marcaValue,

      asRating: asValue,

      sofascoreRating:
        sofascoreValue,

      flashscoreRating:
        flashscoreValue,

      externalAverage,

      value90MatchRating:
        null,

      finalMatchRating:
        null,

      confidence:
        null,

      calculationVersion:
        null,

      calculatedAt:
        null,
    };

    try {
      setSaving(true);

      /*
       * ========================================================
       * MODO EDICIÓN
       * ========================================================
       */

      if (matchRating) {
        await updateMatchRating(
          matchRating.id,
          matchRatingData
        );

        onSaved();
        return;
      }

      /*
       * ========================================================
       * NUEVO REGISTRO
       * ========================================================
       */

      await addMatchRating(
        matchRatingData
      );

      /*
       * Añadir inmediatamente el nuevo
       * Match Rating al estado local.
       */

      const newMatchRating =
        {
          ...matchRatingData,
          id: -Date.now(),
        } as MatchRating;

      setMatchRatings(
        (current) => [
          ...current,
          newMatchRating,
        ]
      );

      /*
       * ========================================================
       * ACTUALIZAR PROGRESO
       *
       * AQUÍ ESTÁ LA CLAVE:
       *
       * El total NO cambia.
       *
       * Si había 16:
       * 1/16 → 2/16 → 3/16...
       * ========================================================
       */

      setCompletedParticipations(
        (current) => current + 1
      );

      /*
       * ========================================================
       * ¿ES EL ÚLTIMO JUGADOR PENDIENTE?
       * ========================================================
       */

      const isLastPlayer =
        currentPlayerIndex >=
        orderedParticipations.length -
          1;

      if (isLastPlayer) {
        onSaved();
        return;
      }

      /*
       * ========================================================
       * SIGUIENTE JUGADOR
       * ========================================================
       */

      setCurrentPlayerIndex(
        (current) =>
          current + 1
      );

      clearRatings();
    } catch (error) {
      console.error(
        "Error guardando valoración:",
        error
      );

      setError(
        "No se ha podido guardar la valoración."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================================================
   * ETIQUETA DEL PARTIDO
   * ============================================================
   */

  const getMatchLabel = (
    match: Match
  ) => {
    const homeTeam =
      teams.find(
        (team) =>
          team.id ===
          match.homeTeamId
      );

    const awayTeam =
      teams.find(
        (team) =>
          team.id ===
          match.awayTeamId
      );

    return `${homeTeam?.shortName ?? "?"} - ${
      awayTeam?.shortName ?? "?"
    }`;
  };

  /*
   * ============================================================
   * POSICIÓN
   * ============================================================
   */

  const getPositionLabel = (
    positionId: number
  ) => {
    if (positionId === 999) {
      return "Sin posición";
    }

    return `Posición ${positionId}`;
  };

  /*
   * ============================================================
   * PROGRESO ACTUAL
   * ============================================================
   *
   * El jugador que estamos viendo es el siguiente
   * que vamos a valorar.
   *
   * Por eso:
   *
   * completados + 1 = posición actual.
   *
   * Ejemplo:
   *
   * 0 completados → 1/16
   * 1 completado  → 2/16
   * 2 completados → 3/16
   * ============================================================
   */

  const currentProgress =
    totalParticipations > 0
      ? Math.min(
          completedParticipations + 1,
          totalParticipations
        )
      : 0;

  const progressPercentage =
    totalParticipations > 0
      ? Math.min(
          (currentProgress /
            totalParticipations) *
            100,
          100
        )
      : 0;


  /*
   * ============================================================
   * UTILIDADES DE IMPORTACIÓN
   * ============================================================
   */

  const normalizeImportName = (value: string): string => {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/^\s*\d+\s*[\.\-:)]\s*/, "")
      .replace(/[.'’`´]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  };

  /*
   * Normaliza el nombre de una jornada/fase para poder reconocer
   * diferentes formas de escribirla en Google Sheets.
   *
   * Ejemplos reconocidos:
   *   J1              -> jornada:1
   *   Jornada 1       -> jornada:1
   *   1               -> knockout:final
   *   16              -> knockout:dieciseisavos
   *   Dieciseisavos   -> knockout:dieciseisavos
   *   16avos          -> knockout:dieciseisavos
   *   Octavos         -> knockout:octavos
   *   Cuartos         -> knockout:cuartos
   *   Semifinal       -> knockout:semifinal
   *   Final           -> knockout:final
   */
  const getImportStageKey = (
    value: string
  ): string | null => {
    const normalized = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[.'’`´]/g, "")
      .replace(/[\-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const jornadaMatch = normalized.match(
      /^j(?:ornada)?\s*(\d+)$/
    );

    if (jornadaMatch) {
      return `jornada:${Number(jornadaMatch[1])}`;
    }

    const bareNumberMap: Record<string, string> = {
      "16": "knockout:dieciseisavos",
      "8": "knockout:octavos",
      "4": "knockout:cuartos",
      "2": "knockout:semifinal",
      "1": "knockout:final",
    };

    if (bareNumberMap[normalized]) {
      return bareNumberMap[normalized];
    }

    if (
      /^(16|dieciseisavos?|dieciseisavos? de final|16avos?|1\/16|ronda de 16)$/.test(
        normalized
      )
    ) {
      return "knockout:dieciseisavos";
    }

    if (
      /^(8|octavos?|octavos? de final|1\/8|ronda de 8)$/.test(
        normalized
      )
    ) {
      return "knockout:octavos";
    }

    if (
      /^(4|cuartos?|cuartos? de final|1\/4)$/.test(
        normalized
      )
    ) {
      return "knockout:cuartos";
    }

    if (
      /^(2|semifinal|semifinales|semifinales? de final|1\/2)$/.test(
        normalized
      )
    ) {
      return "knockout:semifinal";
    }

    if (/^(1|final|final de la competicion)$/.test(normalized)) {
      return "knockout:final";
    }

    return null;
  };

  const getImportStageDisplayName = (
    stageKey: string,
    originalLabel: string
  ): string => {
    if (stageKey.startsWith("jornada:")) {
      return originalLabel.trim();
    }

    const names: Record<string, string> = {
      "knockout:dieciseisavos": "Dieciseisavos",
      "knockout:octavos": "Octavos",
      "knockout:cuartos": "Cuartos",
      "knockout:semifinal": "Semifinal",
      "knockout:final": "Final",
    };

    return names[stageKey] ?? originalLabel.trim();
  };

  const getImportRatingRange = () => {
    if (importSource === "Marca") return { min: 0, max: 3 };
    if (importSource === "AS") return { min: 0, max: 4 };
    return { min: 0, max: 10 };
  };

  const resetImport = () => {
    setImportText("");
    setImportColumns([]);
    setImportPreview([]);
    setImportAnalyzed(false);
    setImportMessage("");
    setError("");
  };

  const resolveImportStage = (
    headerLabel: string
  ): {
    key: string;
    stage: Stage | undefined;
    displayName: string;
  } | null => {
    const key = getImportStageKey(headerLabel);

    if (!key) {
      return null;
    }

    const availableStagesForImport = stages.filter(
      (stage) =>
        stage.seasonId === seasonId &&
        stage.active
    );

    let stage: Stage | undefined;

    if (key.startsWith("jornada:")) {
      const number = Number(key.split(":")[1]);

      stage = availableStagesForImport.find((item) => {
        const normalized = item.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

        const match = normalized.match(
          /^j(?:ornada)?\s*(\d+)$/
        );

        return match
          ? Number(match[1]) === number
          : false;
      });
    } else {
      const aliases: Record<string, string[]> = {
        "knockout:dieciseisavos": [
          "dieciseisavos",
          "dieciseisavos de final",
          "16avos",
          "16avos de final",
          "ronda de 16",
          "1/16",
        ],
        "knockout:octavos": [
          "octavos",
          "octavos de final",
          "ronda de 8",
          "1/8",
        ],
        "knockout:cuartos": [
          "cuartos",
          "cuartos de final",
          "1/4",
        ],
        "knockout:semifinal": [
          "semifinal",
          "semifinales",
          "semifinal de final",
          "1/2",
        ],
        "knockout:final": [
          "final",
          "final de la competicion",
        ],
      };

      const targetAliases = aliases[key] ?? [];

      stage = availableStagesForImport.find((item) => {
        const normalized = item.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[.'’`´]/g, "")
          .replace(/\s+/g, " ")
          .trim();

        return targetAliases.includes(normalized);
      });
    }

    return {
      key,
      stage,
      displayName: getImportStageDisplayName(
        key,
        headerLabel
      ),
    };
  };

  const analyzeImport = () => {
    setError("");
    setImportMessage("");
    setImportAnalyzed(false);
    setImportPreview([]);
    setImportColumns([]);

    if (!competitionId || !seasonId || !teamId) {
      setError(
        "Selecciona competición, temporada y equipo antes de analizar la importación."
      );
      return;
    }

    if (!importText.trim()) {
      setError("Pega primero los datos copiados desde Google Sheets.");
      return;
    }

    const lines = importText
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.split("\t"));

    /*
     * Buscamos la fila de cabecera comprobando cualquier fase
     * reconocible, no solamente J1/J2/J3.
     *
     * Damos prioridad a una fila cuyo primer campo sea JUGADOR
     * o que contenga varias columnas de fases. Esto evita que un
     * valor "1" dentro de una fila de datos sea confundido con
     * la columna FINAL.
     */
    let headerIndex = -1;
    let bestStageCount = 0;

    lines.forEach((cells, index) => {
      const stageCount = cells.filter((cell) =>
        Boolean(resolveImportStage(cell.trim()))
      ).length;

      const firstCell = (cells[0] ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

      const looksLikePlayerHeader =
        firstCell === "jugador" ||
        firstCell === "jugadores";

      if (
        looksLikePlayerHeader &&
        stageCount > 0
      ) {
        headerIndex = index;
        bestStageCount = stageCount;
        return;
      }

      if (
        stageCount > bestStageCount
      ) {
        headerIndex = index;
        bestStageCount = stageCount;
      }
    });

    if (headerIndex === -1 || bestStageCount === 0) {
      setError(
        "No se han encontrado columnas de jornadas o fases. Se admiten J1, J2, J3..., Dieciseisavos, Octavos, Cuartos, Semifinal, Final y los formatos numéricos 16, 8, 4, 2 y 1."
      );
      return;
    }

    const header = lines[headerIndex];
    const columns: ImportColumn[] = [];

    header.forEach((cell, index) => {
      const headerLabel = cell.trim();
      const resolved = resolveImportStage(headerLabel);

      if (!resolved) return;

      let matchId: number | null = null;

      if (resolved.stage) {
        const stageMatches = matches.filter(
          (item) =>
            item.competitionId === competitionId &&
            item.seasonId === seasonId &&
            item.stageId === resolved.stage!.id &&
            (item.homeTeamId === teamId ||
              item.awayTeamId === teamId)
        );

        if (stageMatches.length === 1) {
          matchId = stageMatches[0].id;
        }
      }

      columns.push({
        index,
        label: headerLabel,
        stageName: resolved.displayName,
        stageKey: resolved.key,
        stageId: resolved.stage?.id ?? null,
        matchId,
      });
    });

    if (!columns.length) {
      setError("No se han encontrado columnas de jornadas o fases reconocibles.");
      return;
    }

    const selectedParticipations = participations.filter(
      (participation) =>
        participation.teamId === teamId &&
        matches.some(
          (item) =>
            item.id === participation.matchId &&
            item.competitionId === competitionId &&
            item.seasonId === seasonId
        )
    );

    const playerMap = new Map<string, Player[]>();

    players.forEach((player) => {
      const key = normalizeImportName(player.name);
      const current = playerMap.get(key) ?? [];
      current.push(player);
      playerMap.set(key, current);
    });

    const range = getImportRatingRange();
    const preview: ImportRatingRow[] = [];

    for (
      let lineIndex = headerIndex + 1;
      lineIndex < lines.length;
      lineIndex += 1
    ) {
      const cells = lines[lineIndex];
      const rawName = (cells[0] ?? "").trim();

      if (!rawName) continue;

      const upperName = rawName.toUpperCase();
      if (
        upperName === "MARCA" ||
        upperName === "AS" ||
        upperName === "SOFASCORE" ||
        upperName === "FLASHSCORE" ||
        upperName.includes("TOTALES EQUIPO")
      ) {
        continue;
      }

      const normalizedName = normalizeImportName(rawName);
      if (!normalizedName) continue;

      const matchingPlayers =
        playerMap.get(normalizedName) ?? [];

      const rowHasValue = columns.some(
        (column) => (cells[column.index] ?? "").trim() !== ""
      );

      if (!rowHasValue) continue;

      if (matchingPlayers.length === 0) {
        preview.push({
          playerName: rawName,
          player: undefined,
          playerId: null,
          stageName: "—",
          stageId: null,
          matchId: null,
          participationId: null,
          rating: null,
          status: "player-missing",
          message: "Jugador no encontrado en la base de datos.",
        });
        continue;
      }

      if (matchingPlayers.length > 1) {
        preview.push({
          playerName: rawName,
          player: undefined,
          playerId: null,
          stageName: "—",
          stageId: null,
          matchId: null,
          participationId: null,
          rating: null,
          status: "player-missing",
          message: "Hay varios jugadores con ese nombre.",
        });
        continue;
      }

      const player = matchingPlayers[0];

      for (const column of columns) {
        const rawValue = (cells[column.index] ?? "").trim();
        if (rawValue === "") continue;

        const rating = Number(rawValue.replace(",", "."));

        if (
          Number.isNaN(rating) ||
          rating < range.min ||
          rating > range.max
        ) {
          preview.push({
            playerName: rawName,
            player,
            playerId: player.id,
            stageName: column.stageName,
            stageId: column.stageId,
            matchId: column.matchId,
            participationId: null,
            rating: Number.isNaN(rating) ? null : rating,
            status: "invalid",
            message: `${importSource} debe estar entre ${range.min} y ${range.max}.`,
          });
          continue;
        }

        if (!column.stageId) {
          preview.push({
            playerName: rawName,
            player,
            playerId: player.id,
            stageName: column.stageName,
            stageId: null,
            matchId: null,
            participationId: null,
            rating,
            status: "stage-missing",
            message: `No existe la fase "${column.stageName}" en la temporada seleccionada.`,
          });
          continue;
        }

        if (!column.matchId) {
          preview.push({
            playerName: rawName,
            player,
            playerId: player.id,
            stageName: column.stageName,
            stageId: column.stageId,
            matchId: null,
            participationId: null,
            rating,
            status: "match-missing",
            message: `No se ha encontrado un único partido de este equipo en ${column.stageName}.`,
          });
          continue;
        }

        const participation = selectedParticipations.find(
          (item) =>
            item.matchId === column.matchId &&
            item.playerId === player.id
        );

        if (!participation) {
          preview.push({
            playerName: rawName,
            player,
            playerId: player.id,
            stageName: column.stageName,
            stageId: column.stageId,
            matchId: column.matchId,
            participationId: null,
            rating,
            status: "participation-missing",
            message:
              "No existe participación de este jugador en ese partido.",
          });
          continue;
        }

        preview.push({
          playerName: rawName,
          player,
          playerId: player.id,
          stageName: column.stageName,
          stageId: column.stageId,
          matchId: column.matchId,
          participationId: participation.id,
          rating,
          status: "ok",
          message: "Listo para guardar.",
        });
      }
    }

    if (!preview.length) {
      setError(
        "No se han encontrado valoraciones en las columnas de jornadas o fases."
      );
      return;
    }

    setImportColumns(columns);
    setImportPreview(preview);
    setImportAnalyzed(true);
  };

  const saveImport = async () => {
    setError("");
    setImportMessage("");

    const validRows = importPreview.filter(
      (row) =>
        row.status === "ok" &&
        row.playerId !== null &&
        row.matchId !== null &&
        row.participationId !== null &&
        row.rating !== null
    );

    if (!validRows.length) {
      setError("No hay valoraciones válidas para guardar.");
      return;
    }

    setImporting(true);

    try {
      const localRatings = [...matchRatings];
      let savedCount = 0;

      for (const row of validRows) {
        const existingIndex = localRatings.findIndex(
          (rating) =>
            rating.participationId === row.participationId
        );

        // La memoria local puede no estar actualizada si se ha
        // importado otra fuente previamente. La base de datos es
        // la fuente de verdad para comprobar si ya existe la valoración.
        let existing =
          existingIndex >= 0
            ? localRatings[existingIndex]
            : undefined;

        if (!existing) {
          existing =
            await getMatchRatingByParticipationId(
              row.participationId!
            );
        }

        const marca =
          importSource === "Marca"
            ? row.rating
            : existing?.marcaRating ?? null;

        const as =
          importSource === "AS"
            ? row.rating
            : existing?.asRating ?? null;

        const sofa =
          importSource === "SofaScore"
            ? row.rating
            : existing?.sofascoreRating ?? null;

        const flash =
          importSource === "FlashScore"
            ? row.rating
            : existing?.flashscoreRating ?? null;

        const data: Omit<MatchRating, "id"> = {
          matchId: row.matchId!,
          playerId: row.playerId!,
          participationId: row.participationId!,
          marcaRating: marca,
          asRating: as,
          sofascoreRating: sofa,
          flashscoreRating: flash,
          externalAverage: calculateExternalAverage(
            marca,
            as,
            sofa,
            flash
          ),
          value90MatchRating:
            existing?.value90MatchRating ?? null,
          finalMatchRating:
            existing?.finalMatchRating ?? null,
          confidence: existing?.confidence ?? null,
          calculationVersion:
            existing?.calculationVersion ?? null,
          calculatedAt:
            existing?.calculatedAt ?? null,
        };

        if (existing) {
          // Ya existe la valoración para esta participación:
          // actualizamos únicamente la fuente importada y
          // conservamos las demás notas.
          const updated = await updateMatchRating(
            existing.id,
            data
          );

          if (updated) {
            if (existingIndex >= 0) {
              localRatings[existingIndex] = updated;
            } else {
              localRatings.push(updated);
            }
          }
        } else {
          const created = await addMatchRating(data);
          localRatings.push(created);
        }

        savedCount += 1;
      }

      setMatchRatings(localRatings);
      setImportMessage(
        `Se han guardado ${savedCount} valoraciones de ${importSource}.`
      );
      setImportAnalyzed(false);
      setImportPreview([]);
      setImportColumns([]);
      setImportText("");
      onSaved();
    } catch (error) {
      console.error(
        "Error importando valoraciones:",
        error
      );
      setError(
        "No se han podido guardar las valoraciones. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setImporting(false);
    }
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 rounded-xl border bg-white p-3 shadow sm:p-4 md:p-6">

      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
          {matchRating
            ? "Editar valoración del partido"
            : "Valoraciones de partidos"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Introduce las valoraciones manualmente o
          impórtalas directamente desde Google Sheets.
        </p>
      </div>

      {!matchRating && (
        <div className="mb-5 grid grid-cols-1 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setInputMode("manual");
              setError("");
              setImportMessage("");
            }}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${
              inputMode === "manual"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Introducción manual
          </button>

          <button
            type="button"
            onClick={() => {
              setInputMode("import");
              setError("");
            }}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${
              inputMode === "import"
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Importar desde Google Sheets
          </button>
        </div>
      )}

      {inputMode === "import" && !matchRating ? (
        <div className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:p-4">
              {error}
            </div>
          )}

          {importMessage && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 sm:p-4">
              {importMessage}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 md:p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
              1. Selección de la importación
            </h3>

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
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
                  disabled={
                    seasonsLoading
                  }
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
                >
                  <option value={0}>
                    {seasonsLoading
                      ? "Cargando..."
                      : "Seleccionar temporada"}
                  </option>
                  {availableSeasons.map((season) => (
                    <option
                      key={season.id}
                      value={season.id}
                    >
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
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
                  disabled={competitionsLoading}
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
                >
                  <option value={0}>
                    {competitionsLoading
                      ? "Cargando..."
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

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Equipo
                </label>
                <select
                  value={teamId}
                  onChange={(event) =>
                    handleTeamChange(
                      Number(event.target.value)
                    )
                  }
                  disabled={!seasonId || !competitionId || teamsLoading}
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
                >
                  <option value={0}>
                    {!seasonId
                      ? "Selecciona primero una temporada"
                      : !competitionId
                        ? "Selecciona primero una competición"
                        : teamsLoading
                          ? "Cargando..."
                          : "Seleccionar equipo"}
                  </option>
                  {availableImportTeams.map((team) => (
                      <option
                        key={team.id}
                        value={team.id}
                      >
                        {team.shortName} - {team.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Fuente
                </label>
                <select
                  value={importSource}
                  onChange={(event) => {
                    setImportSource(
                      event.target.value as
                        | "Marca"
                        | "AS"
                        | "SofaScore"
                        | "FlashScore"
                    );
                    resetImport();
                  }}
                  className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
                >
                  <option value="Marca">Marca</option>
                  <option value="AS">AS</option>
                  <option value="SofaScore">SofaScore</option>
                  <option value="FlashScore">FlashScore</option>
                </select>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              El importador reconoce jornadas y fases automáticamente:
              J1, J2, J3..., Dieciseisavos, Octavos, Cuartos,
              Semifinal y Final. También admite los formatos
              numéricos 16, 8, 4, 2 y 1 de tus hojas.
            </p>
          </div>

          <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">
              2. Pegar datos de Google Sheets
            </h3>

            <p className="mb-4 text-xs text-slate-500">
              Copia la tabla completa tal y como la tienes.
              No necesitas eliminar MVP, P, AVERAGE ni TOTAL.
            </p>

            <textarea
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value);
                setImportAnalyzed(false);
                setImportPreview([]);
                setImportColumns([]);
                setImportMessage("");
                setError("");
              }}
              placeholder={`Pega aquí lo copiado desde Google Sheets.

El sistema reconocerá automáticamente las jornadas y fases.

Ejemplo:
J1 | J2 | J3 | 16 | 8 | 4 | 2 | 1

Los números 16, 8, 4, 2 y 1 se interpretan como
Dieciseisavos, Octavos, Cuartos, Semifinal y Final.`}
              rows={13}
              className="min-h-[220px] w-full min-w-0 rounded-lg border border-slate-300 px-3 py-3 font-mono text-xs outline-none focus:border-slate-500 sm:min-h-[260px] sm:px-4"
            />

            <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetImport}
                disabled={importing}
                className="w-full rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 sm:w-auto"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={analyzeImport}
                disabled={
                  importing ||
                  !competitionId ||
                  !seasonId ||
                  !teamId ||
                  !importText.trim()
                }
                className="w-full rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Analizar datos
              </button>
            </div>
          </div>

          {importAnalyzed && (
            <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    3. Vista previa
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {importPreview.filter(
                      (row) => row.status === "ok"
                    ).length}{" "}
                    valoraciones válidas de{" "}
                    {importPreview.length} detectadas.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {importColumns.length} jornadas/fases detectadas
                </span>
              </div>

              <div className="max-h-[520px] w-full max-w-full overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-[720px] text-sm">
                  <thead className="sticky top-0 bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Jugador
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Jornada / fase
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Partido
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Participación
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-700">
                        {importSource}
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, index) => {
                      const match =
                        matches.find(
                          (item) => item.id === row.matchId
                        );

                      const ok = row.status === "ok";

                      return (
                        <tr
                          key={`${row.playerName}-${row.stageId}-${index}`}
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {row.playerName}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.stageName}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {match
                              ? getMatchLabel(match)
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.participationId ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-800">
                            {row.rating ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              title={row.message}
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                ok
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {ok
                                ? "✓ OK"
                                : "⚠ Revisar"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {importPreview.some(
                (row) => row.status !== "ok"
              ) && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Hay filas que no pueden importarse.
                  Solo se guardarán las valoraciones marcadas
                  como OK.
                </div>
              )}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetImport}
                  disabled={importing}
                  className="w-full rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 sm:w-auto"
                >
                  Volver a pegar
                </button>

                <button
                  type="button"
                  onClick={saveImport}
                  disabled={
                    importing ||
                    !importPreview.some(
                      (row) => row.status === "ok"
                    )
                  }
                  className="w-full rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {importing
                    ? "Guardando..."
                    : "Guardar valoraciones"}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end sm:pt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={importing}
              className="w-full rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 sm:w-auto"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleNext();
        }}
        className="space-y-6"
      >

        {/* ====================================================
            FILTROS
            ==================================================== */}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 md:p-5">

          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
            Selección del partido
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">

            {/* TEMPORADA */}

            <div>
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
                disabled={seasonsLoading}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
              >
                <option value={0}>
                  {seasonsLoading
                    ? "Cargando temporadas..."
                    : "Seleccionar temporada"}
                </option>
                {availableSeasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>

            {/* COMPETICIÓN */}

            <div>
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
                disabled={competitionsLoading || !seasonId}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
              >
                <option value={0}>
                  {!seasonId
                    ? "Selecciona primero una temporada"
                    : competitionsLoading
                      ? "Cargando competiciones..."
                      : "Seleccionar competición"}
                </option>
                {availableCompetitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>
                    {competition.name}
                  </option>
                ))}
              </select>
            </div>

            {/* JORNADA */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Jornada / fase
              </label>

              <select
                value={stageId}
                onChange={(event) =>
                  handleStageChange(
                    Number(event.target.value)
                  )
                }
                disabled={stagesLoading || !competitionId}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
              >
                <option value={0}>
                  {!competitionId
                    ? "Selecciona primero una competición"
                    : stagesLoading
                      ? "Cargando jornadas..."
                      : "Seleccionar jornada / fase"}
                </option>
                {availableStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PARTIDO Y EQUIPO */}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:grid-cols-2 sm:gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Partido
              </label>

              <select
                value={matchId}
                onChange={(event) =>
                  handleMatchChange(
                    Number(event.target.value)
                  )
                }
                disabled={!seasonId || !competitionId || !stageId}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
              >
                <option value={0}>
                  {!seasonId
                    ? "Selecciona primero una temporada"
                    : !competitionId
                      ? "Selecciona primero una competición"
                      : !stageId
                        ? "Selecciona primero una jornada / fase"
                        : "Seleccionar partido"}
                </option>
                {availableMatches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {getMatchLabel(match)}
                  </option>
                ))}
              </select>

              {seasonId &&
                competitionId &&
                stageId &&
                availableMatches.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    No hay partidos que coincidan con los filtros seleccionados.
                  </p>
                )}
            </div>

            {/* EQUIPO */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Equipo
              </label>

              <select
                value={teamId}
                onChange={(event) =>
                  handleTeamChange(
                    Number(event.target.value)
                  )
                }
                disabled={!matchId || teamsLoading}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
              >
                <option value={0}>
                  {!matchId
                    ? "Selecciona primero un partido"
                    : teamsLoading
                      ? "Cargando equipos..."
                      : "Seleccionar equipo"}
                </option>
                {availableMatchTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.shortName} - {team.name}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-slate-500">
                Selecciona el equipo cuyas valoraciones quieres introducir.
              </p>
            </div>
          </div>

        </div>

        {/* ====================================================
            JUGADOR ACTUAL
            ==================================================== */}

        {teamId > 0 && (
          <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5">

            <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Valoración del jugador
                </h3>

                {totalParticipations >
                  0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Jugador{" "}
                    <strong>
                      {currentProgress}
                    </strong>{" "}
                    de{" "}
                    <strong>
                      {totalParticipations}
                    </strong>
                  </p>
                )}
              </div>

              {currentItem && (
                <div className="w-full rounded-lg bg-slate-100 px-3 py-2 text-left sm:w-auto sm:px-4 sm:text-right">

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Posición
                  </p>

                  <p className="font-bold text-slate-800">
                    {getPositionLabel(
                      currentItem.positionId
                    )}
                  </p>

                </div>
              )}

            </div>

            {historyLoading ||
            participationsLoading ||
            matchRatingsLoading ? (
              <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500 sm:p-6">
                Cargando jugadores...
              </div>
            ) : orderedParticipations.length ===
              0 ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 sm:p-4">
                {matchRating
                  ? "No se ha encontrado la participación correspondiente a esta valoración."
                  : "Todos los jugadores de este equipo ya tienen una valoración registrada para este partido."}
              </div>
            ) : currentItem ? (
              <>

                {/* DATOS DEL JUGADOR */}

                <div className="mb-5 grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">

                  <div>
                    <span className="block text-xs font-medium uppercase text-slate-500">
                      Jugador
                    </span>

                    <span className="font-semibold text-slate-800">
                      {currentPlayer?.name ??
                        "Jugador desconocido"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium uppercase text-slate-500">
                      Equipo
                    </span>

                    <span className="font-semibold text-slate-800">
                      {currentTeam?.shortName ??
                        "—"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium uppercase text-slate-500">
                      Minutos
                    </span>

                    <span className="font-semibold text-slate-800">
                      {
                        currentParticipation?.minutesPlayed
                      }
                    </span>
                  </div>

                  <div>
                    <span className="block text-xs font-medium uppercase text-slate-500">
                      Titular
                    </span>

                    <span className="font-semibold text-slate-800">
                      {currentParticipation?.isStartingXI
                        ? "Sí"
                        : "No"}
                    </span>
                  </div>

                </div>

                {/* NOTAS */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">

                  {/* MARCA */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Marca
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="3"
                      step="0.1"
                      value={marcaRating}
                      onChange={(event) =>
                        setMarcaRating(
                          event.target.value
                        )
                      }
                      placeholder="0 - 3"
                      className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Escala Marca: 0 a 3.
                    </p>
                  </div>

                  {/* AS */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      AS
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="4"
                      step="0.1"
                      value={asRating}
                      onChange={(event) =>
                        setAsRating(
                          event.target.value
                        )
                      }
                      placeholder="0 - 4"
                      className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Escala AS: 0 a 4.
                    </p>
                  </div>

                  {/* SOFASCORE */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      SofaScore
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={
                        sofascoreRating
                      }
                      onChange={(event) =>
                        setSofascoreRating(
                          event.target.value
                        )
                      }
                      placeholder="0 - 10"
                      className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Escala SofaScore: 0 a 10.
                    </p>
                  </div>

                  {/* FLASHSCORE */}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      FlashScore
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={
                        flashscoreRating
                      }
                      onChange={(event) =>
                        setFlashscoreRating(
                          event.target.value
                        )
                      }
                      placeholder="0 - 10"
                      className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Escala FlashScore: 0 a 10.
                    </p>
                  </div>

                </div>

                {/* =================================================
                    PROGRESO
                    ================================================= */}

                <div className="mt-5 sm:mt-6">

                  <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">

                    <span>
                      Progreso
                    </span>

                    <span>
                      {currentProgress} /{" "}
                      {totalParticipations}
                    </span>

                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">

                    <div
                      className="h-full rounded-full bg-slate-800 transition-all duration-300"
                      style={{
                        width: `${progressPercentage}%`,
                      }}
                    />

                  </div>

                </div>

              </>
            ) : null}

          </div>
        )}

        {/* ====================================================
            AVISO
            ==================================================== */}

        {teamId > 0 &&
          orderedParticipations.length >
            0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 sm:p-4">

              <p className="font-semibold">
                Carga secuencial
              </p>

              <p className="mt-1">
                Los jugadores aparecen
                ordenados por posición. Si
                varios jugadores tienen la
                misma posición, se ordenan
                alfabéticamente.
              </p>

              <p className="mt-1">
                Al pulsar{" "}
                <strong>Siguiente</strong>,
                se guarda la valoración y se
                carga automáticamente el
                siguiente jugador pendiente.
              </p>

            </div>
          )}

        {/* ====================================================
            BOTONES
            ==================================================== */}

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end sm:pt-6">

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="w-full rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Cancelar
          </button>

          {!matchRating &&
            teamId > 0 &&
            orderedParticipations.length >
              0 && (
              <button
                type="submit"
                disabled={
                  saving ||
                  historyLoading ||
                  matchRatingsLoading ||
                  !currentParticipation
                }
                className="w-full rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving
                  ? "Guardando..."
                  : currentPlayerIndex >=
                      orderedParticipations.length -
                        1
                    ? "Finalizar"
                    : "Siguiente"}
              </button>
            )}

          {matchRating && (
            <button
              type="submit"
              disabled={
                saving ||
                !currentParticipation
              }
              className="w-full rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
          )}

        </div>

      </form>
        </>
      )}
    </div>
  );
}