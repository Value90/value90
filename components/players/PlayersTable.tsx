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
   * FILTRO POR PAÍS
   * ============================================================
   */

  const [selectedCountryId, setSelectedCountryId] =
    useState<number>(0);

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
   * JUGADORES FILTRADOS POR PAÍS
   * ============================================================
   */

  const filteredPlayers = useMemo(() => {
    /*
     * 0 = todos los países
     */

    if (selectedCountryId === 0) {
      return players;
    }

    return players.filter(
      (player) =>
        player.countryId ===
        selectedCountryId
    );
  }, [
    players,
    selectedCountryId,
  ]);

  /*
   * ============================================================
   * PAÍSES ORDENADOS ALFABÉTICAMENTE
   * ============================================================
   */

  const sortedCountries = useMemo(() => {
    return [...countries].sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "es"
        )
    );
  }, [countries]);

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
    <div className="w-full min-w-0 space-y-4">

      {/* ======================================================
          FILTRO DE PAÍS
          ====================================================== */}

      <div className="w-full">

        <select
          value={selectedCountryId}
          onChange={(event) => {
            setSelectedCountryId(
              Number(
                event.target.value
              )
            );
          }}
          className="
            w-full
            min-w-0
            max-w-full
            rounded-lg
            border
            border-slate-300
            bg-white
            px-3
            py-2.5
            text-sm
            text-slate-700
            outline-none
            transition
            focus:border-slate-500
            sm:w-auto
            sm:min-w-[240px]
          "
        >

          <option value={0}>
            Todos los países
          </option>

          {sortedCountries.map(
            (country) => (
              <option
                key={country.id}
                value={country.id}
              >
                {country.name}
              </option>
            )
          )}

        </select>

      </div>

      {/* ======================================================
          TABLA
          ====================================================== */}

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
          data={filteredPlayers}
        />

      </div>

    </div>
  );
}