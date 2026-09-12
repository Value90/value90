"use client";

import { useState } from "react";

interface CountryFormProps {
  country?: {
    id: number;
    name: string;
    code: string;
    fifaCode: string;
    continent: string;
  };

  onCancel: () => void;

  onSave: (country: {
    name: string;
    code: string;
    fifaCode: string;
    continent: string;
  }) => void;
}

export default function CountryForm({
  country,
  onCancel,
  onSave,
}: CountryFormProps) {
  const [name, setName] = useState(country?.name ?? "");
  const [code, setCode] = useState(country?.code ?? "");
  const [fifaCode, setFifaCode] = useState(country?.fifaCode ?? "");
  const [continent, setContinent] = useState(
    country?.continent ?? ""
  );

  const [error, setError] = useState("");

  const isEditing = Boolean(country);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("El nombre del país es obligatorio.");
      return;
    }

    if (!code.trim()) {
      setError("El código del país es obligatorio.");
      return;
    }

    if (!fifaCode.trim()) {
      setError("El código FIFA es obligatorio.");
      return;
    }

    if (!continent.trim()) {
      setError("El continente es obligatorio.");
      return;
    }

    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      fifaCode: fifaCode.trim().toUpperCase(),
      continent: continent.trim(),
    });
  };

  return (
    <div className="w-full min-w-0 rounded-xl border bg-white p-3 shadow sm:p-5 md:p-6">
      <div className="mb-5 sm:mb-6">
        <h2 className="text-xl font-bold sm:text-2xl">
          {isEditing ? "Editar país" : "Nuevo país"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {isEditing
            ? "Modifica los datos del país."
            : "Introduce los datos del nuevo país."}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-5">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-5"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">
            Nombre
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. España"
            className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Código
          </label>

          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Ej. ESP"
            maxLength={3}
            className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-slate-500 sm:px-4"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Código FIFA
          </label>

          <input
            type="text"
            value={fifaCode}
            onChange={(event) => setFifaCode(event.target.value)}
            placeholder="Ej. ESP"
            maxLength={3}
            className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-slate-500 sm:px-4"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Continente
          </label>

          <select
            value={continent}
            onChange={(event) => setContinent(event.target.value)}
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
          >
            <option value="">
              Selecciona un continente
            </option>

            <option value="Europa">
              Europa
            </option>

            <option value="Norteamérica">
              Norteamérica
            </option>

            <option value="Sudamérica">
              Sudamérica
            </option>

            <option value="Asia">
              Asia
            </option>

            <option value="África">
              África
            </option>

            <option value="Oceanía">
              Oceanía
            </option>
          </select>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end sm:pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-50 sm:w-auto"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 sm:w-auto"
          >
            {isEditing ? "Guardar cambios" : "Guardar país"}
          </button>
        </div>
      </form>
    </div>
  );
}