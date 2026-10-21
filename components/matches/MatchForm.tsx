"use client";

import { useEffect, useState } from "react";

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
  getTeams,
  type Team,
} from "@/services/team.service";

import {
  getTeamCompetitionsBySeason,
  type TeamCompetition,
} from "@/services/team-competition.service";

import type { Match } from "@/services/match.service";

interface MatchFormProps {
  match?: Match;
  onCancel: () => void;
  onSaved: (match: Omit<Match, "id">) => void;
}

export default function MatchForm({
  match,
  onCancel,
  onSaved,
}: MatchFormProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamCompetitions, setTeamCompetitions] = useState<TeamCompetition[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true);

        const [
          competitionsData,
          seasonsData,
          stagesData,
        ] = await Promise.all([
          getCompetitions(),
          getSeasons(),
          getStages(),
        ]);

        setCompetitions(competitionsData);
        setSeasons(seasonsData);
        setStages(stagesData);

        if (!match) {
          const defaultSeason = seasonsData
            .filter((season) => season.active)
            .sort((a, b) =>
              b.name.localeCompare(a.name, "es", {
                numeric: true,
                sensitivity: "base",
              })
            )[0];

          if (defaultSeason) {
            setSeasonId(String(defaultSeason.id));
          }
        }
      } catch (error) {
        console.error(
          "Error cargando datos del formulario de partidos:",
          error
        );

        setCompetitions([]);
        setSeasons([]);
        setStages([]);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        setTeamsLoading(true);

        const data = await getTeams();

        setTeams(data);
      } catch (error) {
        console.error("Error obteniendo equipos:", error);

        setTeams([]);
      } finally {
        setTeamsLoading(false);
      }
    };

    loadTeams();
  }, []);

  const [competitionId, setCompetitionId] = useState(
    match?.competitionId?.toString() ?? ""
  );

  const [seasonId, setSeasonId] = useState(
    match?.seasonId?.toString() ?? ""
  );

  useEffect(() => {
    const loadTeamCompetitions = async () => {
      if (!seasonId) {
        setTeamCompetitions([]);
        return;
      }

      try {
        const data = await getTeamCompetitionsBySeason(
          Number(seasonId)
        );

        setTeamCompetitions(data);
      } catch (error) {
        console.error(
          "Error obteniendo las competiciones de los equipos:",
          error
        );

        setTeamCompetitions([]);
      }
    };

    loadTeamCompetitions();
  }, [seasonId]);

  const [stageId, setStageId] = useState(
    match?.stageId?.toString() ?? ""
  );

  const [homeTeamId, setHomeTeamId] = useState(
    match?.homeTeamId?.toString() ?? ""
  );

  const [awayTeamId, setAwayTeamId] = useState(
    match?.awayTeamId?.toString() ?? ""
  );

  const [homeScore, setHomeScore] = useState(
    match?.homeScore?.toString() ?? "0"
  );

  const [awayScore, setAwayScore] = useState(
    match?.awayScore?.toString() ?? "0"
  );

  // La fecha y la hora se mantienen separadas en el formulario.
  // Así evitamos construir accidentalmente valores como:
  // 2026-10-20T18:45:00T18:45:00
  const [date, setDate] = useState(
    match?.date?.includes("T")
      ? match.date.split("T")[0] ?? ""
      : match?.date ?? ""
  );

  const [time, setTime] = useState(
    match?.date?.includes("T")
      ? match.date.split("T")[1]?.slice(0, 5) ?? ""
      : ""
  );

  const [stadium, setStadium] = useState(
    match?.stadium ?? ""
  );

  const [status, setStatus] = useState<Match["status"]>(
    match?.status ?? "Programado"
  );

  const [matchDuration, setMatchDuration] = useState<number>(
    match?.matchDuration ?? 90
  );

  const [hasPenalties, setHasPenalties] = useState<boolean>(
    match?.homePenaltyScore !== null &&
      match?.homePenaltyScore !== undefined &&
      match?.awayPenaltyScore !== null &&
      match?.awayPenaltyScore !== undefined
  );

  const [homePenaltyScore, setHomePenaltyScore] = useState<string>(
    match?.homePenaltyScore?.toString() ?? ""
  );

  const [awayPenaltyScore, setAwayPenaltyScore] = useState<string>(
    match?.awayPenaltyScore?.toString() ?? ""
  );

  const selectedCompetition = competitions.find(
    (competition) =>
      competition.id === Number(competitionId)
  );

  const selectedHomeTeam = teams.find(
    (team) =>
      team.id === Number(homeTeamId)
  );

  const registeredTeamIds = new Set(
    teamCompetitions
      .filter(
        (relation) =>
          relation.active === true &&
          relation.seasonId === Number(seasonId) &&
          relation.competitionId === Number(competitionId)
      )
      .map(
        (relation) =>
          relation.teamId
      )
  );

  const filteredTeams = [...teams]
    .filter((team) => {
      if (
        !selectedCompetition ||
        !seasonId ||
        !competitionId
      ) {
        return false;
      }

      if (
        selectedCompetition.competitionType ===
        "National Team"
      ) {
        if (
          selectedCompetition.confederation ===
          "FIFA"
        ) {
          return team.type === "Selección";
        }

        return (
          team.type === "Selección" &&
          team.confederation ===
            selectedCompetition.confederation
        );
      }

      const isRegisteredForCompetition =
        registeredTeamIds.has(team.id);

      const isCurrentEditedTeam =
        !!match &&
        (
          team.id === match.homeTeamId ||
          team.id === match.awayTeamId
        );

      return (
        team.type === "Club" &&
        (
          isRegisteredForCompetition ||
          isCurrentEditedTeam
        )
      );
    })
    .sort((a, b) =>
      a.shortName.localeCompare(
        b.shortName,
        "es",
        {
          sensitivity: "base",
        }
      )
    );

  const availableStages = stages
    .filter(
      (stage) =>
        stage.seasonId === Number(seasonId) &&
        stage.active
    )
    .sort((a, b) => {
      const numberA =
        a.name.match(/\d+/)?.[0];

      const numberB =
        b.name.match(/\d+/)?.[0];

      const stageNumberA =
        numberA !== undefined
          ? Number(numberA)
          : null;

      const stageNumberB =
        numberB !== undefined
          ? Number(numberB)
          : null;

      if (
        stageNumberA !== null &&
        stageNumberB !== null
      ) {
        return (
          stageNumberB -
          stageNumberA
        );
      }

      return (
        (b.displayOrder ?? 0) -
        (a.displayOrder ?? 0)
      );
    });

  const handleCompetitionChange = (
    value: string
  ) => {
    setCompetitionId(value);
    setHomeTeamId("");
    setAwayTeamId("");
    setStadium("");
  };

  const handleSeasonChange = (
    value: string
  ) => {
    setSeasonId(value);
    setStageId("");
    setHomeTeamId("");
    setAwayTeamId("");
    setStadium("");
  };

  const handleHomeTeamChange = (
    value: string
  ) => {
    setHomeTeamId(value);

    const selectedTeam = teams.find(
      (team) =>
        team.id === Number(value)
    );

    if (!selectedTeam) {
      setStadium("");
      return;
    }

    if (
      selectedTeam.type === "Club"
    ) {
      setStadium(
        selectedTeam.stadium ?? ""
      );

      return;
    }

    setStadium("");
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setFormError("");

    if (!competitionId) {
      setFormError(
        "Selecciona una competición."
      );
      return;
    }

    if (!seasonId) {
      setFormError(
        "Selecciona una temporada."
      );
      return;
    }

    if (!stageId) {
      setFormError(
        "Selecciona una fase o jornada."
      );
      return;
    }

    if (!homeTeamId) {
      setFormError(
        "Selecciona el equipo local."
      );
      return;
    }

    if (!awayTeamId) {
      setFormError(
        "Selecciona el equipo visitante."
      );
      return;
    }

    if (
      homeTeamId === awayTeamId
    ) {
      setFormError(
        "El equipo local y el visitante no pueden ser el mismo."
      );
      return;
    }

    if (!date) {
      setFormError(
        "Selecciona la fecha del partido."
      );
      return;
    }

    if (
      selectedHomeTeam?.type === "Club" &&
      !stadium.trim()
    ) {
      setFormError(
        "El equipo local es un club y necesita tener un estadio."
      );
      return;
    }

    if (
      matchDuration !== 90 &&
      matchDuration !== 120
    ) {
      setFormError(
        "La duración del partido debe ser de 90 o 120 minutos."
      );
      return;
    }

    if (hasPenalties) {
      if (
        homePenaltyScore === "" ||
        awayPenaltyScore === ""
      ) {
        setFormError(
          "Introduce el resultado de la tanda de penaltis para ambos equipos."
        );
        return;
      }

      const homePenalties =
        Number(homePenaltyScore);

      const awayPenalties =
        Number(awayPenaltyScore);

      if (
        !Number.isInteger(homePenalties) ||
        !Number.isInteger(awayPenalties) ||
        homePenalties < 0 ||
        awayPenalties < 0
      ) {
        setFormError(
          "El resultado de los penaltis debe ser un número entero igual o superior a 0."
        );
        return;
      }

      if (
        homePenalties === awayPenalties
      ) {
        setFormError(
          "La tanda de penaltis no puede terminar empatada."
        );
        return;
      }
    }

    // date contiene únicamente YYYY-MM-DD y time únicamente HH:mm.
    // Construimos el valor datetime una sola vez al guardar.
    const dateTime = time
      ? `${date}T${time}:00`
      : date;

    const matchData: Omit<
      Match,
      "id"
    > = {
      competitionId:
        Number(competitionId),

      seasonId:
        Number(seasonId),

      stageId:
        Number(stageId),

      homeTeamId:
        Number(homeTeamId),

      awayTeamId:
        Number(awayTeamId),

      homeScore:
        Number(homeScore),

      awayScore:
        Number(awayScore),

      date: dateTime,

      stadium:
        stadium.trim(),

      status,

      matchDuration,

      homePenaltyScore:
        hasPenalties
          ? Number(homePenaltyScore)
          : null,

      awayPenaltyScore:
        hasPenalties
          ? Number(awayPenaltyScore)
          : null,
    };

    onSaved(matchData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 md:p-6 lg:p-8"
    >
      {formError && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:p-4" role="alert">
          {formError}
        </div>
      )}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl font-bold sm:text-2xl">
          {match
            ? "Editar partido"
            : "Nuevo partido"}
        </h2>

        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          {match
            ? "Modifica los datos del partido."
            : "Introduce los datos del nuevo partido."}
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6">

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Competición
          </label>

          <select
            value={competitionId}
            onChange={(event) =>
              handleCompetitionChange(
                event.target.value
              )
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
            required
            disabled={dataLoading}
          >
            <option value="">
              {dataLoading
                ? "Cargando competiciones..."
                : "Seleccionar competición"}
            </option>

            {competitions
              .filter(
                (competition) =>
                  competition.active
              )
              .map(
                (competition) => (
                  <option
                    key={competition.id}
                    value={competition.id}
                  >
                    {competition.name}
                  </option>
                )
              )}
          </select>
        </div>

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Temporada
          </label>

          <select
            value={seasonId}
            onChange={(event) =>
              handleSeasonChange(
                event.target.value
              )
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
            required
            disabled={dataLoading}
          >
            <option value="">
              {dataLoading
                ? "Cargando temporadas..."
                : "Seleccionar temporada"}
            </option>

            {seasons
              .filter(
                (season) =>
                  season.active
              )
              .map(
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

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Fase / Jornada
          </label>

          <select
            value={stageId}
            onChange={(event) =>
              setStageId(
                event.target.value
              )
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
            required
            disabled={
              dataLoading ||
              !seasonId
            }
          >
            <option value="">
              {dataLoading
                ? "Cargando fases..."
                : !seasonId
                  ? "Selecciona primero una temporada"
                  : availableStages.length === 0
                    ? "No hay fases / jornadas"
                    : "Seleccionar fase / jornada"}
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

        {/* FECHA Y HORA EN UNA FILA PROPIA */}

        <div className="min-w-0 md:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Fecha
              </label>

              <input
                type="date"
                value={date}
                onChange={(event) => {
                  // Guardamos solo la fecha.
                  setDate(event.target.value);
                }}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
                required
              />
            </div>

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Hora
              </label>

              <input
                type="time"
                value={time}
                onChange={(event) => {
                  const newTime =
                    event.target.value;

                  // La hora se guarda por separado.
                  // No modificamos `date` aquí para evitar duplicar la hora
                  // al hacer submit.
                  setTime(newTime);
                }}
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
              />
            </div>

          </div>
        </div>

        {/* ESPACIO ANTES DE LOS EQUIPOS */}

        <div className="hidden md:block md:col-span-2 h-1" />

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Equipo local
          </label>

          <select
            value={homeTeamId}
            onChange={(event) =>
              handleHomeTeamChange(
                event.target.value
              )
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
            required
            disabled={
              !competitionId ||
              !seasonId ||
              teamsLoading
            }
          >
            <option value="">
              {teamsLoading
                ? "Cargando equipos..."
                : !competitionId
                  ? "Selecciona primero una competición"
                  : !seasonId
                    ? "Selecciona primero una temporada"
                    : filteredTeams.length === 0
                      ? "No hay equipos disponibles"
                      : "Seleccionar equipo local"}
            </option>

            {filteredTeams.map(
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

          {selectedHomeTeam && (
            <p className="mt-1 text-xs text-slate-500">
              Tipo:{" "}
              {selectedHomeTeam.type}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Equipo visitante
          </label>

          <select
            value={awayTeamId}
            onChange={(event) =>
              setAwayTeamId(
                event.target.value
              )
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
            required
            disabled={
              !competitionId ||
              !seasonId ||
              teamsLoading
            }
          >
            <option value="">
              {teamsLoading
                ? "Cargando equipos..."
                : !competitionId
                  ? "Selecciona primero una competición"
                  : !seasonId
                    ? "Selecciona primero una temporada"
                    : filteredTeams.length === 0
                      ? "No hay equipos disponibles"
                      : "Seleccionar equipo visitante"}
            </option>

            {filteredTeams.map(
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
        </div>

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Goles local
          </label>

          <input
            type="number"
            min="0"
            value={homeScore}
            onChange={(event) =>
              setHomeScore(
                event.target.value
              )
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
          />
        </div>

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Goles visitante
          </label>

          <input
            type="number"
            min="0"
            value={awayScore}
            onChange={(event) =>
              setAwayScore(
                event.target.value
              )
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
          />
        </div>

        <div className="min-w-0 md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Estadio
          </label>

          <input
            type="text"
            value={stadium}
            onChange={(event) =>
              setStadium(
                event.target.value
              )
            }
            placeholder={
              selectedHomeTeam?.type === "Club"
                ? "Estadio del club"
                : "Introduce el estadio"
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
          />

          {selectedHomeTeam?.type ===
            "Club" && (
            <p className="mt-1 text-xs text-slate-500">
              Estadio rellenado automáticamente
              según el club local. Puedes
              modificarlo si es necesario.
            </p>
          )}

          {selectedHomeTeam?.type ===
            "Selección" && (
            <p className="mt-1 text-xs text-slate-500">
              Las selecciones pueden jugar en
              distintos estadios. Introduce el
              estadio del partido.
            </p>
          )}
        </div>

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Estado
          </label>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as Match["status"]
              )
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
          >
            <option value="Programado">
              Programado
            </option>

            <option value="Jugado">
              Jugado
            </option>

            <option value="Cancelado">
              Cancelado
            </option>
          </select>
        </div>

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Duración
          </label>

          <select
            value={matchDuration}
            onChange={(event) =>
              setMatchDuration(
                Number(event.target.value)
              )
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
            required
          >
            <option value={90}>
              90 minutos
            </option>

            <option value={120}>
              120 minutos (prórroga)
            </option>
          </select>

          <p className="mt-1 text-xs text-slate-500">
            Utiliza 120 minutos cuando el partido
            incluye prórroga.
          </p>
        </div>

        <div className="min-w-0 md:col-span-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={hasPenalties}
              onChange={(event) =>
                setHasPenalties(
                  event.target.checked
                )
              }
              className="h-5 w-5 rounded border-slate-300"
            />

            <span className="text-sm font-semibold text-slate-700">
              Penaltis
            </span>
          </label>
        </div>

        {hasPenalties && (
          <div className="grid min-w-0 grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 md:col-span-2">

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {selectedHomeTeam?.name ??
                  "Equipo local"}
              </label>

              <input
                type="number"
                min="0"
                value={homePenaltyScore}
                onChange={(event) =>
                  setHomePenaltyScore(
                    event.target.value
                  )
                }
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
              />
            </div>

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {teams.find(
                  (team) =>
                    team.id ===
                    Number(awayTeamId)
                )?.name ??
                  "Equipo visitante"}
              </label>

              <input
                type="number"
                min="0"
                value={awayPenaltyScore}
                onChange={(event) =>
                  setAwayPenaltyScore(
                    event.target.value
                  )
                }
                className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 sm:px-4 sm:py-3"
              />
            </div>

          </div>
        )}

      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:mt-8 sm:flex-row sm:justify-end">

        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={
            dataLoading ||
            teamsLoading
          }
          className="w-full rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {match
            ? "Guardar cambios"
            : "Crear partido"}
        </button>

      </div>
    </form>
  );
}
