"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

interface MarketValueRow {
  player_id: number;
  team_id: number | null;
  current_value_eur: number;
  previous_value_eur: number | null;
  change_percent: number | null;
  rating_last_30_days: number | null;
  rating_current_season: number;
  market_rating: number;
  age_at_valuation: number | null;
  eligible_matches: number;
  period_start: string;
  updated_at: string;
}

interface MarketRunResult {
  status?: string;
  run_id?: string;
  period_start?: string;
  season_id?: number;
  player_count?: number;
}

const euro = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const rating = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" }).format(new Date(value));
}

export default function MarketPage() {
  const [rows, setRows] = useState<MarketValueRow[]>([]);
  const [playerNames, setPlayerNames] = useState(new Map<number, string>());
  const [teamNames, setTeamNames] = useState(new Map<number, string>());
  const [lastRun, setLastRun] = useState<MarketRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const loadMarket = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: marketError } = await supabase
        .from("player_market_values")
        .select("player_id,team_id,current_value_eur,previous_value_eur,change_percent,rating_last_30_days,rating_current_season,market_rating,age_at_valuation,eligible_matches,period_start,updated_at")
        .order("current_value_eur", { ascending: false })
        .range(0, 4999);
      if (marketError) throw marketError;
      const marketRows = (data ?? []) as MarketValueRow[];
      setRows(marketRows);

      const playerIds = Array.from(new Set(marketRows.map((item) => Number(item.player_id))));
      const teamIds = Array.from(new Set(marketRows.map((item) => item.team_id).filter((id): id is number => id != null)));
      const [playersResult, teamsResult, runResult] = await Promise.all([
        playerIds.length ? supabase.from("players").select("id,name").in("id", playerIds) : Promise.resolve({ data: [], error: null }),
        teamIds.length ? supabase.from("teams").select("id,name").in("id", teamIds) : Promise.resolve({ data: [], error: null }),
        supabase.from("market_valuation_runs").select("id,period_start,player_count,status,created_at,model_version,run_source").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (playersResult.error) throw playersResult.error;
      if (teamsResult.error) throw teamsResult.error;
      setPlayerNames(new Map((playersResult.data ?? []).map((player) => [Number(player.id), String(player.name)])));
      setTeamNames(new Map((teamsResult.data ?? []).map((team) => [Number(team.id), String(team.name)])));
      setLastRun(runResult.error ? null : runResult.data as MarketRunResult | null);
    } catch (loadError) {
      console.error("No se pudieron cargar las estimaciones de mercado:", loadError);
      setError("No se pudieron cargar los valores de mercado. Comprueba que se haya aplicado la migración de mercado en Supabase.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMarket(); }, [loadMarket]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return rows;
    return rows.filter((row) => `${playerNames.get(row.player_id) ?? ""} ${teamNames.get(Number(row.team_id)) ?? ""}`.toLocaleLowerCase("es").includes(query));
  }, [rows, playerNames, teamNames, search]);

  const handleUpdate = async () => {
    setUpdating(true);
    setError("");
    setNotice("");
    try {
      const { data, error: runError } = await supabase.rpc("run_market_valuation", { p_force: true });
      if (runError) throw runError;
      const result = data as MarketRunResult;
      if (result.status === "no_active_season") throw new Error("No hay una temporada activa para calcular las estimaciones.");
      if (result.status === "no_data") throw new Error("Todavía no hay valoraciones V90 calculadas en la temporada activa.");
      setNotice(`Estimación actualizada para ${Number(result.player_count ?? 0).toLocaleString("es-ES")} jugadores.`);
      await loadMarket();
    } catch (updateError) {
      console.error("No se pudo actualizar el mercado:", updateError);
      setError(updateError instanceof Error && updateError.message !== "" ? updateError.message : "No se pudo ejecutar la actualización. Comprueba que la migración esté aplicada y vuelve a intentarlo.");
    } finally {
      setUpdating(false);
    }
  };

  const latestDate = rows[0]?.period_start ?? lastRun?.period_start;
  const totalValue = rows.reduce((sum, row) => sum + Number(row.current_value_eur), 0);

  return (
    <main className="w-full min-w-0 p-3 sm:p-5 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Administración · Modelo V90-MV-1.0</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Valor de mercado</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Estimación propia en euros a partir del rendimiento reciente y de la temporada, con ajuste por edad. Es una referencia deportiva; no predice un precio real de traspaso.</p>
        </div>
        <button type="button" onClick={handleUpdate} disabled={updating || loading} className="min-h-11 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
          {updating ? "Calculando…" : "Actualizar estimaciones"}
        </button>
      </div>

      {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
      {notice && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{notice}</p>}

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Resumen del mercado">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Jugadores estimados</p><p className="mt-2 text-2xl font-black text-slate-900">{loading ? "—" : rows.length.toLocaleString("es-ES")}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Valor total de jugadores estimados</p><p className="mt-2 text-2xl font-black text-slate-900">{loading ? "—" : euro.format(totalValue)}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Última actualización</p><p className="mt-2 text-lg font-black text-slate-900">{loading || !latestDate ? "Sin datos" : formatDate(latestDate)}</p><p className="mt-1 text-xs text-slate-500">Automática: primer martes de cada mes</p></article>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><h2 className="text-lg font-black">Estimaciones por jugador</h2><p className="mt-1 text-xs text-slate-500">Últimos 30 días: 60% · Temporada actual: 40% · Edad incluida en la curva de valor.</p></div>
          <label className="block w-full sm:max-w-xs"><span className="sr-only">Buscar jugador o equipo</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar jugador o equipo" className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
        </div>
        {loading ? <p className="p-8 text-center text-sm text-slate-500" role="status">Cargando estimaciones…</p> : visibleRows.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{rows.length ? "No hay resultados para la búsqueda." : "Todavía no se han calculado valores. Ejecuta la migración y la primera estimación."}</p> : (
          <>
          <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:hidden">{visibleRows.map((row) => <article key={row.player_id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold">{playerNames.get(row.player_id) ?? `Jugador ${row.player_id}`}</h3><p className="mt-1 truncate text-xs text-slate-500">{row.team_id == null ? "Sin equipo actual" : teamNames.get(row.team_id) ?? "Equipo"}{row.age_at_valuation == null ? "" : ` · ${row.age_at_valuation} años`}</p></div><p className="shrink-0 text-right font-black text-emerald-700">{euro.format(Number(row.current_value_eur))}</p></div><div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs"><p className="text-slate-500">Cambio <strong className={Number(row.change_percent ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}>{row.change_percent == null ? "—" : `${Number(row.change_percent) > 0 ? "+" : ""}${Number(row.change_percent).toLocaleString("es-ES", { maximumFractionDigits: 2 })}%`}</strong></p><p className="text-right text-slate-500">Muestra <strong className="text-slate-700">{row.eligible_matches} partidos</strong></p><p className="text-slate-500">V90 mes <strong className="text-slate-700">{row.rating_last_30_days == null ? "—" : rating.format(Number(row.rating_last_30_days))}</strong></p><p className="text-right text-slate-500">V90 temporada <strong className="text-slate-700">{rating.format(Number(row.rating_current_season))}</strong></p></div></article>)}</div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Jugador</th><th className="px-4 py-3">Equipo</th><th className="px-4 py-3 text-right">Valor estimado</th><th className="px-4 py-3 text-right">Variación</th><th className="px-4 py-3 text-right">V90 mes</th><th className="px-4 py-3 text-right">V90 temporada</th><th className="px-4 py-3 text-right">Muestra</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{visibleRows.map((row) => <tr key={row.player_id} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold">{playerNames.get(row.player_id) ?? `Jugador ${row.player_id}`}<span className="ml-2 text-xs font-normal text-slate-400">{row.age_at_valuation == null ? "" : `${row.age_at_valuation} años`}</span></td><td className="px-4 py-3 text-slate-600">{row.team_id == null ? "Sin equipo actual" : teamNames.get(row.team_id) ?? "Equipo"}</td><td className="px-4 py-3 text-right font-black text-emerald-700">{euro.format(Number(row.current_value_eur))}</td><td className={`px-4 py-3 text-right font-bold ${Number(row.change_percent ?? 0) > 0 ? "text-emerald-700" : Number(row.change_percent ?? 0) < 0 ? "text-red-600" : "text-slate-500"}`}>{row.change_percent == null ? "—" : `${Number(row.change_percent) > 0 ? "+" : ""}${Number(row.change_percent).toLocaleString("es-ES", { maximumFractionDigits: 2 })}%`}</td><td className="px-4 py-3 text-right tabular-nums">{row.rating_last_30_days == null ? "—" : rating.format(Number(row.rating_last_30_days))}</td><td className="px-4 py-3 text-right tabular-nums">{rating.format(Number(row.rating_current_season))}</td><td className="px-4 py-3 text-right">{row.eligible_matches} partidos</td></tr>)}</tbody>
            </table>
          </div>
          </>
        )}
        <p className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500 sm:px-5">El conjunto disponible hoy está limitado a los jugadores registrados en la base de datos. Al incorporar datos de otras ligas, el mismo modelo podrá comparar una población más amplia; no se atribuye cobertura internacional a los datos actuales.</p>
      </section>
    </main>
  );
}
