"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicPageHeader from "@/components/public/PublicPageHeader";
import { getPublicJson, type PublicFilters, type PublicPageResult } from "@/components/public/public-api";

type DirectoryKind = "players" | "teams" | "competitions";
type DirectoryItem = Record<string, string | number | null>;

const pageInfo: Record<DirectoryKind, { title: string; description: string; placeholder: string }> = {
  players: { title: "Jugadores", description: "Busca jugadores activos y filtra por equipo, competición o temporada.", placeholder: "Nombre del jugador" },
  teams: { title: "Equipos", description: "Explora los equipos activos y filtra por competición y temporada.", placeholder: "Nombre, ciudad o abreviatura" },
  competitions: { title: "Competiciones", description: "Consulta competiciones activas y sus equipos y partidos registrados.", placeholder: "Nombre de la competición" },
};

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: number; name: string }> }) {
  return <label className="min-w-0"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"><option value="">Todas</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>;
}

export default function PublicDirectory({ kind, initialFilters, initialResult }: { kind: DirectoryKind; initialFilters?: PublicFilters; initialResult?: PublicPageResult<DirectoryItem> }) {
  const info = pageInfo[kind];
  const [filters, setFilters] = useState<PublicFilters | null>(initialFilters ?? null);
  const [result, setResult] = useState<PublicPageResult<DirectoryItem> | null>(initialResult ?? null);
  const [search, setSearch] = useState("");
  const [stableSearch, setStableSearch] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teamType, setTeamType] = useState("Club");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!initialResult);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialFilters) return;
    const controller = new AbortController();
    getPublicJson<PublicFilters>(new URLSearchParams({ section: "filters" }), controller.signal)
      .then(setFilters)
      .catch((loadError: unknown) => { if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "No se han podido cargar los filtros."); });
    return () => controller.abort();
  }, [initialFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setStableSearch(search.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams({ section: kind, page: String(page), limit: "24" });
  if (stableSearch) params.set("q", stableSearch);
  if (competitionId) params.set("competitionId", competitionId);
  if (seasonId) params.set("seasonId", seasonId);
  if (teamId) params.set("teamId", teamId);
  if (kind === "teams") params.set("type", teamType);
  const requestKey = params.toString();
  const lastRequestKey = useRef(initialResult ? new URLSearchParams({ section: kind, page: "1", limit: "24", ...(kind === "teams" ? { type: "Club" } : {}) }).toString() : "");

  useEffect(() => {
    if (requestKey === lastRequestKey.current) return;
    lastRequestKey.current = requestKey;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getPublicJson<PublicPageResult<DirectoryItem>>(params, controller.signal)
      .then(setResult)
      .catch((loadError: unknown) => { if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "No se han podido cargar los datos."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestKey]);

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const pages = Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 24)));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />
      <main>
        <PublicPageHeader eyebrow="Value90" title={info.title} description={info.description} />
        <section className="mx-auto max-w-[1440px] px-4 py-7 sm:px-8 sm:py-10 lg:px-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold text-slate-600">Buscar</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={info.placeholder} className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
              {kind !== "competitions" && <Filter label="Competición" value={competitionId} onChange={(value) => changeFilter(setCompetitionId, value)} options={(filters?.competitions ?? []).filter((item) => item.active !== false)} />}
              {kind !== "competitions" && <Filter label="Temporada" value={seasonId} onChange={(value) => changeFilter(setSeasonId, value)} options={(filters?.seasons ?? []).map((season) => ({ id: season.id, name: season.name }))} />}
              {kind === "players" && <Filter label="Equipo" value={teamId} onChange={(value) => changeFilter(setTeamId, value)} options={(filters?.teams ?? []).filter((item) => item.active !== false)} />}
              {kind === "teams" && <label className="min-w-0"><span className="mb-1.5 block text-xs font-bold text-slate-600">Tipo de equipo</span><select value={teamType} onChange={(event) => changeFilter(setTeamType, event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"><option value="Club">Clubes</option><option value="Selección">Selecciones nacionales</option></select></label>}
              {kind === "competitions" && <Filter label="Temporada" value={seasonId} onChange={(value) => changeFilter(setSeasonId, value)} options={(filters?.seasons ?? []).map((season) => ({ id: season.id, name: season.name }))} />}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500"><span>{loading ? "Buscando…" : `${(result?.total ?? 0).toLocaleString("es-ES")} resultados`}</span><span className="text-xs">Los datos se actualizan desde Value90.</span></div>
          </div>

          {error ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">{error}</div> : loading && !result ? <p className="py-16 text-center text-sm text-slate-500" role="status">Cargando {info.title.toLocaleLowerCase("es")}…</p> : !loading && (result?.items.length ?? 0) === 0 ? <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center"><h2 className="font-bold">No hay resultados</h2><p className="mt-2 text-sm text-slate-500">Prueba con otro nombre o cambia los filtros.</p></div> : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(result?.items ?? []).map((item) => {
                const id = Number(item.id);
                return <article key={id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                  {kind === "players" && <><Link href={`/public/jugadores/${id}`} className="text-lg font-black text-slate-900 hover:text-emerald-700">{item.name}</Link><p className="mt-1 text-sm text-slate-500">{item.teamName}{item.shirtNumber ? ` · Dorsal ${item.shirtNumber}` : ""}</p><Link href={`/public/jugadores/${id}`} className="mt-4 inline-flex min-h-10 items-center text-sm font-bold text-emerald-700">Ver ficha →</Link></>}
                  {kind === "teams" && <><Link href={`/public/equipos/${id}`} className="text-lg font-black text-slate-900 hover:text-emerald-700">{item.name}</Link><p className="mt-1 text-sm text-slate-500">{item.city || ""}{item.type ? `${item.city ? " · " : ""}${item.type}` : ""}</p><p className="mt-3 text-xs font-semibold text-emerald-700">{item.shortName || "Equipo"}</p><Link href={`/public/equipos/${id}`} className="mt-4 inline-flex min-h-10 items-center text-sm font-bold text-emerald-700">Ver ficha →</Link></>}
                  {kind === "competitions" && <><p className="text-lg font-black">{item.name}</p><p className="mt-1 text-sm text-slate-500">{item.type || "Competición"}</p><div className="mt-4 flex gap-4 text-xs font-semibold text-slate-600"><span>{Number(item.teams).toLocaleString("es-ES")} equipos</span><span>{Number(item.matches).toLocaleString("es-ES")} partidos</span></div></>}
                </article>;
              })}
            </div>
          )}

          {result && result.total > result.pageSize && <nav className="mt-7 flex items-center justify-center gap-3" aria-label="Paginación"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold disabled:opacity-40">Anterior</button><span className="text-sm text-slate-600">Página {page} de {pages}</span><button type="button" disabled={page >= pages || loading} onClick={() => setPage((current) => Math.min(pages, current + 1))} className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold disabled:opacity-40">Siguiente</button></nav>}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
