"use client";

import {
  useEffect,
  useState,
} from "react";

import type { PlayerMatchStat } from "@/types/player-match-stat";

import { getMatches } from "@/services/match.service";
import { getPlayers } from "@/services/player.service";
import { getParticipations } from "@/services/participation.service";

import { useTeams } from "@/hooks/useTeams";

interface DeletePlayerMatchStatDialogProps {
  playerMatchStat:
    | PlayerMatchStat
    | undefined;

  onConfirm: () => void;

  onCancel: () => void;
}

export default function DeletePlayerMatchStatDialog({
  playerMatchStat,
  onConfirm,
  onCancel,
}: DeletePlayerMatchStatDialogProps) {
  /*
   * ============================================================
   * EQUIPOS
   * ============================================================
   */

  const { teams } = useTeams();

  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [matches, setMatches] =
    useState<
      Awaited<
        ReturnType<typeof getMatches>
      >
    >([]);

  const [players, setPlayers] =
    useState<
      Awaited<
        ReturnType<typeof getPlayers>
      >
    >([]);

  const [participations, setParticipations] =
    useState<
      Awaited<
        ReturnType<
          typeof getParticipations
        >
      >
    >([]);

  const [loading, setLoading] =
    useState(true);

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  useEffect(() => {
    if (!playerMatchStat) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);

        const [
          matchesData,
          playersData,
          participationsData,
        ] = await Promise.all([
          getMatches(),
          getPlayers(),
          getParticipations(),
        ]);

        if (!mounted) {
          return;
        }

        setMatches(matchesData);
        setPlayers(playersData);
        setParticipations(
          participationsData
        );
      } catch (error) {
        console.error(
          "Error cargando datos de la estadística:",
          error
        );

        if (!mounted) {
          return;
        }

        setMatches([]);
        setPlayers([]);
        setParticipations([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [playerMatchStat]);

  /*
   * ============================================================
   * SI NO HAY ESTADÍSTICA
   * ============================================================
   */

  if (!playerMatchStat) {
    return null;
  }

  /*
   * ============================================================
   * PARTICIPACIÓN
   *
   * player_match_stats
   *        ↓
   * participation_id
   *        ↓
   * participations
   *        ↓
   * match_id / player_id
   * ============================================================
   */

  const participation =
    participations.find(
      (item) =>
        item.id ===
        playerMatchStat.participationId
    );

  /*
   * ============================================================
   * PARTIDO
   * ============================================================
   */

  const match = participation
    ? matches.find(
        (item) =>
          item.id ===
          participation.matchId
      )
    : undefined;

  /*
   * ============================================================
   * JUGADOR
   * ============================================================
   */

  const player = players.find(
    (item) =>
      item.id ===
      participation?.playerId
  );

  /*
   * ============================================================
   * EQUIPO LOCAL
   * ============================================================
   */

  const homeTeam = match
    ? teams.find(
        (team) =>
          team.id ===
          match.homeTeamId
      )
    : undefined;

  /*
   * ============================================================
   * EQUIPO VISITANTE
   * ============================================================
   */

  const awayTeam = match
    ? teams.find(
        (team) =>
          team.id ===
          match.awayTeamId
      )
    : undefined;

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">

        {/* CABECERA */}

        <h2 className="text-xl font-bold text-slate-800">
          Eliminar estadísticas
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          ¿Seguro que quieres eliminar todas
          las estadísticas de este jugador
          para este partido?
        </p>

        {/* INFORMACIÓN */}

        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">

          {loading ? (
            <p className="text-slate-500">
              Cargando información...
            </p>
          ) : (
            <>
              <p>
                <span className="font-semibold text-slate-800">
                  Jugador:
                </span>{" "}
                {player?.name ??
                  "Jugador no encontrado"}
              </p>

              <p className="mt-2">
                <span className="font-semibold text-slate-800">
                  Partido:
                </span>{" "}
                {homeTeam?.shortName ?? "?"}{" "}
                -{" "}
                {awayTeam?.shortName ?? "?"}
              </p>

              <p className="mt-2">
                <span className="font-semibold text-slate-800">
                  Participación:
                </span>{" "}
                #{playerMatchStat.participationId}
              </p>
            </>
          )}

        </div>

        {/* AVISO */}

        <p className="mt-4 text-sm text-red-600">
          Se eliminará el registro completo
          de estadísticas de esta
          participación. Esta acción no se
          puede deshacer.
        </p>

        {/* BOTONES */}

        <div className="mt-6 flex justify-end gap-3">

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Eliminar
          </button>

        </div>

      </div>

    </div>
  );
}