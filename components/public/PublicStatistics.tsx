"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicPageHeader from "@/components/public/PublicPageHeader";
import { getPublicJson } from "@/components/public/public-api";

interface Statistics { players: number; teams: number; competitions: number; matches: number; calculatedRatings: number; playersWithRating: number; averagePlayerV90: number | null; averageMatchV90: number | null }

export default function PublicStatistics({ initialStatistics }: { initialStatistics?: Statistics }) {
  const [statistics, setStatistics] = useState<Statistics | null>(initialStatistics ?? null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!initialStatistics);

  useEffect(() => {
    if (initialStatistics) return;
    const controller = new AbortController();
    getPublicJson<Statistics>(new URLSearchParams({ section: "statistics" }), controller.signal)
      .then(setStatistics)
      .catch((loadError: unknown) => { if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las estadísticas."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [initialStatistics]);

  const cards: Array<[string, number | string | null | undefined]> = [
    ["Jugadores activos", statistics?.players], ["Equipos activos", statistics?.teams],
    ["Competiciones activas", statistics?.competitions], ["Partidos", statistics?.matches],
    ["Valoraciones V90 calculadas", statistics?.calculatedRatings],
    ["Jugadores con V90", statistics?.playersWithRating],
    ["Media V90 por jugador", statistics?.averagePlayerV90 == null ? "—" : statistics.averagePlayerV90.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 })],
    ["Media V90 por partido", statistics?.averageMatchV90 == null ? "—" : statistics.averageMatchV90.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 })],
  ];

  return <div className="min-h-screen bg-slate-50 text-slate-900"><PublicHeader /><main>
    <PublicPageHeader eyebrow="Datos Value90" title="Estadísticas" description="Indicadores actualizados a partir de los registros activos y las valoraciones V90 calculadas." />
    <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-12 lg:px-10">
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {loading && <p role="status" className="mb-5 text-sm text-slate-500">Cargando datos de la base de Value90…</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">{cards.map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><p className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{loading ? "—" : typeof value === "number" ? value.toLocaleString("es-ES") : value ?? "—"}</p><p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm">{label}</p></article>)}</div>
      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:p-7"><div><h2 className="text-lg font-black">Consulta la clasificación</h2><p className="mt-1 text-sm text-slate-300">Filtra por temporada, competición, equipo, posición y partidos jugados.</p></div><Link href="/public/rankings" className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400">Abrir rankings</Link></div>
    </section>
  </main><PublicFooter /></div>;
}
