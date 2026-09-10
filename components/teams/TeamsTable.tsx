"use client";

import { useEffect, useState } from "react";

import DataTable from "@/components/shared/tables/DataTable";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import {
  getCountries,
  type Country,
} from "@/services/country.service";

import type { ColumnDef } from "@tanstack/react-table";

interface TeamsTableProps {
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}

export default function TeamsTable({
  onEdit,
  onDelete,
}: TeamsTableProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ============================================================
   * CARGAR EQUIPOS Y PAÍSES DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [teamsData, countriesData] =
          await Promise.all([
            getTeams(),
            getCountries(),
          ]);

        setTeams(teamsData);
        setCountries(countriesData);
      } catch (error) {
        console.error(
          "Error cargando equipos y países:",
          error
        );

        setError(
          "No se pudieron cargar los equipos."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /*
   * ============================================================
   * OBTENER NOMBRE DEL PAÍS
   * ============================================================
   */

  const getCountryName = (countryId: number) => {
    const country = countries.find(
      (country) => country.id === countryId
    );

    return country?.name ?? "Sin país";
  };

  /*
   * ============================================================
   * ORDEN ALFABÉTICO INICIAL
   * ============================================================
   */

  const sortedTeams = [...teams].sort((a, b) =>
    a.name.localeCompare(b.name, "es", {
      sensitivity: "base",
    })
  );

  /*
   * ============================================================
   * COLUMNAS
   * ============================================================
   */

  const columns: ColumnDef<Team, unknown>[] = [
    {
      accessorKey: "name",
      header: "Equipo",
    },

    {
      accessorKey: "shortName",
      header: "Abreviatura",
    },

    {
      accessorKey: "countryId",
      header: "País",
      cell: ({ getValue }) =>
        getCountryName(getValue<number>()),
    },

    {
      accessorKey: "city",
      header: "Ciudad",
    },

    {
      accessorKey: "stadium",
      header: "Estadio",
    },

    {
      accessorKey: "type",
      header: "Tipo",
    },

    {
      accessorKey: "active",
      header: "Estado",
      cell: ({ getValue }) =>
        getValue<boolean>()
          ? "Activo"
          : "Inactivo",
    },

    {
      id: "actions",
      header: "Acciones",

      cell: ({ row }) => {
        const team = row.original;

        return (
          <div className="flex gap-2">

            <button
              type="button"
              onClick={() => onEdit(team)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() => onDelete(team)}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>

          </div>
        );
      },
    },
  ];

  /*
   * ============================================================
   * ESTADOS
   * ============================================================
   */

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
        Cargando equipos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  /*
   * ============================================================
   * TABLA
   * ============================================================
   */

  return (
    <DataTable
      data={sortedTeams}
      columns={columns}
    />
  );
}