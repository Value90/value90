"use client";

import { useEffect, useState } from "react";

import type { MatchRating } from "@/types/match-rating";
import type { Team } from "@/types/team";
import type { Player } from "@/types/player";
import type { Match } from "@/types/match";
import type { Participation } from "@/types/participation";

import { getMatches } from "@/services/match.service";
import { getPlayers } from "@/services/player.service";
import { getParticipations } from "@/services/participation.service";
import { getTeams } from "@/services/team.service";

interface DeleteMatchRatingDialogProps {
  matchRating: MatchRating | undefined;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteMatchRatingDialog({
  matchRating,
  onConfirm,
  onCancel,
}: DeleteMatchRatingDialogProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [loading, setLoading] = useState(true);

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  useEffect(() => {
    if (!matchRating) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        const [
          teamsData,
          playersData,
          matchesData,
          participationsData,
        ] = await Promise.all([
          getTeams(),
          getPlayers(),
          getMatches(),
          getParticipations(),
        ]);

        setTeams(teamsData);
        setPlayers(playersData);
        setMatches(matchesData);
        setParticipations(participationsData);
      } catch (error) {
        console.error(
          "Error obteniendo datos de la valoración:",
          error
        );

        setTeams([]);
        setPlayers([]);
        setMatches([]);
        setParticipations([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [matchRating]);

  /*
   * ============================================================
   * SI NO HAY VALORACIÓN
   * ============================================================
   */

  if (!matchRating) {
    return null;
  }

  /*
   * ============================================================
   * JUGADOR
   * ============================================================
   */

  const player = players.find(
    (item) =>
      item.id === matchRating.playerId
  );

  /*
   * ============================================================
   * PARTIDO
   * ============================================================
   */

  const match = matches.find(
    (item) =>
      item.id === matchRating.matchId
  );

  /*
   * ============================================================
   * PARTICIPACIÓN
   * ============================================================
   */

  const participation =
    participations.find(
      (item) =>
        item.id ===
        matchRating.participationId
    );

  /*
   * ============================================================
   * EQUIPO
   *
   * MatchRating → Participation → Team
   * ============================================================
   */

  const team = participation
    ? teams.find(
        (item) =>
          item.id ===
          participation.teamId
      )
    : undefined;

  /*
   * ============================================================
   * NOMBRE DEL PARTIDO
   * ============================================================
   */

  let matchName =
    "Partido no encontrado";

  if (match) {
    const homeTeam = teams.find(
      (item) =>
        item.id === match.homeTeamId
    );

    const awayTeam = teams.find(
      (item) =>
        item.id === match.awayTeamId
    );

    if (loading) {
      matchName = "Cargando equipos...";
    } else {
      matchName = `${homeTeam?.shortName ?? "?"} - ${
        awayTeam?.shortName ?? "?"
      }`;
    }
  }

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
          Eliminar valoración
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          ¿Seguro que quieres eliminar esta
          valoración del partido?
        </p>

        {/* INFORMACIÓN */}

        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">

          <p>
            <span className="font-semibold text-slate-800">
              Jugador:
            </span>{" "}
            {loading
              ? "Cargando..."
              : player?.name ??
                "Jugador no encontrado"}
          </p>

          <p className="mt-2">
            <span className="font-semibold text-slate-800">
              Partido:
            </span>{" "}
            {matchName}
          </p>

          <p className="mt-2">
            <span className="font-semibold text-slate-800">
              Equipo:
            </span>{" "}
            {loading
              ? "Cargando..."
              : team?.shortName ??
                "Equipo no encontrado"}
          </p>

          <p className="mt-2">
            <span className="font-semibold text-slate-800">
              Participación:
            </span>{" "}
            #{matchRating.participationId}
          </p>

        </div>

        {/* AVISO */}

        <p className="mt-4 text-sm text-red-600">
          Esta acción no se puede deshacer.
        </p>

        {/* BOTONES */}

        <div className="mt-6 flex justify-end gap-3">

          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
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