"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addParticipation,
  updateParticipation,
  getParticipations,
  type Participation,
} from "@/services/participation.service";

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
  getHistPlayerTeams,
  type HistPlayerTeam,
} from "@/services/hist-player-team.service";

interface ParticipationFormProps {
  participation?: Participation;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}

interface PlayerParticipationRow {
  playerId: number;
  positionId: number;
  shirtNumber: number;
  isStartingXI: boolean;
  captain: boolean;
  substituteInMinute: string;
  substituteOutMinute: string;
  minutesPlayed: number;
}

export default function ParticipationForm({
  participation,
  onCancel,
  onSaved,
}: ParticipationFormProps) {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [stages, setStages] =
    useState<Stage[]>([]);

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [histPlayerTeams, setHistPlayerTeams] =
    useState<HistPlayerTeam[]>([]);

  const [existingParticipations, setExistingParticipations] =
    useState<Participation[]>([]);

  /*
   * ============================================================
   * CARGA
   * ============================================================
   */

  const [competitionsLoading, setCompetitionsLoading] =
    useState(true);

  const [seasonsLoading, setSeasonsLoading] =
    useState(true);

  const [stagesLoading, setStagesLoading] =
    useState(true);

  const [teamsLoading, setTeamsLoading] =
    useState(true);

  const [historyLoading, setHistoryLoading] =
    useState(true);

  const [dataError, setDataError] =
    useState("");

  const [teamsError, setTeamsError] =
    useState("");

  /*
   * ============================================================
   * SELECCIÓN PRINCIPAL
   * ============================================================
   */

  const [competitionId, setCompetitionId] =
    useState<number>(0);

  const [seasonId, setSeasonId] =
    useState<number>(0);

  const [stageId, setStageId] =
    useState<number>(0);

  const [matchId, setMatchId] =
    useState<number>(
      participation?.matchId ?? 0
    );

  const [teamId, setTeamId] =
    useState<number>(
      participation?.teamId ?? 0
    );

  /*
   * ============================================================
   * JUGADORES
   * ============================================================
   */

  const [playerRows, setPlayerRows] =
    useState<PlayerParticipationRow[]>([]);

  /*
   * ============================================================
   * GUARDADO
   * ============================================================
   */

  const [saving, setSaving] =
    useState(false);

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setDataError("");

        const [
          competitionsData,
          seasonsData,
          stagesData,
          matchesData,
          playersData,
          historyData,
          participationsData,
        ] = await Promise.all([
          getCompetitions(),
          getSeasons(),
          getStages(),
          getMatches(),
          getPlayers(),
          getHistPlayerTeams(),
          getParticipations(),
        ]);

        if (!mounted) {
          return;
        }

        setCompetitions(
          competitionsData
        );

        setSeasons(
          seasonsData
        );

        setStages(
          stagesData
        );

        setMatches(
          matchesData
        );

        setPlayers(
          playersData
        );

        setHistPlayerTeams(
          historyData
        );

        setExistingParticipations(
          participationsData
        );
      } catch (error) {
        console.error(
          "Error cargando datos de participación:",
          error
        );

        if (!mounted) {
          return;
        }

        setDataError(
          "No se pudieron cargar los datos necesarios."
        );
      } finally {
        if (mounted) {
          setCompetitionsLoading(false);
          setSeasonsLoading(false);
          setStagesLoading(false);
          setHistoryLoading(false);
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
   * CARGAR EQUIPOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadTeams() {
      try {
        setTeamsLoading(true);
        setTeamsError("");

        const teamsData =
          await getTeams();

        if (!mounted) {
          return;
        }

        setTeams(
          teamsData
        );
      } catch (error) {
        console.error(
          "Error cargando equipos:",
          error
        );

        if (!mounted) {
          return;
        }

        setTeamsError(
          "No se pudieron cargar los equipos."
        );
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
   * INICIALIZAR EDICIÓN
   * ============================================================
   */

  useEffect(() => {
    if (!participation) {
      return;
    }

    if (matches.length === 0) {
      return;
    }

    const selectedMatch =
      matches.find(
        (match) =>
          match.id ===
          participation.matchId
      );

    if (!selectedMatch) {
      return;
    }

    setCompetitionId(
      selectedMatch.competitionId ?? 0
    );

    setSeasonId(
      selectedMatch.seasonId ?? 0
    );

    setStageId(
      selectedMatch.stageId ?? 0
    );

    setMatchId(
      selectedMatch.id
    );

    setTeamId(
      participation.teamId
    );
  }, [
    participation,
    matches,
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
   *
   * ORDEN:
   *
   * Jornada 5
   * Jornada 4
   * Jornada 3
   * Jornada 2
   * Jornada 1
   *
   * No utilizamos displayOrder.
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
        .sort((a, b) => {
          const numberA =
            Number(
              a.name.match(/\d+/)?.[0] ??
                0
            );

          const numberB =
            Number(
              b.name.match(/\d+/)?.[0] ??
                0
            );

          return numberB - numberA;
        });
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
      return matches.filter(
        (match) => {
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
        }
      );
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

  const availableTeams =
    useMemo(() => {
      if (!selectedMatch) {
        return [];
      }

      const matchTeamIds = [
        selectedMatch.homeTeamId,
        selectedMatch.awayTeamId,
      ];

      return teams.filter(
        (team) =>
          matchTeamIds.includes(
            team.id
          )
      );
    }, [
      teams,
      selectedMatch,
    ]);

  /*
   * ============================================================
   * JUGADORES DEL EQUIPO
   * ============================================================
   */

  const availablePlayers =
    useMemo(() => {
      if (
        !teamId ||
        !seasonId
      ) {
        return [];
      }

      const historicalPlayers =
        histPlayerTeams
          .filter(
            (history) =>
              history.teamId ===
                teamId &&
              history.seasonId ===
                seasonId &&
              history.active
          )
          .map((history) => {
            const player =
              players.find(
                (item) =>
                  item.id ===
                  history.playerId
              );

            return {
              player,
              history,
            };
          })
          .filter(
            (
              item
            ): item is {
              player: Player;
              history: HistPlayerTeam;
            } =>
              Boolean(
                item.player
              )
          );

      return historicalPlayers.sort(
        (a, b) =>
          (a.history.shirtNumber ??
            999) -
          (b.history.shirtNumber ??
            999)
      );
    }, [
      players,
      histPlayerTeams,
      teamId,
      seasonId,
    ]);

  /*
   * ============================================================
   * CREAR / CARGAR FILAS
   * ============================================================
   */

  useEffect(() => {
    if (participation) {
      return;
    }

    if (
      !teamId ||
      !seasonId ||
      !matchId
    ) {
      setPlayerRows([]);
      return;
    }

    const rows: PlayerParticipationRow[] =
      availablePlayers.map(
        ({
          player,
          history,
        }) => {
          const existingParticipation =
            existingParticipations.find(
              (item) =>
                item.matchId ===
                  matchId &&
                item.teamId ===
                  teamId &&
                item.playerId ===
                  player.id
            );

          if (
            existingParticipation
          ) {
            return {
              playerId:
                player.id,

              positionId:
                existingParticipation.positionId ??
                history.positionId ??
                0,

              shirtNumber:
                existingParticipation.shirtNumber ??
                history.shirtNumber ??
                0,

              isStartingXI:
                existingParticipation.isStartingXI,

              captain:
                existingParticipation.captain,

              substituteInMinute:
                existingParticipation.substituteInMinute !==
                  null &&
                existingParticipation.substituteInMinute !==
                  undefined
                  ? String(
                      existingParticipation.substituteInMinute
                    )
                  : "",

              substituteOutMinute:
                existingParticipation.substituteOutMinute !==
                  null &&
                existingParticipation.substituteOutMinute !==
                  undefined
                  ? String(
                      existingParticipation.substituteOutMinute
                    )
                  : "",

              minutesPlayed:
                existingParticipation.minutesPlayed ??
                0,
            };
          }

          return {
            playerId:
              player.id,

            positionId:
              history.positionId ??
              0,

            shirtNumber:
              history.shirtNumber ??
              0,

            isStartingXI:
              false,

            captain:
              false,

            substituteInMinute:
              "",

            substituteOutMinute:
              "",

            minutesPlayed:
              0,
          };
        }
      );

    setPlayerRows(rows);
  }, [
    teamId,
    seasonId,
    matchId,
    availablePlayers,
    existingParticipations,
    participation,
  ]);

  /*
   * ============================================================
   * INICIALIZAR EDICIÓN
   * ============================================================
   */

  useEffect(() => {
    if (
      !participation ||
      !teamId ||
      !seasonId ||
      histPlayerTeams.length === 0
    ) {
      return;
    }

    const history =
      histPlayerTeams.find(
        (item) =>
          item.playerId ===
            participation.playerId &&
          item.teamId ===
            teamId &&
          item.seasonId ===
            seasonId &&
          item.active
      );

    if (!history) {
      return;
    }

    setPlayerRows([
      {
        playerId:
          participation.playerId,

        positionId:
          participation.positionId ??
          history.positionId ??
          0,

        shirtNumber:
          participation.shirtNumber ??
          history.shirtNumber ??
          0,

        isStartingXI:
          participation.isStartingXI,

        captain:
          participation.captain,

        substituteInMinute:
          participation.substituteInMinute !==
            null &&
          participation.substituteInMinute !==
            undefined
            ? String(
                participation.substituteInMinute
              )
            : "",

        substituteOutMinute:
          participation.substituteOutMinute !==
            null &&
          participation.substituteOutMinute !==
            undefined
            ? String(
                participation.substituteOutMinute
              )
            : "",

        minutesPlayed:
          participation.minutesPlayed ??
          0,
      },
    ]);
  }, [
    participation,
    teamId,
    seasonId,
    histPlayerTeams,
  ]);

  /*
   * ============================================================
   * CALCULAR MINUTOS
   * ============================================================
   */

  const calculateMinutes = (
    row: PlayerParticipationRow
  ) => {
    const matchDuration = selectedMatch?.matchDuration ?? 90;

    const hasIn =
      row.substituteInMinute !== "";

    const hasOut =
      row.substituteOutMinute !== "";

    const inMinute =
      hasIn
        ? Number(
            row.substituteInMinute
          )
        : 0;

    const outMinute =
      hasOut
        ? Number(
            row.substituteOutMinute
          )
        : matchDuration;

    let calculatedMinutes = 0;

    if (hasIn) {
      calculatedMinutes =
        outMinute -
        inMinute;
    } else if (hasOut) {
      calculatedMinutes =
        outMinute;
    } else {
      calculatedMinutes =
        row.isStartingXI
          ? matchDuration
          : 0;
    }

    if (
      calculatedMinutes < 0
    ) {
      calculatedMinutes = 0;
    }

    if (
      calculatedMinutes >
      matchDuration
    ) {
      calculatedMinutes =
        matchDuration;
    }

    return calculatedMinutes;
  };

  /*
   * ============================================================
   * ACTUALIZAR FILA
   * ============================================================
   */

  const updatePlayerRow = (
    playerId: number,
    changes: Partial<PlayerParticipationRow>
  ) => {
    setPlayerRows(
      (currentRows) =>
        currentRows.map(
          (row) =>
            row.playerId ===
            playerId
              ? {
                  ...row,
                  ...changes,
                }
              : row
        )
    );
  };

  /*
   * ============================================================
   * TITULAR
   * ============================================================
   */

  const handleStartingXIChange = (
    playerId: number,
    checked: boolean
  ) => {
    setPlayerRows(
      (currentRows) =>
        currentRows.map(
          (row) => {
            if (
              row.playerId !==
              playerId
            ) {
              return row;
            }

            const updatedRow = {
              ...row,
              isStartingXI:
                checked,
            };

            return {
              ...updatedRow,
              minutesPlayed:
                calculateMinutes(
                  updatedRow
                ),
            };
          }
        )
    );
  };

  /*
   * ============================================================
   * CAPITÁN
   * ============================================================
   */

  const handleCaptainChange = (
    playerId: number,
    checked: boolean
  ) => {
    setPlayerRows(
      (currentRows) =>
        currentRows.map(
          (row) => ({
            ...row,
            captain:
              checked
                ? row.playerId ===
                  playerId
                : row.playerId ===
                  playerId
                  ? false
                  : row.captain,
          })
        )
    );
  };

  /*
   * ============================================================
   * MINUTO ENTRADA
   * ============================================================
   */

  const handleSubstituteInChange = (
    playerId: number,
    value: string
  ) => {
    setPlayerRows(
      (currentRows) =>
        currentRows.map(
          (row) => {
            if (
              row.playerId !==
              playerId
            ) {
              return row;
            }

            const updatedRow = {
              ...row,
              substituteInMinute:
                value,
            };

            return {
              ...updatedRow,
              minutesPlayed:
                calculateMinutes(
                  updatedRow
                ),
            };
          }
        )
    );
  };

  /*
   * ============================================================
   * MINUTO SALIDA
   * ============================================================
   */

  const handleSubstituteOutChange = (
    playerId: number,
    value: string
  ) => {
    setPlayerRows(
      (currentRows) =>
        currentRows.map(
          (row) => {
            if (
              row.playerId !==
              playerId
            ) {
              return row;
            }

            const updatedRow = {
              ...row,
              substituteOutMinute:
                value,
            };

            return {
              ...updatedRow,
              minutesPlayed:
                calculateMinutes(
                  updatedRow
                ),
            };
          }
        )
    );
  };

  /*
   * ============================================================
   * CAMBIO COMPETICIÓN
   * ============================================================
   */

  const handleCompetitionChange = (
    value: number
  ) => {
    setCompetitionId(value);

    setSeasonId(0);
    setStageId(0);
    setMatchId(0);
    setTeamId(0);

    setPlayerRows([]);
  };

  /*
   * ============================================================
   * CAMBIO TEMPORADA
   * ============================================================
   */

  const handleSeasonChange = (
    value: number
  ) => {
    setSeasonId(value);

    setStageId(0);
    setMatchId(0);
    setTeamId(0);

    setPlayerRows([]);
  };

  /*
   * ============================================================
   * CAMBIO JORNADA
   * ============================================================
   */

  const handleStageChange = (
    value: number
  ) => {
    setStageId(value);

    setMatchId(0);
    setTeamId(0);

    setPlayerRows([]);
  };

  /*
   * ============================================================
   * CAMBIO PARTIDO
   * ============================================================
   */

  const handleMatchChange = (
    value: number
  ) => {
    setMatchId(value);

    setTeamId(0);

    setPlayerRows([]);
  };

  /*
   * ============================================================
   * CAMBIO EQUIPO
   * ============================================================
   */

  const handleTeamChange = (
    value: number
  ) => {
    setTeamId(value);

    setPlayerRows([]);
  };

  /*
   * ============================================================
   * ETIQUETA PARTIDO
   * ============================================================
   */

  const getMatchLabel = (
    selectedMatchId: number
  ) => {
    const match =
      matches.find(
        (item) =>
          item.id ===
          selectedMatchId
      );

    if (!match) {
      return "Partido no encontrado";
    }

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
   * GUARDAR
   * ============================================================
   */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!competitionId) {
      alert(
        "Selecciona una competición."
      );
      return;
    }

    if (!seasonId) {
      alert(
        "Selecciona una temporada."
      );
      return;
    }

    if (!stageId) {
      alert(
        "Selecciona una jornada o fase."
      );
      return;
    }

    if (!matchId) {
      alert(
        "Selecciona un partido."
      );
      return;
    }

    if (!teamId) {
      alert(
        "Selecciona un equipo."
      );
      return;
    }

    if (
      playerRows.length === 0
    ) {
      alert(
        "No hay jugadores para guardar."
      );
      return;
    }

    const currentMatch =
      matches.find(
        (match) =>
          match.id === matchId
      );

    if (!currentMatch) {
      alert(
        "No se ha encontrado el partido seleccionado."
      );
      return;
    }

    if (
      currentMatch.seasonId !==
      seasonId
    ) {
      alert(
        "El partido no pertenece a la temporada seleccionada."
      );
      return;
    }

    const currentMatchTeamIds = [
      currentMatch.homeTeamId,
      currentMatch.awayTeamId,
    ];

    if (
      !currentMatchTeamIds.includes(
        teamId
      )
    ) {
      alert(
        "El equipo seleccionado no pertenece a este partido."
      );
      return;
    }

    for (
      const row of playerRows
    ) {
      const player =
        players.find(
          (item) =>
            item.id ===
            row.playerId
        );

      const history =
        histPlayerTeams.find(
          (item) =>
            item.playerId ===
              row.playerId &&
            item.teamId ===
              teamId &&
            item.seasonId ===
              seasonId &&
            item.active
        );

      if (!history) {
        alert(
          `El jugador ${
            player?.name ??
            row.playerId
          } no tiene historial registrado para este equipo y temporada.`
        );
        return;
      }

      if (
        !row.positionId ||
        !Number.isInteger(
          row.positionId
        ) ||
        row.positionId <= 0
      ) {
        alert(
          `La posición de ${
            player?.name ??
            row.playerId
          } no es válida.`
        );
        return;
      }

      if (
        row.shirtNumber < 1 ||
        row.shirtNumber > 99
      ) {
        alert(
          `El dorsal de ${
            player?.name ??
            row.playerId
          } debe estar entre 1 y 99.`
        );
        return;
      }

      if (
        row.substituteInMinute !==
        ""
      ) {
        const minuteIn =
          Number(
            row.substituteInMinute
          );

        if (
          !Number.isInteger(
            minuteIn
          ) ||
          minuteIn < 0 ||
          minuteIn > 120
        ) {
          alert(
            `El minuto de entrada de ${
              player?.name ??
              row.playerId
            } no es válido.`
          );
          return;
        }
      }

      if (
        row.substituteOutMinute !==
        ""
      ) {
        const minuteOut =
          Number(
            row.substituteOutMinute
          );

        if (
          !Number.isInteger(
            minuteOut
          ) ||
          minuteOut < 0 ||
          minuteOut > 120
        ) {
          alert(
            `El minuto de salida de ${
              player?.name ??
              row.playerId
            } no es válido.`
          );
          return;
        }
      }

      if (
        row.substituteInMinute !==
          "" &&
        row.substituteOutMinute !==
          "" &&
        Number(
          row.substituteOutMinute
        ) <
          Number(
            row.substituteInMinute
          )
      ) {
        alert(
          `El minuto de salida de ${
            player?.name ??
            row.playerId
          } no puede ser anterior al minuto de entrada.`
        );
        return;
      }
    }

    const captainCount =
      playerRows.filter(
        (row) => row.captain
      ).length;

    if (captainCount > 1) {
      alert(
        "Solo puede haber un capitán por equipo en el partido."
      );
      return;
    }

    try {
      setSaving(true);

      if (participation) {
        const row =
          playerRows[0];

        if (!row) {
          alert(
            "No hay datos para guardar."
          );
          return;
        }

        const minutesPlayed =
          calculateMinutes(row);

        const participationData:
          Omit<Participation, "id"> =
          {
            matchId,

            playerId:
              row.playerId,

            teamId,

            positionId:
              row.positionId,

            shirtNumber:
              row.shirtNumber,

            isStartingXI:
              row.isStartingXI,

            minutesPlayed,

            captain:
              row.captain,

            substituteInMinute:
              row.substituteInMinute !==
              ""
                ? Number(
                    row.substituteInMinute
                  )
                : null,

            substituteOutMinute:
              row.substituteOutMinute !==
              ""
                ? Number(
                    row.substituteOutMinute
                  )
                : null,
          };

        await updateParticipation(
          participation.id,
          participationData
        );

        await onSaved();

        return;
      }

      const participationPromises =
        playerRows
          .map((row) => {
            const minutesPlayed =
              calculateMinutes(row);

            return {
              row,
              minutesPlayed,
            };
          })
          .filter(
            ({
              minutesPlayed,
            }) =>
              minutesPlayed > 0
          )
          .map(
            ({
              row,
              minutesPlayed,
            }) => {
              const participationData:
                Omit<Participation, "id"> =
                {
                  matchId,

                  playerId:
                    row.playerId,

                  teamId,

                  positionId:
                    row.positionId,

                  shirtNumber:
                    row.shirtNumber,

                  isStartingXI:
                    row.isStartingXI,

                  minutesPlayed,

                  captain:
                    row.captain,

                  substituteInMinute:
                    row.substituteInMinute !==
                    ""
                      ? Number(
                          row.substituteInMinute
                        )
                      : null,

                  substituteOutMinute:
                    row.substituteOutMinute !==
                    ""
                      ? Number(
                          row.substituteOutMinute
                        )
                      : null,
                };

              const existingParticipation =
                existingParticipations.find(
                  (item) =>
                    item.matchId ===
                      matchId &&
                    item.teamId ===
                      teamId &&
                    item.playerId ===
                      row.playerId
                );

              if (
                existingParticipation
              ) {
                return updateParticipation(
                  existingParticipation.id,
                  participationData
                );
              }

              return addParticipation(
                participationData
              );
            }
          );

      if (
        participationPromises.length ===
        0
      ) {
        alert(
          "No hay jugadores con minutos jugados para guardar."
        );
        return;
      }

      await Promise.all(
        participationPromises
      );

      await onSaved();
    } catch (error) {
      console.error(
        "Error guardando participaciones:",
        error
      );

      alert(
        "No se pudieron guardar las participaciones."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================================================
   * CARGANDO
   * ============================================================
   */

  if (
    competitionsLoading ||
    seasonsLoading ||
    stagesLoading ||
    teamsLoading ||
    historyLoading
  ) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow">
        <h2 className="text-xl font-bold text-slate-800">
          {participation
            ? "Editar participación"
            : "Cargar participaciones"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Cargando datos...
        </p>

        <div className="mt-6 rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
          Cargando competiciones,
          temporadas, jornadas,
          partidos, equipos,
          jugadores e historial...
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * ERROR
   * ============================================================
   */

  if (dataError) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {dataError}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="rounded-xl border bg-white p-6 shadow">

      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          {participation
            ? "Editar participación"
            : "Cargar participaciones"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {participation
            ? "Modifica los datos de la participación."
            : "Selecciona el partido y el equipo. Los jugadores aparecerán automáticamente."}
        </p>
      </div>

      {teamsError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {teamsError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
            Partido
          </h3>

          <div className="grid gap-5 md:grid-cols-3">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Competición
              </label>

              <select
                value={
                  competitionId ||
                  ""
                }
                onChange={(event) =>
                  handleCompetitionChange(
                    Number(
                      event.target.value
                    )
                  )
                }
                disabled={
                  Boolean(
                    participation
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
              >
                <option value="">
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

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Temporada
              </label>

              <select
                value={
                  seasonId ||
                  ""
                }
                onChange={(event) =>
                  handleSeasonChange(
                    Number(
                      event.target.value
                    )
                  )
                }
                disabled={
                  Boolean(
                    participation
                  ) ||
                  !competitionId
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
              >
                <option value="">
                  {!competitionId
                    ? "Selecciona competición"
                    : "Seleccionar temporada"}
                </option>

                {availableSeasons.map(
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

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Jornada / fase
              </label>

              <select
                value={
                  stageId ||
                  ""
                }
                onChange={(event) =>
                  handleStageChange(
                    Number(
                      event.target.value
                    )
                  )
                }
                disabled={
                  Boolean(
                    participation
                  ) ||
                  !seasonId
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
              >
                <option value="">
                  {!seasonId
                    ? "Selecciona temporada"
                    : "Seleccionar jornada / fase"}
                </option>

                {availableStages.map(
                  (stage) => (
                    <option
                      key={stage.id}
                      value={stage.id}
                    >
                      {stage.name}
                    </option>
                  )
                )}
              </select>
            </div>

          </div>

          <div className="mt-5">

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Partido
            </label>

            <select
              value={
                matchId ||
                ""
              }
              onChange={(event) =>
                handleMatchChange(
                  Number(
                    event.target.value
                  )
                )
              }
              disabled={
                Boolean(
                  participation
                ) ||
                !stageId
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
            >
              <option value="">
                {!stageId
                  ? "Selecciona primero una jornada / fase"
                  : "Seleccionar partido"}
              </option>

              {availableMatches.map(
                (match) => (
                  <option
                    key={match.id}
                    value={match.id}
                  >
                    {getMatchLabel(
                      match.id
                    )}
                    {" · "}
                    {match.date}
                  </option>
                )
              )}
            </select>

            {selectedMatch && (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Duración del partido: {selectedMatch.matchDuration ?? 90} minutos
              </p>
            )}
          </div>

        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">

          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
            Equipo
          </h3>

          <select
            value={
              teamId ||
              ""
            }
            onChange={(event) =>
              handleTeamChange(
                Number(
                  event.target.value
                )
              )
            }
            disabled={
              !matchId ||
              Boolean(
                participation
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
          >
            <option value="">
              {!matchId
                ? "Selecciona primero un partido"
                : "Seleccionar equipo"}
            </option>

            {availableTeams.map(
              (team) => (
                <option
                  key={team.id}
                  value={team.id}
                >
                  {team.shortName} -{" "}
                  {team.name}
                </option>
              )
            )}
          </select>

          {teamId &&
            playerRows.length > 0 && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900">
                  {playerRows.length} jugadores
                  cargados
                </p>

                <p className="mt-1 text-xs text-blue-800">
                  Los jugadores proceden del
                  historial del equipo para la
                  temporada seleccionada.
                </p>
              </div>
            )}

        </div>

        {teamId && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Jugadores
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Introduce los datos de cada
                  jugador y guarda todo el equipo
                  de una sola vez.
                </p>
              </div>

              {playerRows.length > 0 && (
                <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                  {playerRows.length} jugadores
                </div>
              )}

            </div>

            {playerRows.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
                No hay jugadores registrados
                para este equipo en la temporada
                seleccionada.
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[1100px] border-collapse text-sm">

                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">

                      <th className="px-3 py-3 font-semibold text-slate-600">
                        Dorsal
                      </th>

                      <th className="px-3 py-3 font-semibold text-slate-600">
                        Jugador
                      </th>

                      <th className="px-3 py-3 font-semibold text-slate-600">
                        Posición
                      </th>

                      <th className="px-3 py-3 text-center font-semibold text-slate-600">
                        Titular
                      </th>

                      <th className="px-3 py-3 text-center font-semibold text-slate-600">
                        Capitán
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

                    </tr>
                  </thead>

                  <tbody>

                    {playerRows.map(
                      (row) => {
                        const player =
                          players.find(
                            (item) =>
                              item.id ===
                              row.playerId
                          );

                        return (
                          <tr
                            key={
                              row.playerId
                            }
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >

                            <td className="px-3 py-3">
                              <span className="font-semibold text-slate-700">
                                {row.shirtNumber >
                                0
                                  ? row.shirtNumber
                                  : "—"}
                              </span>
                            </td>

                            <td className="px-3 py-3">
                              <span className="font-semibold text-slate-800">
                                {player?.name ??
                                  "Jugador desconocido"}
                              </span>
                            </td>

                            <td className="px-3 py-3">
                              <span className="text-slate-600">
                                {row.positionId >
                                0
                                  ? row.positionId
                                  : "—"}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center">

                              <input
                                type="checkbox"
                                checked={
                                  row.isStartingXI
                                }
                                onChange={(
                                  event
                                ) =>
                                  handleStartingXIChange(
                                    row.playerId,
                                    event.target
                                      .checked
                                  )
                                }
                                className="h-4 w-4"
                              />

                            </td>

                            <td className="px-3 py-3 text-center">

                              <input
                                type="checkbox"
                                checked={
                                  row.captain
                                }
                                onChange={(
                                  event
                                ) =>
                                  handleCaptainChange(
                                    row.playerId,
                                    event.target
                                      .checked
                                  )
                                }
                                disabled={
                                  playerRows.some(
                                    (item) =>
                                      item.captain
                                  ) &&
                                  !row.captain
                                }
                                className="h-4 w-4 disabled:cursor-not-allowed disabled:opacity-50"
                              />

                            </td>

                            <td className="px-3 py-3">

                              <input
                                type="number"
                                min="0"
                                max="120"
                                value={
                                  row.substituteInMinute
                                }
                                onChange={(
                                  event
                                ) =>
                                  handleSubstituteInChange(
                                    row.playerId,
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="—"
                                className="w-24 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                              />

                            </td>

                            <td className="px-3 py-3">

                              <input
                                type="number"
                                min="0"
                                max="120"
                                value={
                                  row.substituteOutMinute
                                }
                                onChange={(
                                  event
                                ) =>
                                  handleSubstituteOutChange(
                                    row.playerId,
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="—"
                                className="w-24 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                              />

                            </td>

                            <td className="px-3 py-3">
                              <span className="font-bold text-slate-800">
                                {row.minutesPlayed >
                                0
                                  ? row.minutesPlayed
                                  : "—"}
                              </span>
                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        )}

        {teamId &&
          playerRows.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">

              <p className="font-semibold">
                Carga masiva de participaciones
              </p>

              <p className="mt-1">
                Se guardará una participación
                independiente únicamente para
                cada jugador que haya disputado
                al menos 1 minuto.
              </p>

              <p className="mt-1">
                Los jugadores que permanezcan con
                0 minutos no generarán ningún
                registro en la base de datos.
              </p>

              <p className="mt-1">
                El dorsal y la posición proceden
                del historial del jugador para el
                equipo y temporada seleccionados.
              </p>

              <p className="mt-1">
                Los jugadores no titulares
                comenzarán con 0 minutos
                internamente, pero no se mostrará
                el cero en pantalla.
              </p>

            </div>
          )}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={
              saving ||
              playerRows.length === 0
            }
            className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : participation
                ? "Guardar cambios"
                : `Guardar ${playerRows.length} participaciones`}
          </button>

        </div>

      </form>
    </div>
  );
}