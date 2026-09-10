"use client";

import type { Competition } from "@/services/competition.service";

interface DeleteCompetitionDialogProps {
  competition: Competition | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteCompetitionDialog({
  competition,
  onConfirm,
  onCancel,
}: DeleteCompetitionDialogProps) {

  if (!competition) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">

        <h2 className="text-xl font-bold text-slate-900">
          Eliminar competición
        </h2>

        <p className="mt-3 text-slate-600">
          ¿Estás seguro de que quieres eliminar{" "}
          <span className="font-semibold text-slate-900">
            {competition.name}
          </span>
          ?
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Esta acción no se puede deshacer.
        </p>

        <div className="mt-6 flex justify-end gap-3">

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
          >
            Eliminar
          </button>

        </div>

      </div>

    </div>
  );
}