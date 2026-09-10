"use client";

import {
  useEffect,
  useState,
} from "react";

import PlayerMatchStatsTable from "@/components/player-match-stats/PlayerMatchStatsTable";
import PlayerMatchStatForm from "@/components/player-match-stats/PlayerMatchStatForm";
import DeletePlayerMatchStatDialog from "@/components/player-match-stats/DeletePlayerMatchStatDialog";

import {
  deletePlayerMatchStat,
  getPlayerMatchStats,
  type PlayerMatchStat,
} from "@/services/player-match-stat.service";

type FormMode =
  | "individual"
  | null;

export default function PlayerMatchStatsPage() {
  /*
   * ============================================================
   * ESTADO DEL FORMULARIO
   * ============================================================
   */

  const [formMode, setFormMode] =
    useState<FormMode>(null);

  /*
   * ============================================================
   * ESTADO DE EDICIÓN
   * ============================================================
   */

  const [
    editingPlayerMatchStat,
    setEditingPlayerMatchStat,
  ] = useState<
    PlayerMatchStat | undefined
  >(undefined);

  /*
   * ============================================================
   * ESTADO DE ELIMINACIÓN
   * ============================================================
   */

  const [
    playerMatchStatToDelete,
    setPlayerMatchStatToDelete,
  ] = useState<
    PlayerMatchStat | undefined
  >(undefined);

  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [
    playerMatchStats,
    setPlayerMatchStats,
  ] = useState<PlayerMatchStat[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /*
   * ============================================================
   * CARGAR ESTADÍSTICAS DESDE SUPABASE
   * ============================================================
   */

  const loadPlayerMatchStats =
    async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getPlayerMatchStats();

        setPlayerMatchStats(data);
      } catch (error) {
        console.error(
          "Error obteniendo estadísticas de jugadores:",
          error
        );

        setPlayerMatchStats([]);

        setError(
          "No se pudieron cargar las estadísticas de jugadores."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * ============================================================
   * CARGA INICIAL
   * ============================================================
   */

  useEffect(() => {
    loadPlayerMatchStats();
  }, []);

  /*
   * ============================================================
   * NUEVA ESTADÍSTICA
   * ============================================================
   */

  const handleNewPlayerMatchStat =
    () => {
      setEditingPlayerMatchStat(
        undefined
      );

      setFormMode(
        "individual"
      );
    };

  /*
   * ============================================================
   * EDITAR
   * ============================================================
   */

  const handleEditPlayerMatchStat =
    (
      playerMatchStat: PlayerMatchStat
    ) => {
      setEditingPlayerMatchStat(
        playerMatchStat
      );

      setFormMode(
        "individual"
      );
    };

  /*
   * ============================================================
   * GUARDADO
   * ============================================================
   */

  const handleSaved = async () => {
    setEditingPlayerMatchStat(
      undefined
    );

    setFormMode(null);

    await loadPlayerMatchStats();
  };

  /*
   * ============================================================
   * ELIMINAR
   * ============================================================
   */

  const handleDeletePlayerMatchStat =
    (
      playerMatchStat: PlayerMatchStat
    ) => {
      setPlayerMatchStatToDelete(
        playerMatchStat
      );
    };

  /*
   * ============================================================
   * CONFIRMAR ELIMINACIÓN
   * ============================================================
   */

  const handleConfirmDelete =
    async () => {
      if (
        !playerMatchStatToDelete
      ) {
        return;
      }

      try {
        setError("");

        await deletePlayerMatchStat(
          playerMatchStatToDelete.id
        );

        setPlayerMatchStatToDelete(
          undefined
        );

        await loadPlayerMatchStats();
      } catch (error) {
        console.error(
          "Error eliminando estadística:",
          error
        );

        setError(
          "No se pudo eliminar la estadística."
        );
      }
    };

  /*
   * ============================================================
   * CANCELAR FORMULARIO
   * ============================================================
   */

  const handleCancelForm = () => {
    setEditingPlayerMatchStat(
      undefined
    );

    setFormMode(null);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full p-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-8 flex items-start justify-between">

        <div>

          <h1 className="text-3xl font-bold">
            Estadísticas de jugadores
          </h1>

          <p className="mt-2 text-slate-600">
            Gestión de estadísticas de jugadores
            por partido de Value90
          </p>

        </div>

        {/* ====================================================
            BOTÓN NUEVA ESTADÍSTICA
            ==================================================== */}

        {formMode === null && (

          <button
            type="button"
            onClick={
              handleNewPlayerMatchStat
            }
            className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            + Nueva estadística
          </button>

        )}

      </div>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (

        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>

      )}

      {/* ======================================================
          CONTADOR
          ====================================================== */}

      {formMode === null && (

        <p className="mb-6 text-slate-700">

          Total de registros:{" "}

          <span className="font-semibold">
            {loading
              ? "..."
              : playerMatchStats.length}
          </span>

        </p>

      )}

      {/* ======================================================
          FORMULARIO
          ====================================================== */}

      {formMode === "individual" && (

        <PlayerMatchStatForm
          playerMatchStat={
            editingPlayerMatchStat
          }
          onCancel={
            handleCancelForm
          }
          onSaved={
            handleSaved
          }
        />

      )}

      {/* ======================================================
          TABLA
          ====================================================== */}

      {formMode === null && (

        <PlayerMatchStatsTable
          onEdit={
            handleEditPlayerMatchStat
          }
          onDelete={
            handleDeletePlayerMatchStat
          }
        />

      )}

      {/* ======================================================
          DIÁLOGO DE ELIMINACIÓN
          ====================================================== */}

      {playerMatchStatToDelete && (

        <DeletePlayerMatchStatDialog
          playerMatchStat={
            playerMatchStatToDelete
          }
          onConfirm={
            handleConfirmDelete
          }
          onCancel={() =>
            setPlayerMatchStatToDelete(
              undefined
            )
          }
        />

      )}

    </div>
  );
}