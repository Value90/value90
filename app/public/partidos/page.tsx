"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import PublicHeader from "@/components/public/PublicHeader";
import PublicPageHeader from "@/components/public/PublicPageHeader";

type Match = {
  id: number;
  competition: string;
  season: string;
  round: string;
  date: string;
  status: "Finalizado" | "Próximo";
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

const matches: Match[] = [
  {
    id: 1,
    competition: "LaLiga",
    season: "2026/27",
    round: "Jornada 5",
    date: "20 Sep 2026",
    status: "Finalizado",
    homeTeam: "Real Madrid",
    awayTeam: "Sevilla",
    homeScore: 3,
    awayScore: 1,
  },
  {
    id: 2,
    competition: "Premier League",
    season: "2026/27",
    round: "Jornada 6",
    date: "19 Sep 2026",
    status: "Finalizado",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    homeScore: 2,
    awayScore: 0,
  },
  {
    id: 3,
    competition: "Serie A",
    season: "2026/27",
    round: "Jornada 4",
    date: "19 Sep 2026",
    status: "Finalizado",
    homeTeam: "Inter",
    awayTeam: "Milan",
    homeScore: 1,
    awayScore: 1,
  },
  {
    id: 4,
    competition: "Bundesliga",
    season: "2026/27",
    round: "Jornada 5",
    date: "18 Sep 2026",
    status: "Finalizado",
    homeTeam: "Bayern München",
    awayTeam: "Dortmund",
    homeScore: 3,
    awayScore: 2,
  },
  {
    id: 5,
    competition: "LaLiga",
    season: "2026/27",
    round: "Jornada 5",
    date: "18 Sep 2026",
    status: "Finalizado",
    homeTeam: "Barcelona",
    awayTeam: "Villarreal",
    homeScore: 2,
    awayScore: 1,
  },
  {
    id: 6,
    competition: "LaLiga",
    season: "2026/27",
    round: "Jornada 4",
    date: "14 Sep 2026",
    status: "Finalizado",
    homeTeam: "Atlético de Madrid",
    awayTeam: "Valencia",
    homeScore: 2,
    awayScore: 2,
  },
  {
    id: 7,
    competition: "Premier League",
    season: "2026/27",
    round: "Jornada 6",
    date: "14 Sep 2026",
    status: "Finalizado",
    homeTeam: "Liverpool",
    awayTeam: "Manchester City",
    homeScore: 1,
    awayScore: 2,
  },
  {
    id: 8,
    competition: "Serie A",
    season: "2026/27",
    round: "Jornada 4",
    date: "13 Sep 2026",
    status: "Finalizado",
    homeTeam: "Juventus",
    awayTeam: "Napoli",
    homeScore: 2,
    awayScore: 1,
  },
];

const competitions = [
  "Todas",
  "LaLiga",
  "Premier League",
  "Serie A",
  "Bundesliga",
];

const seasons = ["Todas", "2026/27"];

const rounds = [
  "Todas",
  "Jornada 4",
  "Jornada 5",
  "Jornada 6",
];

export default function PublicMatchesPage() {
  const [selectedSeason, setSelectedSeason] = useState("Todas");
  const [selectedCompetition, setSelectedCompetition] = useState("Todas");
  const [selectedRound, setSelectedRound] = useState("Todas");

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const seasonMatch =
        selectedSeason === "Todas" ||
        match.season === selectedSeason;

      const competitionMatch =
        selectedCompetition === "Todas" ||
        match.competition === selectedCompetition;

      const roundMatch =
        selectedRound === "Todas" ||
        match.round === selectedRound;

      return seasonMatch && competitionMatch && roundMatch;
    });
  }, [
    selectedSeason,
    selectedCompetition,
    selectedRound,
  ]);

  const clearFilters = () => {
    setSelectedSeason("Todas");
    setSelectedCompetition("Todas");
    setSelectedRound("Todas");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />

      <main>
        <PublicPageHeader
          eyebrow="Partidos"
          title="Partidos"
          description="Consulta resultados, jornadas y competiciones y accede al análisis de cada encuentro."
        />

        <section className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          {/* FILTROS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Filtrar partidos
              </h2>

              <p className="text-sm text-slate-500">
                Selecciona los criterios que quieres consultar.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {/* TEMPORADA */}
              <FilterSelect
                label="Temporada"
                value={selectedSeason}
                options={seasons}
                onChange={setSelectedSeason}
              />

              {/* COMPETICIÓN */}
              <FilterSelect
                label="Competición"
                value={selectedCompetition}
                options={competitions}
                onChange={setSelectedCompetition}
              />

              {/* JORNADA */}
              <FilterSelect
                label="Jornada"
                value={selectedRound}
                options={rounds}
                onChange={setSelectedRound}
              />
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                <span className="font-bold text-slate-900">
                  {filteredMatches.length}
                </span>{" "}
                partidos encontrados
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="h-10 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          {/* LISTADO */}
          <div className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-1 w-5 rounded-full bg-emerald-500" />

                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">
                    Resultados
                  </span>
                </div>

                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-900">
                  Últimos partidos
                </h2>
              </div>
            </div>

            {filteredMatches.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">
                  {filteredMatches.map((match) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5 text-slate-400"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900">
                  No se encontraron partidos
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Prueba con otros filtros.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

interface MatchRowProps {
  match: Match;
}

function MatchRow({ match }: MatchRowProps) {
  return (
    <article className="group transition hover:bg-slate-50">
      <div className="grid grid-cols-1 gap-5 px-5 py-6 md:grid-cols-[190px_minmax(0,1fr)_120px] md:items-center md:px-7">
        {/* INFORMACIÓN */}
        <div className="flex items-center justify-between gap-4 md:block">
          <div>
            <div className="text-sm font-bold text-slate-900">
              {match.competition}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              {match.season} · {match.round}
            </div>
          </div>

          <div className="text-right md:mt-3 md:text-left">
            <div className="text-xs font-medium text-slate-400">
              {match.date}
            </div>

            <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-600">
              {match.status}
            </span>
          </div>
        </div>

        {/* PARTIDO */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
          {/* LOCAL */}
          <div className="flex min-w-0 items-center justify-end gap-3">
            <span className="truncate text-right text-sm font-bold text-slate-900 sm:text-base">
              {match.homeTeam}
            </span>

            <TeamBadge teamName={match.homeTeam} />
          </div>

          {/* RESULTADO CENTRADO */}
          <div className="flex min-w-[82px] flex-col items-center">
            <div className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              <span>{match.homeScore}</span>

              <span className="text-slate-300">-</span>

              <span>{match.awayScore}</span>
            </div>

            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Final
            </span>
          </div>

          {/* VISITANTE */}
          <div className="flex min-w-0 items-center justify-start gap-3">
            <TeamBadge teamName={match.awayTeam} />

            <span className="truncate text-sm font-bold text-slate-900 sm:text-base">
              {match.awayTeam}
            </span>
          </div>
        </div>

        {/* ACCIÓN */}
        <div className="flex justify-center md:justify-end">
          <Link
            href={`/public/partidos/${match.id}`}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
          >
            Ver partido

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}

function TeamBadge({ teamName }: { teamName: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black text-slate-500 sm:h-11 sm:w-11">
      {getTeamInitials(teamName)}
    </div>
  );
}

function getTeamInitials(teamName: string) {
  return teamName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}