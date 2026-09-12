"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addPlayerMatchStat,
  getPlayerMatchStats,
  getPlayerMatchStatsByParticipation,
  updatePlayerMatchStat,
  type PlayerMatchStat,
} from "@/services/player-match-stat.service";

import { getMatches } from "@/services/match.service";
import { getPlayers } from "@/services/player.service";
import { getCompetitions } from "@/services/competition.service";
import { getSeasons } from "@/services/season.service";
import { getStages } from "@/services/stage.service";
import { getParticipations } from "@/services/participation.service";

import { useTeams } from "@/hooks/useTeams";

interface PlayerMatchStatFormProps {
  playerMatchStat?: PlayerMatchStat;
  onCancel: () => void;
  onSaved: () => void;
}

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

type StatValue = number | "";

type StatField =
  | "goals"
  | "shots"
  | "shotsOnTarget"
  | "dribbles"
  | "dribblesCompleted"
  | "assists"
  | "duels"
  | "duelsWon"
  | "clearances"
  | "saves"
  | "tackles"
  | "recoveries"
  | "passes"
  | "passesCompleted"
  | "errorsLeadingToGoal"
  | "yellowCards"
  | "redCards";

interface OrderedParticipation {
  participation: Awaited<
    ReturnType<typeof getParticipations>
  >[number];

  player:
    | Awaited<
        ReturnType<typeof getPlayers>
      >[number]
    | undefined;

  positionId: number;
}

/*
 * ============================================================
 * CAMPOS ESTADÍSTICOS
 * ============================================================
 */

const STAT_FIELDS: StatField[] = [
  "goals",
  "shots",
  "shotsOnTarget",
  "dribbles",
  "dribblesCompleted",
  "assists",
  "duels",
  "duelsWon",
  "tackles",
  "clearances",
  "recoveries",
  "saves",
  "passes",
  "passesCompleted",
  "yellowCards",
  "redCards",
  "errorsLeadingToGoal",
];

/*
 * ============================================================
 * VALORES INICIALES
 * ============================================================
 *
 * Todos los campos parten de 0.
 *
 * Si el usuario borra temporalmente el contenido de un input,
 * el estado puede contener "" mientras está editándolo, pero
 * al guardar se transforma nuevamente en 0.
 * ============================================================
 */

const EMPTY_STAT_VALUES: Record<
  StatField,
  StatValue
> = {
  goals: 0,

  shots: 0,

  shotsOnTarget: 0,

  dribbles: 0,

  dribblesCompleted: 0,

  assists: 0,

  duels: 0,

  duelsWon: 0,

  tackles: 0,

  clearances: 0,

  recoveries: 0,

  saves: 0,

  passes: 0,

  passesCompleted: 0,

  yellowCards: 0,

  redCards: 0,

  errorsLeadingToGoal: 0,
};

/*
 * ============================================================
 * CONFIGURACIÓN VISUAL
 * ============================================================
 */

/*
 * ------------------------------------------------------------
 * OFENSIVAS
 * ------------------------------------------------------------
 */

const OFFENSIVE_FIELDS: {
  field: StatField;
  label: string;
}[] = [
  {
    field: "goals",
    label: "Goles",
  },

  {
    field: "shots",
    label: "Tiros",
  },

  {
    field: "shotsOnTarget",
    label: "Tiros a puerta",
  },

  {
    field: "dribbles",
    label: "Regates",
  },

  {
    field: "dribblesCompleted",
    label: "Regates completados",
  },

  {
    field: "assists",
    label: "Asistencias",
  },
];

/*
 * ------------------------------------------------------------
 * DEFENSIVAS
 * ------------------------------------------------------------
 *
 * IMPORTANTE:
 *
 * "tackles" continúa siendo el nombre técnico del campo
 * almacenado en Supabase.
 *
 * Visualmente se muestra como:
 *
 * "Interceptaciones"
 * ------------------------------------------------------------
 */

const DEFENSIVE_FIELDS: {
  field: StatField;
  label: string;
}[] = [
  {
    field: "duels",
    label: "Duelos",
  },

  {
    field: "duelsWon",
    label: "Duelos ganados",
  },

  {
    field: "tackles",
    label: "Interceptaciones",
  },

  {
    field: "clearances",
    label: "Despejes",
  },

  {
    field: "recoveries",
    label: "Recuperaciones",
  },

  {
    field: "saves",
    label: "Paradas",
  },
];

/*
 * ------------------------------------------------------------
 * DISTRIBUCIÓN
 * ------------------------------------------------------------
 */

const DISTRIBUTION_FIELDS: {
  field: StatField;
  label: string;
}[] = [
  {
    field: "passes",
    label: "Pases",
  },

  {
    field: "passesCompleted",
    label: "Pases completados",
  },

  {
    field: "yellowCards",
    label: "Tarjetas amarillas",
  },

  {
    field: "redCards",
    label: "Tarjetas rojas",
  },

  {
    field: "errorsLeadingToGoal",
    label: "Errores que conllevan gol",
  },
];

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function PlayerMatchStatForm({
  playerMatchStat,
  onCancel,
  onSaved,
}: PlayerMatchStatFormProps) {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [matches, setMatches] =
    useState<
      Awaited<
        ReturnType<typeof getMatches>
      >
    >([]);

  const [players, setPlayers] =
    useState<
      Awaited<
        ReturnType<typeof getPlayers>
      >
    >([]);

  const [competitions, setCompetitions] =
    useState<
      Awaited<
        ReturnType<typeof getCompetitions>
      >
    >([]);

  const [seasons, setSeasons] =
    useState<
      Awaited<
        ReturnType<typeof getSeasons>
      >
    >([]);

  const [stages, setStages] =
    useState<
      Awaited<
        ReturnType<typeof getStages>
      >
    >([]);

  const [participations, setParticipations] =
    useState<
      Awaited<
        ReturnType<typeof getParticipations>
      >
    >([]);

  const { teams } = useTeams();

  /*
   * ============================================================
   * CONTEXTO DEL PARTIDO
   * ============================================================
   */

  const [competitionId, setCompetitionId] =
    useState(0);

  const [seasonId, setSeasonId] =
    useState(0);

  const [stageId, setStageId] =
    useState(0);

  const [matchId, setMatchId] =
    useState(0);

  const [teamId, setTeamId] =
    useState(0);

  /*
   * ============================================================
   * JUGADORES
   * ============================================================
   */

  const [
    orderedParticipations,
    setOrderedParticipations,
  ] = useState<
    OrderedParticipation[]
  >([]);

  const [
    currentPlayerIndex,
    setCurrentPlayerIndex,
  ] = useState(0);

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
   * ESTADÍSTICAS
   * ============================================================
   */

  const [statValues, setStatValues] =
    useState<
      Record<
        StatField,
        StatValue
      >
    >({
      ...EMPTY_STAT_VALUES,
    });

  /*
   * ============================================================
   * ESTADO GENERAL
   * ============================================================
   */

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    playersLoading,
    setPlayersLoading,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const isEditing =
    Boolean(playerMatchStat);

  /*
   * ============================================================
   * CARGAR DATOS GENERALES
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          matchesData,
          playersData,
          competitionsData,
          seasonsData,
          stagesData,
          participationsData,
        ] = await Promise.all([
          getMatches(),
          getPlayers(),
          getCompetitions(),
          getSeasons(),
          getStages(),
          getParticipations(),
        ]);

        if (!mounted) {
          return;
        }

        setMatches(matchesData);

        setPlayers(playersData);

        setCompetitions(
          competitionsData
        );

        setSeasons(
          seasonsData
        );

        setStages(
          stagesData
        );

        setParticipations(
          participationsData
        );
      } catch (loadError) {
        console.error(
          "Error cargando datos de estadísticas:",
          loadError
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
   * CARGAR REGISTRO EN MODO EDICIÓN
   * ============================================================
   */

  useEffect(() => {
    if (
      !playerMatchStat ||
      matches.length === 0 ||
      participations.length === 0
    ) {
      return;
    }

    const participation =
      participations.find(
        (item) =>
          item.id ===
          playerMatchStat.participationId
      );

    if (!participation) {
      return;
    }

    const match =
      matches.find(
        (item) =>
          item.id ===
          participation.matchId
      );

    if (!match) {
      return;
    }

    setCompetitionId(
      match.competitionId
    );

    setSeasonId(
      match.seasonId
    );

    setStageId(
      match.stageId
    );

    setMatchId(
      match.id
    );

    setTeamId(
      participation.teamId
    );

    /*
     * Si en la base de datos existe null,
     * visualmente mostramos 0.
     */

    setStatValues({
      goals:
        playerMatchStat.goals ?? 0,

      shots:
        playerMatchStat.shots ?? 0,

      shotsOnTarget:
        playerMatchStat.shotsOnTarget ??
        0,

      dribbles:
        playerMatchStat.dribbles ?? 0,

      dribblesCompleted:
        playerMatchStat.dribblesCompleted ??
        0,

      assists:
        playerMatchStat.assists ?? 0,

      duels:
        playerMatchStat.duels ?? 0,

      duelsWon:
        playerMatchStat.duelsWon ?? 0,

      tackles:
        playerMatchStat.tackles ?? 0,

      clearances:
        playerMatchStat.clearances ??
        0,

      recoveries:
        playerMatchStat.recoveries ??
        0,

      saves:
        playerMatchStat.saves ?? 0,

      passes:
        playerMatchStat.passes ?? 0,

      passesCompleted:
        playerMatchStat.passesCompleted ??
        0,

      yellowCards:
        playerMatchStat.yellowCards ??
        0,

      redCards:
        playerMatchStat.redCards ?? 0,

      errorsLeadingToGoal:
        playerMatchStat.errorsLeadingToGoal ??
        0,
    });
  }, [
    playerMatchStat,
    matches,
    participations,
  ]);

  /*
   * ============================================================
   * COMPETICIONES
   * ============================================================
   */

  const availableCompetitions =
    useMemo(() => {
      return competitions
        .filter(
          (competition) =>
            competition.active
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "es"
          )
        );
    }, [competitions]);

  /*
   * ============================================================
   * TEMPORADAS
   * ============================================================
   */

  const availableSeasons =
    useMemo(() => {
      if (!competitionId) {
        return [];
      }

      const seasonIds =
        new Set(
          matches
            .filter(
              (match) =>
                match.competitionId ===
                competitionId
            )
            .map(
              (match) =>
                match.seasonId
            )
        );

      return seasons
        .filter(
          (season) =>
            season.active &&
            seasonIds.has(
              season.id
            )
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "es"
          )
        );
    }, [
      seasons,
      matches,
      competitionId,
    ]);

  /*
   * ============================================================
   * FASES / JORNADAS
   * ============================================================
   */

  const availableStages =
    useMemo(() => {
      if (!seasonId) {
        return [];
      }

      return stages
        .filter(
          (stage) =>
            stage.seasonId ===
              seasonId &&
            stage.active
        )
        .sort(
          (a, b) =>
            a.displayOrder -
            b.displayOrder
        );
    }, [
      stages,
      seasonId,
    ]);

  /*
   * ============================================================
   * PARTIDOS
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
              ? new Date(
                  a.date
                ).getTime()
              : 0;

          const dateB =
            b.date
              ? new Date(
                  b.date
                ).getTime()
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

      const teamIds = [
        selectedMatch.homeTeamId,
        selectedMatch.awayTeamId,
      ];

      return teams
        .filter((team) =>
          teamIds.includes(
            team.id
          )
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
   * CARGAR JUGADORES DEL EQUIPO
   * ============================================================
   */

  useEffect(() => {
    if (
      !matchId ||
      !teamId ||
      !seasonId
    ) {
      setOrderedParticipations(
        []
      );

      setCurrentPlayerIndex(0);

      setTotalParticipations(0);

      setCompletedParticipations(
        0
      );

      setStatValues({
        ...EMPTY_STAT_VALUES,
      });

      return;
    }

    let mounted = true;

    async function loadPlayers() {
      try {
        setPlayersLoading(true);
        setError("");

        const teamParticipations =
          participations.filter(
            (participation) =>
              participation.matchId ===
                matchId &&
              participation.teamId ===
                teamId
          );

        const result =
          teamParticipations
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

                return {
                  participation,
                  player,
                  positionId:
                    participation.positionId ??
                    999,
                };
              }
            )
            .filter(
              (item) =>
                Boolean(item.player)
            )
            .sort((a, b) => {
              if (
                a.positionId !==
                b.positionId
              ) {
                return (
                  a.positionId -
                  b.positionId
                );
              }

              return (
                a.player?.name ??
                ""
              ).localeCompare(
                b.player?.name ??
                  "",
                "es"
              );
            });

        if (!mounted) {
          return;
        }

        setOrderedParticipations(
          result
        );

        setTotalParticipations(
          result.length
        );

        /*
         * En edición buscamos
         * directamente al jugador.
         */

        if (playerMatchStat) {
          const index =
            result.findIndex(
              (item) =>
                item.participation.id ===
                playerMatchStat.participationId
            );

          if (index >= 0) {
            setCurrentPlayerIndex(
              index
            );
          }
        } else {
          setCurrentPlayerIndex(
            0
          );
        }

        /*
         * Calcular jugadores
         * que ya tienen estadísticas.
         */

        const existingStats =
          await getPlayerMatchStats();

        if (!mounted) {
          return;
        }

        const existingParticipationIds =
          new Set(
            existingStats
              .filter((item) =>
                teamParticipations.some(
                  (participation) =>
                    participation.id ===
                    item.participationId
                )
              )
              .map(
                (item) =>
                  item.participationId
              )
          );

        setCompletedParticipations(
          existingParticipationIds.size
        );
      } catch (loadError) {
        console.error(
          "Error cargando jugadores del equipo:",
          loadError
        );

        if (mounted) {
          setOrderedParticipations(
            []
          );

          setTotalParticipations(
            0
          );

          setCompletedParticipations(
            0
          );

          setError(
            "No se pudieron cargar los jugadores del equipo."
          );
        }
      } finally {
        if (mounted) {
          setPlayersLoading(
            false
          );
        }
      }
    }

    loadPlayers();

    return () => {
      mounted = false;
    };
  }, [
    matchId,
    teamId,
    seasonId,
    participations,
    players,
    playerMatchStat,
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
    currentParticipation
      ? teams.find(
          (team) =>
            team.id ===
            currentParticipation.teamId
        )
      : undefined;

  /*
   * ============================================================
   * CARGAR ESTADÍSTICAS DEL JUGADOR ACTUAL
   * ============================================================
   */

  useEffect(() => {
    if (
      !currentParticipation ||
      !matchId
    ) {
      return;
    }

    let mounted = true;

    async function loadCurrentStats() {
      try {
        const existingStat =
          await getPlayerMatchStatsByParticipation(
            currentParticipation.id
          );

        if (!mounted) {
          return;
        }

        if (!existingStat) {
          setStatValues({
            ...EMPTY_STAT_VALUES,
          });

          return;
        }

        /*
         * Si Supabase devuelve null,
         * mostramos 0.
         */

        setStatValues({
          goals:
            existingStat.goals ??
            0,

          shots:
            existingStat.shots ??
            0,

          shotsOnTarget:
            existingStat.shotsOnTarget ??
            0,

          dribbles:
            existingStat.dribbles ??
            0,

          dribblesCompleted:
            existingStat.dribblesCompleted ??
            0,

          assists:
            existingStat.assists ??
            0,

          duels:
            existingStat.duels ??
            0,

          duelsWon:
            existingStat.duelsWon ??
            0,

          tackles:
            existingStat.tackles ??
            0,

          clearances:
            existingStat.clearances ??
            0,

          recoveries:
            existingStat.recoveries ??
            0,

          saves:
            existingStat.saves ??
            0,

          passes:
            existingStat.passes ??
            0,

          passesCompleted:
            existingStat.passesCompleted ??
            0,

          yellowCards:
            existingStat.yellowCards ??
            0,

          redCards:
            existingStat.redCards ??
            0,

          errorsLeadingToGoal:
            existingStat.errorsLeadingToGoal ??
            0,
        });
      } catch (loadError) {
        console.error(
          "Error cargando estadísticas del jugador:",
          loadError
        );

        if (mounted) {
          setError(
            "No se pudieron cargar las estadísticas existentes del jugador."
          );
        }
      }
    }

    loadCurrentStats();

    return () => {
      mounted = false;
    };
  }, [
    currentParticipation,
    matchId,
  ]);

  /*
   * ============================================================
   * CAMBIAR VALOR
   * ============================================================
   */

  const handleStatValueChange = (
    field: StatField,
    rawValue: string
  ) => {
    /*
     * Permitimos borrar temporalmente
     * el campo mientras se está editando.
     *
     * Al guardar se convertirá en 0.
     */

    if (rawValue === "") {
      setStatValues(
        (current) => ({
          ...current,
          [field]: "",
        })
      );

      return;
    }

    const numericValue =
      Number(rawValue);

    if (
      Number.isNaN(
        numericValue
      )
    ) {
      return;
    }

    setStatValues(
      (current) => ({
        ...current,
        [field]:
          numericValue,
      })
    );
  };

  /*
   * ============================================================
   * CAMBIO DE COMPETICIÓN
   * ============================================================
   */

  const handleCompetitionChange = (
    newCompetitionId: number
  ) => {
    setCompetitionId(
      newCompetitionId
    );

    setSeasonId(0);

    setStageId(0);

    setMatchId(0);

    setTeamId(0);

    setOrderedParticipations(
      []
    );

    setCurrentPlayerIndex(0);

    setTotalParticipations(0);

    setCompletedParticipations(
      0
    );

    setStatValues({
      ...EMPTY_STAT_VALUES,
    });

    setError("");
  };

  /*
   * ============================================================
   * CAMBIO DE TEMPORADA
   * ============================================================
   */

  const handleSeasonChange = (
    newSeasonId: number
  ) => {
    setSeasonId(
      newSeasonId
    );

    setStageId(0);

    setMatchId(0);

    setTeamId(0);

    setOrderedParticipations(
      []
    );

    setCurrentPlayerIndex(0);

    setTotalParticipations(0);

    setCompletedParticipations(
      0
    );

    setStatValues({
      ...EMPTY_STAT_VALUES,
    });

    setError("");
  };

  /*
   * ============================================================
   * CAMBIO DE FASE
   * ============================================================
   */

  const handleStageChange = (
    newStageId: number
  ) => {
    setStageId(
      newStageId
    );

    setMatchId(0);

    setTeamId(0);

    setOrderedParticipations(
      []
    );

    setCurrentPlayerIndex(0);

    setTotalParticipations(0);

    setCompletedParticipations(
      0
    );

    setStatValues({
      ...EMPTY_STAT_VALUES,
    });

    setError("");
  };

  /*
   * ============================================================
   * CAMBIO DE PARTIDO
   * ============================================================
   */

  const handleMatchChange = (
    newMatchId: number
  ) => {
    setMatchId(
      newMatchId
    );

    setTeamId(0);

    setOrderedParticipations(
      []
    );

    setCurrentPlayerIndex(0);

    setTotalParticipations(0);

    setCompletedParticipations(
      0
    );

    setStatValues({
      ...EMPTY_STAT_VALUES,
    });

    setError("");
  };

  /*
   * ============================================================
   * CAMBIO DE EQUIPO
   * ============================================================
   */

  const handleTeamChange = (
    newTeamId: number
  ) => {
    setTeamId(
      newTeamId
    );

    setOrderedParticipations(
      []
    );

    setCurrentPlayerIndex(0);

    setTotalParticipations(0);

    setCompletedParticipations(
      0
    );

    setStatValues({
      ...EMPTY_STAT_VALUES,
    });

    setError("");
  };

  /*
   * ============================================================
   * CONVERTIR VALORES A PAYLOAD
   * ============================================================
   *
   * IMPORTANTE:
   *
   * "" se convierte en 0.
   *
   * De esta forma no almacenamos null por dejar
   * accidentalmente un campo vacío.
   * ============================================================
   */

  const buildStatPayload = (
    participationId: number
  ): Omit<
    PlayerMatchStat,
    "id"
  > => {
    const payload = {
      participationId,

      goals:
        statValues.goals === ""
          ? 0
          : statValues.goals,

      shots:
        statValues.shots === ""
          ? 0
          : statValues.shots,

      shotsOnTarget:
        statValues.shotsOnTarget ===
        ""
          ? 0
          : statValues.shotsOnTarget,

      dribbles:
        statValues.dribbles ===
        ""
          ? 0
          : statValues.dribbles,

      dribblesCompleted:
        statValues.dribblesCompleted ===
        ""
          ? 0
          : statValues.dribblesCompleted,

      assists:
        statValues.assists === ""
          ? 0
          : statValues.assists,

      duels:
        statValues.duels === ""
          ? 0
          : statValues.duels,

      duelsWon:
        statValues.duelsWon ===
        ""
          ? 0
          : statValues.duelsWon,

      tackles:
        statValues.tackles ===
        ""
          ? 0
          : statValues.tackles,

      clearances:
        statValues.clearances ===
        ""
          ? 0
          : statValues.clearances,

      recoveries:
        statValues.recoveries ===
        ""
          ? 0
          : statValues.recoveries,

      saves:
        statValues.saves === ""
          ? 0
          : statValues.saves,

      passes:
        statValues.passes === ""
          ? 0
          : statValues.passes,

      passesCompleted:
        statValues.passesCompleted ===
        ""
          ? 0
          : statValues.passesCompleted,

      yellowCards:
        statValues.yellowCards ===
        ""
          ? 0
          : statValues.yellowCards,

      redCards:
        statValues.redCards ===
        ""
          ? 0
          : statValues.redCards,

      errorsLeadingToGoal:
        statValues.errorsLeadingToGoal ===
        ""
          ? 0
          : statValues.errorsLeadingToGoal,
    };

    return payload;
  };

  /*
   * ============================================================
   * COMPROBAR SI HAY DATOS
   * ============================================================
   *
   * Como todos los campos tienen 0 por defecto,
   * un jugador siempre tiene valores estadísticos válidos.
   *
   * Esto permite guardar un jugador con todos sus registros
   * a cero.
   * ============================================================
   */

  const hasStatValues =
    STAT_FIELDS.some(
      (field) =>
        statValues[field] !==
          "" &&
        statValues[field] !==
          undefined
    );

  /*
   * ============================================================
   * GUARDAR JUGADOR ACTUAL
   * ============================================================
   */

  const saveCurrentPlayerStats =
    async () => {
      if (
        !currentParticipation
      ) {
        throw new Error(
          "No hay un jugador seleccionado."
        );
      }

      if (!hasStatValues) {
        throw new Error(
          "Debes introducir al menos una estadística para este jugador."
        );
      }

      /*
       * Validación de valores.
       */

      for (const field of STAT_FIELDS) {
        const value =
          statValues[field];

        /*
         * Un campo vacío durante la edición
         * se considera 0.
         */

        const normalizedValue =
          value === "" ||
          value === undefined
            ? 0
            : value;

        if (
          typeof normalizedValue !==
            "number" ||
          Number.isNaN(
            normalizedValue
          )
        ) {
          throw new Error(
            `El valor de ${field} no es válido.`
          );
        }

        if (
          normalizedValue < 0
        ) {
          throw new Error(
            `El valor de ${field} no puede ser negativo.`
          );
        }

        if (
          !Number.isInteger(
            normalizedValue
          )
        ) {
          throw new Error(
            `El valor de ${field} debe ser un número entero.`
          );
        }
      }

      const payload =
        buildStatPayload(
          currentParticipation.id
        );

      /*
       * Buscar si ya existe
       * el registro completo.
       */

      const existing =
        await getPlayerMatchStatsByParticipation(
          currentParticipation.id
        );

      if (existing) {
        await updatePlayerMatchStat(
          existing.id,
          payload
        );

        return "updated";
      }

      await addPlayerMatchStat(
        payload
      );

      return "created";
    };

  /*
   * ============================================================
   * SIGUIENTE JUGADOR
   * ============================================================
   */

  const handleNextPlayer =
    async () => {
      if (saving) {
        return;
      }

      setError("");

      if (
        !currentParticipation
      ) {
        setError(
          "No hay un jugador seleccionado."
        );

        return;
      }

      if (!hasStatValues) {
        setError(
          "Debes introducir al menos una estadística para este jugador."
        );

        return;
      }

      try {
        setSaving(true);

        await saveCurrentPlayerStats();

        const nextIndex =
          currentPlayerIndex + 1;

        /*
         * ÚLTIMO JUGADOR
         */

        if (
          nextIndex >=
          orderedParticipations.length
        ) {
          onSaved();

          return;
        }

        /*
         * Actualizar progreso.
         */

        setCompletedParticipations(
          (current) =>
            Math.min(
              totalParticipations,
              current + 1
            )
        );

        /*
         * Pasar al siguiente jugador.
         */

        setCurrentPlayerIndex(
          nextIndex
        );

        setStatValues({
          ...EMPTY_STAT_VALUES,
        });

        setError("");
      } catch (saveError) {
        console.error(
          "Error guardando estadísticas del jugador:",
          saveError
        );

        setError(
          saveError instanceof
          Error
            ? saveError.message
            : "No se pudieron guardar las estadísticas del jugador."
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ============================================================
   * GUARDAR EN EDICIÓN
   * ============================================================
   */

  const handleSubmitEdit =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (saving) {
        return;
      }

      setError("");

      if (
        !currentParticipation
      ) {
        setError(
          "No hay un jugador seleccionado."
        );

        return;
      }

      if (!hasStatValues) {
        setError(
          "Debes introducir al menos una estadística para este jugador."
        );

        return;
      }

      try {
        setSaving(true);

        await saveCurrentPlayerStats();

        onSaved();
      } catch (saveError) {
        console.error(
          "Error guardando estadísticas:",
          saveError
        );

        setError(
          saveError instanceof
          Error
            ? saveError.message
            : "No se pudieron guardar las estadísticas."
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ============================================================
   * PROGRESO
   * ============================================================
   */

  const currentProgress =
    orderedParticipations.length >
    0
      ? currentPlayerIndex + 1
      : 0;

  /*
   * ============================================================
   * RENDER DE CAMPOS
   * ============================================================
   */

  const renderStatSection = (
    title: string,
    fields: {
      field: StatField;
      label: string;
    }[]
  ) => {
    return (
      <section className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-5 sm:py-4">
          <h4 className="text-base font-semibold text-slate-800">
            {title}
          </h4>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-5 lg:grid-cols-3 xl:grid-cols-4">
          {fields.map(
            ({
              field,
              label,
            }) => (
              <div
                key={field}
                className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 sm:p-4"
              >
                <label
                  htmlFor={`stat-${field}`}
                  className="block text-sm font-semibold text-slate-700"
                >
                  {label}
                </label>

                <input
                  id={`stat-${field}`}
                  type="number"
                  min="0"
                  step="1"
                  value={
                    statValues[field]
                  }
                  onChange={(
                    event
                  ) =>
                    handleStatValueChange(
                      field,
                      event.target
                        .value
                    )
                  }
                  className="mt-3 w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-right text-base font-medium text-slate-800 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300 sm:py-2.5"
                />
              </div>
            )
          )}
        </div>
      </section>
    );
  };

  /*
   * ============================================================
   * CARGANDO
   * ============================================================
   */

  if (loading) {
    return (
      <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 md:p-6">
        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
          {isEditing
            ? "Editar estadística"
            : "Carga de estadísticas"}
        </h2>

        <p className="mt-4 text-sm text-slate-500">
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
    <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 md:p-6">

      {/* CABECERA */}

      <div className="mb-5 sm:mb-6">
        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
          {isEditing
            ? "Editar estadística"
            : "Carga de estadísticas"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {isEditing
            ? "Modifica las estadísticas del jugador seleccionado."
            : "Introduce las estadísticas de los jugadores del equipo, uno a uno."}
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-6 sm:p-4">
          {error}
        </div>
      )}

      <form
        onSubmit={
          isEditing
            ? handleSubmitEdit
            : (event) => {
                event.preventDefault();
                void handleNextPlayer();
              }
        }
        className="space-y-6 sm:space-y-8"
      >

        {/* ======================================================
            CONTEXTO DEL PARTIDO
            ====================================================== */}

        <div>
          <h3 className="mb-3 text-base font-semibold text-slate-800 sm:mb-4 sm:text-lg">
            Contexto del partido
          </h3>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">

            {/* COMPETICIÓN */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Competición
              </label>

              <select
                value={
                  competitionId
                }
                onChange={(
                  event
                ) =>
                  handleCompetitionChange(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
              >
                <option value={0}>
                  Selecciona una competición
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
                      {
                        competition.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* TEMPORADA */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Temporada
              </label>

              <select
                value={seasonId}
                onChange={(
                  event
                ) =>
                  handleSeasonChange(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                disabled={
                  !competitionId
                }
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
              >
                <option value={0}>
                  Selecciona una temporada
                </option>

                {availableSeasons.map(
                  (season) => (
                    <option
                      key={
                        season.id
                      }
                      value={
                        season.id
                      }
                    >
                      {season.name}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* FASE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Fase / Jornada
              </label>

              <select
                value={stageId}
                onChange={(
                  event
                ) =>
                  handleStageChange(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                disabled={
                  !seasonId
                }
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
              >
                <option value={0}>
                  Selecciona una fase o jornada
                </option>

                {availableStages.map(
                  (stage) => (
                    <option
                      key={
                        stage.id
                      }
                      value={
                        stage.id
                      }
                    >
                      {stage.name}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* PARTIDO */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Partido
              </label>

              <select
                value={matchId}
                onChange={(
                  event
                ) =>
                  handleMatchChange(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                disabled={
                  !stageId
                }
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
              >
                <option value={0}>
                  Selecciona un partido
                </option>

                {availableMatches.map(
                  (match) => {
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

                    return (
                      <option
                        key={
                          match.id
                        }
                        value={
                          match.id
                        }
                      >
                        {
                          homeTeam?.shortName ??
                          "?"
                        }{" "}
                        -{" "}
                        {
                          awayTeam?.shortName ??
                          "?"
                        }
                      </option>
                    );
                  }
                )}
              </select>
            </div>

            {/* EQUIPO */}

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Equipo
              </label>

              <select
                value={teamId}
                onChange={(
                  event
                ) =>
                  handleTeamChange(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                disabled={
                  !matchId
                }
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
              >
                <option value={0}>
                  Selecciona un equipo
                </option>

                {availableMatchTeams.map(
                  (team) => (
                    <option
                      key={
                        team.id
                      }
                      value={
                        team.id
                      }
                    >
                      {team.name}
                    </option>
                  )
                )}
              </select>
            </div>

          </div>
        </div>

        {/* ======================================================
            JUGADOR ACTUAL
            ====================================================== */}

        {teamId &&
          (playersLoading ||
            orderedParticipations.length >
              0) && (
            <div>

              <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-slate-800">
                  Jugador
                </h3>

                {totalParticipations >
                  0 && (
                  <div className="w-fit rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 sm:px-4">
                    Jugador{" "}
                    <strong className="text-slate-800">
                      {
                        currentProgress
                      }
                    </strong>{" "}
                    de{" "}
                    <strong className="text-slate-800">
                      {
                        totalParticipations
                      }
                    </strong>
                  </div>
                )}
              </div>

              {playersLoading ? (
                <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500 sm:p-6">
                  Cargando jugadores...
                </div>
              ) : !currentItem ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 sm:p-4">
                  No hay jugadores disponibles
                  para este equipo y partido.
                </div>
              ) : (
                <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-5">

                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">

                    <div>
                      <span className="block text-xs font-medium uppercase text-slate-500">
                        Jugador
                      </span>

                      <span className="font-semibold text-slate-800">
                        {
                          currentPlayer?.name ??
                          "Jugador desconocido"
                        }
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-medium uppercase text-slate-500">
                        Equipo
                      </span>

                      <span className="font-semibold text-slate-800">
                        {
                          currentTeam?.shortName ??
                          "—"
                        }
                      </span>
                    </div>

                    <div>
                      <span className="block text-xs font-medium uppercase text-slate-500">
                        Minutos
                      </span>

                      <span className="font-semibold text-slate-800">
                        {
                          currentParticipation?.minutesPlayed ??
                          "—"
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

                </div>
              )}

            </div>
          )}

        {/* ======================================================
            ESTADÍSTICAS
            ====================================================== */}

        {teamId &&
          currentItem && (
            <div>

              <div className="mb-5">
                <h3 className="text-lg font-semibold text-slate-800">
                  Estadísticas del jugador
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Introduce las estadísticas disponibles
                  para este jugador.
                </p>
              </div>

              <div className="space-y-6">

                {renderStatSection(
                  "Ofensivas",
                  OFFENSIVE_FIELDS
                )}

                {renderStatSection(
                  "Defensivas",
                  DEFENSIVE_FIELDS
                )}

                {renderStatSection(
                  "Distribución",
                  DISTRIBUTION_FIELDS
                )}

              </div>

            </div>
          )}

        {/* ======================================================
            PROGRESO
            ====================================================== */}

        {!isEditing &&
          teamId &&
          totalParticipations >
            0 && (
            <div>

              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  Progreso
                </span>

                <span>
                  {
                    Math.min(
                      completedParticipations,
                      totalParticipations
                    )
                  }{" "}
                  de{" "}
                  {
                    totalParticipations
                  }
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200">

                <div
                  className="h-full rounded-full bg-slate-800 transition-all"
                  style={{
                    width: `${
                      totalParticipations
                        ? Math.min(
                            100,
                            (completedParticipations /
                              totalParticipations) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />

              </div>

            </div>
          )}

        {/* ======================================================
            BOTONES
            ====================================================== */}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end sm:pt-6">

          <button
            type="button"
            onClick={
              onCancel
            }
            disabled={
              saving
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Cancelar
          </button>

          {isEditing ? (
            <button
              type="submit"
              disabled={
                !currentItem ||
                saving
              }
              className="w-full rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
          ) : (
            <button
              type="submit"
              disabled={
                !currentItem ||
                saving
              }
              className="w-full rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving
                ? "Guardando..."
                : currentPlayerIndex <
                    orderedParticipations.length -
                      1
                  ? "Guardar y siguiente"
                  : "Guardar y finalizar"}
            </button>
          )}

        </div>

      </form>
    </div>
  );
}