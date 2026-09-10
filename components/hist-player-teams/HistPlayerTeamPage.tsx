"use client";

import { useState } from "react";

import HistPlayerTeamForm from "@/components/hist-player-teams/HistPlayerTeamForm";
import PlayerSquadImportForm from "@/components/players/PlayerSquadImportForm";

type FormMode = "manual" | "import";

export default function HistPlayerTeamsPage() {
  const [mode, setMode] =
    useState<FormMode>("manual");

  return (
    <div className="mx-auto max-w-7xl p-6">

      {/* =====================================================
          CABECERA
          ===================================================== */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Historial de jugadores por equipo
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Gestiona las plantillas históricas
          por temporada y equipo.
        </p>
      </div>

      {/* =====================================================
          SELECTOR DE MODO
          ===================================================== */}

      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            mode === "manual"
              ? "bg-slate-800 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Gestionar plantilla
        </button>

        <button
          type="button"
          onClick={() => setMode("import")}
          className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            mode === "import"
              ? "bg-slate-800 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Importar plantilla
        </button>
      </div>

      {/* =====================================================
          CONTENIDO
          ===================================================== */}

      {mode === "manual" ? (
        <HistPlayerTeamForm />
      ) : (
        <PlayerSquadImportForm
          onSaved={() => {
            // No cambiamos automáticamente de pantalla.
            // El usuario puede revisar el resultado
            // y continuar con la siguiente fase.
          }}
          onCancel={() => setMode("manual")}
        />
      )}

    </div>
  );
}