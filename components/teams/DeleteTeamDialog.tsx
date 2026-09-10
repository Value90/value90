"use client";

import {
  deleteTeam,
  type Team,
} from "@/services/team.service";

interface DeleteTeamDialogProps {
  team: Team;
  onCancel: () => void;
}

export default function DeleteTeamDialog({
  team,
  onCancel,
}: DeleteTeamDialogProps) {

  const handleDelete = () => {
    deleteTeam(team.id);
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">

        <h2 className="text-xl font-bold text-slate-800">
          Eliminar equipo
        </h2>

        <p className="mt-3 text-slate-600">
          ¿Estás seguro de que quieres eliminar
          {" "}
          <span className="font-semibold text-slate-800">
            {team.name}
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
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Eliminar
          </button>

        </div>

      </div>

    </div>
  );
}