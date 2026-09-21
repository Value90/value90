
"use client";

import { useEffect, useMemo, useState } from "react";

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
  getMatchesBySeasonCompetition,
  type Match,
} from "@/services/match.service";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import ParticipationImageImportForm from "@/components/participations/ParticipationImageImportForm";

import {
  getPlayers,
  type Player,
} from "@/services/player.service";

import {
  getParticipationsByMatchId,
  type Participation,
} from "@/services/participation.service";

import {
  addMatchRating,
  updateMatchRating,
  getMatchRatingsByMatchId,
  type MatchRating,
} from "@/services/match-rating.service";

/* ============================================================
   TIPOS
   ============================================================ */

type RatingSource =
  | "marca"
  | "as"
  | "sofascore"
  | "flashscore";

interface UploadedImage {
  file: File;
  previewUrl: string;
}

type SourceImages = Partial<
  Record<RatingSource, UploadedImage[]>
>;

interface AnalysisPlayer {
  playerId?: number | null;
  participationId?: number | null;
  matchRatingId?: number | null;
  playerName: string;
  team: "home" | "away" | "unknown";
  shirtNumber: number | null;
  marca: number | null;
  as: number | null;
  sofascore: number | null;
  flashscore: number | null;
  observations: string;
  isCaptain?: boolean;
}

interface RatingConfig {
  min: number;
  max: number;
  step: number;
  decimals: number;
}

const RATING_CONFIG: Record<
  RatingSource,
  RatingConfig
> = {
  marca: {
    min: 0,
    max: 3,
    step: 1,
    decimals: 0,
  },
  as: {
    min: 0,
    max: 4,
    step: 1,
    decimals: 0,
  },
  sofascore: {
    min: 0,
    max: 10,
    step: 0.1,
    decimals: 1,
  },
  flashscore: {
    min: 0,
    max: 10,
    step: 0.1,
    decimals: 1,
  },
};

const SOURCE_CONFIG: Array<{
  key: RatingSource;
  label: string;
  description: string;
  maxImages: number;
}> = [
  {
    key: "marca",
    label: "Marca",
    description:
      "Una captura. Valoraciones con estrellas de 0 a 3.",
    maxImages: 1,
  },
  {
    key: "as",
    label: "AS",
    description:
      "Hasta dos capturas. Valoraciones con picas de 0 a 4.",
    maxImages: 2,
  },
  {
    key: "sofascore",
    label: "SofaScore",
    description:
      "Hasta dos capturas para mejorar la lectura.",
    maxImages: 2,
  },
  {
    key: "flashscore",
    label: "FlashScore",
    description:
      "Una captura. Valoraciones de 0 a 10.",
    maxImages: 1,
  },
];

/* ============================================================
   UTILIDADES
   ============================================================ */

function sanitizeRatingValue(
  source: RatingSource,
  rawValue: string
): number | null {
  if (rawValue.trim() === "") {
    return null;
  }

  const config = RATING_CONFIG[source];

  const parsed = Number(rawValue.replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const clamped = Math.min(
    config.max,
    Math.max(config.min, parsed)
  );

  const factor = 10 ** config.decimals;

  return Math.round(clamped * factor) / factor;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(
          new Error("No se pudo leer una de las imágenes.")
        );
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(
        new Error("No se pudo leer una de las imágenes.")
      );
    };

    reader.readAsDataURL(file);
  });
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */

export default function MatchDataPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [selectedSeasonId, setSelectedSeasonId] =
    useState("");

  const [selectedCompetitionId, setSelectedCompetitionId] =
    useState("");

  const [selectedStageId, setSelectedStageId] =
    useState("");

  const [selectedMatchId, setSelectedMatchId] =
    useState("");

  // Cada fuente puede tener una o varias imágenes.
  const [images, setImages] = useState<SourceImages>({});

  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);

  const [analysisPlayers, setAnalysisPlayers] =
    useState<AnalysisPlayer[]>([]);

  const [analysisSources, setAnalysisSources] =
    useState<RatingSource[]>([]);

  const [participationsSaved, setParticipationsSaved] =
    useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [existingRatings, setExistingRatings] =
    useState<MatchRating[]>([]);

  const [savingRatings, setSavingRatings] = useState(false);

  const [savedTeams, setSavedTeams] = useState({
    home: false,
    away: false,
  });

  /* ============================================================
     CARGA INICIAL
     ============================================================ */

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);

        const [
          seasonsData,
          competitionsData,
          stagesData,
          teamsData,
        ] = await Promise.all([
          getSeasons(),
          getCompetitions(),
          getStages(),
          getTeams(),
        ]);

        setSeasons(seasonsData);
        setCompetitions(competitionsData);
        setStages(stagesData);
        setTeams(teamsData);
      } catch (err) {
        console.error(
          "Error cargando datos del partido:",
          err
        );

        setError(
          "No se han podido cargar los datos iniciales."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInitialData();
  }, []);

  /* ============================================================
     FILTROS Y PARTIDOS
     ============================================================ */

  const activeSeasons = useMemo(() => {
    return seasons
      .filter((season) => season.active === true)
      .slice()
      .sort((a, b) =>
        b.name.localeCompare(a.name, "es", {
          numeric: true,
          sensitivity: "base",
        })
      );
  }, [seasons]);

  const filteredStages = useMemo(() => {
    if (!selectedSeasonId) {
      return [];
    }

    const getStageNumber = (stage: Stage) => {
      const match = stage.name.match(/\d+/);
      return match ? Number(match[0]) : null;
    };

    return stages
      .filter(
        (stage) =>
          stage.seasonId === Number(selectedSeasonId) &&
          stage.active === true
      )
      .slice()
      .sort((a, b) => {
        const numberA = getStageNumber(a);
        const numberB = getStageNumber(b);

        if (
          numberA !== null &&
          numberB !== null &&
          numberA !== numberB
        ) {
          return numberB - numberA;
        }

        if (a.displayOrder !== b.displayOrder) {
          return b.displayOrder - a.displayOrder;
        }

        return b.name.localeCompare(a.name, "es", {
          numeric: true,
          sensitivity: "base",
        });
      });
  }, [stages, selectedSeasonId]);

  const filteredCompetitions = useMemo(() => {
    if (!selectedSeasonId) {
      return [];
    }

    // Se conserva el comportamiento de tu servicio:
    // si Competition no dispone de seasonId, se muestran
    // todas las competiciones disponibles.
    return competitions;
  }, [competitions, selectedSeasonId]);

  useEffect(() => {
    async function loadMatches() {
      if (
        !selectedSeasonId ||
        !selectedCompetitionId
      ) {
        setMatches([]);
        setSelectedMatchId("");
        return;
      }

      try {
        setLoadingMatches(true);
        setError(null);

        const matchesData =
          await getMatchesBySeasonCompetition(
            Number(selectedSeasonId),
            Number(selectedCompetitionId)
          );

        setMatches(matchesData);
        setSelectedMatchId("");
        setSelectedStageId("");
      } catch (err) {
        console.error(
          "Error cargando partidos:",
          err
        );

        setError(
          "No se han podido cargar los partidos."
        );

        setMatches([]);
      } finally {
        setLoadingMatches(false);
      }
    }

    void loadMatches();
  }, [
    selectedSeasonId,
    selectedCompetitionId,
  ]);

  const filteredMatches = useMemo(() => {
    if (!selectedStageId) {
      return matches;
    }

    return matches.filter(
      (match) =>
        match.stageId === Number(selectedStageId)
    );
  }, [matches, selectedStageId]);

  const selectedMatch = useMemo(() => {
    return matches.find(
      (match) =>
        match.id === Number(selectedMatchId)
    );
  }, [matches, selectedMatchId]);

  const selectedHomeTeam = useMemo(() => {
    if (!selectedMatch) {
      return null;
    }

    return teams.find(
      (team) =>
        team.id === selectedMatch.homeTeamId
    );
  }, [selectedMatch, teams]);

  const selectedAwayTeam = useMemo(() => {
    if (!selectedMatch) {
      return null;
    }

    return teams.find(
      (team) =>
        team.id === selectedMatch.awayTeamId
    );
  }, [selectedMatch, teams]);

  /* ============================================================
     CARGAR PARTICIPACIONES Y VALORACIONES EXISTENTES
     ============================================================ */

  useEffect(() => {
    async function loadMatchPeople() {
      if (!selectedMatchId) {
        setParticipations([]);
        setExistingRatings([]);
        setParticipationsSaved(false);
    setSavedTeams({ home: false, away: false });
        return;
      }

      try {
        const [
          playersData,
          participationsData,
          ratingsData,
        ] = await Promise.all([
          getPlayers(),
          getParticipationsByMatchId(
            Number(selectedMatchId)
          ),
          getMatchRatingsByMatchId(
            Number(selectedMatchId)
          ),
        ]);

        setPlayers(playersData);
        setParticipations(participationsData);
        setExistingRatings(ratingsData);

        const hasSavedParticipations =
          participationsData.length > 0;

        setParticipationsSaved(hasSavedParticipations);

        setMessage(
          hasSavedParticipations
            ? "Este partido ya tiene participaciones guardadas. Puedes continuar con las valoraciones."
            : null
        );
      } catch (err) {
        console.error(
          "Error cargando los datos del partido:",
          err
        );

        setError(
          "No se han podido cargar las participaciones y valoraciones existentes."
        );
      }
    }

    void loadMatchPeople();
  }, [selectedMatchId]);

  /* ============================================================
     VINCULACIÓN DE JUGADORES
     ============================================================ */

  function resolvePlayer(
    player: AnalysisPlayer
  ): Player | undefined {
    if (Number.isInteger(player.playerId)) {
      const byId = players.find(
        (candidate) =>
          candidate.id === player.playerId
      );

      if (byId) {
        return byId;
      }
    }

    const normalized = normalizeName(player.playerName);

    if (!normalized) {
      return undefined;
    }

    const exact = players.filter((candidate) =>
      [candidate.name, candidate.shortName].some(
        (name) =>
          normalizeName(name) === normalized
      )
    );

    if (exact.length === 1) {
      return exact[0];
    }

    const words = normalized
      .split(" ")
      .filter((word) => word.length >= 3);

    const candidates = players
      .map((candidate) => {
        const names = [
          candidate.name,
          candidate.shortName,
        ].map(normalizeName);

        const score = Math.max(
          ...names.map((name) =>
            words.filter((word) =>
              name.split(" ").includes(word)
            ).length
          )
        );

        return { candidate, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 1) {
      return candidates[0].candidate;
    }

    if (
      candidates.length > 1 &&
      candidates[0].score > candidates[1].score
    ) {
      return candidates[0].candidate;
    }

    return undefined;
  }

  function getLinkedParticipation(
    player: AnalysisPlayer
  ): Participation | undefined {
    const resolved = resolvePlayer(player);

    if (!resolved) {
      return undefined;
    }

    const expectedTeamId =
      player.team === "home"
        ? selectedMatch?.homeTeamId
        : player.team === "away"
          ? selectedMatch?.awayTeamId
          : undefined;

    // Primero buscamos una participación que coincida
    // con el jugador y el equipo identificado.
    const teamMatches = participations.filter(
      (item) =>
        item.playerId === resolved.id &&
        (
          expectedTeamId === undefined ||
          item.teamId === expectedTeamId
        )
    );

    if (teamMatches.length === 1) {
      return teamMatches[0];
    }

    if (teamMatches.length > 1) {
      // Si hay más de una coincidencia, intentamos
      // usar el dorsal reconocido por la imagen.
      const byShirtNumber = teamMatches.find(
        (item) =>
          player.shirtNumber !== null &&
          item.shirtNumber === player.shirtNumber
      );

      return byShirtNumber;
    }

    return undefined;
  }

  function updateAnalysisPlayer(
    index: number,
    changes: Partial<AnalysisPlayer>
  ) {
    setAnalysisPlayers((current) =>
      current.map((player, playerIndex) =>
        playerIndex === index
          ? { ...player, ...changes }
          : player
      )
    );
  }

  /* ============================================================
     IMÁGENES
     ============================================================ */

  function handleImageChange(
    source: RatingSource,
    file: File | undefined
  ) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Solo se pueden cargar archivos de imagen."
      );
      return;
    }

    const sourceConfig = SOURCE_CONFIG.find(
      (item) => item.key === source
    );

    if (!sourceConfig) {
      return;
    }

    const currentImages = images[source] ?? [];

    if (
      currentImages.length >= sourceConfig.maxImages
    ) {
      setError(
        `${sourceConfig.label} admite un máximo de ${sourceConfig.maxImages} imagen(es).`
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setImages((current) => ({
      ...current,
      [source]: [
        ...(current[source] ?? []),
        {
          file,
          previewUrl,
        },
      ],
    }));

    setError(null);
    setMessage(null);
  }

  function handleRemoveImage(
    source: RatingSource,
    imageIndex: number
  ) {
    const sourceImages = images[source] ?? [];
    const imageToRemove = sourceImages[imageIndex];

    if (imageToRemove) {
      URL.revokeObjectURL(
        imageToRemove.previewUrl
      );
    }

    setImages((current) => {
      const next = { ...current };

      const remaining = (
        next[source] ?? []
      ).filter(
        (_, index) => index !== imageIndex
      );

      if (remaining.length > 0) {
        next[source] = remaining;
      } else {
        delete next[source];
      }

      return next;
    });

    setMessage(null);
  }

  const uploadedImagesCount = Object.values(
    images
  ).reduce(
    (total, sourceImages) =>
      total + (sourceImages?.length ?? 0),
    0
  );

  const totalAllowedImages = SOURCE_CONFIG.reduce(
    (total, source) =>
      total + source.maxImages,
    0
  );

  /* ============================================================
     ANÁLISIS DE IMÁGENES
     ============================================================ */

  async function handlePrepareAnalysis() {
    if (!selectedMatchId || !selectedMatch) {
      setError(
        "Selecciona primero el partido que quieres analizar."
      );
      return;
    }

    if (uploadedImagesCount === 0) {
      setError(
        "Carga al menos una captura de valoraciones."
      );
      return;
    }

    setError(null);
    setMessage(null);
    setAnalysisPlayers([]);
    setAnalysisSources([]);
    setAnalyzing(true);

    try {
      // Se envían todas las imágenes. Cada una conserva
      // su fuente para que el endpoint pueda agruparlas.
      const imagePayload = (
        await Promise.all(
          SOURCE_CONFIG.flatMap((source) => {
            const sourceImages =
              images[source.key] ?? [];

            return sourceImages.map(async (image) => ({
              source: source.key,
              image: await fileToDataUrl(image.file),
            }));
          })
        )
      );

      const ratingRoster = participations
        .map((participation) => {
          const rosterPlayer = players.find(
            (player) =>
              player.id === participation.playerId
          );

          if (!rosterPlayer) {
            return null;
          }

          const teamSide =
            participation.teamId ===
            selectedMatch.homeTeamId
              ? "home"
              : participation.teamId ===
                  selectedMatch.awayTeamId
                ? "away"
                : null;

          if (!teamSide) {
            return null;
          }

          return {
            playerId: rosterPlayer.id,
            participationId: participation.id,
            playerName: rosterPlayer.name,
            shortName: rosterPlayer.shortName,
            teamId: participation.teamId,
            teamSide,
            shirtNumber: participation.shirtNumber,
          };
        })
        .filter(
          (
            item
          ): item is NonNullable<typeof item> =>
            item !== null
        );

      const response = await fetch(
        "/api/match-data/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            match: {
              homeTeam:
                selectedHomeTeam?.name ??
                `Equipo ${selectedMatch.homeTeamId}`,
              awayTeam:
                selectedAwayTeam?.name ??
                `Equipo ${selectedMatch.awayTeamId}`,
              date: selectedMatch.date ?? null,
            },
            images: imagePayload,
            roster: ratingRoster,
            instructions: {
              marca: [
                "En Marca, las valoraciones se representan con estrellas.",
                "Identifica cuántas estrellas tiene cada jugador y conviértelas a la escala numérica de Marca: 0, 1, 2 o 3.",
                "No confundas las estrellas con el dorsal ni con otros iconos de la página.",
                "Si la imagen no permite distinguir con seguridad las estrellas, devuelve null y explica la duda en observations.",
              ],
              as: [
                "En AS, las valoraciones se representan con picas.",
                "Identifica cuántas picas tiene cada jugador y conviértelas a la escala numérica de AS: 0, 1, 2, 3 o 4.",
                "No confundas las picas con el dorsal ni con otros iconos de la página.",
                "Si la imagen no permite distinguir con seguridad las picas, devuelve null y explica la duda en observations.",
              ],
              general: [
                "Utiliza el nombre y el dorsal del jugador para cruzar la información con roster.",
                "No inventes una valoración cuando el símbolo no sea legible.",
              ],
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "No se han podido analizar las imágenes."
        );
      }

      if (!Array.isArray(data.players)) {
        throw new Error(
          "La respuesta del análisis no tiene un formato válido."
        );
      }

      setAnalysisPlayers(
        data.players as AnalysisPlayer[]
      );

      setAnalysisSources(
        (data.sourcesAnalyzed ??
          []) as RatingSource[]
      );

      setMessage(
        `Análisis completado. Se han procesado ${imagePayload.length} imagen(es).`
      );
    } catch (err) {
      console.error(
        "Error analizando las capturas:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se han podido analizar las imágenes."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  /* ============================================================
     REINICIO DEL FORMULARIO
     ============================================================ */

  function revokeImagePreviewUrls(sourceImages: SourceImages) {
    Object.values(sourceImages).forEach((sourceFiles) => {
      sourceFiles?.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });
    });
  }

  function clearAnalysisImages() {
    revokeImagePreviewUrls(images);
    setImages({});
    setAnalysisPlayers([]);
    setAnalysisSources([]);
  }

  function resetToNewRecord() {
    // Liberamos las URL de previsualización.
    Object.values(images).forEach(
      (sourceImages) => {
        sourceImages?.forEach((image) => {
          URL.revokeObjectURL(image.previewUrl);
        });
      }
    );

    // Limpiamos también los mensajes anteriores.
    setError(null);
    setMessage(null);

    // Se deja únicamente visible el punto 1.
    setSelectedSeasonId("");
    setSelectedCompetitionId("");
    setSelectedStageId("");
    setSelectedMatchId("");

    setMatches([]);
    setImages({});
    setAnalysisPlayers([]);
    setAnalysisSources([]);
    setParticipations([]);
    setExistingRatings([]);
    setParticipationsSaved(false);
    setSavedTeams({ home: false, away: false });
  }

  /* ============================================================
     GUARDAR VALORACIONES
     ============================================================ */

  async function handleSaveRatings(teamSide: "home" | "away") {
    if (!selectedMatchId || !selectedMatch) {
      setError("Selecciona primero un partido.");
      return;
    }

    if (
      !participationsSaved ||
      participations.length === 0
    ) {
      setError(
        "Guarda primero las participaciones del partido."
      );
      return;
    }

    const teamPlayers = analysisPlayers.filter(
      (player) => player.team === teamSide
    );

    if (teamPlayers.length === 0) {
      setError("No hay valoraciones para guardar.");
      return;
    }

    setSavingRatings(true);
    setError(null);
    setMessage(null);

    let saved = 0;
    const failed: string[] = [];

    try {
      // Cada jugador se guarda de forma independiente.
      // Si falla uno, continuamos con los demás.
      for (const player of teamPlayers) {
        try {
          const resolvedPlayer =
            resolvePlayer(player);

          const participation =
            getLinkedParticipation(player);

          if (!resolvedPlayer || !participation) {
            throw new Error(
              `No se ha podido vincular a ${player.playerName}.`
            );
          }

          const payload = {
            matchId: Number(selectedMatchId),
            playerId: resolvedPlayer.id,
            participationId: participation.id,
            marcaRating: player.marca,
            asRating: player.as,
            sofascoreRating: player.sofascore,
            flashscoreRating: player.flashscore,
            externalAverage: null,
            value90MatchRating: null,
            finalMatchRating: null,
            confidence: null,
            calculationVersion: null,
            calculatedAt: null,
          };

          const existing = existingRatings.find(
            (rating) =>
              rating.playerId === resolvedPlayer.id ||
              rating.participationId === participation.id
          );

          if (existing) {
            await updateMatchRating(
              existing.id,
              payload
            );
          } else {
            await addMatchRating(payload);
          }

          saved += 1;
        } catch (playerError) {
          console.error(
            `Error guardando a ${player.playerName}:`,
            playerError
          );

          failed.push(
            player.playerName || "Jugador desconocido"
          );
        }
      }

      if (saved === 0) {
        setError(
          "No se ha podido guardar ninguna valoración. Revisa los jugadores sin vincular."
        );
        return;
      }

      if (failed.length > 0) {
        setMessage(
          `Se han guardado ${saved} valoración(es) del equipo ` +
            `${teamSide === "home" ? "local" : "visitante"}. ` +
            `No se pudieron guardar ${failed.length}: ` +
            `${failed.join(", ")}.`
        );
      } else {
        setMessage(
          `Se han guardado ${saved} valoración(es) del equipo ` +
            `${teamSide === "home" ? "local" : "visitante"} correctamente.`
        );
      }

      // Marcamos el equipo como guardado.
      setSavedTeams((current) => ({
        ...current,
        [teamSide]: true,
      }));

      // Cuando se guarda correctamente el equipo visitante,
      // reiniciamos el formulario y dejamos visible únicamente
      // el punto 1: Seleccionar partido.
      if (teamSide === "away") {
        resetToNewRecord();
      }
    } catch (err) {
      console.error(
        "Error general guardando valoraciones:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se han podido guardar las valoraciones."
      );
    } finally {
      setSavingRatings(false);
    }
  }

  /* ============================================================
     CARGANDO
     ============================================================ */

  if (loading) {
    return (
      <div className="w-full min-w-0 p-3 sm:p-5 md:p-8">
        <p className="text-sm text-slate-600">
          Cargando datos del partido...
        </p>
      </div>
    );
  }

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="w-full min-w-0 space-y-6 p-3 sm:p-5 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
          Datos del partido
        </h1>

        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Selecciona un partido y carga las capturas
          de las valoraciones de las distintas fuentes.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {message}
        </div>
      )}

      {/* ========================================================
          1. SELECCIONAR PARTIDO
          ======================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-800">
            1. Seleccionar partido
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Elige la temporada, competición, jornada y partido.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="match-data-season"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Temporada
            </label>

            <select
              id="match-data-season"
              value={selectedSeasonId}
              onChange={(event) => {
                setSelectedSeasonId(event.target.value);
                setSelectedCompetitionId("");
                setSelectedStageId("");
                setSelectedMatchId("");
                setMatches([]);
                setError(null);
                setMessage(null);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            >
              <option value="">
                Seleccionar temporada
              </option>

              {activeSeasons.map((season) => (
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
            <label
              htmlFor="match-data-competition"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Competición
            </label>

            <select
              id="match-data-competition"
              value={selectedCompetitionId}
              onChange={(event) => {
                setSelectedCompetitionId(event.target.value);
                setSelectedStageId("");
                setSelectedMatchId("");
                setError(null);
                setMessage(null);
              }}
              disabled={!selectedSeasonId}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            >
              <option value="">
                Seleccionar competición
              </option>

              {filteredCompetitions.map((competition) => (
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
            <label
              htmlFor="match-data-stage"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Jornada / fase
            </label>

            <select
              id="match-data-stage"
              value={selectedStageId}
              onChange={(event) => {
                setSelectedStageId(event.target.value);
                setSelectedMatchId("");
              }}
              disabled={!selectedCompetitionId}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            >
              <option value="">
                Todas las jornadas
              </option>

              {filteredStages.map((stage) => (
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
            <label
              htmlFor="match-data-match"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Partido
            </label>

            <select
              id="match-data-match"
              value={selectedMatchId}
              onChange={(event) => {
                setSelectedMatchId(event.target.value);
                setParticipationsSaved(false);
    setSavedTeams({ home: false, away: false });
                setAnalysisPlayers([]);
                setAnalysisSources([]);
                setImages({});
                setMessage(null);
                setError(null);
              }}
              disabled={
                !selectedCompetitionId ||
                loadingMatches
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            >
              <option value="">
                {loadingMatches
                  ? "Cargando partidos..."
                  : "Seleccionar partido"}
              </option>

              {filteredMatches.map((match) => {
                const homeTeam = teams.find(
                  (team) =>
                    team.id === match.homeTeamId
                );

                const awayTeam = teams.find(
                  (team) =>
                    team.id === match.awayTeamId
                );

                return (
                  <option
                    key={match.id}
                    value={match.id}
                  >
                    {homeTeam?.name ??
                      `Equipo ${match.homeTeamId}`}{" "}
                    -{" "}
                    {awayTeam?.name ??
                      `Equipo ${match.awayTeamId}`}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {selectedMatch && (
          <div className="mt-5 rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              {selectedHomeTeam?.name ??
                `Equipo ${selectedMatch.homeTeamId}`}{" "}
              <span className="font-normal text-slate-500">
                vs.
              </span>{" "}
              {selectedAwayTeam?.name ??
                `Equipo ${selectedMatch.awayTeamId}`}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {selectedMatch.date
                ? new Date(
                    selectedMatch.date
                  ).toLocaleDateString("es-ES")
                : "Fecha no disponible"}
            </p>
          </div>
        )}

        {selectedMatchId && participationsSaved && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            ✓ Este partido ya tiene participaciones guardadas.
            Puedes continuar con las valoraciones.
          </div>
        )}
      </section>

      {/* ========================================================
          2. REGISTRAR PARTICIPACIONES
          ======================================================== */}

      {selectedMatchId && !participationsSaved && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">
              2. Registrar participaciones
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Sube la imagen de las alineaciones y guarda
              las participaciones. Después podrás introducir
              las valoraciones.
            </p>
          </div>

          <ParticipationImageImportForm
            fixedMatchId={Number(selectedMatchId)}
            hideMatchSelector
            onCancel={() => undefined}
            onSaved={async () => {
              try {
                const [
                  refreshedParticipations,
                  refreshedRatings,
                ] = await Promise.all([
                  getParticipationsByMatchId(
                    Number(selectedMatchId)
                  ),
                  getMatchRatingsByMatchId(
                    Number(selectedMatchId)
                  ),
                ]);

                setParticipations(
                  refreshedParticipations
                );

                setExistingRatings(refreshedRatings);

                setParticipationsSaved(
                  refreshedParticipations.length > 0
                );

                setMessage(
                  "Participaciones guardadas correctamente. Ya puedes introducir las valoraciones."
                );
              } catch (refreshError) {
                console.error(
                  "Error actualizando los datos después de guardar participaciones:",
                  refreshError
                );

                setParticipationsSaved(true);

                setMessage(
                  "Participaciones guardadas. Vuelve a seleccionar el partido si no aparecen los vínculos de las valoraciones."
                );
              }
            }}
          />
        </section>
      )}

      {/* ========================================================
          3. CARGAR CAPTURAS
          ======================================================== */}

      {participationsSaved &&
        analysisPlayers.length === 0 && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    3. Cargar capturas de valoraciones
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    AS y SofaScore admiten dos capturas
                    complementarias para mejorar la lectura.
                  </p>
                </div>

                <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {uploadedImagesCount} / {totalAllowedImages} cargadas
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {SOURCE_CONFIG.map((source) => {
                  const sourceImages =
                    images[source.key] ?? [];

                  const canAddMore =
                    sourceImages.length <
                    source.maxImages;

                  return (
                    <div
                      key={source.key}
                      className="rounded-xl border border-dashed border-slate-300 p-4"
                    >
                      <div className="mb-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-slate-800">
                            {source.label}
                          </h3>

                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            {sourceImages.length}/
                            {source.maxImages}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {source.description}
                        </p>
                      </div>

                      {sourceImages.length > 0 && (
                        <div className="grid grid-cols-1 gap-3">
                          {sourceImages.map(
                            (image, imageIndex) => (
                              <div
                                key={`${source.key}-${imageIndex}`}
                                className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                              >
                                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                                  <span className="text-xs font-medium text-slate-600">
                                    Captura {imageIndex + 1}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveImage(
                                        source.key,
                                        imageIndex
                                      )
                                    }
                                    className="text-xs font-medium text-red-600 hover:text-red-800"
                                  >
                                    Eliminar
                                  </button>
                                </div>

                                <img
                                  src={image.previewUrl}
                                  alt={`${source.label}, captura ${imageIndex + 1}`}
                                  className="max-h-80 w-full object-contain"
                                />
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {canAddMore && (
                        <label className="mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg bg-slate-50 px-4 py-5 text-center transition hover:bg-slate-100">
                          <span className="text-2xl">
                            📷
                          </span>

                          <span className="mt-2 text-sm font-semibold text-slate-700">
                            {sourceImages.length === 0
                              ? "Seleccionar captura"
                              : "Añadir otra captura"}
                          </span>

                          <span className="mt-1 text-xs text-slate-500">
                            PNG, JPG o WEBP
                          </span>

                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) => {
                              handleImageChange(
                                source.key,
                                event.target.files?.[0]
                              );

                              event.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ==================================================
                4. ANALIZAR VALORACIONES
                ================================================== */}

            <section className="flex flex-col items-stretch justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-6">
              <div>
                <h2 className="font-semibold text-slate-800">
                  4. Analizar valoraciones
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Analiza las capturas cargadas para reconocer
                  las valoraciones de los jugadores.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrepareAnalysis}
                disabled={
                  analyzing || uploadedImagesCount === 0
                }
                className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analyzing
                  ? "Analizando imágenes..."
                  : "Preparar análisis"}
              </button>
            </section>
          </>
        )}

      {/* ========================================================
          5. REVISAR Y GUARDAR VALORACIONES
          ======================================================== */}

      {analysisPlayers.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                5. Revisar y guardar valoraciones
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Revisa las notas detectadas antes de
                incorporarlas a la base de datos.
              </p>
            </div>

            <span className="text-sm text-slate-500">
              {analysisPlayers.length} jugador(es)
            </span>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {analysisSources.map((source) => (
              <span
                key={source}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {SOURCE_CONFIG.find(
                  (item) => item.key === source
                )?.label ?? source}
              </span>
            ))}
          </div>

          {(
            ["home", "away", "unknown"] as const
          ).map((teamSide) => {
            const entries = analysisPlayers
              .map((player, index) => ({
                player,
                index,
              }))
              .filter(
                ({ player }) =>
                  player.team === teamSide
              )
              .sort((a, b) => {
                // Orden principal: posición numérica ascendente (1, 2, 3, 4...).
                // Si dos jugadores tienen la misma posición, se ordenan
                // alfabéticamente por nombre.
                const getPosition = (entry: (typeof a)) => {
                  const participation = getLinkedParticipation(entry.player);
                  const participationWithPosition = participation as
                    | (Participation & {
                        position?: number | null;
                        positionId?: number | null;
                      })
                    | null;

                  return (
                    participationWithPosition?.position ??
                    participationWithPosition?.positionId ??
                    null
                  );
                };

                const positionA = getPosition(a);
                const positionB = getPosition(b);

                if (positionA !== null && positionB !== null) {
                  if (positionA !== positionB) {
                    return positionA - positionB;
                  }
                } else if (positionA !== null) {
                  return -1;
                } else if (positionB !== null) {
                  return 1;
                }

                return a.player.playerName.localeCompare(
                  b.player.playerName,
                  "es",
                  { sensitivity: "base" }
                );
              });

            if (entries.length === 0) {
              return null;
            }

            const title =
              teamSide === "home"
                ? selectedHomeTeam?.name ??
                  "Equipo local"
                : teamSide === "away"
                  ? selectedAwayTeam?.name ??
                    "Equipo visitante"
                  : "Jugadores sin equipo identificado";

            return (
              <section
                key={teamSide}
                className="mb-5 overflow-hidden rounded-xl border border-slate-200"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-4">
                  <h3 className="font-semibold text-slate-800">
                    {title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {entries.length} jugador(es)
                  </p>
                </div>

                <div className="w-full overflow-x-auto overscroll-x-contain">
                  <table className="w-full min-w-[920px] table-auto divide-y divide-slate-200 text-sm">
                    <thead className="bg-white">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-3 text-left font-semibold text-slate-700">
                          Dorsal · Jugador
                        </th>

                        <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-slate-700">
                          Marca
                        </th>

                        <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-slate-700">
                          AS
                        </th>

                        <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-slate-700">
                          SofaScore
                        </th>

                        <th className="whitespace-nowrap px-3 py-3 text-center font-semibold text-slate-700">
                          FlashScore
                        </th>

                        <th className="min-w-56 px-3 py-3 text-left font-semibold text-slate-700">
                          Observaciones
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                      {entries.map(({ player, index }) => {
                        const resolved =
                          resolvePlayer(player);

                        const participation =
                          getLinkedParticipation(player);

                        const linked =
                          Boolean(
                            resolved && participation
                          );

                        return (
                          <tr
                            key={`${player.playerName}-${index}`}
                          >
                            <td className="px-3 py-3 font-medium text-slate-800">
                              <div className="flex flex-wrap items-center gap-2 whitespace-normal">
                                {player.shirtNumber !== null && (
                                  <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                                    #{player.shirtNumber}
                                  </span>
                                )}

                                <span className="font-semibold text-slate-800">
                                  {player.playerName || "Jugador sin nombre"}
                                </span>

                                {player.isCaptain === true && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                    C
                                  </span>
                                )}
                              </div>

                              <div
                                className={`mt-1 text-xs ${
                                  linked
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {linked
                                  ? `Vinculado · Participación #${participation!.id}`
                                  : "Sin vincular: revisa el nombre o la participación"}
                              </div>
                            </td>

                            {(
                              [
                                "marca",
                                "as",
                                "sofascore",
                                "flashscore",
                              ] as const
                            ).map((source) => (
                              <td
                                key={source}
                                className="px-2 py-2 text-center"
                              >
                                <input
                                  type="number"
                                  min={
                                    RATING_CONFIG[source].min
                                  }
                                  max={
                                    RATING_CONFIG[source].max
                                  }
                                  step={
                                    RATING_CONFIG[source].step
                                  }
                                  inputMode={
                                    source === "marca" ||
                                    source === "as"
                                      ? "numeric"
                                      : "decimal"
                                  }
                                  value={player[source] ?? ""}
                                  onChange={(event) =>
                                    updateAnalysisPlayer(
                                      index,
                                      {
                                        [source]:
                                          sanitizeRatingValue(
                                            source,
                                            event.target.value
                                          ),
                                      }
                                    )
                                  }
                                  className="w-[4.75rem] rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 sm:w-20"
                                  aria-label={`${SOURCE_CONFIG.find((item) => item.key === source)?.label ?? source} de ${player.playerName}`}
                                />
                              </td>
                            ))}

                            <td className="min-w-56 whitespace-normal px-3 py-3 text-slate-500">
                              {player.observations || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {teamSide !== "unknown" && (
                  <div className="border-t border-slate-200 bg-slate-50 p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-slate-600">
                        Estado del guardado
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          savedTeams[teamSide]
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {savedTeams[teamSide] ? "Guardado" : "Pendiente"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveRatings(teamSide)}
                      disabled={savingRatings}
                      className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingRatings
                        ? "Guardando..."
                        : `Guardar ${teamSide === "home" ? "equipo local" : "equipo visitante"}`}
                    </button>
                  </div>
                )}
              </section>
            );
          })}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setAnalysisPlayers([]);
                setAnalysisSources([]);
                setError(null);
                setSavedTeams({ home: false, away: false });
              }}
              disabled={savingRatings}
              className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Volver a cargar capturas
            </button>
          </div>

          <p className="mt-3 text-xs leading-5 text-amber-700">
            Marca y AS admiten únicamente enteros.
            SofaScore y FlashScore admiten un decimal.
            Si un jugador no se puede vincular, el resto
            de las valoraciones se guardará igualmente.
          </p>
        </section>
      )}
    </div>
  );
}