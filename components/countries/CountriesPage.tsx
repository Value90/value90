"use client";

import { useEffect, useState } from "react";

import CountriesTable from "@/components/countries/CountriesTable";
import CountryForm from "@/components/countries/CountryForm";

import {
  addCountry,
  deleteCountry,
  getCountries,
  updateCountry,
  type Country,
} from "@/services/country.service";

export default function CountriesPage() {
  const [showForm, setShowForm] = useState(false);

  const [editingCountry, setEditingCountry] =
    useState<Country | undefined>(undefined);

  const [countries, setCountries] =
    useState<Country[]>([]);

  const [refresh, setRefresh] = useState(0);

  const [loading, setLoading] =
    useState(true);

  /*
   * ============================================================
   * CARGAR PAÍSES
   * ============================================================
   */

  useEffect(() => {
    const loadCountries = async () => {
      try {
        setLoading(true);

        const data = await getCountries();

        setCountries(data);
      } catch (error) {
        console.error(
          "Error al cargar los países:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadCountries();
  }, [refresh]);

  /*
   * ============================================================
   * GUARDAR
   * ============================================================
   */

  const handleSave = async (country: {
    name: string;
    code: string;
    fifaCode: string;
    continent: string;
  }) => {
    try {
      if (editingCountry) {
        await updateCountry(
          editingCountry.id,
          country
        );
      } else {
        await addCountry(country);
      }

      setRefresh((value) => value + 1);

      setEditingCountry(undefined);

      setShowForm(false);
    } catch (error) {
      console.error(
        "Error al guardar el país:",
        error
      );
    }
  };

  /*
   * ============================================================
   * EDITAR
   * ============================================================
   */

  const handleEdit = (country: Country) => {
    setEditingCountry(country);

    setShowForm(true);
  };

  /*
   * ============================================================
   * ELIMINAR
   * ============================================================
   */

  const handleDelete = async (
    country: Country
  ) => {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar el país "${country.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCountry(country.id);

      setRefresh((value) => value + 1);
    } catch (error) {
      console.error(
        "Error al eliminar el país:",
        error
      );
    }
  };

  /*
   * ============================================================
   * CANCELAR
   * ============================================================
   */

  const handleCancel = () => {
    setEditingCountry(undefined);

    setShowForm(false);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 p-3 sm:p-5 md:p-8">
      {/* CABECERA */}

      <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Países
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Gestión de países de Value90
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setEditingCountry(undefined);
              setShowForm(true);
            }}
            className="w-full rounded-lg bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto sm:px-5"
          >
            + Nuevo país
          </button>
        )}
      </div>

      {showForm ? (
        <div className="w-full min-w-0">
          <CountryForm
            country={editingCountry}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        </div>
      ) : (
        <>
          {/* RESUMEN */}

          <p className="mb-5 text-sm text-slate-700 sm:mb-6 sm:text-base">
            Total de países:{" "}

            <span className="font-semibold">
              {loading
                ? "..."
                : countries.length}
            </span>
          </p>

          {/* TABLA */}

          <div className="w-full min-w-0">
            <CountriesTable
              countries={countries}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </>
      )}
    </div>
  );
}
