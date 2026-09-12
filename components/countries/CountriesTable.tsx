"use client";

import DataTable from "@/components/shared/tables/DataTable";

import type { Country } from "@/services/country.service";

import type { ColumnDef } from "@tanstack/react-table";

interface CountriesTableProps {
  countries: Country[];
  onEdit: (country: Country) => void;
  onDelete: (country: Country) => void;
}

export default function CountriesTable({
  countries,
  onEdit,
  onDelete,
}: CountriesTableProps) {
  const columns: ColumnDef<Country, unknown>[] = [
    {
      accessorKey: "name",
      header: "País",
    },

    {
      accessorKey: "fifaCode",
      header: "Código FIFA",
    },

    {
      accessorKey: "continent",
      header: "Continente",
    },

    {
      id: "actions",

      header: "Acciones",

      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <button
            type="button"
            onClick={() => onEdit(row.original)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100 sm:px-3 sm:text-sm"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => onDelete(row.original)}
            className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 sm:px-3 sm:text-sm"
          >
            Eliminar
          </button>
        </div>
      ),
    },
  ];

  const sortedCountries = [...countries].sort((a, b) =>
    a.name.localeCompare(b.name, "es", {
      sensitivity: "base",
    })
  );

  return (
    <div className="w-full min-w-0">
      <DataTable
        data={sortedCountries}
        columns={columns}
      />
    </div>
  );
}
