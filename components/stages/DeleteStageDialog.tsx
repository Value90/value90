"use client";

import type { Stage } from "@/services/stage.service";

interface DeleteStageDialogProps {
  stage: Stage | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteStageDialog({
  stage,
  onConfirm,
  onCancel,
}: DeleteStageDialogProps) {
  /*
   * ============================================================
   * SI NO HAY FASE / JORNADA
   * ============================================================
   */

  if (!stage) {
    return null;
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">

        {/* CABECERA */}

        <h2 className="text-xl font-bold text-slate-800">
          Eliminar jornada/fase
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          ¿Seguro que quieres eliminar esta
          jornada/fase?
        </p>

        {/* INFORMACIÓN */}

        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">

          <p>
            <span className="font-semibold text-slate-800">
              Nombre:
            </span>{" "}
            {stage.name}
          </p>

          <p className="mt-2">
            <span className="font-semibold text-slate-800">
              Temporada ID:
            </span>{" "}
            {stage.seasonId}
          </p>

          <p className="mt-2">
            <span className="font-semibold text-slate-800">
              Orden:
            </span>{" "}
            {stage.displayOrder}
          </p>

          <p className="mt-2">
            <span className="font-semibold text-slate-800">
              Estado:
            </span>{" "}
            {stage.active
              ? "Activa"
              : "Inactiva"}
          </p>

        </div>

        {/* AVISO */}

        <p className="mt-4 text-sm text-red-600">
          Esta acción no se puede deshacer.
        </p>

        {/* BOTONES */}

        <div className="mt-6 flex justify-end gap-3">

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Eliminar
          </button>

        </div>

      </div>

    </div>
  );
}