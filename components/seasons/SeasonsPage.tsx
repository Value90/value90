"use client";

import { useEffect, useState } from "react";

import SeasonsTable from "@/components/seasons/SeasonsTable";
import SeasonForm from "@/components/seasons/SeasonsForm";
import DeleteSeasonDialog from "@/components/seasons/DeleteSeasonDialog";

import {
  deleteSeason,
  getSeasons,
  type Season,
} from "@/services/season.service";

export default function SeasonsPage() {
  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingSeason, setEditingSeason] =
    useState<Season | null>(null);

  const [deletingSeason, setDeletingSeason] =
    useState<Season | null>(null);

  /*
   * ============================================================
   * CARGAR TEMPORADAS
   * ============================================================
   */

  const loadSeasons = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getSeasons();

      setSeasons(data);
    } catch (error) {
      console.error(
        "Error cargando temporadas:",
        error
      );

      setSeasons([]);

      setError(
        "No se han podido cargar las temporadas."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeasons();
  }, []);

  /*
   * ============================================================
   * NUEVA TEMPORADA
   * ============================================================
   */

  const handleNewSeason = () => {
    setEditingSeason(null);
    setShowForm(true);
  };

  /*
   * ============================================================
   * EDITAR
   * ============================================================
   */

  const handleEditSeason = (
    season: Season
  ) => {
    setEditingSeason(season);
    setShowForm(true);
  };

  /*
   * ============================================================
   * ELIMINAR
   * ============================================================
   */

  const handleDeleteSeason = (
    season: Season
  ) => {
    setDeletingSeason(season);
  };

  /*
   * ============================================================
   * CONFIRMAR ELIMINACIÓN
   * ============================================================
   */

  const handleConfirmDelete = async () => {
    if (!deletingSeason) {
      return;
    }

    try {
      setError("");

      await deleteSeason(
        deletingSeason.id
      );

      setDeletingSeason(null);

      await loadSeasons();
    } catch (error) {
      console.error(
        "Error eliminando temporada:",
        error
      );

      setError(
        "No se ha podido eliminar la temporada."
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
    setEditingSeason(null);
  };

  /*
   * ============================================================
   * GUARDADO
   * ============================================================
   */

  const handleSaved = async () => {
    setShowForm(false);
    setEditingSeason(null);

    await loadSeasons();
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

          <h1 className="text-2xl font-bold sm:text-3xl">
            Temporadas
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Gestión de temporadas de Value90
          </p>

        </div>

        {!showForm && (
          <button
            type="button"
            onClick={handleNewSeason}
            className="w-full rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
          >
            + Nueva temporada
          </button>
        )}

      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-6 sm:p-4">
          {error}
        </div>
      )}

      {/* RESUMEN */}

      {!showForm && (
        <p className="mb-5 text-sm text-slate-700 sm:mb-6 sm:text-base">
          Total de temporadas:{" "}
          <span className="font-semibold">
            {loading
              ? "..."
              : seasons.length}
          </span>
        </p>
      )}

      {/* FORMULARIO */}

      {showForm && (
        <div className="mb-6 w-full min-w-0 sm:mb-8">
          <SeasonForm
            season={editingSeason ?? undefined}
            onCancel={handleCloseForm}
            onSaved={handleSaved}
          />
        </div>
      )}

      {/* TABLA */}

      {!showForm && (
        <div className="w-full min-w-0">
          <SeasonsTable
            seasons={seasons}
            onEdit={handleEditSeason}
            onDelete={handleDeleteSeason}
          />
        </div>
      )}

      {/* DIÁLOGO ELIMINAR */}

      {deletingSeason && (
        <DeleteSeasonDialog
          season={deletingSeason}
          onConfirm={handleConfirmDelete}
          onCancel={() =>
            setDeletingSeason(null)
          }
        />
      )}

    </div>
  );
}