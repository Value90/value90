"use client";

import type { Participation } from "@/types/participation";

interface DeleteParticipationDialogProps {
  participation: Participation | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteParticipationDialog({
  participation,
  onConfirm,
  onCancel,
}: DeleteParticipationDialogProps) {
  if (!participation) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">

        <h2 className="text-xl font-bold text-slate-800">
          Eliminar participación
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          ¿Seguro que quieres eliminar esta participación?
        </p>

        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">
              Jugador ID:
            </span>{" "}
            {participation.playerId}
          </p>

          <p className="mt-1">
            <span className="font-semibold text-slate-800">
              Partido ID:
            </span>{" "}
            {participation.matchId}
          </p>

          <p className="mt-1">
            <span className="font-semibold text-slate-800">
              Equipo ID:
            </span>{" "}
            {participation.teamId}
          </p>
        </div>

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

    </div>
  );
}