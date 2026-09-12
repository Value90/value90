"use client";

import { useEffect, useState } from "react";

import type { Position } from "@/services/position.service";

interface PositionFormProps {
  position?: Position;
  onCancel: () => void;
  onSave: (position: {
    name: string;
    shortName: string;
    displayOrder: number;
    active: boolean;
  }) => Promise<void>;
}

export default function PositionForm({
  position,
  onCancel,
  onSave,
}: PositionFormProps) {
  const [name, setName] = useState(position?.name ?? "");

  const [shortName, setShortName] = useState(
    position?.shortName ?? ""
  );

  const [displayOrder, setDisplayOrder] = useState(
    position?.displayOrder?.toString() ?? "1"
  );

  const [active, setActive] = useState(
    position?.active ?? true
  );

  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);

  /*
   * ============================================================
   * ACTUALIZAR FORMULARIO AL EDITAR
   * ============================================================
   */

  useEffect(() => {
    setName(position?.name ?? "");

    setShortName(position?.shortName ?? "");

    setDisplayOrder(
      position?.displayOrder?.toString() ?? "1"
    );

    setActive(position?.active ?? true);

    setError("");
  }, [position]);

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
        "El nombre de la posición es obligatorio."
      );
      return;
    }

    if (!shortName.trim()) {
      setError(
        "El nombre corto es obligatorio."
      );
      return;
    }

    if (!displayOrder) {
      setError(
        "El orden de visualización es obligatorio."
      );
      return;
    }

    const order = Number(displayOrder);

    if (
      !Number.isInteger(order) ||
      order < 1
    ) {
      setError(
        "El orden debe ser un número entero mayor que 0."
      );
      return;
    }

    try {
      setSaving(true);

      await onSave({
        name: name.trim(),
        shortName: shortName.trim(),
        displayOrder: order,
        active,
      });
    } catch (error) {
      console.error(
        "Error guardando posición:",
        error
      );

      setError(
        "No se pudo guardar la posición."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 rounded-xl border bg-white p-3 shadow sm:p-5 md:p-6">
      {/* CABECERA */}

      <div className="mb-5 sm:mb-6">
        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
          {position
            ? "Editar posición"
            : "Nueva posición"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {position
            ? "Modifica los datos de la posición."
            : "Introduce los datos de la nueva posición."}
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-6 sm:p-4">
          {error}
        </div>
      )}

      {/* FORMULARIO */}

      <form
        onSubmit={handleSubmit}
        className="min-w-0 space-y-5 sm:space-y-6"
      >
        {/* NOMBRE */}

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Nombre
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Ej. Extremo derecho"
            className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
            disabled={saving}
          />
        </div>

        {/* NOMBRE CORTO */}

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Nombre corto
          </label>

          <input
            type="text"
            value={shortName}
            onChange={(event) =>
              setShortName(event.target.value)
            }
            placeholder="Ej. ED"
            className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-slate-500 sm:px-4"
            disabled={saving}
          />
        </div>

        {/* ORDEN */}

        <div className="min-w-0">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Orden de visualización
          </label>

          <input
            type="number"
            min="1"
            step="1"
            value={displayOrder}
            onChange={(event) =>
              setDisplayOrder(
                event.target.value
              )
            }
            className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
            disabled={saving}
          />

          <p className="mt-1 text-xs text-slate-500">
            Determina el orden en el que aparecerá la posición.
          </p>
        </div>

        {/* ACTIVA */}

        <div className="flex items-center gap-3">
          <input
            id="position-active"
            type="checkbox"
            checked={active}
            onChange={(event) =>
              setActive(
                event.target.checked
              )
            }
            className="h-4 w-4 shrink-0"
            disabled={saving}
          />

          <label
            htmlFor="position-active"
            className="text-sm font-medium text-slate-700"
          >
            Posición activa
          </label>
        </div>

        {/* BOTONES */}

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end sm:pt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="w-full rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving
              ? "Guardando..."
              : position
                ? "Guardar cambios"
                : "Crear posición"}
          </button>
        </div>
      </form>
    </div>
  );
}