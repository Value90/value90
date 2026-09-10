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
    <div className="w-full p-8">

      {/* CABECERA */}

      <div className="mb-8 flex items-start justify-between">

        <div>

          <h1 className="text-3xl font-bold">
            Temporadas
          </h1>

          <p className="mt-2 text-slate-600">
            Gestión de temporadas de Value90
          </p>

        </div>

        {!showForm && (
          <button
            type="button"
            onClick={handleNewSeason}
            className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            + Nueva temporada
          </button>
        )}

      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* RESUMEN */}

      {!showForm && (
        <p className="mb-6 text-slate-700">
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
        <div className="mb-8">
          <SeasonForm
            season={editingSeason ?? undefined}
            onCancel={handleCloseForm}
            onSaved={handleSaved}
          />
        </div>
      )}

      {/* TABLA */}

      {!showForm && (
        <SeasonsTable
          seasons={seasons}
          onEdit={handleEditSeason}
          onDelete={handleDeleteSeason}
        />
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