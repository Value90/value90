"use client";

import { useState } from "react";

import HistPlayerTeamForm from "@/components/hist-player-teams/HistPlayerTeamForm";
import PlayerSquadImportForm from "@/components/players/PlayerSquadImportForm";

type FormMode = "manual" | "import";

export default function HistPlayerTeamsPage() {
  const [mode, setMode] =
    useState<FormMode>("manual");

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl p-3 sm:p-5 md:p-6 lg:p-8">

      {/* =====================================================
          CABECERA
          ===================================================== */}

      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Historial de jugadores por equipo
        </h1>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Gestiona las plantillas históricas
          por temporada y equipo.
        </p>
      </div>

      {/* =====================================================
          SELECTOR DE MODO
          ===================================================== */}

      <div className="mb-5 flex w-full min-w-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow sm:mb-6 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:w-auto ${
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
          className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:w-auto ${
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

      <div className="w-full min-w-0">
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

    </div>
  );
}
