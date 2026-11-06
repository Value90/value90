"use client";

import { useEffect, useMemo, useState } from "react";
import { getSeasons, type Season } from "@/services/season.service";
import { getCompetitions, type Competition } from "@/services/competition.service";
import { getStages, type Stage } from "@/services/stage.service";
import { sortStagesDescending } from "@/lib/stage-order";
import { getMatches, type Match } from "@/services/match.service";
import { getTeams, type Team } from "@/services/team.service";
import {
  getV90MatchStatusByMatch,
  type V90MatchStatusSummary,
} from "@/services/v90-match.service";

function isPastMatch(match: Match, now: number): boolean {
  return new Date(match.date).getTime() < now;
}

export default function DatosV90Page() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [v90ByMatch, setV90ByMatch] = useState<Map<number, V90MatchStatusSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedSeasonId, setSelectedSeasonId] = useState<number | "">("");
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | "">("");
  const [selectedStageId, setSelectedStageId] = useState<number | "">("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setRefreshing(true);
      setError("");

      try {
        const [seasonData, competitionData, stageData, matchData, teamData, statusData] =
          await Promise.all([
            getSeasons(),
            getCompetitions(),
            getStages(),
            getMatches(),
            getTeams(),
            getV90MatchStatusByMatch(),
          ]);

        if (!mounted) return;

        setSeasons(seasonData);
        setCompetitions(competitionData);
        setStages(stageData);
        setMatches(matchData);
        setTeams(teamData);
        setV90ByMatch(statusData);
      } catch (loadError) {
        console.error("Error cargando el resumen V90:", loadError);
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los datos V90.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadData();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const availableSeasons = useMemo(
    () => seasons.filter((season) => season.active),
    [seasons],
  );

  const availableCompetitions = useMemo(() => {
    if (!selectedSeasonId) return [];
    const competitionIds = new Set(
      matches
        .filter((match) => match.seasonId === selectedSeasonId)
        .map((match) => match.competitionId),
    );

    return competitions
      .filter((competition) => competition.active && competitionIds.has(competition.id))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [competitions, matches, selectedSeasonId]);

  const availableStages = useMemo(() => {
    if (!selectedSeasonId || !selectedCompetitionId) return [];
    const stageIds = new Set(
      matches
        .filter(
          (match) =>
            match.seasonId === selectedSeasonId &&
            match.competitionId === selectedCompetitionId,
        )
        .map((match) => match.stageId),
    );

    return sortStagesDescending(stages
      .filter(
        (stage) =>
          stage.active &&
          stage.seasonId === selectedSeasonId &&
          stageIds.has(stage.id),
      ));
  }, [matches, selectedCompetitionId, selectedSeasonId, stages]);

  useEffect(() => {
    if (!selectedSeasonId && availableSeasons.length) {
      setSelectedSeasonId(availableSeasons[0].id);
    }
  }, [availableSeasons, selectedSeasonId]);

  useEffect(() => {
    if (!selectedSeasonId || selectedCompetitionId || !availableCompetitions.length) return;

    const latestPlayedCompetition = availableCompetitions
      .map((competition) => ({
        competition,
        latestPlayedDate: matches
          .filter(
            (match) =>
              match.seasonId === selectedSeasonId &&
              match.competitionId === competition.id &&
              match.status === "Jugado" &&
              new Date(match.date).getTime() <= Date.now(),
          )
          .reduce(
            (latest, match) => Math.max(latest, new Date(match.date).getTime()),
            0,
          ),
      }))
      .sort((a, b) => b.latestPlayedDate - a.latestPlayedDate)[0]?.competition;

    setSelectedCompetitionId((latestPlayedCompetition ?? availableCompetitions[0]).id);
  }, [availableCompetitions, matches, selectedCompetitionId, selectedSeasonId]);

  useEffect(() => {
    if (!selectedCompetitionId || selectedStageId || !availableStages.length) return;

    const latestPlayedStage = availableStages.find((stage) =>
      matches.some(
        (match) =>
          match.stageId === stage.id &&
          match.status === "Jugado" &&
          new Date(match.date).getTime() <= Date.now(),
      ),
    );

    setSelectedStageId((latestPlayedStage ?? availableStages[0]).id);
  }, [availableStages, matches, selectedCompetitionId, selectedStageId]);

  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId);
  const selectedCompetition = competitions.find(
    (competition) => competition.id === selectedCompetitionId,
  );
  const selectedStage = stages.find((stage) => stage.id === selectedStageId);

  const selectedStageMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.seasonId === selectedSeasonId &&
          match.competitionId === selectedCompetitionId &&
          match.stageId === selectedStageId,
      ),
    [matches, selectedCompetitionId, selectedSeasonId, selectedStageId],
  );

  const stageSummary = useMemo(() => {
    const statuses = selectedStageMatches.map((match) => ({
      match,
      status: v90ByMatch.get(match.id),
    }));

    const matchAverageValues = statuses.flatMap(({ status }) =>
      status?.average == null ? [] : [status.average],
    );

    return {
      matchCount: statuses.length,
      matchesWithV90: statuses.filter(
        ({ status }) => Boolean(status && status.calculated > 0),
      ).length,
      matchesWithIncidents: statuses.filter(({ match, status }) => {
        const past = isPastMatch(match, Date.now());
        return (
          past &&
          (match.status === "Cancelado" ||
            match.status === "Programado" ||
            (match.status === "Jugado" &&
              (!status || status.pending > 0 || status.errors > 0)))
        );
      }).length,
      average:
        matchAverageValues.length > 0
          ? matchAverageValues.reduce((sum, value) => sum + value, 0) /
            matchAverageValues.length
          : null,
    };
  }, [selectedStageMatches, v90ByMatch]);

  const pastIncidents = useMemo(
    () =>
      selectedStageMatches
        .filter((match) => {
          if (!isPastMatch(match, Date.now())) return false;
          const status = v90ByMatch.get(match.id);
          return (
            match.status === "Cancelado" ||
            match.status === "Programado" ||
            (match.status === "Jugado" &&
              (!status || status.pending > 0 || status.errors > 0))
          );
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [selectedStageMatches, v90ByMatch],
  );

  const teamsById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );

  const teamName = (teamId: number) =>
    teamsById.get(teamId)?.shortName ??
    teamsById.get(teamId)?.name ??
    "Equipo desconocido";

  const incidentDescription = (match: Match) => {
    const status = v90ByMatch.get(match.id);
    if (match.status === "Cancelado") {
      return "Partido cancelado o suspendido; no se genera V90.";
    }
    if (match.status === "Programado") {
      return "La fecha ya pasó y sigue como programado. Confirma si se aplazó o se disputó.";
    }
    if (!status) {
      return "No hay cálculo V90 registrado. Revisa participaciones y valoraciones.";
    }
    if (status.errors > 0) {
      return status.errors + " cálculo(s) con error.";
    }
    if (status.pending > 0) {
      return status.pending + " participación(es) pendiente(s) de datos.";
    }
    return "El cálculo del partido está incompleto.";
  };

  const refresh = () => setRefreshKey((current) => current + 1);

  return (
    <div className="w-full min-w-0 space-y-6 p-3 sm:space-y-8 sm:p-5 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Datos V90</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Resumen de la jornada más reciente y seguimiento de cálculos pendientes.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading || refreshing}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
        >
          {refreshing ? "Actualizando…" : "Actualizar"}
        </button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-800 sm:text-lg">Filtros</h2>
          <p className="mt-1 text-sm text-slate-500">
            Selecciona la temporada, competición y jornada que quieres consultar.
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
          <label className="min-w-0 text-sm font-semibold text-slate-700">
            Temporada
            <select
              value={selectedSeasonId}
              onChange={(event) => {
                setSelectedSeasonId(event.target.value ? Number(event.target.value) : "");
                setSelectedCompetitionId("");
                setSelectedStageId("");
              }}
              disabled={loading}
              className="mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
            >
              <option value="">Selecciona temporada</option>
              {availableSeasons.map((season) => (
                <option key={season.id} value={season.id}>{season.name}</option>
              ))}
            </select>
          </label>

          <label className="min-w-0 text-sm font-semibold text-slate-700">
            Competición
            <select
              value={selectedCompetitionId}
              onChange={(event) => {
                setSelectedCompetitionId(event.target.value ? Number(event.target.value) : "");
                setSelectedStageId("");
              }}
              disabled={loading || !selectedSeasonId}
              className="mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
            >
              <option value="">Selecciona competición</option>
              {availableCompetitions.map((competition) => (
                <option key={competition.id} value={competition.id}>{competition.name}</option>
              ))}
            </select>
          </label>

          <label className="min-w-0 text-sm font-semibold text-slate-700">
            Jornada
            <select
              value={selectedStageId}
              onChange={(event) =>
                setSelectedStageId(event.target.value ? Number(event.target.value) : "")
              }
              disabled={loading || !selectedCompetitionId}
              className="mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
            >
              <option value="">Selecciona jornada</option>
              {availableStages.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800 sm:text-xl">Resumen de jornada</h2>
          <p className="mt-1 text-sm text-slate-500">
            {selectedSeason?.name ?? "Temporada"} · {selectedCompetition?.name ?? "Competición"} · {selectedStage?.name ?? "Jornada"}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Partidos de la jornada</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{loading ? "…" : stageSummary.matchCount}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Partidos con V90 generado</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{loading ? "…" : stageSummary.matchesWithV90}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Pendientes o incidencias</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{loading ? "…" : stageSummary.matchesWithIncidents}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">V90 medio de jornada</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">
              {loading || stageSummary.average === null ? "—" : stageSummary.average.toFixed(3)}
            </p>
          </article>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800 sm:text-xl">Incidencias de jornadas pasadas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Partidos pasados cancelados, aún programados o con cálculos incompletos.
          </p>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Cargando incidencias…</div>
          ) : pastIncidents.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              No hay incidencias pasadas en la jornada seleccionada.
            </div>
          ) : (
            pastIncidents.map((match) => (
              <article
                key={match.id}
                className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {teamName(match.homeTeamId)} vs {teamName(match.awayTeamId)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(match.date).toLocaleDateString("es-ES")} · {selectedStage?.name ?? "Jornada"}
                  </p>
                </div>
                <p className="text-sm text-amber-800">{incidentDescription(match)}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
