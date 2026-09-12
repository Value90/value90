"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DataTable from "@/components/shared/tables/DataTable";

import {
  getPlayers,
  type Player,
} from "@/services/player.service";

import {
  getCountries,
} from "@/services/country.service";

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

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [countries, setCountries] =
    useState<
      Awaited<
        ReturnType<typeof getCountries>
      >
    >([]);

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [
          playersData,
          countriesData,
        ] = await Promise.all([
          getPlayers(),
          getCountries(),
        ]);

        if (!mounted) {
          return;
        }

        setPlayers(playersData);
        setCountries(countriesData);
      } catch (error) {
        console.error(
          "Error cargando datos de jugadores:",
          error
        );

        if (!mounted) {
          return;
        }

        setPlayers([]);
        setCountries([]);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
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
          row: {
            original: Player;
          };
        }) => {
          const country =
            countries.find(
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
          row: {
            original: Player;
          };
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
        enableSorting: false,

        cell: ({
          row,
        }: {
          row: {
            original: Player;
          };
        }) => (
          <div className="flex items-center gap-1 whitespace-nowrap sm:gap-2">

            <button
              type="button"
              onClick={() =>
                onEdit(row.original)
              }
              className="rounded-md bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() =>
                onDelete(row.original)
              }
              className="rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm"
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
    <div
      className="
        w-full
        min-w-0
        overflow-hidden
        [&_table]:min-w-[700px]
        [&_th]:whitespace-nowrap
        [&_td]:whitespace-nowrap
        [&_th]:px-3
        [&_td]:px-3
        [&_th]:py-3
        [&_td]:py-3
        sm:[&_th]:px-4
        sm:[&_td]:px-4
      "
    >
      <DataTable
        columns={columns}
        data={players}
      />
    </div>
  );
}