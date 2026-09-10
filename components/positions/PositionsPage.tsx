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
    <div className="w-full p-8">

      {/* CABECERA */}

      <div className="mb-8 flex items-start justify-between">

        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Posiciones
          </h1>

          <p className="mt-2 text-slate-600">
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
            className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            + Nueva posición
          </button>
        )}

      </div>

      {/* ERROR GENERAL */}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm ? (

        <PositionForm
          position={editingPosition}
          onCancel={handleCancel}
          onSave={handleSave}
        />

      ) : (

        <>

          {/* RESUMEN */}

          <p className="mb-6 text-slate-700">

            Total de posiciones:{" "}

            <span className="font-semibold">
              {loading
                ? "..."
                : positions.length}
            </span>

          </p>

          {/* TABLA */}

          <PositionsTable
            positions={positions}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

        </>

      )}

    </div>
  );
}