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
  /*
   * ============================================================
   * ESTADO DEL FORMULARIO
   * ============================================================
   */

  const [showForm, setShowForm] =
    useState(false);

  const [editingPlayer, setEditingPlayer] =
    useState<Player | undefined>(
      undefined
    );

  const [playerToDelete, setPlayerToDelete] =
    useState<Player | undefined>(
      undefined
    );

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   *
   * Se utiliza para forzar la recarga de PlayersTable
   * después de crear, editar o eliminar.
   * ============================================================
   */

  const [refreshKey, setRefreshKey] =
    useState(0);

  /*
   * ============================================================
   * JUGADORES
   * ============================================================
   *
   * getPlayers() devuelve Promise<Player[]> porque
   * trabaja con Supabase.
   *
   * Por eso NO podemos hacer:
   *
   * const players = getPlayers();
   *
   * y después:
   *
   * players.length
   *
   * ============================================================
   */

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
   * GUARDAR JUGADOR
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
   * PREPARAR ELIMINACIÓN
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

  const handleConfirmDelete =
    async () => {
      if (!playerToDelete) {
        return;
      }

      try {
        await deletePlayer(
          playerToDelete.id
        );

        setPlayerToDelete(
          undefined
        );

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
    <div className="w-full p-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-8 flex items-start justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Jugadores
          </h1>

          <p className="mt-2 text-slate-600">
            Gestión de jugadores de Value90
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={handleNewPlayer}
            className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            + Nuevo jugador
          </button>
        )}

      </div>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {playersError && !showForm && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {playersError}
        </div>
      )}

      {/* ======================================================
          CONTADOR
          ====================================================== */}

      {!showForm && (
        <p className="mb-6 text-slate-700">

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

      {showForm ? (
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

      {/* ======================================================
          DIÁLOGO DE ELIMINACIÓN
          ====================================================== */}

      {playerToDelete && (
        <DeletePlayerDialog
          player={playerToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() =>
            setPlayerToDelete(
              undefined
            )
          }
        />
      )}

    </div>
  );
}