"use client";

import {
  useEffect,
  useState,
} from "react";

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

interface MatchesPageProps {
  // Actualmente no necesitamos props.
}

export default function MatchesPage(
  _props: MatchesPageProps
) {
  /*
   * ============================================================
   * ESTADO DEL FORMULARIO
   * ============================================================
   */

  const [showForm, setShowForm] =
    useState(false);

  const [editingMatch, setEditingMatch] =
    useState<Match | undefined>(
      undefined
    );

  const [matchToDelete, setMatchToDelete] =
    useState<Match | undefined>(
      undefined
    );

  /*
   * ============================================================
   * PARTIDOS
   * ============================================================
   */

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [matchesLoading, setMatchesLoading] =
    useState(true);

  const [matchesError, setMatchesError] =
    useState("");

  /*
   * ============================================================
   * GUARDANDO
   * ============================================================
   */

  const [saving, setSaving] =
    useState(false);

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   */

  const [refreshKey, setRefreshKey] =
    useState(0);

  /*
   * ============================================================
   * CARGAR PARTIDOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadMatches() {
      try {
        setMatchesLoading(true);
        setMatchesError("");

        const data =
          await getMatches();

        if (!mounted) {
          return;
        }

        setMatches(data);
      } catch (error) {
        console.error(
          "Error cargando partidos:",
          error
        );

        if (!mounted) {
          return;
        }

        setMatches([]);

        setMatchesError(
          "No se pudieron cargar los partidos."
        );
      } finally {
        if (mounted) {
          setMatchesLoading(false);
        }
      }
    }

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

  const handleNewMatch = () => {
    setMatchesError("");

    setEditingMatch(undefined);
    setShowForm(true);
  };

  /*
   * ============================================================
   * EDITAR PARTIDO
   * ============================================================
   */

  const handleEditMatch = (
    match: Match
  ) => {
    setMatchesError("");

    setEditingMatch(match);
    setShowForm(true);
  };

  /*
   * ============================================================
   * GUARDAR PARTIDO
   * ============================================================
   *
   * MatchForm nos devuelve:
   *
   * Omit<Match, "id">
   *
   * Si estamos editando:
   *   updateMatch()
   *
   * Si estamos creando:
   *   addMatch()
   *
   * ============================================================
   */

  const handleSaved = async (
    matchData: Omit<Match, "id">
  ) => {
    try {
      setSaving(true);
      setMatchesError("");

      /*
       * EDITAR
       */

      if (editingMatch) {
        await updateMatch(
          editingMatch.id,
          matchData
        );
      } else {
        /*
         * CREAR
         */

        await addMatch(
          matchData
        );
      }

      /*
       * Volvemos a la tabla.
       */

      setEditingMatch(
        undefined
      );

      setShowForm(false);

      /*
       * Volvemos a cargar los partidos
       * desde Supabase.
       */

      setRefreshKey(
        (value) => value + 1
      );
    } catch (error) {
      console.error(
        "Error guardando partido:",
        error
      );

      setMatchesError(
        "No se pudo guardar el partido. Comprueba los datos e inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================================================
   * PREPARAR ELIMINACIÓN
   * ============================================================
   */

  const handleDeleteMatch = (
    match: Match
  ) => {
    setMatchesError("");
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
        setMatchesError("");

        await deleteMatch(
          matchToDelete.id
        );

        setMatchToDelete(
          undefined
        );

        setRefreshKey(
          (value) => value + 1
        );
      } catch (error) {
        console.error(
          "Error eliminando partido:",
          error
        );

        setMatchesError(
          "No se pudo eliminar el partido."
        );
      }
    };

  /*
   * ============================================================
   * CANCELAR FORMULARIO
   * ============================================================
   */

  const handleCancelForm = () => {
    if (saving) {
      return;
    }

    setEditingMatch(undefined);
    setShowForm(false);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-6 flex flex-col gap-5 sm:mb-8 sm:gap-6 md:flex-row md:items-start md:justify-between">

        <div className="min-w-0">

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Partidos
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Gestión de partidos de Value90
          </p>

        </div>

        {!showForm && (
          <button
            type="button"
            onClick={handleNewMatch}
            disabled={saving}
            className="w-full rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            + Nuevo partido
          </button>
        )}

      </div>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {matchesError && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-5 text-red-700 sm:mb-6">
          {matchesError}
        </div>
      )}

      {/* ======================================================
          CONTADOR
          ====================================================== */}

      {!showForm && (
        <div className="mb-5 sm:mb-6">

          <p className="text-sm text-slate-700 sm:text-base">
            Total de partidos:{" "}

            <span className="font-semibold">
              {matchesLoading
                ? "Cargando..."
                : matches.length}
            </span>
          </p>

        </div>
      )}

      {/* ======================================================
          FORMULARIO / TABLA
          ====================================================== */}

      <div className="w-full min-w-0">

        {showForm ? (
          <MatchForm
            match={editingMatch}
            onCancel={handleCancelForm}
            onSaved={handleSaved}
          />
        ) : (
          <MatchesTable
            key={refreshKey}
            onEdit={handleEditMatch}
            onDelete={handleDeleteMatch}
          />
        )}

      </div>

      {/* ======================================================
          DIÁLOGO DE ELIMINACIÓN
          ====================================================== */}

      {matchToDelete && (
        <DeleteMatchDialog
          match={matchToDelete}
          onConfirm={
            handleConfirmDelete
          }
          onCancel={() => {
            if (saving) {
              return;
            }

            setMatchToDelete(
              undefined
            );
          }}
        />
      )}

    </div>
  );
}