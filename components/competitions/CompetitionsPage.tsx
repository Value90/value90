"use client";

import { useEffect, useMemo, useState } from "react";

import {
  deleteCompetition,
  getCompetitions,
  type Competition,
} from "@/services/competition.service";

import {
  getCountries,
  type Country,
} from "@/services/country.service";

import CompetitionForm from "@/components/competitions/CompetitionForm";

export default function CompetitionsPage() {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ============================================================
   * BUSCADOR
   * ============================================================
   */

  const [search, setSearch] = useState("");

  /*
   * ============================================================
   * FORMULARIO
   * ============================================================
   */

  const [showForm, setShowForm] = useState(false);
  const [editingCompetition, setEditingCompetition] =
    useState<Competition | null>(null);

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [competitionsData, countriesData] =
        await Promise.all([
          getCompetitions(),
          getCountries(),
        ]);

      setCompetitions(competitionsData);
      setCountries(countriesData);
    } catch (err) {
      console.error(
        "Error cargando competiciones:",
        err
      );

      setError(
        "No se han podido cargar las competiciones."
      );

      setCompetitions([]);
      setCountries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function load() {
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

        if (!mounted) return;

        setCompetitions(competitionsData);
        setCountries(countriesData);
      } catch (err) {
        console.error(
          "Error cargando competiciones:",
          err
        );

        if (!mounted) return;

        setError(
          "No se han podido cargar las competiciones."
        );

        setCompetitions([]);
        setCountries([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * PAÍSES
   * ============================================================
   */

  const getCountryName = (
    countryId: number | null
  ) => {
    if (countryId === null) {
      return "—";
    }

    return (
      countries.find(
        (country) => country.id === countryId
      )?.name ?? "—"
    );
  };

  /*
   * ============================================================
   * FILTRADO
   * ============================================================
   */

  const filteredCompetitions = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return competitions;
    }

    return competitions.filter((competition) => {
      const countryName = getCountryName(
        competition.countryId
      );

      return (
        competition.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        competition.shortName
          .toLowerCase()
          .includes(normalizedSearch) ||
        countryName
          .toLowerCase()
          .includes(normalizedSearch) ||
        competition.confederation
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [competitions, countries, search]);

  /*
   * ============================================================
   * NUEVA COMPETICIÓN
   * ============================================================
   */

  const handleNewCompetition = () => {
    setEditingCompetition(null);
    setShowForm(true);
  };

  /*
   * ============================================================
   * EDITAR
   * ============================================================
   */

  const handleEdit = (
    competition: Competition
  ) => {
    setEditingCompetition(competition);
    setShowForm(true);
  };

  /*
   * ============================================================
   * ELIMINAR
   * ============================================================
   */

  const handleDelete = async (
    competition: Competition
  ) => {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar la competición "${competition.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteCompetition(
        competition.id
      );

      await loadData();
    } catch (err) {
      console.error(
        "Error eliminando competición:",
        err
      );

      setError(
        "No se ha podido eliminar la competición."
      );
    }
  };

  /*
   * ============================================================
   * FORMULARIO CERRADO
   * ============================================================
   */

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCompetition(null);
  };

  /*
   * ============================================================
   * FORMULARIO GUARDADO
   * ============================================================
   */

  const handleFormSaved = async () => {
    setShowForm(false);
    setEditingCompetition(null);

    await loadData();
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 p-3 sm:p-5 md:p-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-800">
            Competiciones
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Gestión de competiciones de Value90
          </p>

        </div>

        {!showForm && (
          <button
            type="button"
            onClick={handleNewCompetition}
            className="
              inline-flex
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-slate-800
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-slate-700
              focus:outline-none
              focus:ring-2
              focus:ring-slate-400
              focus:ring-offset-2
            "
          >
            + Nueva competición
          </button>
        )}

      </div>

      {/* ======================================================
          FORMULARIO
          ====================================================== */}

      {showForm ? (

        <section className="mb-8">
          <CompetitionForm
            competition={editingCompetition}
            onClose={handleFormClose}
            onSaved={handleFormSaved}
          />
        </section>

      ) : (

        <>
          {/* ==================================================
              TOTAL
              ================================================== */}

          <div className="mb-6 text-base text-slate-700">
            Total de competiciones:{" "}
            <span className="font-bold">
              {loading
                ? "..."
                : competitions.length}
            </span>
          </div>

          {/* ==================================================
              ERROR
              ================================================== */}

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ==================================================
              BUSCADOR
              ================================================== */}

          <div className="mb-5">

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar..."
              className="
                w-full
                max-w-[480px]
                rounded-xl
                border
                border-slate-300
                bg-white
                px-5
                py-3.5
                text-base
                text-slate-800
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-slate-400
                focus:ring-2
                focus:ring-slate-200
              "
            />

          </div>

          {/* ==================================================
              TABLA
              ================================================== */}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[950px]">

                <thead className="bg-slate-100">

                  <tr>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                      Nombre
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                      Abreviatura
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                      País
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                      Tipo
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                      Confederación
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                      Estado
                    </th>

                    <th className="px-5 py-4 text-left text-sm font-semibold text-slate-700">
                      Acciones
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {loading ? (

                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        Cargando competiciones...
                      </td>
                    </tr>

                  ) : filteredCompetitions.length === 0 ? (

                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        {search.trim()
                          ? "No se encontraron competiciones."
                          : "Todavía no hay competiciones registradas."}
                      </td>
                    </tr>

                  ) : (

                    filteredCompetitions.map(
                      (competition) => (

                        <tr
                          key={competition.id}
                          className="border-t border-slate-200 transition hover:bg-slate-50"
                        >

                          <td className="px-5 py-4 text-sm font-medium text-slate-800">
                            {competition.name}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {competition.shortName}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {getCountryName(
                              competition.countryId
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {competition.competitionType}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {competition.confederation}
                          </td>

                          <td className="px-5 py-4 text-sm">

                            {competition.active ? (

                              <span className="font-medium text-slate-700">
                                Activa
                              </span>

                            ) : (

                              <span className="font-medium text-slate-400">
                                Inactiva
                              </span>

                            )}

                          </td>

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2 whitespace-nowrap">

                              <button
                                type="button"
                                onClick={() =>
                                  handleEdit(
                                    competition
                                  )
                                }
                                className="
                                  rounded-lg
                                  bg-slate-100
                                  px-3
                                  py-2
                                  text-sm
                                  font-medium
                                  text-slate-700
                                  transition
                                  hover:bg-slate-200
                                "
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    competition
                                  )
                                }
                                className="
                                  rounded-lg
                                  bg-red-50
                                  px-3
                                  py-2
                                  text-sm
                                  font-medium
                                  text-red-700
                                  transition
                                  hover:bg-red-100
                                "
                              >
                                Eliminar
                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </>

      )}

    </div>
  );
}