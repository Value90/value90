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

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [teamCompetitions, setTeamCompetitions] =
    useState<TeamCompetition[]>([]);

  const [dataLoading, setDataLoading] =
    useState(true);

  const [teamsLoading, setTeamsLoading] =
    useState(true);

  /*
   * ============================================================
   * CARGAR COMPETICIONES, TEMPORADAS Y FASES
   * ============================================================
   */

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

        setCompetitions(
          competitionsData
        );

        setSeasons(
          seasonsData
        );

        setStages(
          stagesData
        );
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

  /*
   * ============================================================
   * CARGAR EQUIPOS
   * ============================================================
   */

  useEffect(() => {
    const loadTeams = async () => {
      try {
        setTeamsLoading(true);

        const data =
          await getTeams();

        setTeams(data);
      } catch (error) {
        console.error(
          "Error obteniendo equipos:",
          error
        );

        setTeams([]);
      } finally {
        setTeamsLoading(false);
      }
    };

    loadTeams();
  }, []);

  /*
   * ============================================================
   * ESTADO DEL FORMULARIO
   * ============================================================
   */

  const [competitionId, setCompetitionId] =
    useState(
      match?.competitionId?.toString() ?? ""
    );

  const [seasonId, setSeasonId] =
    useState(
      match?.seasonId?.toString() ?? ""
    );

  /*
   * ============================================================
   * CARGAR RELACIÓN EQUIPO ↔ COMPETICIÓN POR TEMPORADA
   * ============================================================
   */

  useEffect(() => {
    const loadTeamCompetitions = async () => {
      if (!seasonId) {
        setTeamCompetitions([]);
        return;
      }

      try {
        const data =
          await getTeamCompetitionsBySeason(
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


  const [stageId, setStageId] =
    useState(
      match?.stageId?.toString() ?? ""
    );

  const [homeTeamId, setHomeTeamId] =
    useState(
      match?.homeTeamId?.toString() ?? ""
    );

  const [awayTeamId, setAwayTeamId] =
    useState(
      match?.awayTeamId?.toString() ?? ""
    );

  const [homeScore, setHomeScore] =
    useState(
      match?.homeScore?.toString() ?? "0"
    );

  const [awayScore, setAwayScore] =
    useState(
      match?.awayScore?.toString() ?? "0"
    );

  const [date, setDate] =
    useState(
      match?.date ?? ""
    );

  const [stadium, setStadium] =
    useState(
      match?.stadium ?? ""
    );

  const [status, setStatus] =
    useState<Match["status"]>(
      match?.status ?? "Programado"
    );

  const [matchDuration, setMatchDuration] =
    useState<number>(
      match?.matchDuration ?? 90
    );

  const [hasPenalties, setHasPenalties] =
    useState<boolean>(
      match?.homePenaltyScore !== null &&
      match?.homePenaltyScore !== undefined &&
      match?.awayPenaltyScore !== null &&
      match?.awayPenaltyScore !== undefined
    );

  const [homePenaltyScore, setHomePenaltyScore] =
    useState<string>(
      match?.homePenaltyScore?.toString() ?? ""
    );

  const [awayPenaltyScore, setAwayPenaltyScore] =
    useState<string>(
      match?.awayPenaltyScore?.toString() ?? ""
    );

  /*
   * ============================================================
   * COMPETICIÓN SELECCIONADA
   * ============================================================
   */

  const selectedCompetition =
    competitions.find(
      (competition) =>
        competition.id ===
        Number(competitionId)
    );

  /*
   * ============================================================
   * EQUIPO LOCAL SELECCIONADO
   * ============================================================
   */

  const selectedHomeTeam =
    teams.find(
      (team) =>
        team.id ===
        Number(homeTeamId)
    );

  /*
   * ============================================================
   * EQUIPOS FILTRADOS Y ORDENADOS
   * ============================================================
   */

  const filteredTeams = [...teams]
    .filter((team) => {
      if (!selectedCompetition || !seasonId) {
        return false;
      }

      /*
       * ========================================================
       * COMPETICIONES DE SELECCIONES
       * ========================================================
       */

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

      /*
       * ========================================================
       * COMPETICIONES DE CLUBES
       * ========================================================
       *
       * Un club solo aparece si está relacionado
       * explícitamente con la competición Y temporada
       * seleccionadas en hist_team_competitions.
       *
       * Ya NO usamos:
       *
       *   team.competitionId
       *
       * porque ese campo solo representa la competición
       * principal/histórica del equipo y no permite modelar
       * correctamente una participación simultánea como:
       *
       *   Real Madrid → LaLiga + Champions
       */

      const isRegisteredForCompetition =
        teamCompetitions.some(
          (relation) =>
            relation.active &&
            relation.teamId === team.id &&
            relation.competitionId ===
              Number(competitionId) &&
            relation.seasonId === Number(seasonId)
        );

      /*
       * Al editar un partido existente, conservamos
       * temporalmente sus equipos aunque la relación histórica
       * todavía no esté registrada, para no romper partidos
       * ya existentes.
       */

      const isCurrentEditedTeam =
        !!match &&
        (team.id === match.homeTeamId ||
          team.id === match.awayTeamId);

      return (
        team.type === "Club" &&
        (isRegisteredForCompetition ||
          isCurrentEditedTeam)
      );
    })
    .sort((a, b) =>
      a.shortName.localeCompare(b.shortName, "es", {
        sensitivity: "base",
      })
    );
  /*
   * ============================================================
   * JORNADAS / FASES DISPONIBLES
   * ============================================================
   *
   * Las jornadas se ordenan por el número que aparece
   * en el nombre:
   *
   * Jornada 4
   * Jornada 3
   * Jornada 2
   * Jornada 1
   *
   * No dependemos de displayOrder porque puede no coincidir
   * con el número real de la jornada.
   */

  const availableStages =
    stages
      .filter(
        (stage) =>
          stage.seasonId ===
            Number(seasonId) &&
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

        /*
         * Si ambas fases tienen número,
         * ordenar de mayor a menor.
         */

        if (
          stageNumberA !== null &&
          stageNumberB !== null
        ) {
          return (
            stageNumberB -
            stageNumberA
          );
        }

        /*
         * Si alguna no tiene número,
         * usamos displayOrder como respaldo.
         */

        return (
          (b.displayOrder ?? 0) -
          (a.displayOrder ?? 0)
        );
      });

  /*
   * ============================================================
   * CAMBIO DE COMPETICIÓN
   * ============================================================
   */

  const handleCompetitionChange = (
    value: string
  ) => {
    setCompetitionId(value);

    /*
     * Cambiar de competición invalida
     * los equipos y el estadio seleccionados.
     */

    setHomeTeamId("");
    setAwayTeamId("");
    setStadium("");
  };

  /*
   * ============================================================
   * CAMBIO DE TEMPORADA
   * ============================================================
   */

  const handleSeasonChange = (
    value: string
  ) => {
    setSeasonId(value);

    /*
     * La jornada / fase seleccionada
     * puede dejar de ser válida.
     */

    setStageId("");
  };

  /*
   * ============================================================
   * CAMBIO DE EQUIPO LOCAL
   * ============================================================
   *
   * REGLA DE VALUE90:
   *
   * Club
   *   → usar su estadio habitual
   *
   * Selección
   *   → no asumir un estadio concreto
   * ============================================================
   */

  const handleHomeTeamChange = (
    value: string
  ) => {
    setHomeTeamId(value);

    const selectedTeam =
      teams.find(
        (team) =>
          team.id ===
          Number(value)
      );

    if (!selectedTeam) {
      setStadium("");
      return;
    }

    if (
      selectedTeam.type ===
      "Club"
    ) {
      setStadium(
        selectedTeam.stadium ?? ""
      );

      return;
    }

    /*
     * Las selecciones pueden disputar
     * partidos en distintos estadios.
     *
     * No asignamos uno automáticamente.
     */

    setStadium("");
  };

  /*
   * ============================================================
   * GUARDAR
   * ============================================================
   */

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    /*
     * COMPETICIÓN
     */

    if (!competitionId) {
      alert(
        "Selecciona una competición."
      );

      return;
    }

    /*
     * TEMPORADA
     */

    if (!seasonId) {
      alert(
        "Selecciona una temporada."
      );

      return;
    }

    /*
     * FASE / JORNADA
     */

    if (!stageId) {
      alert(
        "Selecciona una fase o jornada."
      );

      return;
    }

    /*
     * EQUIPO LOCAL
     */

    if (!homeTeamId) {
      alert(
        "Selecciona el equipo local."
      );

      return;
    }

    /*
     * EQUIPO VISITANTE
     */

    if (!awayTeamId) {
      alert(
        "Selecciona el equipo visitante."
      );

      return;
    }

    /*
     * MISMO EQUIPO
     */

    if (
      homeTeamId === awayTeamId
    ) {
      alert(
        "El equipo local y el visitante no pueden ser el mismo."
      );

      return;
    }

    /*
     * FECHA
     */

    if (!date) {
      alert(
        "Selecciona la fecha del partido."
      );

      return;
    }

    /*
     * ESTADIO
     *
     * Para un club debería existir su estadio habitual.
     * Para una selección puede ser introducido manualmente.
     */

    if (
      selectedHomeTeam?.type ===
        "Club" &&
      !stadium.trim()
    ) {
      alert(
        "El equipo local es un club y necesita tener un estadio."
      );

      return;
    }

    /*
     * DATOS DEL PARTIDO
     */

    /*
     * ============================================================
     * DURACIÓN DEL PARTIDO
     * ============================================================
     */

    if (
      matchDuration !== 90 &&
      matchDuration !== 120
    ) {
      alert(
        "La duración del partido debe ser de 90 o 120 minutos."
      );

      return;
    }

    /*
     * ============================================================
     * PENALTIS
     * ============================================================
     */

    if (hasPenalties) {
      if (
        homePenaltyScore === "" ||
        awayPenaltyScore === ""
      ) {
        alert(
          "Introduce el resultado de la tanda de penaltis para ambos equipos."
        );
        return;
      }

      const homePenalties = Number(homePenaltyScore);
      const awayPenalties = Number(awayPenaltyScore);

      if (
        !Number.isInteger(homePenalties) ||
        !Number.isInteger(awayPenalties) ||
        homePenalties < 0 ||
        awayPenalties < 0
      ) {
        alert(
          "El resultado de los penaltis debe ser un número entero igual o superior a 0."
        );
        return;
      }

      if (homePenalties === awayPenalties) {
        alert(
          "La tanda de penaltis no puede terminar empatada."
        );
        return;
      }
    }

    /*
     * ============================================================
     * DATOS DEL PARTIDO
     * ============================================================
     */

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

      date,

      stadium:
        stadium.trim(),

      status,

      matchDuration,

      homePenaltyScore: hasPenalties
        ? Number(homePenaltyScore)
        : null,

      awayPenaltyScore: hasPenalties
        ? Number(awayPenaltyScore)
        : null,
    };

    /*
     * DEVOLVER DATOS A LA PÁGINA
     */

    onSaved(matchData);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-8">

        <h2 className="text-2xl font-bold">
          {match
            ? "Editar partido"
            : "Nuevo partido"}
        </h2>

        <p className="mt-2 text-slate-600">
          {match
            ? "Modifica los datos del partido."
            : "Introduce los datos del nuevo partido."}
        </p>

      </div>

      {/* ======================================================
          FORMULARIO
          ====================================================== */}

      <div className="grid grid-cols-2 gap-6">

        {/* ====================================================
            COMPETICIÓN
            ==================================================== */}

        <div>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
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

        {/* ====================================================
            TEMPORADA
            ==================================================== */}

        <div>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
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

        {/* ====================================================
            FASE / JORNADA
            ==================================================== */}

        <div>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
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
                  : availableStages.length ===
                      0
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

        {/* ====================================================
            FECHA
            ==================================================== */}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Fecha
          </label>

          <input
            type="date"
            value={
              date.includes("T")
                ? date.split("T")[0]
                : date
            }
            onChange={(event) =>
              setDate(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
            required
          />
        </div>

        {/* ====================================================
            EQUIPO LOCAL
            ==================================================== */}

        <div>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
            required
            disabled={
              !competitionId ||
              teamsLoading
            }
          >
            <option value="">
              {teamsLoading
                ? "Cargando equipos..."
                : !competitionId
                  ? "Selecciona primero una competición"
                  : filteredTeams.length ===
                      0
                    ? "No hay equipos disponibles"
                    : "Seleccionar equipo local"}
            </option>

            {filteredTeams.map(
              (team) => (
                <option
                  key={team.id}
                  value={team.id}
                >
                  {team.shortName} - {team.name}
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

        {/* ====================================================
            EQUIPO VISITANTE
            ==================================================== */}

        <div>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
            required
            disabled={
              !competitionId ||
              teamsLoading
            }
          >
            <option value="">
              {teamsLoading
                ? "Cargando equipos..."
                : !competitionId
                  ? "Selecciona primero una competición"
                  : filteredTeams.length ===
                      0
                    ? "No hay equipos disponibles"
                    : "Seleccionar equipo visitante"}
            </option>

            {filteredTeams.map(
              (team) => (
                <option
                  key={team.id}
                  value={team.id}
                >
                  {team.shortName} - {team.name}
                </option>
              )
            )}
          </select>
        </div>

        {/* ====================================================
            GOLES LOCAL
            ==================================================== */}

        <div>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
          />
        </div>

        {/* ====================================================
            GOLES VISITANTE
            ==================================================== */}

        <div>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
          />
        </div>

        {/* ====================================================
            ESTADIO
            ==================================================== */}

        <div className="col-span-2">

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
              selectedHomeTeam?.type ===
              "Club"
                ? "Estadio del club"
                : "Introduce el estadio"
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
          />

          {selectedHomeTeam?.type ===
            "Club" && (
            <p className="mt-1 text-xs text-slate-500">
              Estadio rellenado
              automáticamente según el club
              local. Puedes modificarlo si es
              necesario.
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

        {/* ====================================================
            ESTADO
            ==================================================== */}

        <div>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
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

        {/* ====================================================
            DURACIÓN DEL PARTIDO
            ==================================================== */}

        <div>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
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

        {/* ====================================================
            PENALTIS
            ==================================================== */}

        <div className="col-span-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={hasPenalties}
              onChange={(event) =>
                setHasPenalties(event.target.checked)
              }
              className="h-5 w-5 rounded border-slate-300"
            />

            <span className="text-sm font-semibold text-slate-700">
              Penaltis
            </span>
          </label>
        </div>

        {hasPenalties && (
          <div className="col-span-2 grid grid-cols-2 gap-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {selectedHomeTeam?.name ?? "Equipo local"}
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
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {teams.find(
                  (team) =>
                    team.id === Number(awayTeamId)
                )?.name ?? "Equipo visitante"}
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
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
              />
            </div>
          </div>
        )}

      </div>

      {/* ======================================================
          BOTONES
          ====================================================== */}

      <div className="mt-8 flex justify-end gap-3">

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={
            dataLoading ||
            teamsLoading
          }
          className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {match
            ? "Guardar cambios"
            : "Crear partido"}
        </button>

      </div>

    </form>
  );
}