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
          <div className="flex gap-2">

            <button
              type="button"
              onClick={() =>
                onEdit(row.original)
              }
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() =>
                onDelete(row.original)
              }
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
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
    <DataTable
      data={seasons}
      columns={columns}
    />
  );
}