"use client";

import { useEffect, useRef, useState } from "react";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicPageHeader from "@/components/public/PublicPageHeader";
import { getPublicJson, type PublicFilters, type PublicPageResult } from "@/components/public/public-api";

interface RankedPlayer { playerId: number; playerName: string; teamName: string; score: number; matches: number }

function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: number; name: string }> }) {
  return <label><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"><option value="">Todas</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>;
}

export default function PublicRankings({ initialFilters, initialResult }: { initialFilters?: PublicFilters; initialResult?: PublicPageResult<RankedPlayer> }) {
  const [filters, setFilters] = useState<PublicFilters | null>(initialFilters ?? null);
  const [result, setResult] = useState<PublicPageResult<RankedPlayer> | null>(initialResult ?? null);
  const [search, setSearch] = useState("");
  const [stableSearch, setStableSearch] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [seasonId, setSeasonId] = useState(() => String(initialFilters?.seasons.find((season) => season.active)?.id ?? ""));
  const [teamId, setTeamId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [minMatches, setMinMatches] = useState("1");
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

  useEffect(() => {
    const timer = window.setTimeout(() => { setStableSearch(search.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams({ section: "rankings", page: String(page), limit: "20", minMatches });
  if (stableSearch) params.set("q", stableSearch);
  if (competitionId) params.set("competitionId", competitionId);
  if (seasonId) params.set("seasonId", seasonId);
  if (teamId) params.set("teamId", teamId);
  if (positionId) params.set("positionId", positionId);
  const requestKey = params.toString();
  const lastRequestKey = useRef(initialResult ? new URLSearchParams({ section: "rankings", page: "1", limit: "20", minMatches: "1", ...(seasonId ? { seasonId } : {}) }).toString() : "");

  useEffect(() => {
    if (requestKey === lastRequestKey.current) return;
    lastRequestKey.current = requestKey;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getPublicJson<PublicPageResult<RankedPlayer>>(params, controller.signal)
      .then(setResult)
      .catch((loadError: unknown) => { if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el ranking."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestKey]);

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 20)));
  function setFilter(setter: (value: string) => void, value: string) { setter(value); setPage(1); }

  return <div className="min-h-screen bg-slate-50 text-slate-900"><PublicHeader /><main>
    <PublicPageHeader eyebrow="Clasificación" title="Rankings V90" description="Consulta la temporada actual y filtra por competición, temporada, equipo, posición, nombre y partidos calculados." />
    <section className="mx-auto max-w-[1440px] px-4 py-7 sm:px-8 sm:py-10 lg:px-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-600">Buscar jugador</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre del jugador" className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
          <SelectFilter label="Competición" value={competitionId} onChange={(value) => setFilter(setCompetitionId, value)} options={filters?.competitions ?? []} />
          <SelectFilter label="Temporada" value={seasonId === "all" ? "" : seasonId} onChange={(value) => setFilter(setSeasonId, value || "all")} options={(filters?.seasons ?? []).map((season) => ({ id: season.id, name: season.name }))} />
          <SelectFilter label="Equipo" value={teamId} onChange={(value) => setFilter(setTeamId, value)} options={filters?.teams ?? []} />
          <SelectFilter label="Posición" value={positionId} onChange={(value) => setFilter(setPositionId, value)} options={(filters?.positions ?? []).map((position) => ({ id: position.id, name: position.name }))} />
          <label><span className="mb-1.5 block text-xs font-bold text-slate-600">Mínimo de partidos</span><input type="number" inputMode="numeric" min="1" max="1000" value={minMatches} onChange={(event) => setFilter(setMinMatches, event.target.value || "1")} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500"><span>{loading ? "Actualizando clasificación…" : `${(result?.total ?? 0).toLocaleString("es-ES")} jugadores`}</span><span className="text-xs">Media ponderada de los hechos V90 activos calculados.</span></div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[3.5rem_minmax(0,1fr)_minmax(9rem,0.7fr)_6rem_8rem] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 sm:grid"><span>#</span><span>Jugador</span><span>Equipo del último cálculo</span><span className="text-right">Partidos</span><span className="text-right">V90</span></div>
        {error ? <p className="p-6 text-sm text-red-700" role="alert">{error}</p> : loading && !result ? <p className="p-10 text-center text-sm text-slate-500" role="status">Cargando el ranking…</p> : (result?.items.length ?? 0) === 0 ? <p className="p-10 text-center text-sm text-slate-500">No hay jugadores con estos filtros.</p> : <ol className="divide-y divide-slate-100">{result!.items.map((item, index) => <li key={item.playerId} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[3.5rem_minmax(0,1fr)_minmax(9rem,0.7fr)_6rem_8rem] sm:px-5"><span className="text-sm font-black text-slate-400">{String((page - 1) * result!.pageSize + index + 1).padStart(2, "0")}</span><div className="min-w-0"><p className="truncate font-bold">{item.playerName}</p><p className="mt-1 text-xs text-slate-500 sm:hidden">{item.teamName} · {item.matches} partidos</p></div><span className="hidden truncate text-sm text-slate-600 sm:block">{item.teamName}</span><span className="hidden text-right text-sm text-slate-600 sm:block">{item.matches}</span><span className="text-right text-xl font-black text-emerald-700">{item.score.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span></li>)}</ol>}
        {result && result.total > result.pageSize && <div className="flex items-center justify-center gap-3 border-t border-slate-100 p-4"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold disabled:opacity-40">Anterior</button><span className="text-sm text-slate-600">{page} / {totalPages}</span><button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold disabled:opacity-40">Siguiente</button></div>}
      </div>
    </section>
  </main><PublicFooter /></div>;
}
