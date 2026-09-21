
"use client";

import { useState } from "react";

import MatchRatingsTable from "@/components/match-ratings/MatchRatingsTable";
import MatchRatingForm from "@/components/match-ratings/MatchRatingForm";
import DeleteMatchRatingDialog from "@/components/match-ratings/DeleteMatchRatingDialog";

import {
  deleteMatchRating,
  type MatchRating,
} from "@/services/match-rating.service";

type FormMode = "manual" | "import";

export default function MatchRatingsPage() {
  const [showForm, setShowForm] = useState(false);

  const [formMode, setFormMode] =
    useState<FormMode>("manual");

  const [editingMatchRating, setEditingMatchRating] =
    useState<MatchRating | undefined>(undefined);

  const [matchRatingToDelete, setMatchRatingToDelete] =
    useState<MatchRating | undefined>(undefined);

  const [refreshKey, setRefreshKey] = useState(0);

  /*
   * ============================================================
   * NUEVA VALORACIÓN
   * ============================================================
   */

  const handleNewMatchRating = () => {
    setEditingMatchRating(undefined);
    setFormMode("manual");
    setShowForm(true);
  };

  /*
   * ============================================================
   * IMPORTAR VALORACIONES DESDE GOOGLE SHEETS
   * ============================================================
   */

  const handleImportMatchRatings = () => {
    setEditingMatchRating(undefined);
    setFormMode("import");
    setShowForm(true);
  };

  /*
   * ============================================================
   * EDITAR VALORACIÓN
   * ============================================================
   */

  const handleEditMatchRating = (
    matchRating: MatchRating
  ) => {
    setEditingMatchRating(matchRating);
    setFormMode("manual");
    setShowForm(true);
  };

  /*
   * ============================================================
   * GUARDAR
   * ============================================================
   */

  const handleSaved = () => {
    setEditingMatchRating(undefined);
    setShowForm(false);
    setFormMode("manual");
    setRefreshKey((value) => value + 1);
  };

  /*
   * ============================================================
   * ELIMINAR VALORACIÓN
   * ============================================================
   */

  const handleDeleteMatchRating = (
    matchRating: MatchRating
  ) => {
    setMatchRatingToDelete(matchRating);
  };

  const handleConfirmDelete = async () => {
    if (!matchRatingToDelete) {
      return;
    }

    try {
      await deleteMatchRating(matchRatingToDelete.id);

      setMatchRatingToDelete(undefined);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error(
        "Error eliminando la valoración:",
        error
      );
    }
  };

  /*
   * ============================================================
   * CANCELAR FORMULARIO
   * ============================================================
   */

  const handleCancelForm = () => {
    setEditingMatchRating(undefined);
    setShowForm(false);
    setFormMode("manual");
  };

  /*
   * ============================================================
   * CANCELAR ELIMINACIÓN
   * ============================================================
   */

  const handleCancelDelete = () => {
    setMatchRatingToDelete(undefined);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full p-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Valoraciones de partidos
          </h1>

          <p className="mt-2 text-slate-600">
            Gestión de las valoraciones externas de los
            jugadores en los partidos de Value90.
          </p>
        </div>

        {!showForm && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleNewMatchRating}
              className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
            >
              + Crear valoración
            </button>

            <button
              type="button"
              onClick={handleImportMatchRatings}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Importar valoraciones
            </button>
          </div>
        )}
      </div>

      {showForm ? (
        <MatchRatingForm
          key={`${formMode}-${editingMatchRating?.id ?? "new"}`}
          matchRating={editingMatchRating}
          initialInputMode={formMode}
          onCancel={handleCancelForm}
          onSaved={handleSaved}
        />
      ) : (
        <MatchRatingsTable
          key={refreshKey}
          onEdit={handleEditMatchRating}
          onDelete={handleDeleteMatchRating}
        />
      )}

      {matchRatingToDelete && (
        <DeleteMatchRatingDialog
          matchRating={matchRatingToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
}