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
  const [formMode, setFormMode] =
    useState<FormMode>(null);

  const [
    editingPlayerMatchStat,
    setEditingPlayerMatchStat,
  ] = useState<
    PlayerMatchStat | undefined
  >(undefined);

  const [
    playerMatchStatToDelete,
    setPlayerMatchStatToDelete,
  ] = useState<
    PlayerMatchStat | undefined
  >(undefined);

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

  useEffect(() => {
    loadPlayerMatchStats();
  }, []);

  const handleNewPlayerMatchStat =
    () => {
      setEditingPlayerMatchStat(
        undefined
      );

      setFormMode(
        "individual"
      );
    };

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

  const handleSaved = async () => {
    setEditingPlayerMatchStat(
      undefined
    );

    setFormMode(null);

    await loadPlayerMatchStats();
  };

  const handleDeletePlayerMatchStat =
    (
      playerMatchStat: PlayerMatchStat
    ) => {
      setPlayerMatchStatToDelete(
        playerMatchStat
      );
    };

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

  const handleCancelForm = () => {
    setEditingPlayerMatchStat(
      undefined
    );

    setFormMode(null);
  };

  return (
    <div className="w-full min-w-0 p-3 sm:p-5 md:p-8">

      <div className="mb-5 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">

        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Estadísticas de jugadores
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Gestión de estadísticas de jugadores
            por partido de Value90
          </p>
        </div>

        {formMode === null && (
          <button
            type="button"
            onClick={
              handleNewPlayerMatchStat
            }
            className="w-full shrink-0 rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
          >
            + Nueva estadística
          </button>
        )}

      </div>

      {error && (
        <div className="mb-5 w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-6 sm:p-4">
          {error}
        </div>
      )}

      {formMode === null && (
        <p className="mb-5 text-sm text-slate-700 sm:mb-6 sm:text-base">
          Total de registros:{" "}
          <span className="font-semibold">
            {loading
              ? "..."
              : playerMatchStats.length}
          </span>
        </p>
      )}

      {formMode === "individual" && (
        <div className="w-full min-w-0">
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
        </div>
      )}

      {formMode === null && (
        <div className="w-full min-w-0">
          <PlayerMatchStatsTable
            onEdit={
              handleEditPlayerMatchStat
            }
            onDelete={
              handleDeletePlayerMatchStat
            }
          />
        </div>
      )}

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
