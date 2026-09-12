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

  const handleNewMatchRating = () => {
    setEditingMatchRating(undefined);
    setFormMode("manual");
    setShowForm(true);
  };

  const handleImportMatchRatings = () => {
    setEditingMatchRating(undefined);
    setFormMode("import");
    setShowForm(true);
  };

  const handleEditMatchRating = (
    matchRating: MatchRating
  ) => {
    setEditingMatchRating(matchRating);
    setFormMode("manual");
    setShowForm(true);
  };

  const handleSaved = () => {
    setEditingMatchRating(undefined);
    setShowForm(false);
    setFormMode("manual");
    setRefreshKey((value) => value + 1);
  };

  const handleDeleteMatchRating = (
    matchRating: MatchRating
  ) => {
    setMatchRatingToDelete(matchRating);
  };

  const handleConfirmDelete = async () => {
    if (!matchRatingToDelete) {
      return;
    }

    await deleteMatchRating(matchRatingToDelete.id);

    setMatchRatingToDelete(undefined);
    setRefreshKey((value) => value + 1);
  };

  const handleCancelForm = () => {
    setEditingMatchRating(undefined);
    setShowForm(false);
    setFormMode("manual");
  };

  const handleCancelDelete = () => {
    setMatchRatingToDelete(undefined);
  };

  return (
    <div className="w-full min-w-0 p-3 sm:p-5 md:p-8">
      <div className="mb-5 flex min-w-0 flex-col gap-4 sm:mb-7 sm:gap-5 lg:mb-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
            Valoraciones de partidos
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Gestión de las valoraciones externas de los
            jugadores en los partidos de Value90
          </p>
        </div>

        {!showForm && (
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3">
            <button
              type="button"
              onClick={handleNewMatchRating}
              className="w-full rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 sm:w-auto"
            >
              + Crear valoración
            </button>

            <button
              type="button"
              onClick={handleImportMatchRatings}
              className="w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
            >
              Importar valoraciones
            </button>
          </div>
        )}
      </div>

      <div className="min-w-0">
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
      </div>

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