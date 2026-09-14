"use client";

import { useEffect, useState } from "react";

import MatchesTable from "@/components/matches/MatchesTable";
import MatchForm from "@/components/matches/MatchForm";
import DeleteMatchDialog from "@/components/matches/DeleteMatchDialog";

import {
  addMatch,
  updateMatch,
  deleteMatch,
  getMatches,
  type Match,
} from "@/services/match.service";

export default function MatchesPage() {
  /*
   * ============================================================
   * ESTADO GENERAL
   * ============================================================
   */

  const [showForm, setShowForm] =
    useState(false);

  const [editingMatch, setEditingMatch] =
    useState<Match | undefined>(undefined);

  const [matchToDelete, setMatchToDelete] =
    useState<Match | undefined>(undefined);

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [refreshKey, setRefreshKey] =
    useState(0);

  /*
   * ============================================================
   * CARGAR PARTIDOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadMatches = async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getMatches();

        if (!mounted) {
          return;
        }

        setMatches(data);
      } catch (err) {
        console.error(
          "Error cargando partidos:",
          err
        );

        if (!mounted) {
          return;
        }

        setMatches([]);

        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los partidos."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMatches();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  /*
   * ============================================================
   * NUEVO PARTIDO
   * ============================================================
   */

  const handleNew = () => {
    setError("");
    setEditingMatch(undefined);
    setShowForm(true);
  };

  /*
   * ============================================================
   * EDITAR PARTIDO
   * ============================================================
   */

  const handleEdit = (match: Match) => {
    setError("");
    setEditingMatch(match);
    setShowForm(true);
  };

  /*
   * ============================================================
   * GUARDAR PARTIDO
   * ============================================================
   */

  const handleSave = async (
    matchData: Omit<Match, "id">
  ) => {
    try {
      setSaving(true);
      setError("");

      if (editingMatch) {
        await updateMatch(
          editingMatch.id,
          matchData
        );
      } else {
        await addMatch(matchData);
      }

      setEditingMatch(undefined);
      setShowForm(false);

      setRefreshKey(
        (value) => value + 1
      );
    } catch (err) {
      console.error(
        "Error guardando partido:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el partido."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================================================
   * SOLICITAR ELIMINACIÓN
   * ============================================================
   */

  const handleDelete = (match: Match) => {
    setError("");
    setMatchToDelete(match);
  };

  /*
   * ============================================================
   * CONFIRMAR ELIMINACIÓN
   * ============================================================
   */

  const handleConfirmDelete =
    async () => {
      if (!matchToDelete) {
        return;
      }

      try {
        setError("");
        setSaving(true);

        await deleteMatch(
          matchToDelete.id
        );

        setMatchToDelete(undefined);

        setRefreshKey(
          (value) => value + 1
        );
      } catch (err) {
        console.error(
          "Error eliminando partido:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "No se pudo eliminar el partido."
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ============================================================
   * CANCELAR FORMULARIO
   * ============================================================
   */

  const handleCancel = () => {
    setEditingMatch(undefined);
    setShowForm(false);
    setError("");
  };

  /*
   * ============================================================
   * CANCELAR ELIMINACIÓN
   * ============================================================
   */

  const handleCancelDelete = () => {
    setMatchToDelete(undefined);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden p-3 sm:p-5 md:p-8">
      {/* ========================================================
          CABECERA
          ======================================================== */}

      <div className="mb-6 flex min-w-0 max-w-full flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-full">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Partidos
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Gestión de partidos de Value90
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={handleNew}
            className="w-full shrink-0 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 sm:w-auto sm:px-5 sm:py-3"
          >
            + Nuevo partido
          </button>
        )}
      </div>

      {/* ========================================================
          ERROR
          ======================================================== */}

      {error && (
        <div className="mb-5 w-full max-w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-6 sm:p-4">
          {error}
        </div>
      )}

      {/* ========================================================
          RESUMEN
          ======================================================== */}

      {!showForm && !error && (
        <p className="mb-5 max-w-full text-sm text-slate-700 sm:mb-6 sm:text-base">
          Total de partidos:{" "}
          <span className="font-semibold">
            {loading
              ? "..."
              : matches.length}
          </span>
        </p>
      )}

      {/* ========================================================
          FORMULARIO
          ======================================================== */}

      {showForm && (
        <div className="w-full min-w-0 max-w-full">
          <MatchForm
            key={
              editingMatch?.id ??
              "nuevo"
            }
            match={editingMatch}
            onCancel={handleCancel}
            onSaved={handleSave}
          />

          {saving && (
            <div className="mt-3 text-sm text-slate-500">
              Guardando partido...
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TABLA
          ======================================================== */}

      {!showForm && (
        <div className="w-full min-w-0 max-w-full overflow-hidden">
          <MatchesTable
            key={refreshKey}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* ========================================================
          DIÁLOGO DE ELIMINACIÓN
          ======================================================== */}

      {matchToDelete && (
        <DeleteMatchDialog
          match={matchToDelete}
          onConfirm={
            handleConfirmDelete
          }
          onCancel={
            handleCancelDelete
          }
        />
      )}
    </div>
  );
}
