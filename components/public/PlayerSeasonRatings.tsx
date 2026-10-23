"use client";

import { useState } from "react";

interface SeasonTotal { seasonId: number; seasonName: string; score: number | null; matches: number; teams: string[] }
interface MatchRating { id: number; seasonId: number; seasonName: string; date: string; homeTeam: string; awayTeam: string; homeScore: number | null; awayScore: number | null; rating: number }

function formatMatchDate(value: string) {
  const wallTime = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/)?.[0];
  if (!wallTime) return value;
  const parsed = new Date(`${wallTime}Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export default function PlayerSeasonRatings({ seasons, matchHistory, currentSeasonId }: { seasons: SeasonTotal[]; matchHistory: MatchRating[]; currentSeasonId: number | null }) {
  const [view, setView] = useState<"totals" | "matches">("totals");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const buttons = [
    { id: "totals" as const, label: "Totales" },
    { id: "matches" as const, label: "Por partido" },
  ];

  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-black">Valoraciones V90</h2><div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Vista de valoraciones">{buttons.map((button) => <button key={button.id} type="button" onClick={() => setView(button.id)} aria-pressed={view === button.id} className={`min-h-10 rounded-lg px-3 text-xs font-bold transition sm:px-4 sm:text-sm ${view === button.id ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{button.label}</button>)}</div></div>

    {view === "totals" ? seasons.length ? <div className="mt-5 space-y-3">{seasons.map((season) => <section key={season.seasonId} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{season.seasonName}{season.seasonId === currentSeasonId ? " · Actual" : ""}</h3><span className="text-xl font-black text-emerald-700">{season.score == null ? "—" : season.score.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span></div><p className="mt-1 text-sm text-slate-500">{season.matches} partidos · {season.teams.join(", ") || "Sin equipo registrado"}</p></section>)}</div> : <p className="mt-4 text-sm text-slate-500">Aún no hay valoraciones calculadas para este jugador.</p> : <div className="mt-5">
      <label className="mb-4 block max-w-sm"><span className="mb-1.5 block text-xs font-bold text-slate-600">Temporada</span><select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">Todas las temporadas</option>{seasons.map((season) => <option key={season.seasonId} value={season.seasonId}>{season.seasonName}</option>)}</select></label>
      {matchHistory.filter((match) => seasonFilter === "all" || match.seasonId === Number(seasonFilter)).length ? <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Partido</th><th className="px-4 py-3">Resultado</th><th className="px-4 py-3 text-right">V90</th></tr></thead><tbody className="divide-y divide-slate-100">{matchHistory.filter((match) => seasonFilter === "all" || match.seasonId === Number(seasonFilter)).map((match) => <tr key={match.id}><td className="whitespace-nowrap px-4 py-3 text-slate-600"><span className="block">{formatMatchDate(match.date)}</span><span className="text-xs text-slate-400">{match.seasonName}</span></td><td className="px-4 py-3 font-semibold">{match.homeTeam} <span className="text-slate-400">vs</span> {match.awayTeam}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{match.homeScore ?? "—"} : {match.awayScore ?? "—"}</td><td className="px-4 py-3 text-right font-black text-emerald-700">{match.rating.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td></tr>)}</tbody></table></div> : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No hay valoraciones de partido para esta temporada.</p>}
    </div>}
  </article>;
}
