"use client";

import type { Season } from "@/services/season.service";

interface DeleteSeasonDialogProps {
  season: Season;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteSeasonDialog({
  season,
  onConfirm,
  onCancel,
}: DeleteSeasonDialogProps) {
  return (
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
      <h2 className="text-xl font-bold text-slate-800">
        Eliminar temporada
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        ¿Seguro que quieres eliminar la temporada{" "}
        <span className="font-semibold">
          "{season.name}"
        </span>
        ?
      </p>

      <p className="mt-4 text-sm text-red-600">
        Esta acción no se puede deshacer.
      </p>

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
  );
}