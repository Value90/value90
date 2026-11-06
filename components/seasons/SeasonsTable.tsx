"use client";

import { useMemo, useState } from "react";

import DataTable from "@/components/shared/tables/DataTable";

import type { ColumnDef } from "@tanstack/react-table";

import type { Season } from "@/services/season.service";

interface SeasonsTableProps {
  seasons: Season[];
  onEdit: (season: Season) => void;
  onDelete: (season: Season) => void;
  onToggleActive: (season: Season, active: boolean) => Promise<void>;
}

export default function SeasonsTable({
  seasons,
  onEdit,
  onDelete,
  onToggleActive,
}: SeasonsTableProps) {
  const [savingIds, setSavingIds] = useState<Set<number>>(() => new Set());

  const columns = useMemo<
    ColumnDef<Season, unknown>[]
  >(
    () => [
      {
        accessorKey: "name",
        header: "Temporada",
      },

      {
        accessorKey: "startDate",
        header: "Fecha inicio",
      },

      {
        accessorKey: "endDate",
        header: "Fecha fin",
      },

      {
        accessorKey: "active",
        header: "Estado",
        cell: ({ row }) => (
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={row.original.active}
              disabled={savingIds.has(row.original.id)}
              onChange={async (event) => {
                const active = event.target.checked;
                setSavingIds((current) => new Set(current).add(row.original.id));
                try {
                  await onToggleActive(row.original, active);
                } finally {
                  setSavingIds((current) => {
                    const next = new Set(current);
                    next.delete(row.original.id);
                    return next;
                  });
                }
              }}
              aria-label={`${row.original.active ? "Desactivar" : "Activar"} temporada ${row.original.name}`}
              className="h-4 w-4 accent-emerald-600 disabled:opacity-50"
            />
            <span className="text-sm text-slate-700" aria-live="polite">
              {savingIds.has(row.original.id) ? "Guardando…" : row.original.active ? "Activa" : "Inactiva"}
            </span>
          </label>
        ),
      },

      {
        id: "actions",
        header: "Acciones",

        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5 sm:flex-nowrap sm:gap-2">

            <button
              type="button"
              onClick={() =>
                onEdit(row.original)
              }
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100 sm:px-3 sm:text-sm"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() =>
                onDelete(row.original)
              }
              className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 sm:px-3 sm:text-sm"
            >
              Eliminar
            </button>

          </div>
        ),
      },
    ],
    [onEdit, onDelete, onToggleActive, savingIds]
  );

  return (
    <div className="w-full min-w-0 overflow-hidden [&_table]:min-w-[650px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_th]:px-3 [&_td]:px-3 sm:[&_th]:px-4 sm:[&_td]:px-4">
      <DataTable
        data={seasons}
        columns={columns}
      />
    </div>
  );
}
