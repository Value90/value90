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
    <div className="w-full p-8">
      {/* CABECERA */}

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Países
          </h1>

          <p className="mt-2 text-slate-600">
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
            className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            + Nuevo país
          </button>
        )}
      </div>

      {showForm ? (
        <CountryForm
          country={editingCountry}
          onCancel={handleCancel}
          onSave={handleSave}
        />
      ) : (
        <>
          {/* RESUMEN */}

          <p className="mb-6 text-slate-700">
            Total de países:{" "}

            <span className="font-semibold">
              {loading
                ? "..."
                : countries.length}
            </span>
          </p>

          {/* TABLA */}

          <CountriesTable
            countries={countries}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}