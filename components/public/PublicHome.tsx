"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getPublicPlayers, type PublicPlayer } from "@/services/player.service";
import { getPublicTeams, type PublicTeam } from "@/services/team.service";
import {
  getPublicCompetitions,
  type PublicCompetition,
} from "@/services/competition.service";
import { getPublicMatches, type PublicMatch } from "@/services/match.service";
import {
  getPublicPlayerV90MatchFacts,
  type PublicPlayerV90MatchFact,
} from "@/services/v90-match.service";

interface FeaturedPlayer {
  player: PublicPlayer;
  teamName: string;
  v90: number;
  variation: number | null;
  trend: number[];
}

interface RankingPlayer extends FeaturedPlayer {
  rank: number;
}

function formatNumber(value: number | null | undefined, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return value.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDate(dateValue: string) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue.slice(0, 10);
  }

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getScore(match: PublicMatch) {
  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;

  return `${home} - ${away}`;
}

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="h-8 w-20 rounded bg-slate-50" aria-hidden="true" />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x =
        values.length === 1
          ? 50
          : (index / (values.length - 1)) * 100;

      const y = 30 - ((value - min) / range) * 24;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 32"
      className="h-8 w-20"
      role="img"
      aria-label="Evolución V90"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-500"
      />
    </svg>
  );
}

function BigTrendChart({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        Aún no hay suficientes datos V90 para mostrar la evolución.
      </div>
    );
  }

  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x =
        values.length === 1
          ? 50
          : 10 + (index / (values.length - 1)) * 80;

      const y = 86 - ((value - min) / range) * 68;

      return `${x},${y}`;
    })
    .join(" ");

  const last = values[values.length - 1];

  return (
    <div className="relative">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
            Evolución V90
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Rendimiento acumulado en partidos calculados.
          </p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-black tracking-tight text-white">
            {formatNumber(last)}
          </p>
          <p className="text-xs text-emerald-300">V90 actual</p>
        </div>
      </div>

      <div className="relative h-48 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <div className="absolute inset-x-4 top-1/4 border-t border-white/10" />
        <div className="absolute inset-x-4 top-1/2 border-t border-white/10" />
        <div className="absolute inset-x-4 top-3/4 border-t border-white/10" />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)]"
        >
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-400"
          />
        </svg>

        <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[10px] text-slate-500">
          <span>Inicio</span>
          <span>Partidos</span>
          <span>Actual</span>
        </div>
      </div>
    </div>
  );
}

export default function PublicHome() {
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [teams, setTeams] = useState<PublicTeam[]>([]);
  const [competitions, setCompetitions] = useState<PublicCompetition[]>([]);
  const [matches, setMatches] = useState<PublicMatch[]>([]);
  const [facts, setFacts] = useState<PublicPlayerV90MatchFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadHomeData() {
      try {
        setLoading(true);
        setLoadError("");

        const [
          playersData,
          teamsData,
          competitionsData,
          matchesData,
          factsData,
        ] = await Promise.all([
          getPublicPlayers(),
          getPublicTeams(),
          getPublicCompetitions(),
          getPublicMatches(),
          getPublicPlayerV90MatchFacts(),
        ]);

        if (!mounted) return;

        setPlayers(playersData);
        setTeams(teamsData);
        setCompetitions(competitionsData);
        setMatches(matchesData);
        setFacts(factsData.filter((fact) => Number.isFinite(fact.v90Match)));
      } catch (error) {
        console.error("Error cargando Home pública:", error);

        if (mounted) {
          setLoadError(
            "No se pudieron cargar algunos datos de Value90."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadHomeData();

    return () => {
      mounted = false;
    };
  }, []);

  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams]
  );

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players]
  );

  const competitionMap = useMemo(
    () =>
      new Map(
        competitions.map((competition) => [
          competition.id,
          competition,
        ])
      ),
    [competitions]
  );

  const matchMap = useMemo(
    () => new Map(matches.map((match) => [match.id, match])),
    [matches]
  );

  const calculatedFacts = useMemo(
    () =>
      [...facts].sort(
        (a, b) =>
          new Date(b.calculatedAt).getTime() -
          new Date(a.calculatedAt).getTime()
      ),
    [facts]
  );

  const playerAggregates = useMemo(() => {
    const map = new Map<
      number,
      {
        contribution: number;
        weight: number;
        values: Array<{
          v90: number;
          date: string;
        }>;
      }
    >();

    for (const fact of facts) {
      const current = map.get(fact.playerId) ?? {
        contribution: 0,
        weight: 0,
        values: [],
      };

      current.contribution += fact.weightedContribution;
      current.weight += fact.totalWeight;

      const match = matchMap.get(fact.matchId);

      current.values.push({
        v90: fact.v90Match,
        date: match?.date ?? fact.calculatedAt,
      });

      map.set(fact.playerId, current);
    }

    return map;
  }, [facts, matchMap]);

  const rankingPlayers = useMemo<RankingPlayer[]>(() => {
    return Array.from(playerAggregates.entries())
      .map(([playerId, aggregate]) => {
        const player = playerMap.get(playerId);

        if (!player || aggregate.weight <= 0) {
          return null;
        }

        const orderedValues = [...aggregate.values].sort(
          (a, b) =>
            new Date(a.date).getTime() -
            new Date(b.date).getTime()
        );

        const v90 =
          aggregate.contribution / aggregate.weight;

        const recentValues = orderedValues
          .slice(-8)
          .map((item) => item.v90);

        const previousValues = orderedValues
          .slice(-16, -8)
          .map((item) => item.v90);

        const previousAverage =
          previousValues.length > 0
            ? previousValues.reduce(
                (sum, value) => sum + value,
                0
              ) / previousValues.length
            : null;

        const variation =
          previousAverage === null
            ? null
            : v90 - previousAverage;

        const latestMatch =
          orderedValues[orderedValues.length - 1];

        return {
          player,
          teamName:
            teamMap.get(
              facts.find(
                (fact) =>
                  fact.playerId === playerId &&
                  fact.v90Match === latestMatch?.v90
              )?.teamId ?? 0
            )?.shortName ??
            teamMap.get(
              facts.find(
                (fact) => fact.playerId === playerId
              )?.teamId ?? 0
            )?.shortName ??
            teamMap.get(
              facts.find(
                (fact) => fact.playerId === playerId
              )?.teamId ?? 0
            )?.name ??
            "Sin equipo",
          v90,
          variation,
          trend: recentValues,
        };
      })
      .filter(
        (item): item is RankingPlayer => item !== null
      )
      .sort((a, b) => b.v90 - a.v90)
      .slice(0, 10)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }, [facts, playerAggregates, playerMap, teamMap]);

  const featuredPlayers = rankingPlayers.slice(0, 4);

  const topPlayerTrend = featuredPlayers[0]?.trend ?? [];

  const recentMatches = useMemo(() => {
    return [...matches]
      .filter(
        (match) =>
          match.status !== "Programado" ||
          match.homeScore !== null ||
          match.awayScore !== null
      )
      .sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      )
      .slice(0, 5);
  }, [matches]);

  const activeCompetitions = useMemo(
    () =>
      competitions
        .filter((competition) => competition.active)
        .sort((a, b) =>
          a.name.localeCompare(b.name, "es", {
            sensitivity: "base",
          })
        )
        .slice(0, 6),
    [competitions]
  );

  const calculatedPlayerCount = useMemo(
    () =>
      new Set(
        calculatedFacts.map((fact) => fact.playerId)
      ).size,
    [calculatedFacts]
  );

  const latestV90 = featuredPlayers[0]?.v90 ?? null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/public" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl font-black text-white">
              V
            </div>

            <div>
              <div className="text-xl font-black tracking-[-0.04em] text-slate-900">
                VALUE<span className="text-emerald-600">90</span>
              </div>
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Football data & player value
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {[
              ["Inicio", "/public"],
              ["Jugadores", "/public/jugadores"],
              ["Equipos", "/public/equipos"],
              ["Partidos", "/public/partidos"],
              ["Rankings", "/public/rankings"],
              ["Estadísticas", "/public/estadisticas"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-semibold text-slate-600 transition hover:text-emerald-600"
              >
                {label}
              </Link>
            ))}
          </nav>

          <Link
            href="/login"
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Acceder
          </Link>
        </div>
      </header>

      <main>
        <section className="overflow-hidden bg-slate-950">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-24">
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="h-1 w-8 rounded-full bg-emerald-500" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                  Value90
                </span>
              </div>

              <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
                El valor real
                <br />
                <span className="text-emerald-400">
                  también se mide.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                Datos. Rendimiento. Contexto. Valor.
                <br />
                Value90 convierte el rendimiento real de competición
                en una nueva forma de valorar a los futbolistas.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/public/jugadores"
                  className="rounded-xl bg-emerald-500 px-6 py-3.5 text-center text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                >
                  Explorar jugadores →
                </Link>

                <Link
                  href="/public/estadisticas"
                  className="rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-center text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Cómo funciona
                </Link>
              </div>

              <div className="mt-10 grid gap-5 sm:grid-cols-3">
                {[
                  ["Datos reales", "de competición"],
                  ["Análisis", "de rendimiento"],
                  ["Valoración", "objetiva"],
                ].map(([title, subtitle]) => (
                  <div key={title}>
                    <p className="text-sm font-bold text-white">
                      {title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {subtitle}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur sm:p-7">
              <BigTrendChart values={topPlayerTrend} />

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-slate-500">Jugadores V90</p>
                  <p className="mt-1 text-lg font-black text-white">
                    {loading ? "…" : calculatedPlayerCount}
                  </p>
                </div>

                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-slate-500">
                    Valoraciones
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    {loading ? "…" : calculatedFacts.length}
                  </p>
                </div>

                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-slate-500">
                    V90 líder
                  </p>
                  <p className="mt-1 text-lg font-black text-emerald-400">
                    {formatNumber(latestV90)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loadError && (
          <div className="mx-auto max-w-[1440px] px-5 pt-6 sm:px-8 lg:px-10">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {loadError}
            </div>
          </div>
        )}

        <section className="mx-auto -mt-1 max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                value: players.length,
                label: "Jugadores",
                text: "en nuestra base de datos",
              },
              {
                value: teams.length,
                label: "Equipos",
                text: "registrados en Value90",
              },
              {
                value: competitions.filter((item) => item.active).length,
                label: "Competiciones",
                text: "activas en la plataforma",
              },
              {
                value: matches.length,
                label: "Partidos",
                text: "registrados en la base de datos",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-3xl font-black tracking-tight text-slate-900">
                  {loading ? "…" : stat.value.toLocaleString("es-ES")}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {stat.label}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {stat.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 pb-10 sm:px-8 lg:px-10">
          <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
            <div>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">
                    V90
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                    Jugadores destacados
                  </h2>
                </div>

                <Link
                  href="/public/jugadores"
                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
                >
                  Ver todos →
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {loading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-[330px] animate-pulse rounded-2xl border border-slate-200 bg-white"
                      />
                    ))
                  : featuredPlayers.map((item) => {
                      const variation =
                        item.variation !== null
                          ? item.variation
                          : null;

                      return (
                        <div
                          key={item.player.id}
                          className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className="relative flex h-40 items-end justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-white to-emerald-50">
                            <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-emerald-600 text-2xl font-black text-white shadow-lg">
                              {getInitials(item.player.name)}
                            </div>

                            <div className="absolute right-3 top-3 rounded-lg bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
                              V90
                            </div>
                          </div>

                          <div className="p-4">
                            <p className="truncate text-base font-black text-slate-900">
                              {item.player.name}
                            </p>

                            <p className="mt-1 truncate text-xs font-medium text-slate-500">
                              {item.teamName}
                            </p>

                            <div className="mt-4 flex items-end justify-between gap-3">
                              <div>
                                <p className="text-2xl font-black tracking-tight text-slate-900">
                                  {formatNumber(item.v90)}
                                </p>

                                {variation !== null && (
                                  <p
                                    className={`mt-1 text-xs font-bold ${
                                      variation >= 0
                                        ? "text-emerald-600"
                                        : "text-red-500"
                                    }`}
                                  >
                                    {variation >= 0 ? "↑" : "↓"}{" "}
                                    {variation >= 0 ? "+" : ""}
                                    {formatNumber(variation)}
                                  </p>
                                )}
                              </div>

                              <MiniSparkline values={item.trend} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
              </div>

              {!loading && featuredPlayers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <p className="font-bold text-slate-700">
                    Todavía no hay jugadores con V90 calculado.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Cuando existan cálculos activos, aparecerán aquí
                    automáticamente.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">
                    Ranking
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">
                    Ranking V90
                  </h2>
                </div>

                <Link
                  href="/public/rankings"
                  className="text-sm font-bold text-emerald-600"
                >
                  Ver ranking →
                </Link>
              </div>

              <div className="mt-5 space-y-1">
                {rankingPlayers.slice(0, 5).map((item) => (
                  <div
                    key={item.player.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50"
                  >
                    <span className="w-5 text-center text-xs font-black text-slate-400">
                      {item.rank}
                    </span>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">
                      {getInitials(item.player.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {item.player.name}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {item.teamName}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">
                        {formatNumber(item.v90)}
                      </p>

                      {item.variation !== null && (
                        <p
                          className={`text-[10px] font-bold ${
                            item.variation >= 0
                              ? "text-emerald-600"
                              : "text-red-500"
                          }`}
                        >
                          {item.variation >= 0 ? "+" : ""}
                          {formatNumber(item.variation)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {!loading && rankingPlayers.length === 0 && (
                  <p className="py-10 text-center text-sm text-slate-400">
                    Aún no hay ranking V90 disponible.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">
                  Actualidad
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">
                  Últimos partidos analizados
                </h2>
              </div>

              <Link
                href="/public/partidos"
                className="text-sm font-bold text-emerald-600"
              >
                Ver todos →
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[90px_1fr_1.4fr_90px] gap-4 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 sm:grid">
                <span>Fecha</span>
                <span>Competición</span>
                <span>Partido</span>
                <span className="text-right">Resultado</span>
              </div>

              {recentMatches.map((match) => {
                const homeTeam =
                  teamMap.get(match.homeTeamId);
                const awayTeam =
                  teamMap.get(match.awayTeamId);
                const competition =
                  competitionMap.get(match.competitionId);

                return (
                  <div
                    key={match.id}
                    className="grid gap-2 border-t border-slate-100 px-5 py-4 sm:grid-cols-[90px_1fr_1.4fr_90px] sm:items-center sm:gap-4"
                  >
                    <span className="text-xs font-bold text-slate-500">
                      {formatDate(match.date)}
                    </span>

                    <span className="text-xs font-semibold text-emerald-600">
                      {competition?.name ?? "Competición"}
                    </span>

                    <span className="text-sm font-bold text-slate-800">
                      {homeTeam?.shortName ??
                        homeTeam?.name ??
                        "Local"}{" "}
                      <span className="mx-1 text-slate-300">—</span>{" "}
                      {awayTeam?.shortName ??
                        awayTeam?.name ??
                        "Visitante"}
                    </span>

                    <span className="text-left text-sm font-black text-slate-900 sm:text-right">
                      {getScore(match)}
                    </span>
                  </div>
                );
              })}

              {!loading && recentMatches.length === 0 && (
                <div className="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-400">
                  Todavía no hay partidos registrados.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-10">
          <div className="overflow-hidden rounded-[28px] bg-emerald-950 px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                Talento. Rendimiento. Oportunidad.
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Descubre el próximo gran fichaje.
              </h2>

              <p className="mt-3 text-sm leading-6 text-emerald-100/70">
                Analiza jugadores, compara rendimiento y descubre
                qué futbolistas están creciendo dentro del modelo V90.
              </p>
            </div>

            <Link
              href="/public/jugadores"
              className="mt-7 inline-flex rounded-xl bg-emerald-400 px-6 py-3.5 text-sm font-black text-emerald-950 transition hover:bg-emerald-300 lg:mt-0"
            >
              Ver jugadores →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <p className="text-lg font-black">
              VALUE<span className="text-emerald-600">90</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              El fútbol también se puede analizar.
            </p>
          </div>

          <div className="flex flex-wrap gap-5 text-xs font-semibold text-slate-500">
            <Link href="/public/jugadores">Jugadores</Link>
            <Link href="/public/equipos">Equipos</Link>
            <Link href="/public/partidos">Partidos</Link>
            <Link href="/public/rankings">Rankings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
