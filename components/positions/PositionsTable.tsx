"use client";

import DataTable from "@/components/shared/tables/DataTable";

import type { Position } from "@/services/position.service";

import type { ColumnDef } from "@tanstack/react-table";

interface PositionsTableProps {
  positions: Position[];
  loading: boolean;
  onEdit: (position: Position) => void;
  onDelete: (position: Position) => void;
}

export default function PositionsTable({
  positions,
  loading,
  onEdit,
  onDelete,
}: PositionsTableProps) {
  const columns: ColumnDef<Position, unknown>[] = [
    {
      accessorKey: "name",
      header: "Posición",
    },

    {
      accessorKey: "shortName",
      header: "Nombre corto",
    },

    {
      accessorKey: "displayOrder",
      header: "Orden",
    },

    {
      accessorKey: "active",
      header: "Activa",

      cell: ({ row }) =>
        row.original.active
          ? "Sí"
          : "No",
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
  ];

  if (loading) {
    return (
      <div className="w-full min-w-0 rounded-xl border bg-white p-5 text-center text-sm text-slate-500 sm:p-8 sm:text-base">
        Cargando posiciones...
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="w-full min-w-0 rounded-xl border bg-white p-5 text-center text-sm text-slate-500 sm:p-8 sm:text-base">
        No hay posiciones registradas.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-hidden [&_table]:min-w-[620px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_th]:px-3 [&_td]:px-3 sm:[&_th]:px-4 sm:[&_td]:px-4">
      <DataTable
        data={positions}
        columns={columns}
      />
    </div>
  );
}