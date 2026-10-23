"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { getPublicJson } from "@/components/public/public-api";

interface Overview {
  statistics: { players: number; teams: number; matches: number; calculatedRatings: number };
  featuredPlayers: Array<{ playerId: number; playerName: string; teamName: string; score: number; matches: number }>;
  matches: Array<{ id: number; date: string; homeTeam: string; awayTeam: string; homeScore: number | null; awayScore: number | null; status: string; competitionName: string }>;
}

function rating(value: number) {
  return value.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function count(value: number) {
  return value.toLocaleString("es-ES");
}

function date(value: string) {
  const wallTime = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!wallTime) return value;
  const parsed = new Date(`${wallTime}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("es-ES", { day: "2-digit", month: "short", timeZone: "UTC" });
}

function madridToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function PublicHome({ initialData }: { initialData?: Overview }) {
  const [data, setData] = useState<Overview | null>(initialData ?? null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!initialData);
  const matchesByCompetition = Object.entries((data?.matches ?? []).reduce<Record<string, Overview["matches"]>>((groups, match) => {
    (groups[match.competitionName] ??= []).push(match);
    return groups;
  }, {}));

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ section: "overview" });
    if (!initialData) getPublicJson<Overview>(params, controller.signal)
      .then(setData)
      .catch((loadError: unknown) => { if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los datos."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const refresh = window.setInterval(() => {
      const matchesParams = new URLSearchParams({ section: "matches", page: "1", limit: "50", date: madridToday() });
      getPublicJson<{ items: Overview["matches"] }>(matchesParams, controller.signal)
        .then((matches) => setData((current) => current ? { ...current, matches: matches.items } : current))
        .catch(() => undefined);
    }, 60_000);
    return () => { controller.abort(); window.clearInterval(refresh); };
  }, [initialData]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />
      <main>
        <section className="overflow-hidden bg-slate-950 text-white">
          <div className="mx-auto grid max-w-[1440px] items-center gap-6 px-4 py-7 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Rendimiento de fútbol, medido</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">El valor real también se mide.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Explora jugadores, equipos y partidos a través de datos de rendimiento y valoraciones V90.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link href="/public/rankings" className="rounded-xl bg-emerald-500 px-6 py-3.5 text-center text-sm font-bold text-slate-950 hover:bg-emerald-400">Explorar rankings</Link>
                <Link href="/public/partidos" className="rounded-xl border border-white/20 px-6 py-3.5 text-center text-sm font-bold text-white hover:bg-white/10">Ver partidos</Link>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Ranking V90</p><h2 className="mt-2 text-xl font-black sm:text-2xl">Mejor puntuación media</h2></div>
                <Link href="/public/rankings" className="shrink-0 text-sm font-bold text-emerald-300 hover:text-emerald-200">Ver todo →</Link>
              </div>
              {loading ? <p className="py-10 text-sm text-slate-400" role="status">Cargando datos reales…</p> : error ? <p className="py-10 text-sm text-amber-200" role="alert">{error}</p> : (
                <ol className="mt-5 divide-y divide-white/10">
                  {(data?.featuredPlayers ?? []).map((player, index) => (
                    <li key={player.playerId} className="flex items-center gap-3 py-3">
                      <span className="w-7 text-sm font-black text-emerald-300">{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0 flex-1"><p className="truncate font-bold">{player.playerName}</p><p className="truncate text-xs text-slate-400">{player.teamName} · {player.matches} partidos</p></div>
                      <span className="text-xl font-black text-emerald-300">{rating(player.score)}</span>
                    </li>
                  ))}
                  {!data?.featuredPlayers.length && <li className="py-8 text-sm text-slate-400">Aún no hay valoraciones calculadas.</li>}
                </ol>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1440px] grid-cols-2 gap-3 px-4 py-8 sm:grid-cols-3 sm:gap-4 sm:px-8 lg:grid-cols-5 lg:px-10">
          {[
            ["Jugadores", data?.statistics.players], ["Equipos", data?.statistics.teams],
            ["Partidos", data?.statistics.matches], ["Valoraciones V90", data?.statistics.calculatedRatings],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-2xl font-black text-slate-900 sm:text-3xl">{loading || !data ? "—" : count(Number(value ?? 0))}</p>
              <p className="mt-1 text-xs font-bold text-slate-500 sm:text-sm">{label}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto grid max-w-[1440px] gap-8 px-4 pb-14 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="font-black">Partidos de hoy</h2><Link href="/public/partidos" className="text-sm font-bold text-emerald-700">Ver calendario →</Link></div>
            {loading ? <p className="p-6 text-sm text-slate-500" role="status">Cargando partidos…</p> : matchesByCompetition.length ? <div className="divide-y divide-slate-100">{matchesByCompetition.map(([competition, matches]) => <section key={competition}><h3 className="bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-600">{competition}</h3><ul className="divide-y divide-slate-100">{matches.map((match) => <li key={match.id} className="px-4 py-4 sm:px-5"><p className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-1 text-xs font-bold sm:gap-3 sm:text-sm"><span className="truncate text-right">{match.homeTeam}</span><span>{match.homeScore ?? "—"}</span><span className="text-slate-400">vs</span><span>{match.awayScore ?? "—"}</span><span className="truncate">{match.awayTeam}</span></p><p className={`mt-2 text-center text-xs ${match.status === "EN VIVO" ? "font-black text-red-600" : "text-slate-500"}`}>{match.status === "EN VIVO" ? "EN VIVO" : `${date(match.date)} · ${match.status}`}</p></li>)}</ul></section>)}</div> : <p className="p-6 text-sm text-slate-500">No hay partidos disponibles hoy.</p>}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
