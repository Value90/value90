"use client";

import { useEffect, useState } from "react";

import {
  addCompetition,
  updateCompetition,
  type Competition,
} from "@/services/competition.service";

import {
  getCountries,
  type Country,
} from "@/services/country.service";

interface CompetitionFormProps {
  competition: Competition | null;
  onClose: () => void;
  onSaved?: () => void;
}

export default function CompetitionForm({
  competition,
  onClose,
  onSaved,
}: CompetitionFormProps) {
  /*
   * ============================================================
   * PAÍSES
   * ============================================================
   */

  const [countries, setCountries] = useState<Country[]>([]);

  const [countriesLoading, setCountriesLoading] =
    useState(true);

  const [countriesError, setCountriesError] =
    useState("");

  /*
   * ============================================================
   * CARGAR PAÍSES DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadCountries() {
      try {
        setCountriesLoading(true);
        setCountriesError("");

        const data = await getCountries();

        if (mounted) {
          const sortedCountries = [...data].sort((a, b) =>
            a.name.localeCompare(b.name, "es", {
              sensitivity: "base",
            })
          );

          setCountries(sortedCountries);
        }
      } catch (error) {
        console.error(
          "Error cargando países:",
          error
        );

        if (mounted) {
          setCountries([]);
          setCountriesError(
            "No se han podido cargar los países."
          );
        }
      } finally {
        if (mounted) {
          setCountriesLoading(false);
        }
      }
    }

    loadCountries();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * FORMULARIO
   * ============================================================
   */

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");

  const [countryId, setCountryId] =
    useState<number | null>(null);

  const [confederation, setConfederation] =
    useState("");

  const [competitionType, setCompetitionType] =
    useState<Competition["competitionType"]>("League");

  const [active, setActive] =
    useState(true);

  const [error, setError] =
    useState("");

  const isEditing =
    competition !== null;

  /*
   * ============================================================
   * CARGAR DATOS DE LA COMPETICIÓN
   * ============================================================
   */

  useEffect(() => {
    if (competition) {
      setName(competition.name);
      setShortName(competition.shortName);
      setCountryId(competition.countryId);
      setConfederation(competition.confederation);
      setCompetitionType(
        competition.competitionType
      );
      setActive(competition.active);
    } else {
      setName("");
      setShortName("");
      setCountryId(null);
      setConfederation("");
      setCompetitionType("League");
      setActive(true);
    }

    setError("");
  }, [competition]);

  /*
   * ============================================================
   * GUARDAR
   * ============================================================
   */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError(
        "El nombre de la competición es obligatorio."
      );
      return;
    }

    if (!shortName.trim()) {
      setError(
        "La abreviatura es obligatoria."
      );
      return;
    }

    if (!confederation) {
      setError(
        "Debes seleccionar una confederación."
      );
      return;
    }

    if (!competitionType) {
      setError(
        "Debes seleccionar un tipo de competición."
      );
      return;
    }

    const competitionData: Omit<
      Competition,
      "id"
    > = {
      name: name.trim(),

      shortName: shortName.trim(),

      countryId,

      competitionType,

      confederation,

      active,
    };

    try {
      if (isEditing && competition) {
        await updateCompetition(
          competition.id,
          competitionData
        );
      } else {
        await addCompetition(
          competitionData
        );
      }

      onSaved?.();
      onClose();
    } catch (error) {
      console.error(
        "Error guardando competición:",
        error
      );

      setError(
        "No se ha podido guardar la competición."
      );
    }
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full rounded-xl border bg-white p-4 shadow sm:p-5 md:p-6">

      {/* CABECERA */}

      <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">

        <div>

          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {isEditing
              ? "Editar competición"
              : "Nueva competición"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {isEditing
              ? "Modifica los datos de la competición."
              : "Introduce los datos de la nueva competición."}
          </p>

        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar formulario"
          className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          ✕
        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ERROR PAÍSES */}

      {countriesError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {countriesError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2"
      >

        {/* NOMBRE */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Nombre *
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 sm:px-4"
            placeholder="LaLiga"
          />

        </div>

        {/* ABREVIATURA */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Abreviatura *
          </label>

          <input
            type="text"
            value={shortName}
            onChange={(event) =>
              setShortName(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm uppercase outline-none transition focus:border-slate-500 sm:px-4"
            placeholder="LL"
          />

        </div>

        {/* PAÍS */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            País
          </label>

          <select
            value={countryId ?? ""}
            onChange={(event) =>
              setCountryId(
                event.target.value
                  ? Number(event.target.value)
                  : null
              )
            }
            disabled={countriesLoading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
          >

            <option value="">
              {countriesLoading
                ? "Cargando países..."
                : "Sin país"}
            </option>

            {countries.map((country) => (
              <option
                key={country.id}
                value={country.id}
              >
                {country.name}
              </option>
            ))}

          </select>

        </div>

        {/* CONFEDERACIÓN */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Confederación *
          </label>

          <select
            value={confederation}
            onChange={(event) =>
              setConfederation(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500"
          >

            <option value="">
              Seleccionar
            </option>

            <option value="UEFA">
              UEFA
            </option>

            <option value="CONMEBOL">
              CONMEBOL
            </option>

            <option value="CONCACAF">
              CONCACAF
            </option>

            <option value="CAF">
              CAF
            </option>

            <option value="AFC">
              AFC
            </option>

            <option value="OFC">
              OFC
            </option>

          </select>

        </div>

        {/* TIPO */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Tipo *
          </label>

          <select
            value={competitionType}
            onChange={(event) =>
              setCompetitionType(
                event.target.value as Competition["competitionType"]
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500"
          >

            <option value="League">
              Liga
            </option>

            <option value="Cup">
              Copa
            </option>

            <option value="National Team">
              Selecciones
            </option>

          </select>

        </div>

        {/* ESTADO */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Estado
          </label>

          <label className="flex h-[42px] items-center gap-3 rounded-lg border border-slate-300 px-4">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) =>
                setActive(
                  event.target.checked
                )
              }
              className="h-4 w-4"
            />

            <span className="text-sm font-medium text-slate-700">
              Competición activa
            </span>
          </label>

        </div>

        {/* BOTONES */}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:col-span-2">

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 px-5 py-2.5 font-medium transition hover:bg-slate-100 sm:w-auto"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-800 px-5 py-2.5 font-medium text-white transition hover:bg-slate-700 sm:w-auto"
          >
            {isEditing
              ? "Guardar cambios"
              : "Crear competición"}
          </button>

        </div>

      </form>

    </div>
  );
}