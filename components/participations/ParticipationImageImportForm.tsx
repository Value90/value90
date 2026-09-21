
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

import {
  recordRecognitionCorrectionsBatch,
} from "@/services/ai.feedback.service";

/* ============================================================
   TIPOS
   ============================================================ */

interface ParticipationImageImportFormProps {
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
  fixedMatchId?: number | null;
  hideMatchSelector?: boolean;
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

/* ============================================================
   UTILIDADES
   ============================================================ */

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'’`´]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeNumber(
  value: unknown,
  fallback = 0
): number {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

/* ============================================================
   COMPONENTE
   ============================================================ */

export default function ParticipationImageImportForm({
  onCancel,
  onSaved,
  fixedMatchId = null,
  hideMatchSelector = false,
}: ParticipationImageImportFormProps) {
  /* ==========================================================
     DATOS
     ========================================================== */

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

  /* ==========================================================
     SELECCIÓN
     ========================================================== */

  const [seasonId, setSeasonId] = useState<number>(0);
  const [competitionId, setCompetitionId] = useState<number>(0);
  const [stageId, setStageId] = useState<number>(0);
  const [matchId, setMatchId] = useState<number>(0);

  /* ==========================================================
     IMAGEN
     ========================================================== */

  const [imagePreview, setImagePreview] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");

  /* ==========================================================
     RESULTADO DE LA IA
     ========================================================== */

  const [detectedPlayers, setDetectedPlayers] =
    useState<DetectedPlayer[]>([]);

  const [originalDetectedPlayers, setOriginalDetectedPlayers] =
    useState<DetectedPlayer[]>([]);

  /* ==========================================================
     ESTADO
     ========================================================== */

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /* ==========================================================
     CARGA INICIAL
     ========================================================== */

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

        if (!mounted) return;

        setSeasons(seasonsData);
        setCompetitions(competitionsData);
        setStages(stagesData);
        setMatches(matchesData);
        setPlayers(playersData);
        setTeams(teamsData);
        setPositions(positionsData);
        setHistPlayerTeams(historyData);
        setExistingParticipations(participationsData);
      } catch (err) {
        console.error("Error cargando datos:", err);

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

    void loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     SINCRONIZAR PARTIDO FIJADO
     ========================================================== */

  useEffect(() => {
    if (!fixedMatchId || matches.length === 0) {
      return;
    }

    const fixedMatch = matches.find(
      (match) => match.id === fixedMatchId
    );

    if (!fixedMatch) {
      setError("No se ha encontrado el partido fijado.");
      return;
    }

    setSeasonId(fixedMatch.seasonId);
    setCompetitionId(fixedMatch.competitionId);
    setStageId(fixedMatch.stageId ?? 0);
    setMatchId(fixedMatch.id);
  }, [fixedMatchId, matches]);

  /* ==========================================================
     FILTROS
     ========================================================== */

  const sortedSeasons = useMemo(() => {
    return seasons
      .filter((season) => season.active === true)
      .slice()
      .sort((a, b) =>
        b.name.localeCompare(a.name, "es", {
          numeric: true,
        })
      );
  }, [seasons]);

  const availableCompetitions = useMemo(() => {
    if (!seasonId) return [];

    const competitionIds = new Set(
      matches
        .filter((match) => match.seasonId === seasonId)
        .map((match) => match.competitionId)
    );

    return competitions
      .filter(
        (competition) =>
          competition.active === true &&
          (
            competition.competitionType === "League" ||
            competition.competitionType === "National Team"
          ) &&
          competitionIds.has(competition.id)
      )
      .slice()
      .sort((a, b) =>
        a.name.localeCompare(b.name, "es")
      );
  }, [competitions, matches, seasonId]);

  const availableStages = useMemo(() => {
    if (!seasonId || !competitionId) return [];

    const stageIds = new Set(
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
          stageIds.has(stage.id)
      )
      .slice()
      .sort((a, b) => {
        const numberA = Number(a.name.match(/\d+/)?.[0]);
        const numberB = Number(b.name.match(/\d+/)?.[0]);

        if (
          Number.isFinite(numberA) &&
          Number.isFinite(numberB) &&
          numberA !== numberB
        ) {
          return numberB - numberA;
        }

        if (a.displayOrder !== b.displayOrder) {
          return b.displayOrder - a.displayOrder;
        }

        return a.name.localeCompare(b.name, "es");
      });
  }, [stages, matches, seasonId, competitionId]);

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
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      );
  }, [matches, seasonId, competitionId, stageId]);

  const selectedMatch = useMemo(() => {
    return matches.find((match) => match.id === matchId);
  }, [matches, matchId]);

  const homeTeam = useMemo(() => {
    if (!selectedMatch) return undefined;

    return teams.find(
      (team) => team.id === selectedMatch.homeTeamId
    );
  }, [selectedMatch, teams]);

  const awayTeam = useMemo(() => {
    if (!selectedMatch) return undefined;

    return teams.find(
      (team) => team.id === selectedMatch.awayTeamId
    );
  }, [selectedMatch, teams]);

  const getTeamName = (team?: Team) => {
    return team?.shortName ?? team?.name ?? "Equipo";
  };

  const matchDuration =
    selectedMatch?.matchDuration ?? 90;

  /* ==========================================================
     PLANTILLAS DE LOS EQUIPOS
     ========================================================== */

  const rosterCandidates = useMemo<
    RosterCandidate[]
  >(() => {
    if (!selectedMatch || !seasonId) return [];

    const result: RosterCandidate[] = [];

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
      const squad = histPlayerTeams.filter(
        (history) =>
          history.teamId === matchTeam.id &&
          history.seasonId === seasonId &&
          history.active === true
      );

      for (const history of squad) {
        const player = players.find(
          (item) => item.id === history.playerId
        );

        if (!player) continue;

        result.push({
          playerId: player.id,
          playerName: player.name,
          shortName: player.shortName ?? player.name,
          teamId: matchTeam.id,
          teamSide: matchTeam.side,
          shirtNumber: history.shirtNumber ?? null,
          positionId: history.positionId ?? null,
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

  /* ==========================================================
     CAMBIOS DE SELECCIÓN
     ========================================================== */

  const clearAnalysis = () => {
    setImagePreview("");
    setImageDataUrl("");
    setDetectedPlayers([]);
    setError("");
    setMessage("");
  };

  const handleSeasonChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setSeasonId(Number(event.target.value));
    setCompetitionId(0);
    setStageId(0);
    setMatchId(0);
    clearAnalysis();
  };

  const handleCompetitionChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setCompetitionId(Number(event.target.value));
    setStageId(0);
    setMatchId(0);
    clearAnalysis();
  };

  const handleStageChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setStageId(Number(event.target.value));
    setMatchId(0);
    clearAnalysis();
  };

  const handleMatchChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setMatchId(Number(event.target.value));
    clearAnalysis();
  };

  /* ==========================================================
     IMAGEN
     ========================================================== */

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

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

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("No se pudo leer la imagen.");
        return;
      }

      setImageDataUrl(reader.result);
      setImagePreview(reader.result);
    };

    reader.onerror = () => {
      setError("No se pudo leer la imagen.");
    };

    reader.readAsDataURL(file);
  };

  /* ==========================================================
     ANALIZAR IMAGEN
     ========================================================== */

  const handleAnalyzeImage = async () => {
    setError("");
    setMessage("");

    if (!seasonId) {
      setError("Selecciona una temporada.");
      return;
    }

    if (!competitionId) {
      setError("Selecciona una competición.");
      return;
    }

    if (!stageId) {
      setError("Selecciona una jornada / fase.");
      return;
    }

    if (!matchId || !selectedMatch) {
      setError("Selecciona un partido.");
      return;
    }

    if (!imageDataUrl) {
      setError("Selecciona primero una imagen.");
      return;
    }

    if (rosterCandidates.length === 0) {
      setError(
        "No hay jugadores registrados en las plantillas de los dos equipos para esta temporada."
      );
      return;
    }

    setAnalyzing(true);

    try {
      const response = await fetch(
        "/api/participations/analyze-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId,
            image: imageDataUrl,
            matchDuration,
            homeTeamName: getTeamName(homeTeam),
            awayTeamName: getTeamName(awayTeam),
            roster: rosterCandidates.map((player) => ({
              playerId: player.playerId,
              playerName: player.playerName,
              shortName: player.shortName,
              teamId: player.teamId,
              teamSide: player.teamSide,
              shirtNumber: player.shirtNumber,
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ?? "No se pudo analizar la imagen."
        );
      }

      if (!Array.isArray(data?.players)) {
        throw new Error(
          "La respuesta del análisis no tiene un formato válido."
        );
      }

      const detectedByPlayerId = new Map<
        number,
        Record<string, unknown>
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

        const rosterPlayer = rosterCandidates.find(
          (candidate) => candidate.playerId === playerId
        );

        if (rosterPlayer) {
          detectedByPlayerId.set(playerId, item);
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
              participationState: "none",
              substituteInMinute: null,
              substituteOutMinute: null,
              confidence: 0,
              captain: false,
              captainConfidence: 0,
            };
          }

          const isStartingXI =
            item.isStartingXI === true;

          const inputMinute =
            item.substituteInMinute;

          const outputMinute =
            item.substituteOutMinute;

          const substituteInMinute =
            inputMinute !== null &&
            inputMinute !== undefined &&
            Number.isFinite(Number(inputMinute))
              ? Number(inputMinute)
              : null;

          const substituteOutMinute =
            outputMinute !== null &&
            outputMinute !== undefined &&
            Number.isFinite(Number(outputMinute))
              ? Number(outputMinute)
              : null;

          const confidence = safeNumber(
            item.confidence
          );

          const captainConfidence = safeNumber(
            item.captainConfidence
          );

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
            substituteInMinute,
            substituteOutMinute,
            confidence,
            captain: item.captain === true,
            captainConfidence,
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

      setDetectedPlayers(detected);
      setOriginalDetectedPlayers(
        detected.map((player) => ({ ...player }))
      );

      const recognizedCount = detected.filter(
        (player) => player.confidence > 0
      ).length;

      setMessage(
        `Se han cargado ${detected.length} jugadores. La IA ha identificado ${recognizedCount}. Revisa los datos antes de guardar.`
      );
    } catch (err) {
      console.error("Error analizando imagen:", err);

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

  /* ==========================================================
     ACTUALIZAR JUGADORES
     ========================================================== */

  const updateDetectedPlayer = (
    playerId: number,
    changes: Partial<DetectedPlayer>
  ) => {
    setDetectedPlayers((current) =>
      current.map((player) =>
        player.playerId === playerId
          ? { ...player, ...changes }
          : player
      )
    );
  };

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

  const handlePositionChange = (
    playerId: number,
    value: string
  ) => {
    updateDetectedPlayer(playerId, {
      positionId: value === "" ? null : Number(value),
    });
  };

  const removeDetectedPlayer = (playerId: number) => {
    setDetectedPlayers((current) =>
      current.filter(
        (player) => player.playerId !== playerId
      )
    );
  };

  const handleCaptainChange = (
    player: DetectedPlayer
  ) => {
    setDetectedPlayers((current) =>
      current.map((item) => {
        if (item.teamId !== player.teamId) {
          return item;
        }

        return {
          ...item,
          captain:
            item.playerId === player.playerId,
        };
      })
    );
  };

  /* ==========================================================
     MINUTOS
     ========================================================== */

  const calculateMinutes = (
    player: DetectedPlayer
  ): number => {
    const input = player.substituteInMinute;
    const output = player.substituteOutMinute;

    if (player.participationState === "none") {
      return 0;
    }

    if (input !== null && output !== null) {
      return Math.max(0, output - input);
    }

    if (input !== null) {
      return Math.max(0, matchDuration - input);
    }

    if (output !== null) {
      return Math.max(0, output);
    }

    if (player.isStartingXI) {
      return matchDuration;
    }

    return 0;
  };

  /* ==========================================================
     GUARDAR PARTICIPACIONES
     ========================================================== */

  const handleSave = async () => {
    setError("");
    setMessage("");

    if (!selectedMatch) {
      setError("Selecciona un partido.");
      return;
    }

    if (detectedPlayers.length === 0) {
      setError("No hay jugadores para guardar.");
      return;
    }

    const validationErrors: string[] = [];
    const captainByTeam = new Map<number, number>();

    for (const player of detectedPlayers) {
      if (
        player.participationState !== "none" &&
        (!player.positionId || player.positionId <= 0)
      ) {
        validationErrors.push(
          `${player.playerName}: no tiene una posición registrada.`
        );
      }

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

      if (
        player.substituteInMinute !== null &&
        (
          player.substituteInMinute < 0 ||
          player.substituteInMinute > matchDuration
        )
      ) {
        validationErrors.push(
          `${player.playerName}: minuto de entrada no válido.`
        );
      }

      if (
        player.substituteOutMinute !== null &&
        (
          player.substituteOutMinute < 0 ||
          player.substituteOutMinute > matchDuration
        )
      ) {
        validationErrors.push(
          `${player.playerName}: minuto de salida no válido.`
        );
      }

      if (
        player.substituteInMinute !== null &&
        player.substituteOutMinute !== null &&
        player.substituteInMinute >
          player.substituteOutMinute
      ) {
        validationErrors.push(
          `${player.playerName}: la entrada no puede ser posterior a la salida.`
        );
      }

      if (player.captain) {
        if (captainByTeam.has(player.teamId)) {
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

    if (validationErrors.length > 0) {
      setError(validationErrors.join(" "));
      return;
    }

    const playersWithMinutes = detectedPlayers
      .map((player) => ({
        player,
        minutesPlayed: calculateMinutes(player),
      }))
      .filter((item) => item.minutesPlayed > 0);

    if (playersWithMinutes.length === 0) {
      setError(
        "No hay jugadores con minutos jugados para guardar."
      );
      return;
    }

    setSaving(true);

    try {
      let savedCount = 0;

      for (const item of playersWithMinutes) {
        const player = item.player;

        const participationData: Omit<
          Participation,
          "id"
        > = {
          matchId: selectedMatch.id,
          playerId: player.playerId,
          teamId: player.teamId,
          positionId: player.positionId!,
          shirtNumber: player.shirtNumber ?? 0,
          isStartingXI: player.isStartingXI,
          minutesPlayed: item.minutesPlayed,
          captain: player.captain,
          substituteInMinute:
            player.substituteInMinute,
          substituteOutMinute:
            player.substituteOutMinute,
        };

        const existing =
          existingParticipations.find(
            (participation) =>
              participation.matchId === selectedMatch.id &&
              participation.teamId === player.teamId &&
              participation.playerId === player.playerId
          );

        if (existing) {
          await updateParticipation(
            existing.id,
            participationData
          );
        } else {
          await addParticipation(participationData);
        }

        savedCount += 1;
      }

      const corrections = [] as Parameters<
        typeof recordRecognitionCorrectionsBatch
      >[0];

      for (const current of detectedPlayers) {
        const original = originalDetectedPlayers.find(
          (item) => item.playerId === current.playerId
        );

        if (!original) continue;

        const fields = [
          { name: "participationState", type: "participation_status" as const },
          { name: "substituteInMinute", type: "substitute_in_minute" as const },
          { name: "substituteOutMinute", type: "substitute_out_minute" as const },
          { name: "captain", type: "captain" as const },
        ];

        for (const field of fields) {
          const detectedValue = original[field.name as keyof DetectedPlayer];
          const correctedValue = current[field.name as keyof DetectedPlayer];

          if (JSON.stringify(detectedValue) !== JSON.stringify(correctedValue)) {
            corrections.push({
              matchId: selectedMatch.id,
              playerId: current.playerId,
              fieldName: field.name,
              detectedValue,
              correctedValue,
              correctionType: field.type,
              confidence: current.confidence,
              status: "pending",
            });
          }
        }
      }

      if (corrections.length > 0) {
        try {
          await recordRecognitionCorrectionsBatch(corrections);
        } catch (feedbackError) {
          console.error("Error registrando correcciones de IA:", feedbackError);
        }
      }

      const refreshed = await getParticipations();

      setExistingParticipations(refreshed);
      setDetectedPlayers([]);
      setOriginalDetectedPlayers([]);
      setImagePreview("");
      setImageDataUrl("");

      setMessage(
        `Se han guardado correctamente ${savedCount} participaciones.`
      );

      await onSaved();
    } catch (err) {
      console.error("Error guardando participaciones:", err);

      setError(
        "No se pudieron guardar las participaciones. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================
     TABLA DE EQUIPO — DISEÑO SIN SUPERPOSICIONES
     ========================================================== */

  const renderTeamTable = (
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

    /*
     * Anchos de columna:
     *
     * La tabla usa una anchura compacta y se desplaza
     * horizontalmente en pantallas pequeñas.
     * El contenedor exterior nunca aumenta la anchura
     * de la pantalla.
     */

    const columnWidths = [
      "72px",   // Dorsal
      "190px",  // Jugador
      "170px",  // Posición
      "145px",  // Estado
      "88px",   // Entrada
      "88px",   // Salida
      "72px",   // Minutos
      "92px",   // Capitán
      "96px",   // Conf. IA
      "82px",   // Acción
    ].join(" ");

    const sortedPositions = positions
      .slice()
      .sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }

        return a.name.localeCompare(b.name, "es");
      });

    return (
      <section
        key={teamId}
        className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {/* CABECERA DEL EQUIPO */}

        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {teamName}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {teamPlayers.length} jugadores en plantilla
                <span className="mx-1.5 text-slate-300">
                  ·
                </span>
                {participatingCount} con participación
              </p>
            </div>

            <span className="w-fit shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              Plantilla completa
            </span>
          </div>
        </div>

        {/* CONTENEDOR HORIZONTAL */}

        <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
          <div
            className="w-max min-w-full"
          >
            {/* CABECERA DE LA TABLA */}

            <div
              className="grid items-center border-b border-slate-200 bg-white px-2 py-3"
              style={{
                gridTemplateColumns: columnWidths,
              }}
            >
              <div className="px-2 text-left text-sm font-semibold text-slate-700">
                Dorsal
              </div>

              <div className="px-2 text-left text-sm font-semibold text-slate-700">
                Jugador
              </div>

              <div className="px-2 text-left text-sm font-semibold text-slate-700">
                Posición
              </div>

              <div className="px-2 text-left text-sm font-semibold text-slate-700">
                Estado
              </div>

              <div className="px-2 text-center text-sm font-semibold text-slate-700">
                Entrada
              </div>

              <div className="px-2 text-center text-sm font-semibold text-slate-700">
                Salida
              </div>

              <div className="px-2 text-center text-sm font-semibold text-slate-700">
                Minutos
              </div>

              <div className="px-2 text-center text-sm font-semibold text-slate-700">
                Capitán
              </div>

              <div className="px-2 text-center text-sm font-semibold text-slate-700">
                Conf. IA
              </div>

              <div className="px-2 text-center text-sm font-semibold text-slate-700">
                Acción
              </div>
            </div>

            {/* FILAS */}

            {teamPlayers.map((player) => {
              const minutes = calculateMinutes(player);
              const notParticipating =
                player.participationState === "none";

              return (
                <div
                  key={player.playerId}
                  className={`grid min-h-[68px] items-center border-b border-slate-100 px-2 last:border-b-0 ${
                    notParticipating
                      ? "bg-slate-50/70"
                      : "bg-white"
                  }`}
                  style={{
                    gridTemplateColumns: columnWidths,
                  }}
                >
                  {/* DORSAL */}

                  <div className="min-w-0 px-2">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={player.shirtNumber ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        updateDetectedPlayer(
                          player.playerId,
                          {
                            shirtNumber:
                              value === ""
                                ? null
                                : Number(value),
                          }
                        );
                      }}
                      disabled={saving}
                      className="box-border h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                    />
                  </div>

                  {/* JUGADOR */}

                  <div className="min-w-0 overflow-hidden px-2">
                    <p
                      className="truncate text-sm font-semibold text-slate-800"
                      title={player.playerName}
                    >
                      {player.playerName}
                    </p>

                    {player.shortName !== player.playerName && (
                      <p
                        className="mt-0.5 truncate text-xs text-slate-400"
                        title={player.shortName}
                      >
                        {player.shortName}
                      </p>
                    )}
                  </div>

                  {/* POSICIÓN */}

                  <div className="min-w-0 px-2">
                    <select
                      value={player.positionId ?? ""}
                      onChange={(event) =>
                        handlePositionChange(
                          player.playerId,
                          event.target.value
                        )
                      }
                      disabled={saving}
                      className="box-border h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        Seleccionar
                      </option>

                      {sortedPositions.map((position) => (
                        <option
                          key={position.id}
                          value={position.id}
                        >
                          {position.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ESTADO */}

                  <div className="min-w-0 px-2">
                    <select
                      value={player.participationState}
                      onChange={(event) =>
                        handleParticipationStateChange(
                          player,
                          event.target.value as DetectedPlayer["participationState"]
                        )
                      }
                      disabled={saving}
                      className={`box-border h-10 w-full min-w-0 rounded-lg border px-2 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 ${
                        player.participationState === "starter"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : player.participationState === "substitute"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
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
                  </div>

                  {/* ENTRADA */}

                  <div className="min-w-0 px-2">
                    <input
                      type="number"
                      min={0}
                      max={matchDuration}
                      value={player.substituteInMinute ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        updateDetectedPlayer(
                          player.playerId,
                          {
                            substituteInMinute:
                              value === ""
                                ? null
                                : Number(value),
                          }
                        );
                      }}
                      disabled={
                        saving ||
                        player.participationState !==
                          "substitute"
                      }
                      className="box-border h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  {/* SALIDA */}

                  <div className="min-w-0 px-2">
                    <input
                      type="number"
                      min={0}
                      max={matchDuration}
                      value={player.substituteOutMinute ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        updateDetectedPlayer(
                          player.playerId,
                          {
                            substituteOutMinute:
                              value === ""
                                ? null
                                : Number(value),
                          }
                        );
                      }}
                      disabled={
                        saving ||
                        player.participationState === "none"
                      }
                      className="box-border h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>

                  {/* MINUTOS */}

                  <div className="min-w-0 px-2 text-center">
                    <span
                      className={`text-sm font-bold ${
                        notParticipating
                          ? "text-slate-400"
                          : "text-slate-800"
                      }`}
                    >
                      {minutes}
                    </span>
                  </div>

                  {/* CAPITÁN */}

                  <div className="min-w-0 px-2">
                    <div className="flex flex-col items-center justify-center gap-1">
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
                        className="h-5 w-5 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
                        aria-label={`Capitán: ${player.playerName}`}
                      />

                      {player.captain &&
                        player.captainConfidence > 0 && (
                          <span
                            className={`whitespace-nowrap text-[10px] font-semibold ${
                              player.captainConfidence >= 0.9
                                ? "text-green-600"
                                : player.captainConfidence >= 0.7
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }`}
                          >
                            IA{" "}
                            {Math.round(
                              player.captainConfidence * 100
                            )}
                            %
                          </span>
                        )}
                    </div>
                  </div>

                  {/* CONFIANZA IA */}

                  <div className="min-w-0 px-2 text-center">
                    {player.confidence > 0 ? (
                      <span
                        className={`whitespace-nowrap text-sm font-semibold ${
                          player.confidence >= 0.9
                            ? "text-green-600"
                            : player.confidence >= 0.7
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {Math.round(
                          player.confidence * 100
                        )}
                        %
                      </span>
                    ) : (
                      <span className="whitespace-nowrap text-xs font-medium text-slate-400">
                        No detectado
                      </span>
                    )}
                  </div>

                  {/* ACCIÓN */}

                  <div className="min-w-0 px-2 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        removeDetectedPlayer(player.playerId)
                      }
                      disabled={saving}
                      className="rounded-lg px-2 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  /* ==========================================================
     CARGANDO
     ========================================================== */

  if (loading) {
    return (
      <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-800">
          Importar participaciones
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Cargando datos...
        </p>
      </div>
    );
  }

  /* ==========================================================
     RENDER PRINCIPAL
     ========================================================== */

  return (
    <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 md:p-6">
      {/* CABECERA */}

      <div className="mb-5 sm:mb-6">
        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
          Importar participaciones desde imagen
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Selecciona el partido y sube la imagen de las
          alineaciones. La imagen será analizada
          automáticamente y podrás revisar los datos
          antes de guardarlos.
        </p>
      </div>

      {/* MENSAJES */}

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:p-4"
        >
          <strong>Revisa los siguientes errores:</strong>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 sm:p-4"
        >
          {message}
        </div>
      )}

      {/* SELECCIÓN DEL PARTIDO */}

      {!hideMatchSelector && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:mb-6 sm:p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
            Partido
          </h3>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Temporada
              </label>

              <select
                value={seasonId}
                onChange={handleSeasonChange}
                className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value={0}>
                  Seleccionar temporada
                </option>

                {sortedSeasons.map((season) => (
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
                onChange={handleCompetitionChange}
                disabled={!seasonId}
                className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none disabled:bg-slate-100 focus:border-emerald-500"
              >
                <option value={0}>
                  Seleccionar competición
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
                Jornada / fase
              </label>

              <select
                value={stageId}
                onChange={handleStageChange}
                disabled={!competitionId}
                className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none disabled:bg-slate-100 focus:border-emerald-500"
              >
                <option value={0}>
                  Seleccionar jornada / fase
                </option>

                {availableStages.map((stage) => (
                  <option
                    key={stage.id}
                    value={stage.id}
                  >
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Partido
              </label>

              <select
                value={matchId}
                onChange={handleMatchChange}
                disabled={!stageId}
                className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none disabled:bg-slate-100 focus:border-emerald-500"
              >
                <option value={0}>
                  Seleccionar partido
                </option>

                {availableMatches.map((match) => {
                  const home = teams.find(
                    (team) => team.id === match.homeTeamId
                  );

                  const away = teams.find(
                    (team) => team.id === match.awayTeamId
                  );

                  return (
                    <option
                      key={match.id}
                      value={match.id}
                    >
                      {new Date(match.date).toLocaleDateString(
                        "es-ES"
                      )}{" "}
                      — {getTeamName(home)} vs{" "}
                      {getTeamName(away)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {selectedMatch && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Local
                  </span>

                  <span className="mt-1 block font-semibold text-slate-800">
                    {getTeamName(homeTeam)}
                  </span>
                </div>

                <div>
                  <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Visitante
                  </span>

                  <span className="mt-1 block font-semibold text-slate-800">
                    {getTeamName(awayTeam)}
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
      )}

      {/* IMAGEN */}

      <div className="mb-5 rounded-xl border border-slate-200 p-3 sm:mb-6 sm:p-5">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-700">
          Imagen de alineaciones
        </h3>

        <p className="mb-4 text-sm leading-6 text-slate-500">
          Sube una captura donde aparezcan las alineaciones
          y las sustituciones.
        </p>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleImageChange}
          disabled={analyzing || saving}
          className="block w-full min-w-0 cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-2 file:border-0 file:bg-slate-100 file:px-3 file:py-2.5 file:font-semibold sm:file:mr-4 sm:file:px-4"
        />

        {imagePreview && (
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Vista previa
            </p>

            <div className="max-h-[600px] w-full overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-3">
              <img
                src={imagePreview}
                alt="Vista previa de la alineación"
                className="mx-auto max-h-[560px] max-w-full rounded-md object-contain"
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleAnalyzeImage}
            disabled={
              analyzing ||
              saving ||
              !seasonId ||
              !competitionId ||
              !stageId ||
              !matchId ||
              !selectedMatch ||
              !imageDataUrl
            }
            className="w-full rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {analyzing
              ? "Analizando imagen..."
              : "Analizar imagen"}
          </button>
        </div>
      </div>

      {/* REVISIÓN */}

      {detectedPlayers.length > 0 && (
        <div className="mb-5 sm:mb-6">
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4">
            <p className="text-sm font-semibold text-amber-800">
              Revisión antes de guardar
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-700">
              La plantilla completa de ambos equipos aparece
              en la revisión. Los jugadores que no hayan sido
              reconocidos quedan como{" "}
              <strong>No participó</strong>. Comprueba
              titulares, suplentes, posiciones, dorsales,
              minutos de entrada y salida y capitán.
              La IA también intentará detectar el capitán
              cuando aparezca la marca <strong>(c)</strong>
              antes de su nombre.
            </p>
          </div>

          <div className="space-y-5 sm:space-y-6">
            {homeTeam &&
              renderTeamTable(
                homeTeam.id,
                getTeamName(homeTeam)
              )}

            {awayTeam &&
              renderTeamTable(
                awayTeam.id,
                getTeamName(awayTeam)
              )}
          </div>
        </div>
      )}

      {detectedPlayers.length > 0 && (
        <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 sm:mb-6 sm:p-4">
          <strong className="font-semibold text-slate-700">
            Importante:
          </strong>{" "}
          los jugadores marcados como{" "}
          <strong>No participó</strong> se muestran para
          completar la revisión, pero no se guardan como
          participaciones. Solo se guardan los jugadores
          con minutos jugados.
        </div>
      )}

      {/* BOTONES */}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
        >
          Volver
        </button>

        {detectedPlayers.length > 0 && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || analyzing}
            className="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving
              ? "Guardando..."
              : "Guardar participaciones"}
          </button>
        )}
      </div>
    </div>
  );
}