"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface HighlightlyProgressMatch {
  id: number;
  date: string;
  status: string;
  homeScore: number;
  awayScore: number;
  stadium: string;
  competitionId: number;
  competitionName: string;
  seasonName: string;
  stageName: string;
  homeTeamName: string;
  awayTeamName: string;
  hasHighlightlyMapping: boolean;
  resultComplete: boolean;
  participationComplete: boolean;
  statsComplete: boolean;
  v90Calculated: number;
  v90Pending: number;
  v90Errors: number;
  v90Average: number | null;
  pendingV90: boolean;
  participationCount: number;
  missingStats: number;
  missingPlayers: Array<{ participationId: number; playerId: number; playerName: string; teamName: string; shirtNumber: number | null; minutesPlayed: number; isStartingXi: boolean }>;
  pendingMatchData: boolean;
  pendingStats: boolean;
  pending: boolean;
  lastSyncError: string | null;
  lastSyncedAt: string | null;
}

const manualStatFields = [
  ["goals", "Goles"], ["assists", "Asistencias"], ["shots", "Tiros"], ["shots_on_target", "A puerta"],
  ["dribbles", "Regates"], ["dribbles_completed", "Regates completados"], ["duels", "Duelos"], ["duels_won", "Duelos ganados"],
  ["tackles", "Entradas"], ["recoveries", "Recuperaciones"], ["saves", "Paradas"], ["passes", "Pases"],
  ["passes_completed", "Pases completados"], ["yellow_cards", "Amarillas"], ["red_cards", "Rojas"],
] as const;

function ManualStatsForm({ player, busy, onSave }: {
  player: HighlightlyProgressMatch["missingPlayers"][number];
  busy: boolean;
  onSave: (participationId: number, stats: Record<string, number>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(manualStatFields.map(([key]) => [key, "0"])));
  return <form className="mt-3 rounded-lg border border-slate-200 bg-white p-3" onSubmit={(event) => {
    event.preventDefault();
    void onSave(player.participationId, Object.fromEntries(manualStatFields.map(([key]) => [key, Number(values[key] || 0)])));
  }}>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {manualStatFields.map(([key, label]) => <label key={key} className="text-xs font-medium text-slate-600">{label}
        <input type="number" min="0" step="1" required value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 min-h-9 w-full rounded-md border border-slate-300 px-2 text-sm text-slate-900" />
      </label>)}
    </div>
    <button type="submit" disabled={busy} className="mt-3 min-h-10 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{busy ? "Guardando y calculando…" : "Guardar estadísticas y calcular V90"}</button>
    <span className="ml-3 text-xs text-slate-500">No consume llamadas de Highlightly.</span>
  </form>;
}

interface Props {
  seasonId: number;
  competitionId: number | "";
  stageId: number | "";
}

const dateTime = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  timeZone: "Europe/Madrid",
});

export default function HighlightlyProgress({ seasonId, competitionId, stageId }: Props) {
  const [matches, setMatches] = useState<HighlightlyProgressMatch[]>([]);
  const [summary, setSummary] = useState({ total: 0, pendingMatchData: 0, pendingStats: 0, pendingV90: 0, complete: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyMatchId, setBusyMatchId] = useState<number | null>(null);
  const [busyParticipationId, setBusyParticipationId] = useState<number | null>(null);
  const [onlyPending, setOnlyPending] = useState(true);

  const loadProgress = useCallback(async () => {
    if (!seasonId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ seasonId: String(seasonId) });
      if (competitionId !== "") params.set("competitionId", String(competitionId));
      if (stageId !== "") params.set("stageId", String(stageId));
      const response = await fetch(`/api/admin/sports/progress?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo leer el progreso de Highlightly.");
      setMatches(payload.matches ?? []);
      setSummary(payload.summary ?? { total: 0, pendingMatchData: 0, pendingStats: 0, pendingV90: 0, complete: 0 });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo leer el progreso de Highlightly.");
    } finally {
      setLoading(false);
    }
  }, [seasonId, competitionId, stageId]);

  useEffect(() => { void loadProgress(); }, [loadProgress]);

  const visibleMatches = useMemo(() => onlyPending ? matches.filter((item) => item.pending) : matches, [matches, onlyPending]);

  async function retry(match: HighlightlyProgressMatch) {
    setBusyMatchId(match.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/sports/sync", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ matchId: match.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudieron volver a importar los datos del partido.");
      const failed = payload.results?.find((item: { error?: string }) => item.error);
      if (failed) throw new Error(failed.error);
      const result = payload.results?.[0];
      setNotice(result?.waiting
        ? `Highlightly todavía no da el partido ${match.homeTeamName} vs ${match.awayTeamName} por finalizado. Puedes volver a intentarlo más tarde.`
        : `Sincronización completada para ${match.homeTeamName} vs ${match.awayTeamName}: resultado, participaciones y ${Number(result?.importedPlayerStats ?? 0)} registro(s) de estadísticas recibidos. Se usaron ${Number(result?.callsUsed ?? 0)} llamadas; V90: ${Number(result?.ownRatings ?? 0)} valoración(es) actualizadas.${result?.callsRemaining != null ? ` Saldo restante: ${result.callsRemaining} llamadas.` : ""}`);
      await loadProgress();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "No se pudo completar la importación.");
      await loadProgress();
    } finally {
      setBusyMatchId(null);
    }
  }

  async function saveManualStats(participationId: number, stats: Record<string, number>) {
    setBusyParticipationId(participationId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/sports/manual-stats", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ participationId, stats }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudieron guardar las estadísticas.");
      const result = payload.recalculation;
      setNotice(`Estadísticas guardadas. Valoración propia: ${Number(result?.calculated ?? 0)}; V90 calculado: ${Number(result?.v90Calculated ?? 0)}; V90 pendiente: ${Number(result?.v90Pending ?? 0)}. No se usaron llamadas de Highlightly.`);
      await loadProgress();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudieron guardar las estadísticas.");
    } finally {
      setBusyParticipationId(null);
    }
  }

  async function recalculate(match: HighlightlyProgressMatch) {
    setBusyMatchId(match.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/sports/manual-stats", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "recalculate", matchId: match.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo recalcular el V90.");
      const result = payload.recalculation;
      const reasons = Array.isArray(result?.pendingReasons) ? result.pendingReasons.join("; ") : "";
      setNotice(`Recalculado sin llamadas a Highlightly. Valoraciones propias: ${Number(result?.calculated ?? 0)}; V90 calculado: ${Number(result?.v90Calculated ?? 0)}; pendiente: ${Number(result?.v90Pending ?? 0)}.${reasons ? ` Motivo pendiente: ${reasons}` : ""}`);
      await loadProgress();
    } catch (recalcError) {
      setError(recalcError instanceof Error ? recalcError.message : "No se pudo recalcular el V90.");
    } finally {
      setBusyMatchId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Pendientes de Highlightly</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Revisa qué partidos de esta temporada tienen pendiente el resultado o las participaciones, y qué partidos jugados aún necesitan estadísticas individuales. Los filtros de temporada, competición y jornada seleccionados arriba se aplican a esta lista. Cada reintento de un partido finalizado suele consumir entre 2 y 4 llamadas a Highlightly, según si faltan alineaciones o eventos. No se puede garantizar antes de consultar que el proveedor devuelva todas las estadísticas: el resultado indicará cuántas llamadas se usaron y cuántos registros se guardaron; si faltan datos, el partido seguirá pendiente.</p>
          </div>
          <button type="button" onClick={() => void loadProgress()} disabled={loading || busyMatchId !== null} className="min-h-10 shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{loading ? "Actualizando…" : "Actualizar lista"}</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-5">
          {[["Partidos en filtro", summary.total], ["Pendiente resultado / participaciones", summary.pendingMatchData], ["Pendiente estadísticas", summary.pendingStats], ["Pendiente V90", summary.pendingV90], ["Completos", summary.complete]].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 px-3 py-3"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 text-xl font-bold text-slate-800">{value}</div></div>
          ))}
        </div>
        <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={onlyPending} onChange={(event) => setOnlyPending(event.target.checked)} className="h-4 w-4 accent-slate-800" />
          Mostrar solo pendientes
        </label>
      </div>

      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading && matches.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Consultando partidos y estadísticas…</p> : visibleMatches.length === 0 ? (
          <div className="p-6 text-center"><p className="font-semibold text-emerald-800">{matches.length ? "No hay partidos atrasados pendientes para estos filtros." : "No hay partidos en esta temporada, competición y jornada."}</p><p className="mt-1 text-sm text-slate-500">La lista se actualiza con los partidos cuya fecha ya pasó y que aún necesitan resultado, participaciones, estadísticas o V90.</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleMatches.map((match) => {
              const needsFullSync = match.pendingMatchData;
              const reason = !match.hasHighlightlyMapping
                ? "Sin asociación con Highlightly"
                : needsFullSync && !match.resultComplete
                  ? "Pendiente resultado o sincronización final"
                  : needsFullSync && !match.participationComplete
                    ? "No hay participaciones registradas"
                    : match.pendingStats
                      ? `${match.missingStats} participación(es) sin estadísticas`
                      : `Cálculo V90 pendiente: ${match.v90Pending} pendiente(s), ${match.v90Errors} error(es), ${match.v90Calculated} calculada(s)`;
              return (
                <article key={match.id} className="flex flex-col gap-3 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500"><span>{match.competitionName}</span><span>·</span><span>{match.stageName}</span><span>·</span><span>{dateTime.format(new Date(match.date))}</span></div>
                    <h3 className="mt-1 font-bold text-slate-800">{match.homeTeamName} {match.homeScore}–{match.awayScore} {match.awayTeamName}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full px-2.5 py-1 ${match.resultComplete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>Resultado: {match.resultComplete ? "completo" : "pendiente"}</span>
                      <span className={`rounded-full px-2.5 py-1 ${match.participationComplete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>Participaciones: {match.status === "Cancelado" ? "no aplican" : match.participationComplete ? `${match.participationCount} registradas` : "pendientes"}</span>
                      <span className={`rounded-full px-2.5 py-1 ${match.statsComplete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>Estadísticas: {match.status === "Cancelado" ? "no aplican" : match.statsComplete ? "completas" : match.participationCount ? `${match.missingStats} pendientes` : "sin comprobar"}</span>
                      <span className={`rounded-full px-2.5 py-1 ${!match.pendingV90 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>V90: {match.status === "Cancelado" ? "no aplica" : match.pendingV90 ? `${match.v90Pending + match.v90Errors || "pendiente"}` : match.v90Calculated ? "calculado" : "sin cálculo necesario"}</span>
                    </div>
                    <p className="mt-2 text-sm text-amber-900">{reason}{match.lastSyncError ? ` · Último error: ${match.lastSyncError}` : ""}</p>
                  </div>
                  {match.hasHighlightlyMapping ? (
                    <button type="button" onClick={() => void retry(match)} disabled={busyMatchId !== null || loading} className="min-h-11 w-full shrink-0 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
                      {busyMatchId === match.id ? "Importando…" : "Reintentar importación"}
                    </button>
                  ) : <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-600">Importa o vincula el partido primero</span>}
                  </div>
                  {match.missingPlayers?.length > 0 && match.pendingStats && (
                    <details className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-amber-950">Ver jugadores sin estadísticas ({match.missingPlayers.length}) y completarlas manualmente</summary>
                      <div className="mt-3 space-y-3">
                        {match.missingPlayers.map((player) => <div key={player.participationId} className="rounded-lg border border-amber-100 bg-white p-3">
                          <div className="font-semibold text-slate-800">{player.playerName}{player.shirtNumber != null ? ` · #${player.shirtNumber}` : ""} <span className="font-normal text-slate-600">— {player.teamName}, {player.minutesPlayed} min, {player.isStartingXi ? "titular" : "suplente"}</span></div>
                          <ManualStatsForm player={player} busy={busyParticipationId === player.participationId || busyParticipationId !== null} onSave={saveManualStats} />
                        </div>)}
                      </div>
                    </details>
                  )}
                  {match.pendingV90 && match.statsComplete && match.hasHighlightlyMapping && (
                    <button type="button" onClick={() => void recalculate(match)} disabled={busyMatchId !== null || busyParticipationId !== null || loading} className="min-h-10 w-full rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-900 hover:bg-indigo-100 disabled:opacity-60 sm:w-auto">
                      {busyMatchId === match.id ? "Recalculando…" : "Recalcular valoraciones sin llamada"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
