"use client";

import { useEffect, useMemo, useState } from "react";

import DataTable from "@/components/shared/tables/DataTable";

import {
  getPlayers,
  type Player,
} from "@/services/player.service";

import { getCountries } from "@/services/country.service";

interface PlayersTableProps {
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
}

export default function PlayersTable({
  onEdit,
  onDelete,
}: PlayersTableProps) {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [players, setPlayers] = useState<Player[]>([]);

  const [countries, setCountries] = useState<
    Awaited<ReturnType<typeof getCountries>>
  >([]);

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  useEffect(() => {
    async function loadData() {
      try {
        const [
          playersData,
          countriesData,
        ] = await Promise.all([
          getPlayers(),
          getCountries(),
        ]);

        setPlayers(playersData);
        setCountries(countriesData);
      } catch (error) {
        console.error(
          "Error cargando datos de jugadores:",
          error
        );
      }
    }

    loadData();
  }, []);

  /*
   * ============================================================
   * COLUMNAS
   * ============================================================
   */

  const columns = useMemo(
    () => [
      /*
       * --------------------------------------------------------
       * JUGADOR
       * --------------------------------------------------------
       */

      {
        accessorKey: "name",
        header: "Jugador",
      },

      /*
       * --------------------------------------------------------
       * NOMBRE CORTO
       * --------------------------------------------------------
       */

      {
        accessorKey: "shortName",
        header: "Nombre corto",
      },

      /*
       * --------------------------------------------------------
       * PAÍS
       * --------------------------------------------------------
       */

      {
        accessorKey: "countryId",
        header: "País",

        cell: ({
          row,
        }: {
          row: { original: Player };
        }) => {
          const country = countries.find(
            (item) =>
              item.id ===
              row.original.countryId
          );

          return (
            country?.name ??
            "Sin país"
          );
        },
      },

      /*
       * --------------------------------------------------------
       * FECHA DE NACIMIENTO
       * --------------------------------------------------------
       */

      {
        accessorKey: "birthDate",
        header: "Fecha nacimiento",
      },

      /*
       * --------------------------------------------------------
       * ACTIVO
       * --------------------------------------------------------
       */

      {
        accessorKey: "active",
        header: "Activo",

        cell: ({
          row,
        }: {
          row: { original: Player };
        }) =>
          row.original.active
            ? "Sí"
            : "No",
      },

      /*
       * --------------------------------------------------------
       * ACCIONES
       * --------------------------------------------------------
       */

      {
        id: "actions",
        header: "Acciones",

        cell: ({
          row,
        }: {
          row: { original: Player };
        }) => (
          <div className="flex gap-2">

            <button
              type="button"
              onClick={() =>
                onEdit(row.original)
              }
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() =>
                onDelete(row.original)
              }
              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Eliminar
            </button>

          </div>
        ),
      },
    ],
    [
      onEdit,
      onDelete,
      countries,
    ]
  );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <DataTable
      columns={columns}
      data={players}
    />
  );
}