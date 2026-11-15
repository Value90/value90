"use client";

import { useCallback, useEffect, useState } from "react";

interface ComparisonItem {
  playerName: string;
  date: string | null;
  stage: string;
  position: string;
  minutesPlayed: number;
  ownRating: number;
  externalAverage: number | null;
  absoluteError: number | null;
  difference: number | null;
}

interface OwnRatingReport {
  run: {
    id: string;
    evaluation_source_run_id: string | null;
    evaluation_mae: number | null;
    evaluation_rmse: number | null;
    model_version: string;
    training_samples: number;
    rated_samples: number;
    cross_validation_mae: number | null;
    cross_validation_rmse: number | null;
    created_at: string;
    position_models: Record<string, { source: string; trainingSamples: number; features: string[]; coefficients: number[] }>;
  } | null;
  items: ComparisonItem[];
}

const rating = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const shortDate = (value: string | null) => value ? new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "—";

export default function OwnRatingsProgress() {
  const [report, setReport] = useState<OwnRatingReport | null>(null);
  const [busy, setBusy] = useState<"calculate" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    const response = await fetch("/api/admin/own-ratings", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar la comparación.");
    setReport(payload);
  }, []);

  useEffect(() => {
    loadReport().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la comparación."));
  }, [loadReport]);

  async function calculateOwnRatings() {
    setBusy("calculate");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/own-ratings", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo calcular la valoración propia.");
      setMessage(`Cálculo ${payload.modelVersion}: ${payload.ratedSamples} notas propias a partir de estadísticas Highlightly; V90 actualizado en ${payload.v90Calculated} participaciones${payload.v90Pending ? `, ${payload.v90Pending} pendientes por configuración o datos incompletos` : ""}${payload.v90Errors ? ` y ${payload.v90Errors} con error` : ""}.`);
      await loadReport();
    } catch (calculationError) {
      setError(calculationError instanceof Error ? calculationError.message : "No se pudo calcular la valoración propia.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-800">Valoración propia a partir de estadísticas</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          La nota propia se calcula por posición directamente desde las estadísticas individuales de Highlightly. Al sincronizar manualmente un partido finalizado, se actualizan la valoración final, el V90 y los datos del ranking; no hacen falta notas externas ni entrenamiento previo.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={calculateOwnRatings} disabled={busy !== null} className="min-h-11 rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60">
            {busy === "calculate" ? "Recalculando…" : "Recalcular LaLiga: jornadas 1–11"}
          </button>
        </div>
        {message && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{message}</p>}
        {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h3 className="font-bold text-slate-800">Valoraciones propias calculadas</h3>
          {report?.run && <p className="mt-1 text-sm text-slate-500">{report.run.model_version} · {report.run.rated_samples} valoraciones calculadas desde estadísticas · última actualización {shortDate(report.run.created_at)}</p>}
        </div>
        {!report?.items.length ? (
          <p className="p-6 text-center text-sm text-slate-500">Aún no hay valoraciones propias. Sincroniza un partido con estadísticas de Highlightly o recalcula las estadísticas que ya están guardadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Jugador</th><th className="px-4 py-3">Jornada</th><th className="px-4 py-3">Posición</th><th className="px-4 py-3 text-right">Valoración propia</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {report.items.map((item, index) => (
                  <tr key={`${item.playerName}-${item.date}-${index}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.playerName}<span className="block text-xs font-normal text-slate-500">{shortDate(item.date)} · {item.minutesPlayed} min</span></td>
                    <td className="px-4 py-3 text-slate-600">{item.stage}</td>
                    <td className="px-4 py-3 text-slate-600">{item.position}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{rating.format(item.ownRating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
