"use client";

import {
  useState,
  type FormEvent,
} from "react";

import {
  addSeason,
  updateSeason,
  type Season,
} from "@/services/season.service";

interface SeasonFormProps {
  season?: Season;
  onCancel: () => void;
  onSaved: () => void;
}

export default function SeasonForm({
  season,
  onCancel,
  onSaved,
}: SeasonFormProps) {
  const [name, setName] = useState(
    season?.name ?? ""
  );

  const [startDate, setStartDate] =
    useState(season?.startDate ?? "");

  const [endDate, setEndDate] =
    useState(season?.endDate ?? "");

  const [active, setActive] = useState(
    season?.active ?? true
  );

  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError(
        "El nombre de la temporada es obligatorio."
      );
      return;
    }

    if (!startDate) {
      setError(
        "Debes seleccionar la fecha de inicio."
      );
      return;
    }

    if (!endDate) {
      setError(
        "Debes seleccionar la fecha de fin."
      );
      return;
    }

    if (endDate < startDate) {
      setError(
        "La fecha de fin no puede ser anterior a la fecha de inicio."
      );
      return;
    }

    try {
      setSaving(true);

      const seasonData: Omit<
        Season,
        "id"
      > = {
        name: name.trim(),
        startDate,
        endDate,
        active,
      };

      if (season) {
        await updateSeason(
          season.id,
          seasonData
        );
      } else {
        await addSeason(seasonData);
      }

      onSaved();
    } catch (error) {
      console.error(
        "Error guardando temporada:",
        error
      );

      setError(
        "No se ha podido guardar la temporada."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow">

      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          {season
            ? "Editar temporada"
            : "Nueva temporada"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {season
            ? "Modifica los datos de la temporada."
            : "Introduce los datos de la nueva temporada."}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* NOMBRE */}

        <div>
          <label
            htmlFor="season-name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Nombre
          </label>

          <input
            id="season-name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Ej. Temporada 2025/26"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500"
            required
          />
        </div>

        {/* FECHA INICIO */}

        <div>
          <label
            htmlFor="season-start-date"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Fecha de inicio
          </label>

          <input
            id="season-start-date"
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500"
            required
          />
        </div>

        {/* FECHA FIN */}

        <div>
          <label
            htmlFor="season-end-date"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Fecha de fin
          </label>

          <input
            id="season-end-date"
            type="date"
            value={endDate}
            onChange={(event) =>
              setEndDate(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500"
            required
          />
        </div>

        {/* ESTADO */}

        <div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) =>
                setActive(event.target.checked)
              }
              className="h-4 w-4"
            />

            <span className="text-sm font-medium text-slate-700">
              Temporada activa
            </span>
          </label>
        </div>

        {/* BOTONES */}

        <div className="flex justify-end gap-3 border-t pt-6">

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : season
                ? "Guardar cambios"
                : "Crear temporada"}
          </button>

        </div>

      </form>
    </div>
  );
}