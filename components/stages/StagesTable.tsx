"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DataTable from "@/components/shared/tables/DataTable";

import {
  getStages,
  type Stage,
} from "@/services/stage.service";

import {
  getSeasons,
  type Season,
} from "@/services/season.service";

interface StagesTableProps {
  onEdit: (stage: Stage) => void;
  onDelete: (stage: Stage) => void;
}

export default function StagesTable({
  onEdit,
  onDelete,
}: StagesTableProps) {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [stages, setStages] =
    useState<Stage[]>([]);

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [loading, setLoading] =
    useState(true);

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);

        const [
          stagesData,
          seasonsData,
        ] = await Promise.all([
          getStages(),
          getSeasons(),
        ]);

        if (!mounted) {
          return;
        }

        setStages(stagesData);
        setSeasons(seasonsData);
      } catch (error) {
        console.error(
          "Error cargando jornadas / fases:",
          error
        );

        if (!mounted) {
          return;
        }

        setStages([]);
        setSeasons([]);
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

  /*
   * ============================================================
   * OBTENER AÑO INICIAL DE LA TEMPORADA
   * ============================================================
   *
   * Admite:
   *
   * 26/27
   * 2026/2027
   * Temporada 2026/27
   * Temporada 2025/26
   *
   * ============================================================
   */

  const getSeasonStartYear = (
    seasonName: string
  ): number => {
    if (!seasonName) {
      return 0;
    }

    const match =
      seasonName.match(
        /\d{2,4}/
      );

    if (!match) {
      return 0;
    }

    const year =
      Number(match[0]);

    if (year < 100) {
      return 2000 + year;
    }

    return year;
  };

  /*
   * ============================================================
   * OBTENER NÚMERO DE JORNADA
   * ============================================================
   *
   * Ejemplos:
   *
   * Jornada 1 -> 1
   * Jornada 2 -> 2
   * Jornada 3 -> 3
   *
   * También permite:
   *
   * Jornada 10 -> 10
   *
   * ============================================================
   */

  const getStageNumber = (
    stageName: string
  ): number | null => {
    if (!stageName) {
      return null;
    }

    const match =
      stageName.match(
        /(\d+)\s*$/
      );

    if (!match) {
      return null;
    }

    return Number(
      match[1]
    );
  };

  /*
   * ============================================================
   * DATOS ORDENADOS
   * ============================================================
   *
   * ORDEN:
   *
   * 1. Temporada más reciente
   * 2. Jornada más alta
   *
   * ============================================================
   */

  const sortedStages =
    useMemo(() => {
      /*
       * Mapa de temporadas para acceder rápidamente
       * al nombre de cada temporada.
       */

      const seasonMap =
        new Map<number, Season>();

      seasons.forEach(
        (season) => {
          seasonMap.set(
            season.id,
            season
          );
        }
      );

      return [...stages].sort(
        (a, b) => {
          const seasonA =
            seasonMap.get(
              a.seasonId
            );

          const seasonB =
            seasonMap.get(
              b.seasonId
            );

          /*
           * ==================================================
           * 1. TEMPORADA
           * ==================================================
           */

          const yearA =
            getSeasonStartYear(
              seasonA?.name ?? ""
            );

          const yearB =
            getSeasonStartYear(
              seasonB?.name ?? ""
            );

          if (yearA !== yearB) {
            return (
              yearB - yearA
            );
          }

          /*
           * ==================================================
           * 2. JORNADA
           * ==================================================
           *
           * NO utilizamos displayOrder.
           *
           * Utilizamos el número que aparece en el nombre.
           *
           * ==================================================
           */

          const stageNumberA =
            getStageNumber(
              a.name
            );

          const stageNumberB =
            getStageNumber(
              b.name
            );

          /*
           * Si ambos nombres contienen número de jornada,
           * ordenamos numéricamente de mayor a menor.
           */

          if (
            stageNumberA !== null &&
            stageNumberB !== null &&
            stageNumberA !==
              stageNumberB
          ) {
            return (
              stageNumberB -
              stageNumberA
            );
          }

          /*
           * ==================================================
           * 3. DESDE DISPLAY ORDER
           * ==================================================
           *
           * Para fases que no tengan un número en el nombre
           * utilizamos displayOrder como criterio secundario.
           *
           * ==================================================
           */

          if (
            a.displayOrder !==
            b.displayOrder
          ) {
            return (
              b.displayOrder -
              a.displayOrder
            );
          }

          /*
           * ==================================================
           * 4. DESEMPATE POR NOMBRE
           * ==================================================
           */

          return a.name.localeCompare(
            b.name,
            "es"
          );
        }
      );
    }, [
      stages,
      seasons,
    ]);

  /*
   * ============================================================
   * COLUMNAS
   * ============================================================
   */

  const columns = useMemo(
    () => [
      /*
       * ========================================================
       * NOMBRE
       * ========================================================
       */

      {
        accessorKey: "name",

        header: "Nombre",
      },

      /*
       * ========================================================
       * TEMPORADA
       * ========================================================
       */

      {
        accessorKey: "seasonId",

        header: "Temporada",

        cell: ({
          row,
        }: {
          row: {
            original: Stage;
          };
        }) => {
          const season =
            seasons.find(
              (item: Season) =>
                item.id ===
                row.original.seasonId
            );

          return (
            season?.name ??
            "Temporada no encontrada"
          );
        },
      },

      /*
       * ========================================================
       * ESTADO
       * ========================================================
       */

      {
        accessorKey: "active",

        header: "Estado",

        cell: ({
          row,
        }: {
          row: {
            original: Stage;
          };
        }) =>
          row.original.active
            ? "Activa"
            : "Inactiva",
      },

      /*
       * ========================================================
       * ACCIONES
       * ========================================================
       */

      {
        id: "actions",

        header: "Acciones",

        enableSorting: false,

        cell: ({
          row,
        }: {
          row: {
            original: Stage;
          };
        }) => (
          <div className="flex flex-wrap gap-1.5 sm:flex-nowrap sm:gap-2">

            <button
              type="button"
              onClick={() =>
                onEdit(
                  row.original
                )
              }
              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 sm:px-3 sm:py-2 sm:text-sm"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() =>
                onDelete(
                  row.original
                )
              }
              className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 sm:px-3 sm:py-2 sm:text-sm"
            >
              Eliminar
            </button>

          </div>
        ),
      },
    ],
    [
      seasons,
      onEdit,
      onDelete,
    ]
  );

  /*
   * ============================================================
   * CARGANDO
   * ============================================================
   */

  if (loading) {
    return (
      <div className="w-full min-w-0 rounded-xl border bg-white p-5 shadow sm:p-6">
        <p className="text-sm text-slate-500 sm:text-base">
          Cargando jornadas / fases...
        </p>
      </div>
    );
  }

  /*
   * ============================================================
   * TABLA
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 overflow-hidden [&_table]:min-w-[650px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_th]:px-3 [&_td]:px-3 sm:[&_th]:px-4 sm:[&_td]:px-4">
      <DataTable
        columns={columns}
        data={sortedStages}
        initialSorting={[]}
      />
    </div>
  );
}