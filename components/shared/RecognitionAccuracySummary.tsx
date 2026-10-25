"use client";

import { useState } from "react";
import {
  getRecognitionAccuracySummary,
  type RecognitionAccuracyMetric,
} from "@/services/ai.feedback.service";

const fieldLabels: Record<string, string> = {
  participationState: "Participación",
  substituteInMinute: "Minuto de entrada",
  substituteOutMinute: "Minuto de salida",
  captain: "Capitán",
  marca: "Marca",
  as: "AS",
  sofascore: "SofaScore",
  flashscore: "FlashScore",
};

export default function RecognitionAccuracySummary() {
  const [metrics, setMetrics] = useState<RecognitionAccuracyMetric[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMetrics() {
    setLoading(true);
    setError("");

    try {
      setMetrics(await getRecognitionAccuracySummary());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo calcular el acierto observado."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-3 sm:p-5" aria-labelledby="ai-accuracy-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 id="ai-accuracy-title" className="font-semibold text-slate-800">
            Acierto observado de la IA
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Se calcula comparando las detecciones con los datos revisados y guardados.
          </p>
        </div>
        <button
          type="button"
          onClick={loadMetrics}
          disabled={loading}
          className="min-h-11 w-full shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
        >
          {loading ? "Calculando…" : metrics ? "Actualizar" : "Ver medición"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {metrics && (
        <div className="mt-4">
          {metrics.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Aún no hay análisis revisados vinculados para calcular la medición. Guarda una revisión manual para empezar a reunir casos.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metrics.map((metric) => (
                  <div key={`${metric.recognitionType}:${metric.fieldName}`} className="rounded-lg bg-slate-50 p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium text-slate-700">
                        {fieldLabels[metric.fieldName] ?? metric.fieldName}
                      </span>
                      <span className="text-lg font-bold text-slate-900">{metric.accuracy}%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {metric.recognitionType === "participations" ? "Participaciones" : "Valoraciones"} · {metric.fieldName === "captain" ? `${metric.correct} aciertos de ${metric.reviewed} equipos` : `${metric.correct} aciertos de ${metric.reviewed} revisiones`}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                Objetivo: superar el 95% de acierto observado. Con pocas revisiones, el porcentaje aún no es representativo; la revisión manual sigue activa.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
