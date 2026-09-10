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

  ];

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
        Cargando posiciones...
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
        No hay posiciones registradas.
      </div>
    );
  }

  return (
    <DataTable
      data={positions}
      columns={columns}
    />
  );
}