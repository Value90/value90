"use client";

import { useEffect, useState } from "react";

import CompetitionsTable from "@/components/competitions/CompetitionsTable";
import CompetitionForm from "@/components/competitions/CompetitionForm";
import DeleteCompetitionDialog from "@/components/competitions/DeleteCompetitionDialog";

import {
  getCompetitions,
  deleteCompetition,
  type Competition,
} from "@/services/competition.service";

export default function CompetitionsPage() {
  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [
    editingCompetition,
    setEditingCompetition,
  ] = useState<Competition | null>(null);

  const [
    deletingCompetition,
    setDeletingCompetition,
  ] = useState<Competition | null>(null);

  /*
   * ============================================================
   * CARGAR COMPETICIONES
   * ============================================================
   */

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getCompetitions();

      setCompetitions(data);
    } catch (error) {
      console.error(
        "Error cargando competiciones:",
        error
      );

      setCompetitions([]);

      setError(
        "No se han podido cargar las competiciones."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitions();
  }, []);

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

  const handleDelete = (
    competition: Competition
  ) => {
    setDeletingCompetition(competition);
  };

  /*
   * ============================================================
   * CONFIRMAR ELIMINACIÓN
   * ============================================================
   */

  const handleConfirmDelete = async () => {
    if (!deletingCompetition) {
      return;
    }

    try {
      setError("");

      await deleteCompetition(
        deletingCompetition.id
      );

      setDeletingCompetition(null);

      await loadCompetitions();
    } catch (error) {
      console.error(
        "Error eliminando competición:",
        error
      );

      setError(
        "No se ha podido eliminar la competición."
      );
    }
  };

  /*
   * ============================================================
   * CERRAR FORMULARIO
   * ============================================================
   */

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCompetition(null);
  };

  /*
   * ============================================================
   * GUARDADO
   * ============================================================
   */

  const handleSaved = async () => {
    setShowForm(false);
    setEditingCompetition(null);

    await loadCompetitions();
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
            Competiciones
          </h1>

          <p className="mt-2 text-slate-600">
            Gestión de las competiciones registradas
            en Value90.
          </p>

        </div>

        <button
          type="button"
          onClick={handleNewCompetition}
          className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + Nueva competición
        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* RESUMEN */}

      <p className="mb-6 text-slate-700">

        Total de competiciones:{" "}

        <span className="font-semibold">
          {loading
            ? "..."
            : competitions.length}
        </span>

      </p>

      {/* FORMULARIO / TABLA */}

      {showForm ? (

        <div className="mb-8">
          <CompetitionForm
           competition={editingCompetition}
           onClose={handleCloseForm}
           onSaved={handleSaved}
         />
        </div>
      ) : (
        <CompetitionsTable
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      
      {/* DIÁLOGO ELIMINAR */}

      <DeleteCompetitionDialog
        competition={
          deletingCompetition
        }
        onConfirm={
          handleConfirmDelete
        }
        onCancel={() =>
          setDeletingCompetition(null)
        }
      />

    </div>
  );
}