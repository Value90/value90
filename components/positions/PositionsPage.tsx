"use client";

import { useEffect, useState } from "react";

import PositionsTable from "@/components/positions/PositionsTable";
import PositionForm from "@/components/positions/PositionForm";

import {
  addPosition,
  deletePosition,
  getPositions,
  updatePosition,
  type Position,
} from "@/services/position.service";

export default function PositionsPage() {
  const [showForm, setShowForm] = useState(false);

  const [editingPosition, setEditingPosition] =
    useState<Position | undefined>(undefined);

  const [positions, setPositions] =
    useState<Position[]>([]);

  const [refresh, setRefresh] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * ============================================================
   * CARGAR POSICIONES
   * ============================================================
   */

  useEffect(() => {
    const loadPositions = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getPositions();

        setPositions(data);
      } catch (error) {
        console.error(
          "Error al cargar las posiciones:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "Error desconocido al cargar las posiciones.";

        setError(
          `No se pudieron cargar las posiciones: ${message}`
        );
      } finally {
        setLoading(false);
      }
    };

    loadPositions();
  }, [refresh]);

  /*
   * ============================================================
   * GUARDAR
   * ============================================================
   */

  const handleSave = async (
    position: {
      name: string;
      shortName: string;
      displayOrder: number;
      active: boolean;
    }
  ) => {
    try {
      setError("");

      if (editingPosition) {
        await updatePosition(
          editingPosition.id,
          position
        );
      } else {
        await addPosition(position);
      }

      setRefresh((value) => value + 1);

      setEditingPosition(undefined);
      setShowForm(false);
    } catch (error) {
      console.error(
        "Error al guardar la posición:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido al guardar la posición.";

      setError(
        `No se pudo guardar la posición: ${message}`
      );
    }
  };

  /*
   * ============================================================
   * EDITAR
   * ============================================================
   */

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    setShowForm(true);
    setError("");
  };

  /*
   * ============================================================
   * ELIMINAR
   * ============================================================
   */

  const handleDelete = async (
    position: Position
  ) => {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar la posición "${position.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deletePosition(position.id);

      setRefresh((value) => value + 1);
    } catch (error) {
      console.error(
        "Error al eliminar la posición:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido al eliminar la posición.";

      setError(
        `No se pudo eliminar la posición: ${message}`
      );
    }
  };

  /*
   * ============================================================
   * CANCELAR
   * ============================================================
   */

  const handleCancel = () => {
    setEditingPosition(undefined);
    setShowForm(false);
    setError("");
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 p-3 sm:p-5 md:p-8">
      {/* CABECERA */}

      <div className="mb-5 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Posiciones
          </h1>

          <p className="mt-1 text-sm text-slate-600 sm:mt-2 sm:text-base">
            Gestión de posiciones de los jugadores de Value90
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setEditingPosition(undefined);
              setError("");
              setShowForm(true);
            }}
            className="w-full shrink-0 rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
          >
            + Nueva posición
          </button>
        )}
      </div>

      {/* ERROR GENERAL */}

      {error && (
        <div className="mb-5 w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-6 sm:p-4">
          {error}
        </div>
      )}

      {showForm ? (
        <div className="w-full min-w-0">
          <PositionForm
            position={editingPosition}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        </div>
      ) : (
        <>
          {/* RESUMEN */}

          <p className="mb-5 text-sm text-slate-700 sm:mb-6 sm:text-base">
            Total de posiciones:{" "}
            <span className="font-semibold">
              {loading
                ? "..."
                : positions.length}
            </span>
          </p>

          {/* TABLA */}

          <div className="w-full min-w-0">
            <PositionsTable
              positions={positions}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </>
      )}
    </div>
  );
}