"use client";

import {
  useEffect,
  useState,
} from "react";

import PlayersTable from "@/components/players/PlayersTable";
import PlayerForm from "@/components/players/PlayerForm";
import DeletePlayerDialog from "@/components/players/DeletePlayerDialog";

import {
  deletePlayer,
  getPlayers,
  type Player,
} from "@/services/player.service";

export default function PlayersPage() {
  const [showForm, setShowForm] = useState(false);

  const [editingPlayer, setEditingPlayer] =
    useState<Player | undefined>(undefined);

  const [playerToDelete, setPlayerToDelete] =
    useState<Player | undefined>(undefined);

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [playersLoading, setPlayersLoading] =
    useState(true);

  const [playersError, setPlayersError] =
    useState("");

  /*
   * ============================================================
   * CARGAR JUGADORES
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadPlayers() {
      try {
        setPlayersLoading(true);
        setPlayersError("");

        const data = await getPlayers();

        if (!mounted) {
          return;
        }

        setPlayers(data);
      } catch (error) {
        console.error(
          "Error cargando jugadores:",
          error
        );

        if (!mounted) {
          return;
        }

        setPlayers([]);

        setPlayersError(
          "No se pudieron cargar los jugadores."
        );
      } finally {
        if (mounted) {
          setPlayersLoading(false);
        }
      }
    }

    loadPlayers();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  /*
   * ============================================================
   * NUEVO JUGADOR
   * ============================================================
   */

  const handleNewPlayer = () => {
    setEditingPlayer(undefined);
    setShowForm(true);
  };

  /*
   * ============================================================
   * EDITAR JUGADOR
   * ============================================================
   */

  const handleEditPlayer = (
    player: Player
  ) => {
    setEditingPlayer(player);
    setShowForm(true);
  };

  /*
   * ============================================================
   * JUGADOR GUARDADO
   * ============================================================
   */

  const handleSaved = () => {
    setEditingPlayer(undefined);
    setShowForm(false);

    setRefreshKey(
      (value) => value + 1
    );
  };

  /*
   * ============================================================
   * ELIMINAR JUGADOR
   * ============================================================
   */

  const handleDeletePlayer = (
    player: Player
  ) => {
    setPlayerToDelete(player);
  };

  /*
   * ============================================================
   * CONFIRMAR ELIMINACIÓN
   * ============================================================
   */

  const handleConfirmDelete = async () => {
    if (!playerToDelete) {
      return;
    }

    try {
      await deletePlayer(
        playerToDelete.id
      );

      setPlayerToDelete(undefined);

      setRefreshKey(
        (value) => value + 1
      );
    } catch (error) {
      console.error(
        "Error eliminando jugador:",
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
    setEditingPlayer(undefined);
    setShowForm(false);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 p-3 sm:p-5 md:p-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-5 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">

        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Jugadores
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Gestión de jugadores de Value90
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={handleNewPlayer}
            className="w-full shrink-0 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto sm:px-5 sm:py-3"
          >
            + Nuevo jugador
          </button>
        )}
      </div>

      {/* ======================================================
          ERROR DE CARGA
          ====================================================== */}

      {playersError && !showForm && (
        <div className="mb-5 w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-6 sm:p-4">
          {playersError}
        </div>
      )}

      {/* ======================================================
          CONTADOR
          ====================================================== */}

      {!showForm && (
        <p className="mb-5 text-sm text-slate-700 sm:mb-6 sm:text-base">
          Total de jugadores:{" "}
          <span className="font-semibold">
            {playersLoading
              ? "Cargando..."
              : players.length}
          </span>
        </p>
      )}

      {/* ======================================================
          FORMULARIO / TABLA
          ====================================================== */}

      <div className="w-full min-w-0">

        {showForm ? (

          /*
           * IMPORTANTE:
           * PlayerForm necesita estos tres props.
           * No dejar <PlayerForm /> vacío.
           */

          <PlayerForm
            player={editingPlayer}
            onCancel={handleCancelForm}
            onSaved={handleSaved}
          />

        ) : (

          <PlayersTable
            key={refreshKey}
            onEdit={handleEditPlayer}
            onDelete={handleDeletePlayer}
          />

        )}

      </div>

      {/* ======================================================
          DIÁLOGO DE ELIMINACIÓN
          ====================================================== */}

      {playerToDelete && (
        <DeletePlayerDialog
          player={playerToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() =>
            setPlayerToDelete(undefined)
          }
        />
      )}

    </div>
  );
}