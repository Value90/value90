"use client";

import { useEffect, useRef, useState } from "react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicPageHeader from "@/components/public/PublicPageHeader";
import { getPublicJson, type PublicFilters, type PublicPageResult } from "@/components/public/public-api";

interface PublicMatch { id: number; date: string; status: string; homeTeam: string; awayTeam: string; homeScore: number | null; awayScore: number | null; competitionName: string; stageName: string }
function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: number; name: string }> }) {
  return <label><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"><option value="">Todas</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}
function madridToday() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function formatDate(value: string) {
  // Los horarios guardados desde administración representan hora local de Madrid,
  // aunque PostgreSQL/Supabase los serialice con sufijo UTC.
  const wallTime = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/)?.[0];
  if (!wallTime) return value;
  const parsed = new Date(`${wallTime}Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

export default function PublicMatches({ initialFilters, initialResult }: { initialFilters?: PublicFilters; initialResult?: PublicPageResult<PublicMatch> }) {
  const [filters, setFilters] = useState<PublicFilters | null>(initialFilters ?? null);
  const [result, setResult] = useState<PublicPageResult<PublicMatch> | null>(initialResult ?? null);
  const [competitionId, setCompetitionId] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [stageId, setStageId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [date, setDate] = useState(() => madridToday());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!initialResult);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialFilters) return;
    const controller = new AbortController();
    getPublicJson<PublicFilters>(new URLSearchParams({ section: "filters" }), controller.signal)
      .then(setFilters)
      .catch((loadError: unknown) => { if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los filtros."); });
    return () => controller.abort();
  }, [initialFilters]);

  const params = new URLSearchParams({ section: "matches", page: String(page), limit: "24" });
  if (competitionId) params.set("competitionId", competitionId);
  if (seasonId) params.set("seasonId", seasonId);
  if (stageId) params.set("stageId", stageId);
  if (teamId) params.set("teamId", teamId);
  if (date) params.set("date", date);
  const requestKey = params.toString();
  const lastRequestKey = useRef(initialResult ? new URLSearchParams({ section: "matches", page: "1", limit: "24", date: madridToday() }).toString() : "");

  useEffect(() => {
    if (requestKey === lastRequestKey.current) return;
    lastRequestKey.current = requestKey;
    const controller = new AbortController();
    setLoading(true); setError("");
    getPublicJson<PublicPageResult<PublicMatch>>(params, controller.signal)
      .then(setResult)
      .catch((loadError: unknown) => { if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los partidos."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      getPublicJson<PublicPageResult<PublicMatch>>(new URLSearchParams(requestKey)).then(setResult).catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [requestKey]);

  function setFilter(setter: (value: string) => void, value: string) { setter(value); setPage(1); }
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 24)));

  return <div className="min-h-screen bg-slate-50 text-slate-900"><PublicHeader /><main>
    <PublicPageHeader eyebrow="Calendario y resultados" title="Partidos" description="Consulta los encuentros de hoy, agrupados por competición. Usa los filtros para buscar otras fechas, competiciones, temporadas, jornadas o equipos." />
    <section className="mx-auto max-w-[1440px] px-4 py-7 sm:px-8 sm:py-10 lg:px-10">
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-5">
        <SelectFilter label="Competición" value={competitionId} onChange={(value) => setFilter(setCompetitionId, value)} options={filters?.competitions ?? []} />
        <SelectFilter label="Temporada" value={seasonId} onChange={(value) => setFilter(setSeasonId, value)} options={(filters?.seasons ?? []).map((item) => ({ id: item.id, name: item.name }))} />
        <SelectFilter label="Jornada / fase" value={stageId} onChange={(value) => setFilter(setStageId, value)} options={(filters?.stages ?? []).filter((item) => !seasonId || item.season_id === Number(seasonId)).map((item) => ({ id: item.id, name: item.name }))} />
        <SelectFilter label="Equipo" value={teamId} onChange={(value) => setFilter(setTeamId, value)} options={filters?.teams ?? []} />
        <label><span className="mb-1.5 block text-xs font-bold text-slate-600">Fecha</span><input type="date" value={date === "all" ? "" : date} onChange={(event) => setFilter(setDate, event.target.value || "all")} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
        <div className="flex items-end"><button type="button" onClick={() => { setCompetitionId(""); setSeasonId(""); setStageId(""); setTeamId(""); setDate("all"); setPage(1); }} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver todos los días</button><button type="button" onClick={() => { setCompetitionId(""); setSeasonId(""); setStageId(""); setTeamId(""); setDate(madridToday()); setPage(1); }} className="ml-2 h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hoy</button></div>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-slate-500"><span>{loading ? "Buscando partidos…" : `${(result?.total ?? 0).toLocaleString("es-ES")} partidos`}</span><span className="hidden sm:inline">Ordenados del más reciente al más antiguo</span></div>
      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}
      {loading && !result ? <p className="py-16 text-center text-sm text-slate-500" role="status">Cargando partidos…</p> : (result?.items.length ?? 0) === 0 ? <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-10 text-center"><h2 className="font-bold">No hay partidos con esos filtros</h2><p className="mt-2 text-sm text-slate-500">Prueba con otra fecha o competición.</p></div> : <div className="mt-4 space-y-6">{Object.entries(result!.items.reduce<Record<string, PublicMatch[]>>((groups, match) => { (groups[match.competitionName] ??= []).push(match); return groups; }, {})).map(([competition, matches]) => <section key={competition} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><h2 className="border-b border-slate-100 bg-slate-50 px-5 py-3 font-black text-slate-800">{competition}</h2><div className="divide-y divide-slate-100">{matches.map((match) => <article key={match.id} className="p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-500">{match.stageName}</p><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${match.status === "EN VIVO" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{match.status}</span></div><div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-1 sm:gap-3"><p className="truncate text-right text-xs font-bold sm:text-base">{match.homeTeam}</p><span className="text-xs font-black sm:text-base">{match.homeScore ?? "—"}</span><span className="text-[10px] font-semibold text-slate-400 sm:text-sm">vs</span><span className="text-xs font-black sm:text-base">{match.awayScore ?? "—"}</span><p className="truncate text-left text-xs font-bold sm:text-base">{match.awayTeam}</p></div><p className={`mt-3 text-center text-xs ${match.status === "EN VIVO" ? "font-black text-red-600" : "text-slate-500"}`}>{match.status === "EN VIVO" ? "EN VIVO" : formatDate(match.date)}</p></article>)}</div></section>)}</div>}
      {result && result.total > result.pageSize && <nav className="mt-7 flex items-center justify-center gap-3" aria-label="Paginación"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold disabled:opacity-40">Anterior</button><span className="text-sm text-slate-600">Página {page} de {totalPages}</span><button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold disabled:opacity-40">Siguiente</button></nav>}
    </section>
  </main><PublicFooter /></div>;
}
