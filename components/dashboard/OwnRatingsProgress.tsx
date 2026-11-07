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
  const [busy, setBusy] = useState<"import" | "calculate" | "evaluate" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importProgress, setImportProgress] = useState("");
  const [quota, setQuota] = useState<number | null>(null);

  const loadReport = useCallback(async () => {
    const response = await fetch("/api/admin/own-ratings", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar la comparación.");
    setReport(payload);
  }, []);

  useEffect(() => {
    loadReport().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la comparación."));
  }, [loadReport]);

  async function importEvaluationRounds() {
    setBusy("import");
    setError("");
    setMessage("");
    setImportProgress("Buscando estadísticas pendientes de las jornadas 6–11…");
    try {
      const prepareResponse = await fetch("/api/admin/own-ratings/import-stats", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "prepare" }),
      });
      const prepared = await prepareResponse.json();
      if (!prepareResponse.ok) throw new Error(prepared.error ?? "No se pudieron preparar los partidos.");
      const ids: number[] = prepared.matchIds ?? [];
      setQuota(prepared.callsRemaining ?? null);
      if (!ids.length) {
        const missing = Number(prepared.skipped?.missingMappings?.length ?? 0);
        setMessage(`No quedan estadísticas pendientes de las jornadas 6–11${missing ? `; ${missing} partidos necesitan asociación con Highlightly` : ""}. Las jornadas 1–5 ya estaban importadas; no se consumieron llamadas para preparar esta revisión.`);
        setImportProgress("");
        return;
      }
      let imported = 0;
      let calls = 0;
      const unmatched: Array<{ player: string }> = [];
      let stoppedByQuota = false;
      for (let start = 0; start < ids.length && !stoppedByQuota; start += 5) {
        const batch = ids.slice(start, start + 5);
        setImportProgress(`Importando partidos ${Math.min(start + batch.length, ids.length)} de ${ids.length}…`);
        const response = await fetch("/api/admin/own-ratings/import-stats", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "import_batch", matchIds: batch }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Falló un lote de estadísticas.");
        imported += Number(result.imported ?? 0);
        calls += Number(result.callsUsed ?? 0);
        if (Array.isArray(result.unmatched)) unmatched.push(...result.unmatched);
        setQuota(result.callsRemaining ?? null);
        if (result.callsRemaining === 0 && start + batch.length < ids.length) {
          stoppedByQuota = true;
          break;
        }
      }
      const missingCount = Number(prepared.skipped?.missingMappings?.length ?? 0);
      const summary = stoppedByQuota && imported === 0
        ? `No se importaron estadísticas porque la cuota diaria quedó agotada al preparar los partidos. Se revisaron ${ids.length} partidos sin consumir más llamadas.`
        : `${stoppedByQuota ? "Importación parcial por límite diario" : "Importación terminada"}: ${imported} participaciones con estadísticas en ${stoppedByQuota ? "parte de " : ""}${ids.length} partidos.`;
      setMessage(`${summary} Se utilizaron ${calls} llamadas a Highlightly.${prepared.alreadyComplete ? ` ${prepared.alreadyComplete} partidos ya tenían sus estadísticas completas.` : ""}${unmatched.length ? ` ${unmatched.length} jugadores quedaron sin asociar para revisión.` : ""}${missingCount ? ` Hay ${missingCount} partidos sin asociación con Highlightly.` : ""}`);
      setImportProgress("");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "No se pudieron importar las estadísticas.");
      setImportProgress("");
    } finally {
      setBusy(null);
    }
  }

  async function calculateOwnRatings() {
    setBusy("calculate");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/own-ratings", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo calcular la valoración propia.");
      setMessage(`Modelo ${payload.modelVersion}: ${payload.ratedSamples} notas propias. Validación cruzada: MAE ${payload.crossValidationMae == null ? "—" : rating.format(payload.crossValidationMae)} y RMSE ${payload.crossValidationRmse == null ? "—" : rating.format(payload.crossValidationRmse)}.`);
      if (payload.fallbackPositions?.length) setMessage((current) => `${current} Muestra insuficiente para ajustar por separado: ${payload.fallbackPositions.join(", ")}; se usó el modelo general para esas posiciones.`);
      await loadReport();
    } catch (calculationError) {
      setError(calculationError instanceof Error ? calculationError.message : "No se pudo calcular la valoración propia.");
    } finally {
      setBusy(null);
    }
  }

  async function evaluateHeldOutRounds() {
    setBusy("evaluate");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/own-ratings/evaluate", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo evaluar el modelo.");
      setMessage(`Evaluación independiente de las jornadas 6–10, sin reentrenar: ${payload.evaluatedSamples} valoraciones externas comparadas. MAE ${rating.format(payload.mae)} · RMSE ${rating.format(payload.rmse)}.`);
      await loadReport();
    } catch (evaluationError) {
      setError(evaluationError instanceof Error ? evaluationError.message : "No se pudo evaluar el modelo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-800">Valoración propia a partir de estadísticas</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Importa las estadísticas pendientes de las primeras 11 jornadas y entrena el modelo con las valoraciones externas disponibles. Después, cada sincronización automática de un partido finalizado calcula las notas propias y actualiza el ranking.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={importEvaluationRounds} disabled={busy !== null} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
            {busy === "import" ? "Importando estadísticas…" : "Completar estadísticas: jornadas 6–11"}
          </button>
          <button type="button" onClick={evaluateHeldOutRounds} disabled={busy !== null} className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
            {busy === "evaluate" ? "Evaluando…" : "Evaluar modelo con jornadas 6–10"}
          </button>
          <button type="button" onClick={calculateOwnRatings} disabled={busy !== null} className="min-h-11 rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60">
            {busy === "calculate" ? "Recalculando…" : "Recalcular modelo: jornadas 1–11"}
          </button>
        </div>
        {importProgress && <p className="mt-3 text-sm font-medium text-slate-600" role="status">{importProgress}</p>}
        {quota != null && <p className="mt-2 text-xs text-slate-500">Llamadas Highlightly restantes: {quota}</p>}
        {message && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{message}</p>}
        {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h3 className="font-bold text-slate-800">Comparación con fuentes externas</h3>
          {report?.run && (
            <p className="mt-1 text-sm text-slate-500">
              {report.run.model_version} · {report.run.evaluation_source_run_id
                ? `Evaluación independiente: ${report.run.rated_samples} notas, MAE ${report.run.evaluation_mae == null ? "—" : rating.format(Number(report.run.evaluation_mae))} y RMSE ${report.run.evaluation_rmse == null ? "—" : rating.format(Number(report.run.evaluation_rmse))}. Modelo entrenado con ${report.run.training_samples} valoraciones externas.`
                : `${report.run.training_samples} valoraciones externas para entrenar · validación cruzada inicial: MAE ${report.run.cross_validation_mae == null ? "—" : rating.format(Number(report.run.cross_validation_mae))} · RMSE ${report.run.cross_validation_rmse == null ? "—" : rating.format(Number(report.run.cross_validation_rmse))}`}
            </p>
          )}
        </div>
        {report?.run && (
          <details className="border-b border-slate-200 px-4 py-3 sm:px-6">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Ver pesos aprendidos por posición</summary>
            <p className="mt-2 text-xs leading-5 text-slate-500">Coeficientes estandarizados: muestran cuánto influye cada estadística frente a su variación habitual en la muestra. Los pesos se recalibran al volver a calcular el modelo.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(report.run.position_models).map(([group, model]) => (
                <div key={group} className="rounded-lg bg-slate-50 p-3">
                  <h4 className="text-sm font-bold capitalize text-slate-800">{group === "global" ? "Modelo general" : group} <span className="font-normal text-slate-500">· {model.source === "global" ? "general" : `${model.trainingSamples} muestras`}</span></h4>
                  <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                    {model.features.map((feature, index) => (
                      <li key={feature} className="flex justify-between gap-2"><span>{feature.replaceAll("_", " ")}</span><span className="font-mono">{rating.format(model.coefficients[index] ?? 0)}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        )}
        {!report?.items.length ? (
          <p className="p-6 text-center text-sm text-slate-500">Aún no hay una valoración propia calculada. Importa las estadísticas y pulsa el botón de cálculo manual.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Jugador</th><th className="px-4 py-3">Jornada</th><th className="px-4 py-3">Posición</th><th className="px-4 py-3 text-right">V90 propia</th><th className="px-4 py-3 text-right">Media externa</th><th className="px-4 py-3 text-right">Propia − externa</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {report.items.map((item, index) => (
                  <tr key={`${item.playerName}-${item.date}-${index}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.playerName}<span className="block text-xs font-normal text-slate-500">{shortDate(item.date)} · {item.minutesPlayed} min</span></td>
                    <td className="px-4 py-3 text-slate-600">{item.stage}</td>
                    <td className="px-4 py-3 text-slate-600">{item.position}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{rating.format(item.ownRating)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{item.externalAverage == null ? "—" : rating.format(item.externalAverage)}</td>
                    <td className={`px-4 py-3 text-right ${item.absoluteError != null && item.absoluteError > 1 ? "font-semibold text-amber-700" : "text-slate-600"}`}>{item.difference == null ? "—" : `${item.difference > 0 ? "+" : ""}${rating.format(item.difference)}`}</td>
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
