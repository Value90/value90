"use client";

import { useMemo } from "react";

import DataTable from "@/components/shared/tables/DataTable";

import type { ColumnDef } from "@tanstack/react-table";

import type { Season } from "@/services/season.service";

interface SeasonsTableProps {
  seasons: Season[];
  onEdit: (season: Season) => void;
  onDelete: (season: Season) => void;
}

export default function SeasonsTable({
  seasons,
  onEdit,
  onDelete,
}: SeasonsTableProps) {
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
        cell: ({ getValue }) =>
          getValue<boolean>()
            ? "Activa"
            : "Inactiva",
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
    [onEdit, onDelete]
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