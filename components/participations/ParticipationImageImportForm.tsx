"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSeasons,
  type Season,
} from "@/services/season.service";

import {
  getCompetitions,
  type Competition,
} from "@/services/competition.service";

import {
  getStages,
  type Stage,
} from "@/services/stage.service";

import {
  getMatches,
  type Match,
} from "@/services/match.service";

import {
  getPlayers,
  type Player,
} from "@/services/player.service";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import {
  getPositions,
  type Position,
} from "@/services/position.service";

import {
  getHistPlayerTeams,
  type HistPlayerTeam,
} from "@/services/hist-player-team.service";

import {
  getParticipations,
  addParticipation,
  updateParticipation,
  type Participation,
} from "@/services/participation.service";

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

interface ParticipationImageImportFormProps {
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}

interface RosterCandidate {
  playerId: number;
  playerName: string;
  shortName: string;
  teamId: number;
  teamSide: "home" | "away";
  shirtNumber: number | null;
  positionId: number | null;
}

interface DetectedPlayer {
  playerId: number;
  playerName: string;
  shortName: string;
  teamId: number;
  teamSide: "home" | "away";
  shirtNumber: number | null;
  positionId: number | null;
  isStartingXI: boolean;
  participationState: "starter" | "substitute" | "none";
  substituteInMinute: number | null;
  substituteOutMinute: number | null;
  confidence: number;
  captain: boolean;
  captainConfidence: number;
}

/*
 * ============================================================
 * FUNCIONES AUXILIARES
 * ============================================================
 */

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'’`´]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function ParticipationImageImportForm({
  onCancel,
  onSaved,
}: ParticipationImageImportFormProps) {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [competitions, setCompetitions] =
    useState<Competition[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [histPlayerTeams, setHistPlayerTeams] =
    useState<HistPlayerTeam[]>([]);
  const [existingParticipations, setExistingParticipations] =
    useState<Participation[]>([]);

  /*
   * ============================================================
   * SELECCIÓN
   * ============================================================
   */

  const [seasonId, setSeasonId] =
    useState<number>(0);

  const [competitionId, setCompetitionId] =
    useState<number>(0);

  const [stageId, setStageId] =
    useState<number>(0);

  const [matchId, setMatchId] =
    useState<number>(0);

  /*
   * ============================================================
   * IMAGEN
   * ============================================================
   */

  const [imagePreview, setImagePreview] =
    useState<string>("");

  const [imageDataUrl, setImageDataUrl] =
    useState<string>("");

  /*
   * ============================================================
   * RESULTADO DE LA IA
   * ============================================================
   */

  const [detectedPlayers, setDetectedPlayers] =
    useState<DetectedPlayer[]>([]);

  /*
   * ============================================================
   * ESTADO
   * ============================================================
   */

  const [loading, setLoading] =
    useState(true);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /*
   * ============================================================
   * CARGAR DATOS
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
          stagesData,
          matchesData,
          playersData,
          teamsData,
          positionsData,
          historyData,
          participationsData,
        ] = await Promise.all([
          getSeasons(),
          getCompetitions(),
          getStages(),
          getMatches(),
          getPlayers(),
          getTeams(),
          getPositions(),
          getHistPlayerTeams(),
          getParticipations(),
        ]);

        if (!mounted) {
          return;
        }

        setSeasons(seasonsData);
        setCompetitions(competitionsData);
        setStages(stagesData);
        setMatches(matchesData);
        setPlayers(playersData);
        setTeams(teamsData);
        setPositions(positionsData);
        setHistPlayerTeams(historyData);
        setExistingParticipations(
          participationsData
        );
      } catch (err) {
        console.error(
          "Error cargando datos para importar participaciones:",
          err
        );

        if (mounted) {
          setError(
            "No se pudieron cargar los datos necesarios."
          );
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
   * TEMPORADAS
   * ============================================================
   */

  const sortedSeasons = useMemo(() => {
    return seasons
      .filter(
        (season) => season.active === true
      )
      .slice()
      .sort((a, b) => {
        return b.name.localeCompare(
          a.name,
          "es",
          {
            numeric: true,
          }
        );
      });
  }, [seasons]);

  /*
   * ============================================================
   * COMPETICIONES DISPONIBLES
   *
   * Solo mostramos competiciones que realmente tienen
   * partidos dentro de la temporada seleccionada.
   * ============================================================
   */

  const availableCompetitions = useMemo(() => {
    if (!seasonId) {
      return [];
    }

    const competitionIds = new Set(
      matches
        .filter(
          (match) =>
            match.seasonId === seasonId
        )
        .map(
          (match) =>
            match.competitionId
        )
    );

    return competitions
      .filter(
        (competition) =>
          competition.active === true &&
          (
            competition.competitionType ===
              "League" ||
            competition.competitionType ===
              "National Team"
          ) &&
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
    matches,
    seasonId,
  ]);

  /*
   * ============================================================
   * JORNADAS / FASES DISPONIBLES
   *
   * Solo mostramos jornadas/fases que tienen partidos para
   * la temporada y competición seleccionadas.
   * ============================================================
   */

  const availableStages = useMemo(() => {
    if (!seasonId || !competitionId) {
      return [];
    }

    const stageIdsWithMatches = new Set(
      matches
        .filter(
          (match) =>
            match.seasonId === seasonId &&
            match.competitionId === competitionId &&
            match.stageId !== null &&
            match.stageId !== undefined
        )
        .map((match) => match.stageId as number)
    );

    return stages
      .filter(
        (stage) =>
          stage.active === true &&
          stage.seasonId === seasonId &&
          stageIdsWithMatches.has(stage.id)
      )
      .sort((a, b) => {
        const numberA = Number(a.name.match(/\d+/)?.[0]);
        const numberB = Number(b.name.match(/\d+/)?.[0]);

        const hasNumberA = Number.isFinite(numberA);
        const hasNumberB = Number.isFinite(numberB);

        // Para jornadas numeradas: mayor a menor.
        if (hasNumberA && hasNumberB && numberA !== numberB) {
          return numberB - numberA;
        }

        // Si alguna fase no tiene número, usamos displayOrder como respaldo.
        if (a.displayOrder !== b.displayOrder) {
          return b.displayOrder - a.displayOrder;
        }

        return a.name.localeCompare(b.name, "es");
      });
  }, [stages, matches, seasonId, competitionId]);

  /*
   * ============================================================
   * PARTIDOS DISPONIBLES
   * ============================================================
   */

  const availableMatches = useMemo(() => {
    if (!seasonId || !competitionId || !stageId) {
      return [];
    }

    return matches
      .filter(
        (match) =>
          match.seasonId === seasonId &&
          match.competitionId === competitionId &&
          match.stageId === stageId
      )
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });
  }, [matches, seasonId, competitionId, stageId]);

  /*
   * ============================================================
   * PARTIDO SELECCIONADO
   * ============================================================
   */

  const selectedMatch = useMemo(() => {
    return matches.find(
      (match) =>
        match.id === matchId
    );
  }, [matches, matchId]);

  /*
   * ============================================================
   * EQUIPOS DEL PARTIDO
   * ============================================================
   */

  const homeTeam = useMemo(() => {
    if (!selectedMatch) {
      return undefined;
    }

    return teams.find(
      (team) =>
        team.id ===
        selectedMatch.homeTeamId
    );
  }, [
    selectedMatch,
    teams,
  ]);

  const awayTeam = useMemo(() => {
    if (!selectedMatch) {
      return undefined;
    }

    return teams.find(
      (team) =>
        team.id ===
        selectedMatch.awayTeamId
    );
  }, [
    selectedMatch,
    teams,
  ]);

  /*
   * ============================================================
   * NOMBRE DE EQUIPO
   * ============================================================
   */

  const getTeamName = (
    team?: Team
  ) => {
    if (!team) {
      return "Equipo";
    }

    return (
      team.shortName ??
      team.name
    );
  };

  /*
   * ============================================================
   * PLANTILLAS DEL PARTIDO
   *
   * Utilizamos el historial de plantilla de la temporada
   * como lista de candidatos para reducir errores de
   * reconocimiento de nombres.
   * ============================================================
   */

  const rosterCandidates = useMemo<
    RosterCandidate[]
  >(() => {
    if (
      !selectedMatch ||
      !seasonId
    ) {
      return [];
    }

    const result: RosterCandidate[] =
      [];

    const matchTeams = [
      {
        id: selectedMatch.homeTeamId,
        side: "home" as const,
      },
      {
        id: selectedMatch.awayTeamId,
        side: "away" as const,
      },
    ];

    for (const matchTeam of matchTeams) {
      const squad =
        histPlayerTeams.filter(
          (history) =>
            history.teamId ===
              matchTeam.id &&
            history.seasonId ===
              seasonId &&
            history.active === true
        );

      for (const history of squad) {
        const player =
          players.find(
            (item) =>
              item.id ===
              history.playerId
          );

        if (!player) {
          continue;
        }

        result.push({
          playerId: player.id,
          playerName: player.name,
          shortName:
            player.shortName ??
            player.name,
          teamId: matchTeam.id,
          teamSide:
            matchTeam.side,
          shirtNumber:
            history.shirtNumber ??
            null,
          positionId:
            history.positionId ??
            null,
        });
      }
    }

    return result;
  }, [
    selectedMatch,
    seasonId,
    histPlayerTeams,
    players,
  ]);

  /*
   * ============================================================
   * CAMBIO DE TEMPORADA
   * ============================================================
   */

  const handleSeasonChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const value = Number(
      event.target.value
    );

    setSeasonId(value);
    setCompetitionId(0);
    setStageId(0);
    setMatchId(0);

    setImagePreview("");
    setImageDataUrl("");
    setDetectedPlayers([]);

    setError("");
    setMessage("");
  };

  /*
   * ============================================================
   * CAMBIO DE COMPETICIÓN
   * ============================================================
   */

  const handleCompetitionChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const value = Number(
      event.target.value
    );

    setCompetitionId(value);
    setStageId(0);
    setMatchId(0);

    setImagePreview("");
    setImageDataUrl("");
    setDetectedPlayers([]);

    setError("");
    setMessage("");
  };

  /*
   * ============================================================
   * CAMBIO DE JORNADA / FASE
   * ============================================================
   */

  const handleStageChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const value = Number(event.target.value);

    setStageId(value);
    setMatchId(0);

    setImagePreview("");
    setImageDataUrl("");
    setDetectedPlayers([]);

    setError("");
    setMessage("");
  };

  /*
   * ============================================================
   * CAMBIO DE PARTIDO
   * ============================================================
   */

  const handleMatchChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const value = Number(
      event.target.value
    );

    setMatchId(value);

    setImagePreview("");
    setImageDataUrl("");
    setDetectedPlayers([]);

    setError("");
    setMessage("");
  };

  /*
   * ============================================================
   * SUBIR IMAGEN
   * ============================================================
   */

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    setError("");
    setMessage("");
    setDetectedPlayers([]);

    if (!file) {
      setImagePreview("");
      setImageDataUrl("");
      return;
    }

    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "Solo se admiten imágenes PNG, JPG, JPEG o WEBP."
      );

      event.target.value = "";
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const result =
        reader.result;

      if (
        typeof result !==
        "string"
      ) {
        setError(
          "No se pudo leer la imagen."
        );
        return;
      }

      setImageDataUrl(result);
      setImagePreview(result);
    };

    reader.onerror = () => {
      setError(
        "No se pudo leer la imagen."
      );
    };

    reader.readAsDataURL(file);
  };

  /*
   * ============================================================
   * ANALIZAR IMAGEN
   * ============================================================
   */

  const handleAnalyzeImage =
    async () => {
      setError("");
      setMessage("");

      if (!seasonId) {
        setError(
          "Selecciona una temporada."
        );
        return;
      }

      if (!competitionId) {
        setError(
          "Selecciona una competición."
        );
        return;
      }

      if (!stageId) {
        setError(
          "Selecciona una jornada / fase."
        );
        return;
      }

      if (!matchId) {
        setError(
          "Selecciona un partido."
        );
        return;
      }

      if (!selectedMatch) {
        setError(
          "No se ha encontrado el partido seleccionado."
        );
        return;
      }

      if (!imageDataUrl) {
        setError(
          "Selecciona primero una imagen."
        );
        return;
      }

      if (
        rosterCandidates.length ===
        0
      ) {
        setError(
          "No hay jugadores registrados en las plantillas de los dos equipos para esta temporada."
        );
        return;
      }

      setAnalyzing(true);

      try {
        const response =
          await fetch(
            "/api/participations/analyze-image",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                image:
                  imageDataUrl,

                matchDuration:
                  selectedMatch.matchDuration ??
                  90,

                homeTeamName:
                  getTeamName(
                    homeTeam
                  ),

                awayTeamName:
                  getTeamName(
                    awayTeam
                  ),

                roster:
                  rosterCandidates.map(
                    (player) => ({
                      playerId:
                        player.playerId,

                      playerName:
                        player.playerName,

                      shortName:
                        player.shortName,

                      teamId:
                        player.teamId,

                      teamSide:
                        player.teamSide,

                      shirtNumber:
                        player.shirtNumber,
                    })
                  ),
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ??
              "No se pudo analizar la imagen."
          );
        }

        if (
          !data ||
          !Array.isArray(
            data.players
          )
        ) {
          throw new Error(
            "La respuesta del análisis no tiene un formato válido."
          );
        }

        /*
         * ======================================================
         * VALIDAR RESULTADOS
         * ======================================================
         */

        /*
         * ======================================================
         * CONSTRUIR RESULTADO COMPLETO
         * ======================================================
         *
         * La IA solo identifica los jugadores que aparecen en la
         * imagen. Aquí cruzamos ese resultado con la plantilla
         * completa del partido para mostrar también los jugadores
         * que no participaron.
         */
        const detectedByPlayerId = new Map<
          number,
          any
        >();

        for (const item of data.players) {
          const playerId = Number(item.playerId);

          if (
            !Number.isInteger(playerId) ||
            playerId <= 0 ||
            detectedByPlayerId.has(playerId)
          ) {
            continue;
          }

          const rosterPlayer =
            rosterCandidates.find(
              (candidate) =>
                candidate.playerId === playerId
            );

          if (rosterPlayer) {
            detectedByPlayerId.set(
              playerId,
              item
            );
          }
        }

        const detected: DetectedPlayer[] =
          rosterCandidates.map((rosterPlayer) => {
            const item = detectedByPlayerId.get(
              rosterPlayer.playerId
            );

            if (!item) {
              return {
                playerId: rosterPlayer.playerId,
                playerName: rosterPlayer.playerName,
                shortName: rosterPlayer.shortName,
                teamId: rosterPlayer.teamId,
                teamSide: rosterPlayer.teamSide,
                shirtNumber: rosterPlayer.shirtNumber,
                positionId: rosterPlayer.positionId,
                isStartingXI: false,
                participationState: "none" as const,
                substituteInMinute: null,
                substituteOutMinute: null,
                confidence: 0,
                captain: false,
                captainConfidence: 0,
              };
            }

            const isStartingXI =
              Boolean(item.isStartingXI);

            const substituteInMinute =
              item.substituteInMinute !== null &&
              item.substituteInMinute !== undefined
                ? Number(item.substituteInMinute)
                : null;

            const substituteOutMinute =
              item.substituteOutMinute !== null &&
              item.substituteOutMinute !== undefined
                ? Number(item.substituteOutMinute)
                : null;

            const confidence = Number(item.confidence);

            return {
              playerId: rosterPlayer.playerId,
              playerName: rosterPlayer.playerName,
              shortName: rosterPlayer.shortName,
              teamId: rosterPlayer.teamId,
              teamSide: rosterPlayer.teamSide,
              shirtNumber: rosterPlayer.shirtNumber,
              positionId: rosterPlayer.positionId,
              isStartingXI,
              participationState: isStartingXI
                ? "starter"
                : "substitute",
              substituteInMinute:
                Number.isInteger(substituteInMinute)
                  ? substituteInMinute
                  : null,
              substituteOutMinute:
                Number.isInteger(substituteOutMinute)
                  ? substituteOutMinute
                  : null,
              confidence: Number.isFinite(confidence)
                ? confidence
                : 0,
              captain: item.captain === true,
              captainConfidence:
                Number.isFinite(
                  Number(item.captainConfidence)
                )
                  ? Number(item.captainConfidence)
                  : 0,
            };
          });

        detected.sort((a, b) => {
          if (a.teamSide !== b.teamSide) {
            return a.teamSide === "home" ? -1 : 1;
          }

          if (
            a.shirtNumber !== null &&
            b.shirtNumber !== null
          ) {
            return a.shirtNumber - b.shirtNumber;
          }

          if (a.shirtNumber !== null) return -1;
          if (b.shirtNumber !== null) return 1;

          return a.playerName.localeCompare(
            b.playerName,
            "es"
          );
        });

        if (detected.length === 0) {
          throw new Error(
            "No se han podido cargar las plantillas registradas para este partido."
          );
        }

        setDetectedPlayers(detected);

        const recognizedCount = detected.filter(
          (player) => player.confidence > 0
        ).length;

        setMessage(
          `Se han cargado ${detected.length} jugadores de las dos plantillas. La IA ha identificado ${recognizedCount}. Revisa y corrige los datos antes de guardar.`
        );
      } catch (err) {
        console.error(
          "Error analizando imagen:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo analizar la imagen."
        );

        setDetectedPlayers([]);
      } finally {
        setAnalyzing(false);
      }
    };

  /*
   * ============================================================
   * ACTUALIZAR JUGADOR DETECTADO
   * ============================================================
   */

  const updateDetectedPlayer =
    (
      playerId: number,
      changes: Partial<DetectedPlayer>
    ) => {
      setDetectedPlayers(
        (current) =>
          current.map(
            (player) =>
              player.playerId ===
              playerId
                ? {
                    ...player,
                    ...changes,
                  }
                : player
          )
      );
    };

  /*
   * ============================================================
   * CAMBIAR ESTADO DE PARTICIPACIÓN
   * ============================================================
   */

  const handleParticipationStateChange = (
    player: DetectedPlayer,
    state: DetectedPlayer["participationState"]
  ) => {
    if (state === "none") {
      updateDetectedPlayer(player.playerId, {
        participationState: "none",
        isStartingXI: false,
        substituteInMinute: null,
        substituteOutMinute: null,
        captain: false,
      });
      return;
    }

    if (state === "starter") {
      updateDetectedPlayer(player.playerId, {
        participationState: "starter",
        isStartingXI: true,
        substituteInMinute: null,
      });
      return;
    }

    updateDetectedPlayer(player.playerId, {
      participationState: "substitute",
      isStartingXI: false,
    });
  };

  /*
   * ============================================================
   * CAMBIAR POSICIÓN
   * ============================================================
   */

  const handlePositionChange = (
    playerId: number,
    value: string
  ) => {
    updateDetectedPlayer(playerId, {
      positionId: value === "" ? null : Number(value),
    });
  };

  /*
   * ============================================================
   * ELIMINAR JUGADOR DEL RESULTADO
   * ============================================================
   */

  const removeDetectedPlayer =
    (playerId: number) => {
      setDetectedPlayers(
        (current) =>
          current.filter(
            (player) =>
              player.playerId !==
              playerId
          )
      );
    };

  /*
   * ============================================================
   * CAPITÁN
   *
   * Solo puede existir un capitán por equipo.
   * ============================================================
   */

  const handleCaptainChange =
    (
      player: DetectedPlayer
    ) => {
      setDetectedPlayers(
        (current) =>
          current.map(
            (item) => {
              if (
                item.teamId !==
                player.teamId
              ) {
                return item;
              }

              return {
                ...item,
                captain:
                  item.playerId ===
                  player.playerId,
              };
            }
          )
      );
    };

  /*
   * ============================================================
   * DURACIÓN DEL PARTIDO
   * ============================================================
   */

  const matchDuration =
    selectedMatch?.matchDuration ??
    90;

  /*
   * ============================================================
   * CALCULAR MINUTOS
   * ============================================================
   *
   * Titular:
   *   duración - salida
   *
   * Titular sin salida:
   *   duración completa
   *
   * Suplente:
   *   duración - entrada
   *
   * Suplente con salida:
   *   salida - entrada
   *
   * Suplente que entra pero no sale:
   *   duración - entrada
   *
   * Titular que entra/sale en una situación excepcional:
   *   se utiliza entrada/salida.
   * ============================================================
   */

  const calculateMinutes =
    (
      player: DetectedPlayer
    ): number => {
      const inMinute =
        player.substituteInMinute;

      const outMinute =
        player.substituteOutMinute;

      /*
       * Entrada y salida
       */

      if (
        inMinute !== null &&
        outMinute !== null
      ) {
        return Math.max(
          0,
          outMinute -
            inMinute
        );
      }

      /*
       * Solo entrada
       */

      if (
        inMinute !== null
      ) {
        return Math.max(
          0,
          matchDuration -
            inMinute
        );
      }

      /*
       * Solo salida
       */

      if (
        outMinute !== null
      ) {
        return Math.max(
          0,
          outMinute
        );
      }

      /*
       * Titular sin sustitución
       */

      if (
        player.isStartingXI
      ) {
        return matchDuration;
      }

      /*
       * Suplente detectado pero
       * sin minuto de entrada:
       * no podemos atribuirle minutos.
       */

      return 0;
    };

  /*
   * ============================================================
   * GUARDAR PARTICIPACIONES
   * ============================================================
   */

  const handleSave =
    async () => {
      setError("");
      setMessage("");

      if (!selectedMatch) {
        setError(
          "Selecciona un partido."
        );
        return;
      }

      if (
        detectedPlayers.length ===
        0
      ) {
        setError(
          "No hay jugadores para guardar."
        );
        return;
      }

      /*
       * ========================================================
       * VALIDACIONES
       * ========================================================
       */

      const validationErrors: string[] =
        [];

      const captainByTeam =
        new Map<number, number>();

      for (const player of detectedPlayers) {
        /*
         * Posición obligatoria porque Participation
         * necesita positionId.
         */

        if (
          player.participationState !== "none" &&
          (!player.positionId || player.positionId <= 0)
        ) {
          validationErrors.push(
            `${player.playerName}: no tiene una posición registrada.`
          );
        }

        /*
         * Jugadores que no participan no pueden tener datos
         * de entrada, salida o capitán.
         */
        if (player.participationState === "none") {
          if (
            player.substituteInMinute !== null ||
            player.substituteOutMinute !== null ||
            player.captain
          ) {
            validationErrors.push(
              `${player.playerName}: un jugador que no participa no puede tener entrada, salida o ser capitán.`
            );
          }
        }

        /*
         * Entrada
         */

        if (
          player.substituteInMinute !==
            null &&
          (
            player.substituteInMinute <
              0 ||
            player.substituteInMinute >
              matchDuration
          )
        ) {
          validationErrors.push(
            `${player.playerName}: minuto de entrada no válido.`
          );
        }

        /*
         * Salida
         */

        if (
          player.substituteOutMinute !==
            null &&
          (
            player.substituteOutMinute <
              0 ||
            player.substituteOutMinute >
              matchDuration
          )
        ) {
          validationErrors.push(
            `${player.playerName}: minuto de salida no válido.`
          );
        }

        /*
         * Entrada posterior a salida
         */

        if (
          player.substituteInMinute !==
            null &&
          player.substituteOutMinute !==
            null &&
          player.substituteInMinute >
            player.substituteOutMinute
        ) {
          validationErrors.push(
            `${player.playerName}: la entrada no puede ser posterior a la salida.`
          );
        }

        /*
         * Capitán
         */

        if (player.captain) {
          if (
            captainByTeam.has(
              player.teamId
            )
          ) {
            validationErrors.push(
              "Solo puede haber un capitán por equipo."
            );
          }

          captainByTeam.set(
            player.teamId,
            player.playerId
          );
        }
      }

      if (
        validationErrors.length > 0
      ) {
        setError(
          validationErrors.join(
            " "
          )
        );
        return;
      }

      /*
       * ========================================================
       * PREPARAR GUARDADO
       * ========================================================
       */

      const playersWithMinutes =
        detectedPlayers
          .map((player) => ({
            player,
            minutesPlayed:
              calculateMinutes(
                player
              ),
          }))
          .filter(
            (item) =>
              item.minutesPlayed >
              0
          );

      if (
        playersWithMinutes.length ===
        0
      ) {
        setError(
          "No hay jugadores con minutos jugados para guardar."
        );
        return;
      }

      setSaving(true);

      try {
        let savedCount = 0;

        for (const item of playersWithMinutes) {
          const player =
            item.player;

          const participationData:
            Omit<
              Participation,
              "id"
            > = {
            matchId:
              selectedMatch.id,

            playerId:
              player.playerId,

            teamId:
              player.teamId,

            positionId:
              player.positionId!,

            shirtNumber:
              player.shirtNumber ?? 0,

            isStartingXI:
              player.isStartingXI,

            minutesPlayed:
              item.minutesPlayed,

            captain:
              player.captain,

            substituteInMinute:
              player.substituteInMinute,

            substituteOutMinute:
              player.substituteOutMinute,
          };

          /*
           * Buscamos si ya existe.
           */

          const existing =
            existingParticipations.find(
              (participation) =>
                participation.matchId ===
                  selectedMatch.id &&
                participation.teamId ===
                  player.teamId &&
                participation.playerId ===
                  player.playerId
            );

          if (existing) {
            await updateParticipation(
              existing.id,
              participationData
            );
          } else {
            await addParticipation(
              participationData
            );
          }

          savedCount += 1;
        }

        /*
         * ======================================================
         * RECARGAR PARTICIPACIONES
         * ======================================================
         */

        const refreshed =
          await getParticipations();

        setExistingParticipations(
          refreshed
        );

        setMessage(
          `Se han guardado correctamente ${savedCount} participaciones.`
        );

        setDetectedPlayers([]);
        setImagePreview("");
        setImageDataUrl("");

        /*
         * Volvemos a la página principal.
         */

        await onSaved();
      } catch (err) {
        console.error(
          "Error guardando participaciones desde imagen:",
          err
        );

        setError(
          "No se pudieron guardar las participaciones. Revisa los datos e inténtalo de nuevo."
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ============================================================
   * RENDER DE UNA TABLA DE EQUIPO
   * ============================================================
   */

  const renderTeamTable =
    (
      teamId: number,
      teamName: string
    ) => {
      const teamPlayers = detectedPlayers
        .filter((player) => player.teamId === teamId)
        .slice()
        .sort((a, b) => {
          if (
            a.shirtNumber !== null &&
            b.shirtNumber !== null
          ) {
            return a.shirtNumber - b.shirtNumber;
          }

          if (a.shirtNumber !== null) return -1;
          if (b.shirtNumber !== null) return 1;

          return a.playerName.localeCompare(b.playerName, "es");
        });

      const participatingCount = teamPlayers.filter(
        (player) => player.participationState !== "none"
      ).length;

      return (
        <div className="w-full min-w-0 overflow-hidden rounded-lg border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 p-3 sm:px-4 sm:py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-slate-800">
                  {teamName}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {teamPlayers.length} jugadores en plantilla · {participatingCount} con participación
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                Plantilla completa
              </span>
            </div>
          </div>

          <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-left">
                  <th className="px-3 py-3 font-semibold text-slate-600">
                    Dorsal
                  </th>
                  <th className="px-3 py-3 font-semibold text-slate-600">
                    Jugador
                  </th>
                  <th className="px-3 py-3 font-semibold text-slate-600">
                    Posición
                  </th>
                  <th className="px-3 py-3 font-semibold text-slate-600">
                    Estado
                  </th>
                  <th className="px-3 py-3 font-semibold text-slate-600">
                    Entrada
                  </th>
                  <th className="px-3 py-3 font-semibold text-slate-600">
                    Salida
                  </th>
                  <th className="px-3 py-3 font-semibold text-slate-600">
                    Minutos
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600">
                    Capitán
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600">
                    Conf. IA
                  </th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {teamPlayers.map((player) => {
                  const minutes = calculateMinutes(player);
                  const notParticipating =
                    player.participationState === "none";

                  return (
                    <tr
                      key={player.playerId}
                      className={
                        `border-b border-slate-100 last:border-b-0 ${
                          notParticipating ? "bg-slate-50/70" : "bg-white"
                        }`
                      }
                    >
                      {/* DORSAL */}
                      <td className="whitespace-nowrap px-2 py-3 sm:px-3">
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={player.shirtNumber ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateDetectedPlayer(player.playerId, {
                              shirtNumber:
                                value === "" ? null : Number(value),
                            });
                          }}
                          disabled={saving}
                          className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                        />
                      </td>

                      {/* JUGADOR */}
                      <td className="whitespace-nowrap px-2 py-3 sm:px-3">
                        <div className="font-medium text-slate-800">
                          {player.playerName}
                        </div>
                        {player.shortName !== player.playerName && (
                          <div className="text-xs text-slate-400">
                            {player.shortName}
                          </div>
                        )}
                      </td>

                      {/* POSICIÓN */}
                      <td className="whitespace-nowrap px-2 py-3 sm:px-3">
                        <select
                          value={player.positionId ?? ""}
                          onChange={(event) =>
                            handlePositionChange(
                              player.playerId,
                              event.target.value
                            )
                          }
                          disabled={saving}
                          className="w-44 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                        >
                          <option value="">
                            Seleccionar
                          </option>
                          {positions
                            .slice()
                            .sort((a, b) => {
                              if (a.displayOrder !== b.displayOrder) {
                                return a.displayOrder - b.displayOrder;
                              }
                              return a.name.localeCompare(b.name, "es");
                            })
                            .map((position) => (
                              <option
                                key={position.id}
                                value={position.id}
                              >
                                {position.name}
                              </option>
                            ))}
                        </select>
                      </td>

                      {/* ESTADO */}
                      <td className="whitespace-nowrap px-2 py-3 sm:px-3">
                        <select
                          value={player.participationState}
                          onChange={(event) =>
                            handleParticipationStateChange(
                              player,
                              event.target.value as DetectedPlayer["participationState"]
                            )
                          }
                          disabled={saving}
                          className={
                            `w-36 rounded-md border px-2 py-1.5 text-sm font-semibold outline-none focus:border-slate-500 disabled:bg-slate-100 ${
                              player.participationState === "starter"
                                ? "border-green-200 bg-green-50 text-green-700"
                                : player.participationState === "substitute"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-slate-200 bg-slate-100 text-slate-500"
                            }`
                          }
                        >
                          <option value="starter">
                            Titular
                          </option>
                          <option value="substitute">
                            Suplente
                          </option>
                          <option value="none">
                            No participó
                          </option>
                        </select>
                      </td>

                      {/* ENTRADA */}
                      <td className="whitespace-nowrap px-2 py-3 sm:px-3">
                        <input
                          type="number"
                          min={0}
                          max={matchDuration}
                          value={player.substituteInMinute ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateDetectedPlayer(player.playerId, {
                              substituteInMinute:
                                value === "" ? null : Number(value),
                            });
                          }}
                          disabled={
                            saving ||
                            player.participationState !== "substitute"
                          }
                          className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>

                      {/* SALIDA */}
                      <td className="whitespace-nowrap px-2 py-3 sm:px-3">
                        <input
                          type="number"
                          min={0}
                          max={matchDuration}
                          value={player.substituteOutMinute ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateDetectedPlayer(player.playerId, {
                              substituteOutMinute:
                                value === "" ? null : Number(value),
                            });
                          }}
                          disabled={
                            saving ||
                            player.participationState === "none"
                          }
                          className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>

                      {/* MINUTOS */}
                      <td className="whitespace-nowrap px-2 py-3 sm:px-3">
                        <span
                          className={
                            `font-semibold ${
                              notParticipating
                                ? "text-slate-400"
                                : "text-slate-800"
                            }`
                          }
                        >
                          {minutes}
                        </span>
                      </td>

                      {/* CAPITÁN */}
                      <td className="whitespace-nowrap px-2 py-3 text-center sm:px-3">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="checkbox"
                            checked={player.captain}
                            onChange={() =>
                              handleCaptainChange(player)
                            }
                            disabled={
                              saving ||
                              player.participationState === "none"
                            }
                            className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                          />
                          {player.captain &&
                            player.captainConfidence > 0 && (
                              <span
                                className={
                                  player.captainConfidence >= 0.9
                                    ? "text-[10px] font-semibold text-green-600"
                                    : player.captainConfidence >= 0.7
                                    ? "text-[10px] font-semibold text-amber-600"
                                    : "text-[10px] font-semibold text-red-600"
                                }
                                title="Confianza de la detección automática del capitán"
                              >
                                IA {Math.round(
                                  player.captainConfidence * 100
                                )}%
                              </span>
                            )}
                        </div>
                      </td>

                      {/* CONFIANZA IA */}
                      <td className="whitespace-nowrap px-2 py-3 text-center sm:px-3">
                        {player.confidence > 0 ? (
                          <span
                            className={
                              player.confidence >= 0.9
                                ? "font-semibold text-green-600"
                                : player.confidence >= 0.7
                                ? "font-semibold text-amber-600"
                                : "font-semibold text-red-600"
                            }
                          >
                            {Math.round(player.confidence * 100)}%
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            No detectado
                          </span>
                        )}
                      </td>

                      {/* QUITAR */}
                      <td className="whitespace-nowrap px-2 py-3 text-center sm:px-3">
                        <button
                          type="button"
                          onClick={() =>
                            removeDetectedPlayer(player.playerId)
                          }
                          disabled={saving}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

  /*
   * ============================================================
   * CARGANDO
   * ============================================================
   */

  if (loading) {
    return (
      <div className="w-full min-w-0 rounded-xl border bg-white p-3 shadow sm:p-4 md:p-6">
        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
          Importar participaciones
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
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
    <div className="w-full min-w-0 rounded-xl border bg-white p-3 shadow sm:p-4 md:p-6">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-5 sm:mb-6">
        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
          Importar participaciones desde imagen
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Selecciona el partido y sube la imagen de
          las alineaciones. La imagen será analizada
          automáticamente y podrás revisar los datos
          antes de guardarlos.
        </p>
      </div>

      {/* ======================================================
          MENSAJES
          ====================================================== */}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:p-4">
          <strong className="font-semibold">
            Revisa los siguientes errores:
          </strong>

          <p className="mt-1">
            {error}
          </p>
        </div>
      )}

      {message && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 sm:p-4">
          {message}
        </div>
      )}

      {/* ======================================================
          SELECCIÓN DEL PARTIDO
          ====================================================== */}

      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:mb-6 sm:p-5">

        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
          Partido
        </h3>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">

          {/* TEMPORADA */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Temporada
            </label>

            <select
              value={seasonId}
              onChange={
                handleSeasonChange
              }
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
            >
              <option value={0}>
                Seleccionar temporada
              </option>

              {sortedSeasons.map(
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
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Competición
            </label>

            <select
              value={
                competitionId
              }
              onChange={
                handleCompetitionChange
              }
              disabled={!seasonId}
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-slate-500"
            >
              <option value={0}>
                Seleccionar competición
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
          </div>

          {/* JORNADA / FASE */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Jornada / fase
            </label>

            <select
              value={stageId}
              onChange={handleStageChange}
              disabled={!competitionId}
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-slate-500"
            >
              <option value={0}>
                {!competitionId
                  ? "Selecciona primero una competición"
                  : "Seleccionar jornada / fase"}
              </option>

              {availableStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          {/* PARTIDO */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Partido
            </label>

            <select
              value={matchId}
              onChange={
                handleMatchChange
              }
              disabled={
                !stageId
              }
              className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-slate-500"
            >
              <option value={0}>
                {!stageId
                  ? "Selecciona primero una jornada / fase"
                  : "Seleccionar partido"}
              </option>

              {availableMatches.map(
                (match) => {
                  const home =
                    teams.find(
                      (team) =>
                        team.id ===
                        match.homeTeamId
                    );

                  const away =
                    teams.find(
                      (team) =>
                        team.id ===
                        match.awayTeamId
                    );

                  return (
                    <option
                      key={match.id}
                      value={match.id}
                    >
                      {new Date(
                        match.date
                      ).toLocaleDateString(
                        "es-ES"
                      )}{" "}
                      —{" "}
                      {getTeamName(
                        home
                      )}{" "}
                      vs{" "}
                      {getTeamName(
                        away
                      )}
                    </option>
                  );
                }
              )}
            </select>
          </div>

        </div>

        {/* INFORMACIÓN DEL PARTIDO */}

        {selectedMatch && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 sm:mt-5 sm:p-4">

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 sm:gap-4">

              <div>
                <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Local
                </span>

                <span className="mt-1 block font-semibold text-slate-800">
                  {getTeamName(
                    homeTeam
                  )}
                </span>
              </div>

              <div>
                <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Visitante
                </span>

                <span className="mt-1 block font-semibold text-slate-800">
                  {getTeamName(
                    awayTeam
                  )}
                </span>
              </div>

              <div>
                <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Duración
                </span>

                <span className="mt-1 block font-semibold text-slate-800">
                  {matchDuration} minutos
                </span>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ======================================================
          IMAGEN
          ====================================================== */}

      <div className="mb-5 rounded-xl border border-slate-200 p-3 sm:mb-6 sm:p-5">

        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">
          Imagen de alineaciones
        </h3>

        <p className="mb-4 text-sm leading-6 text-slate-500">
          Sube una captura donde aparezcan las
          alineaciones y las sustituciones.
        </p>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={
            handleImageChange
          }
          disabled={analyzing || saving}
          className="block w-full min-w-0 cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-2 file:border-0 file:bg-slate-100 file:px-3 file:py-2.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 sm:file:mr-4 sm:file:px-4"
        />

        {imagePreview && (
          <div className="mt-5">

            <p className="mb-2 text-sm font-medium text-slate-700">
              Vista previa
            </p>

            <div className="max-h-[600px] w-full overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-3">
              <img
                src={
                  imagePreview
                }
                alt="Vista previa de la alineación"
                className="mx-auto max-h-[560px] max-w-full w-auto rounded-md object-contain"
              />
            </div>

          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:justify-end">

          <button
            type="button"
            onClick={
              handleAnalyzeImage
            }
            disabled={
              analyzing ||
              saving ||
              !stageId ||
              !matchId ||
              !imageDataUrl
            }
            className="w-full rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {analyzing
              ? "Analizando imagen..."
              : "Analizar imagen"}
          </button>

        </div>

      </div>

      {/* ======================================================
          RESULTADO
          ====================================================== */}

      {detectedPlayers.length >
        0 && (
        <div className="mb-5 sm:mb-6">

          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4">

            <p className="text-sm font-semibold text-amber-800">
              Revisión antes de guardar
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-700">
              La plantilla completa de ambos equipos aparece en la revisión.
              Los jugadores que no hayan sido reconocidos quedan como
              <strong> No participó</strong>. Comprueba titulares, suplentes,
              posiciones, dorsales, minutos de entrada y salida y capitán.
              La IA también intentará detectar el capitán cuando aparezca
              la marca <strong>(c)</strong> antes de su nombre.
            </p>

          </div>

          <div className="space-y-5 sm:space-y-6">

            {homeTeam &&
              renderTeamTable(
                homeTeam.id,
                getTeamName(
                  homeTeam
                )
              )}

            {awayTeam &&
              renderTeamTable(
                awayTeam.id,
                getTeamName(
                  awayTeam
                )
              )}

          </div>

        </div>
      )}

      {detectedPlayers.length > 0 && (
        <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 sm:mb-6 sm:p-4">
          <strong className="font-semibold text-slate-700">Importante:</strong>{" "}
          los jugadores marcados como <strong>No participó</strong> se muestran
          para completar la revisión, pero no se guardan como participaciones.
          Solo se guardan los jugadores con minutos jugados.
        </div>
      )}

      {/* ======================================================
          BOTONES
          ====================================================== */}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between sm:pt-6">

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          Volver
        </button>

        {detectedPlayers.length >
          0 && (
          <button
            type="button"
            onClick={
              handleSave
            }
            disabled={
              saving ||
              analyzing
            }
            className="w-full rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving
              ? "Guardando..."
              : "Guardar participaciones"}
          </button>
        )}

      </div>

    </div>
  );
};