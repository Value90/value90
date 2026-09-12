"use client";

import { useEffect, useMemo, useState } from "react";

import DataTable from "@/components/shared/tables/DataTable";

import {
  getCompetitions,
  type Competition,
} from "@/services/competition.service";

import {
  getCountries,
  type Country,
} from "@/services/country.service";

import type { ColumnDef } from "@tanstack/react-table";

interface CompetitionsTableProps {
  onEdit: (competition: Competition) => void;
  onDelete: (competition: Competition) => void;
}

export default function CompetitionsTable({
  onEdit,
  onDelete,
}: CompetitionsTableProps) {
  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [countries, setCountries] =
    useState<Country[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          competitionsData,
          countriesData,
        ] = await Promise.all([
          getCompetitions(),
          getCountries(),
        ]);

        if (!mounted) {
          return;
        }

        setCompetitions(
          competitionsData
        );

        setCountries(
          countriesData
        );
      } catch (error) {
        console.error(
          "Error cargando competiciones:",
          error
        );

        if (!mounted) {
          return;
        }

        setCompetitions([]);
        setCountries([]);

        setError(
          "No se han podido cargar las competiciones."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const getCountryName = (
    countryId: number | null
  ) => {
    if (countryId === null) {
      return "Sin país";
    }

    const country = countries.find(
      (item: Country) =>
        item.id === countryId
    );

    return (
      country?.name ??
      "País no encontrado"
    );
  };

  const columns = useMemo<
    ColumnDef<Competition, unknown>[]
  >(
    () => [
      {
        accessorKey: "name",
        header: "Competición",
      },

      {
        accessorKey: "shortName",
        header: "Abreviatura",
      },

      {
        id: "country",
        header: "País",
        cell: ({ row }) =>
          getCountryName(
            row.original.countryId
          ),
      },

      {
        accessorKey: "confederation",
        header: "Confederación",
      },

      {
        accessorKey: "competitionType",
        header: "Tipo",
        cell: ({ getValue }) => {
          const value =
            getValue<
              Competition["competitionType"]
            >();

          if (value === "League") {
            return "Liga";
          }

          if (value === "Cup") {
            return "Copa";
          }

          return "Selecciones";
        },
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

        cell: ({ row }) => {
          const competition =
            row.original;

          return (
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <button
                type="button"
                onClick={() =>
                  onEdit(competition)
                }
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100 sm:px-3 sm:text-sm"
              >
                Editar
              </button>

              <button
                type="button"
                onClick={() =>
                  onDelete(competition)
                }
                className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 sm:px-3 sm:text-sm"
              >
                Eliminar
              </button>
            </div>
          );
        },
      },
    ],
    [
      countries,
      onEdit,
      onDelete,
    ]
  );

  if (loading) {
    return (
      <div className="w-full min-w-0 rounded-xl border bg-white p-4 text-sm text-slate-500 sm:p-6">
        Cargando competiciones...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-w-0 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <DataTable
        data={competitions}
        columns={columns}
      />
    </div>
  );
}
