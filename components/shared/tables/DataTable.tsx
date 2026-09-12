"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";

import {
  useState,
  type ReactNode,
} from "react";

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];

  /*
   * ============================================================
   * BUSCADOR
   * ============================================================
   *
   * Permite ocultar el buscador únicamente
   * en las tablas que lo necesiten.
   *
   * Por defecto sigue apareciendo.
   * ============================================================
   */

  showSearch?: boolean;

  /*
   * ============================================================
   * ORDENACIÓN INICIAL
   * ============================================================
   */

  initialSorting?: SortingState;

  /*
   * ============================================================
   * ACCIONES ADICIONALES
   * ============================================================
   *
   * Controles adicionales que aparecerán
   * junto al buscador.
   * ============================================================
   */

  toolbarActions?: ReactNode;
}

/*
 * ==============================================================
 * NORMALIZAR TEXTO
 * ==============================================================
 *
 * Elimina tildes y acentos para que la búsqueda no distinga
 * entre:
 *
 * José / Jose
 * García / Garcia
 * Álvaro / Alvaro
 * Muñoz / Munoz
 *
 * No modifica los datos originales.
 * ==============================================================
 */

const normalizeText = (
  value: string
): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
};

export default function DataTable<TData>({
  data,
  columns,
  showSearch = true,
  initialSorting = [],
  toolbarActions,
}: DataTableProps<TData>) {
  /*
   * ============================================================
   * ORDENACIÓN
   * ============================================================
   */

  const [sorting, setSorting] =
    useState<SortingState>(
      initialSorting
    );

  /*
   * ============================================================
   * BUSCADOR
   * ============================================================
   */

  const [globalFilter, setGlobalFilter] =
    useState("");

  /*
   * ============================================================
   * PAGINACIÓN
   * ============================================================
   */

  const [pagination, setPagination] =
    useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10,
    });

  /*
   * ============================================================
   * TABLA
   * ============================================================
   */

  const table = useReactTable({
    data,
    columns,

    state: {
      sorting,
      globalFilter,
      pagination,
    },

    onSortingChange:
      setSorting,

    onGlobalFilterChange:
      setGlobalFilter,

    onPaginationChange:
      setPagination,

    getCoreRowModel:
      getCoreRowModel(),

    getSortedRowModel:
      getSortedRowModel(),

    getFilteredRowModel:
      getFilteredRowModel(),

    getPaginationRowModel:
      getPaginationRowModel(),

    /*
     * ==========================================================
     * FILTRO GLOBAL PERSONALIZADO
     * ==========================================================
     */

    globalFilterFn: (
      row,
      _columnId,
      filterValue
    ) => {
      const searchText =
        normalizeText(
          String(
            filterValue ?? ""
          )
        );

      if (!searchText) {
        return true;
      }

      return row
        .getAllCells()
        .some((cell) => {
          const value =
            cell.getValue();

          if (
            value === null ||
            value === undefined
          ) {
            return false;
          }

          return normalizeText(
            String(value)
          ).includes(searchText);
        });
    },
  });

  /*
   * ============================================================
   * PAGINACIÓN NUMÉRICA
   * ============================================================
   *
   * Ejemplos:
   *
   * [1, 2, 3, 4, 5, 6, 7]
   *
   * [1, 2, 3, 4, 5, ..., 10]
   *
   * [1, ..., 4, 5, 6, ..., 10]
   *
   * [1, ..., 6, 7, 8, 9, 10]
   *
   * ============================================================
   */

  const getPageNumbers = (): (
    | number
    | "..."
  )[] => {
    const pageCount =
      table.getPageCount();

    const currentPage =
      table.getState()
        .pagination
        .pageIndex + 1;

    /*
     * Si hay pocas páginas,
     * mostramos todas.
     */

    if (pageCount <= 7) {
      return Array.from(
        { length: pageCount },
        (_, index) =>
          index + 1
      );
    }

    /*
     * Primera página.
     */

    const pages: (
      | number
      | "..."
    )[] = [1];

    /*
     * Estamos al principio.
     */

    if (currentPage <= 4) {
      pages.push(
        2,
        3,
        4,
        5,
        "...",
        pageCount
      );

      return pages;
    }

    /*
     * Estamos al final.
     */

    if (
      currentPage >=
      pageCount - 3
    ) {
      pages.push(
        "...",
        pageCount - 4,
        pageCount - 3,
        pageCount - 2,
        pageCount - 1,
        pageCount
      );

      return pages;
    }

    /*
     * Estamos en una página intermedia.
     */

    pages.push(
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      pageCount
    );

    return pages;
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full space-y-4">

      {/* ======================================================
          BARRA DE HERRAMIENTAS
          ====================================================== */}

      {(showSearch ||
        toolbarActions) && (

        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">

          {/* ==================================================
              BUSCADOR
              ================================================== */}

          {showSearch ? (
            <input
              type="text"
              placeholder="Buscar..."
              value={
                globalFilter ?? ""
              }
              onChange={(event) => {
                setGlobalFilter(
                  event.target.value
                );

                /*
                 * Cuando buscamos,
                 * volvemos a la primera página.
                 */

                table.setPageIndex(0);
              }}
              className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
            />
          ) : (
            <div />
          )}

          {/* ==================================================
              CONTROLES ADICIONALES
              ================================================== */}

          {toolbarActions && (
            <div className="flex w-full items-center gap-3 md:w-auto">
              {toolbarActions}
            </div>
          )}

        </div>
      )}

      {/* ======================================================
          CONTENEDOR RESPONSIVE DE LA TABLA
          ====================================================== */}

      <div
        className="
          w-full
          overflow-x-auto
          overflow-y-hidden
          rounded-xl
          border
          bg-white
          shadow
        "
      >

        {/* ====================================================
            TABLA
            ==================================================== */}

        <table
          className="
            w-full
            min-w-max
            border-collapse
          "
        >

          {/* ==================================================
              CABECERA
              ================================================== */}

          <thead className="bg-slate-100">

            {table
              .getHeaderGroups()
              .map(
                (headerGroup) => (

                  <tr
                    key={
                      headerGroup.id
                    }
                  >

                    {headerGroup.headers.map(
                      (
                        header,
                        headerIndex
                      ) => (

                        <th
                          key={`${headerGroup.id}-${header.id}-${headerIndex}`}
                          className="
                            whitespace-nowrap
                            p-4
                            text-left
                            font-semibold
                            text-slate-700
                          "
                        >

                          {header.isPlaceholder
                            ? null
                            : (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className="
                                  flex
                                  items-center
                                  gap-2
                                  whitespace-nowrap
                                "
                              >

                                {flexRender(
                                  header
                                    .column
                                    .columnDef
                                    .header,
                                  header.getContext()
                                )}

                                {{
                                  asc: " ↑",
                                  desc: " ↓",
                                }[
                                  header
                                    .column
                                    .getIsSorted() as string
                                ] ?? ""}

                              </button>
                            )}

                        </th>

                      )
                    )}

                  </tr>

                )
              )}

          </thead>

          {/* ==================================================
              CUERPO
              ================================================== */}

          <tbody>

            {table.getRowModel()
              .rows.length ===
            0 ? (

              <tr>

                <td
                  colSpan={
                    columns.length
                  }
                  className="
                    p-8
                    text-center
                    text-slate-500
                  "
                >
                  No se encontraron
                  resultados.
                </td>

              </tr>

            ) : (

              table
                .getRowModel()
                .rows
                .map(
                  (row) => (

                    <tr
                      key={row.id}
                      className="
                        border-t
                        hover:bg-slate-50
                      "
                    >

                      {row
                        .getVisibleCells()
                        .map(
                          (
                            cell,
                            cellIndex
                          ) => (

                            <td
                              key={`${row.id}-${cell.id}-${cellIndex}`}
                              className="
                                p-4
                                align-middle
                              "
                            >

                              {flexRender(
                                cell
                                  .column
                                  .columnDef
                                  .cell,
                                cell.getContext()
                              )}

                            </td>

                          )
                        )}

                    </tr>

                  )
                )

            )}

          </tbody>

        </table>

        {/* ====================================================
            PAGINACIÓN
            ==================================================== */}

        <div
          className="
            flex
            flex-col
            gap-3
            border-t
            bg-slate-50
            px-4
            py-3
            md:flex-row
            md:items-center
            md:justify-between
          "
        >

          {/* ==================================================
              INFORMACIÓN DE PÁGINA
              ================================================== */}

          <div
            className="
              text-sm
              text-slate-600
            "
          >

            Página{" "}

            <span className="font-semibold">
              {table.getState()
                .pagination
                .pageIndex + 1}
            </span>{" "}

            de{" "}

            <span className="font-semibold">
              {table.getPageCount()}
            </span>

          </div>

          {/* ==================================================
              CONTROLES
              ================================================== */}

          <div
            className="
              flex
              items-center
              justify-center
              gap-1
              overflow-x-auto
            "
          >

            {/* ==================================================
                ANTERIOR
                ================================================== */}

            <button
              type="button"
              onClick={() =>
                table.previousPage()
              }
              disabled={
                !table.getCanPreviousPage()
              }
              className="
                shrink-0
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                py-2
                text-sm
                font-medium
                text-slate-700
                transition
                hover:bg-slate-100
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              ← Anterior
            </button>

            {/* ==================================================
                NÚMEROS
                ================================================== */}

            <div
              className="
                flex
                shrink-0
                items-center
                gap-1
              "
            >

              {getPageNumbers().map(
                (
                  page,
                  index
                ) =>
                  typeof page ===
                  "number" ? (

                    <button
                      key={page}
                      type="button"
                      onClick={() =>
                        table.setPageIndex(
                          page - 1
                        )
                      }
                      className={`
                        min-w-[40px]
                        rounded-lg
                        border
                        px-3
                        py-2
                        text-sm
                        font-medium
                        transition
                        ${
                          table.getState()
                            .pagination
                            .pageIndex ===
                          page - 1
                            ? "border-slate-800 bg-slate-800 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }
                      `}
                    >
                      {page}
                    </button>

                  ) : (

                    <span
                      key={`ellipsis-${index}`}
                      className="
                        shrink-0
                        px-2
                        text-slate-500
                      "
                    >
                      ...
                    </span>

                  )
              )}

            </div>

            {/* ==================================================
                SIGUIENTE
                ================================================== */}

            <button
              type="button"
              onClick={() =>
                table.nextPage()
              }
              disabled={
                !table.getCanNextPage()
              }
              className="
                shrink-0
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                py-2
                text-sm
                font-medium
                text-slate-700
                transition
                hover:bg-slate-100
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              Siguiente →
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}