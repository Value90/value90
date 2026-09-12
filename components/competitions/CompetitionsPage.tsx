"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getMatchRatings,
  type MatchRating,
} from "@/services/match-rating.service";

import {
  getPlayers,
  type Player,
} from "@/services/player.service";

import StatCard from "@/components/dashboard/StatCard";

export default function DatosV90Page() {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [matchRatings, setMatchRatings] =
    useState<MatchRating[]>([]);

  const [matchRatingsLoading, setMatchRatingsLoading] =
    useState(true);

  /*
   * ============================================================
   * JUGADORES
   *
   * getPlayers() trabaja con Supabase y devuelve
   * Promise<Player[]>.
   * ============================================================
   */

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [playersLoading, setPlayersLoading] =
    useState(true);

  /*
   * ============================================================
   * CARGAR VALORACIONES DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadMatchRatings() {
      try {
        setMatchRatingsLoading(true);

        const data = await getMatchRatings();

        if (!mounted) {
          return;
        }

        setMatchRatings(data);
      } catch (error) {
        console.error(
          "Error cargando valoraciones para Datos V90:",
          error
        );

        if (mounted) {
          setMatchRatings([]);
        }
      } finally {
        if (mounted) {
          setMatchRatingsLoading(false);
        }
      }
    }

    loadMatchRatings();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * CARGAR JUGADORES DESDE SUPABASE
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadPlayers() {
      try {
        setPlayersLoading(true);

        const data = await getPlayers();

        if (!mounted) {
          return;
        }

        setPlayers(data);
      } catch (error) {
        console.error(
          "Error cargando jugadores para Datos V90:",
          error
        );

        if (mounted) {
          setPlayers([]);
        }
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
  }, []);

  /*
   * ============================================================
   * MÉTRICAS
   * ============================================================
   */

  const totalRatings =
    matchRatings.length;

  const ratingsWithExternalAverage =
    useMemo(() => {
      return matchRatings.filter(
        (rating) =>
          rating.externalAverage !== null
      ).length;
    }, [matchRatings]);

  const ratingsWithV90MatchRating =
    useMemo(() => {
      return matchRatings.filter(
        (rating) =>
          rating.value90MatchRating !== null
      ).length;
    }, [matchRatings]);

  const ratingsWithFinalRating =
    useMemo(() => {
      return matchRatings.filter(
        (rating) =>
          rating.finalMatchRating !== null
      ).length;
    }, [matchRatings]);

  const ratingsWithConfidence =
    useMemo(() => {
      return matchRatings.filter(
        (rating) =>
          rating.confidence !== null
      ).length;
    }, [matchRatings]);

  /*
   * ============================================================
   * MEDIAS
   * ============================================================
   */

  const externalAverage =
    useMemo(() => {
      const values = matchRatings
        .map(
          (rating) =>
            rating.externalAverage
        )
        .filter(
          (value): value is number =>
            value !== null
        );

      if (values.length === 0) {
        return null;
      }

      const total = values.reduce(
        (sum, value) =>
          sum + value,
        0
      );

      return total / values.length;
    }, [matchRatings]);

  const v90MatchAverage =
    useMemo(() => {
      const values = matchRatings
        .map(
          (rating) =>
            rating.value90MatchRating
        )
        .filter(
          (value): value is number =>
            value !== null
        );

      if (values.length === 0) {
        return null;
      }

      const total = values.reduce(
        (sum, value) =>
          sum + value,
        0
      );

      return total / values.length;
    }, [matchRatings]);

  const finalRatingAverage =
    useMemo(() => {
      const values = matchRatings
        .map(
          (rating) =>
            rating.finalMatchRating
        )
        .filter(
          (value): value is number =>
            value !== null
        );

      if (values.length === 0) {
        return null;
      }

      const total = values.reduce(
        (sum, value) =>
          sum + value,
        0
      );

      return total / values.length;
    }, [matchRatings]);

  /*
   * ============================================================
   * ÚLTIMAS VALORACIONES
   * ============================================================
   */

  const recentRatings =
    useMemo(() => {
      return [...matchRatings]
        .sort(
          (a, b) =>
            b.id - a.id
        )
        .slice(0, 10);
    }, [matchRatings]);

  /*
   * ============================================================
   * REPRESENTACIÓN DE VALORES
   * ============================================================
   */

  const formatValue = (
    value: number | null,
    decimals = 2
  ) => {
    if (value === null) {
      return "—";
    }

    return value.toFixed(decimals);
  };

  /*
   * ============================================================
   * NOMBRE DEL JUGADOR
   * ============================================================
   */

  const getPlayerName = (
    playerId: number
  ) => {
    if (playersLoading) {
      return "Cargando...";
    }

    return (
      players.find(
        (player) =>
          player.id === playerId
      )?.name ??
      "Jugador desconocido"
    );
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

      <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-800">
            Datos V90
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Información generada y calculada por el
            motor de valoración V90.
          </p>

        </div>

      </div>


      {/* ======================================================
          1. ESTADO DEL MOTOR
          ====================================================== */}

      <section className="mb-10">

        <div className="mb-5">

          <h2 className="text-xl font-bold text-slate-800">
            Estado del motor V90
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Estado actual de los cálculos disponibles
            a partir de las valoraciones registradas.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title="Valoraciones"
            value={
              matchRatingsLoading
                ? "..."
                : totalRatings.toString()
            }
          />

          <StatCard
            title="Media externa calculada"
            value={
              matchRatingsLoading
                ? "..."
                : ratingsWithExternalAverage.toString()
            }
          />

          <StatCard
            title="V90 Match Rating calculado"
            value={
              matchRatingsLoading
                ? "..."
                : ratingsWithV90MatchRating.toString()
            }
          />

          <StatCard
            title="Valoración final calculada"
            value={
              matchRatingsLoading
                ? "..."
                : ratingsWithFinalRating.toString()
            }
          />

        </div>

      </section>


      {/* ======================================================
          2. MEDIAS V90
          ====================================================== */}

      <section className="mb-10">

        <div className="mb-5">

          <h2 className="text-xl font-bold text-slate-800">
            Medias V90
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Valores agregados disponibles actualmente.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">

          <StatCard
            title="Media externa"
            value={
              matchRatingsLoading
                ? "..."
                : externalAverage === null
                ? "—"
                : formatValue(
                    externalAverage
                  )
            }
          />

          <StatCard
            title="Media V90 Match Rating"
            value={
              matchRatingsLoading
                ? "..."
                : v90MatchAverage === null
                ? "—"
                : formatValue(
                    v90MatchAverage
                  )
            }
          />

          <StatCard
            title="Media valoración final"
            value={
              matchRatingsLoading
                ? "..."
                : finalRatingAverage === null
                ? "—"
                : formatValue(
                    finalRatingAverage
                  )
            }
          />

        </div>

      </section>


      {/* ======================================================
          3. CONFIANZA
          ====================================================== */}

      <section className="mb-10">

        <div className="mb-5">

          <h2 className="text-xl font-bold text-slate-800">
            Confianza del cálculo
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Información relacionada con la confianza
            asignada por el motor V90.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          <StatCard
            title="Valoraciones con confianza"
            value={
              matchRatingsLoading
                ? "..."
                : ratingsWithConfidence.toString()
            }
          />

          <StatCard
            title="Pendientes de cálculo"
            value={
              matchRatingsLoading
                ? "..."
                : Math.max(
                    totalRatings -
                      ratingsWithFinalRating,
                    0
                  ).toString()
            }
          />

        </div>

      </section>


      {/* ======================================================
          4. ÚLTIMAS VALORACIONES
          ====================================================== */}

      <section>

        <div className="mb-5">

          <h2 className="text-xl font-bold text-slate-800">
            Últimas valoraciones procesadas
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Últimos registros disponibles en el motor V90.
          </p>

        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-slate-100">

                <tr>

                  <th className="p-4 text-left text-sm font-semibold text-slate-700">
                    Jugador
                  </th>

                  <th className="p-4 text-left text-sm font-semibold text-slate-700">
                    Match Rating
                  </th>

                  <th className="p-4 text-left text-sm font-semibold text-slate-700">
                    Media externa
                  </th>

                  <th className="p-4 text-left text-sm font-semibold text-slate-700">
                    V90 Match
                  </th>

                  <th className="p-4 text-left text-sm font-semibold text-slate-700">
                    Valoración final
                  </th>

                  <th className="p-4 text-left text-sm font-semibold text-slate-700">
                    Confianza
                  </th>

                  <th className="p-4 text-left text-sm font-semibold text-slate-700">
                    Versión
                  </th>

                </tr>

              </thead>

              <tbody>

                {matchRatingsLoading ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="p-8 text-center text-slate-500"
                    >
                      Cargando valoraciones...
                    </td>

                  </tr>

                ) : recentRatings.length === 0 ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="p-8 text-center text-slate-500"
                    >
                      Todavía no existen valoraciones
                      procesadas por el motor V90.
                    </td>

                  </tr>

                ) : (

                  recentRatings.map(
                    (rating) => (

                      <tr
                        key={rating.id}
                        className="border-t hover:bg-slate-50"
                      >

                        <td className="p-4 font-medium text-slate-800">
                          {getPlayerName(
                            rating.playerId
                          )}
                        </td>

                        <td className="p-4 text-slate-700">
                          {formatValue(
                            rating.finalMatchRating
                          )}
                        </td>

                        <td className="p-4 text-slate-700">
                          {formatValue(
                            rating.externalAverage
                          )}
                        </td>

                        <td className="p-4 text-slate-700">
                          {formatValue(
                            rating.value90MatchRating
                          )}
                        </td>

                        <td className="p-4 text-slate-700">
                          {formatValue(
                            rating.finalMatchRating
                          )}
                        </td>

                        <td className="p-4 text-slate-700">
                          {formatValue(
                            rating.confidence
                          )}
                        </td>

                        <td className="p-4 text-slate-700">
                          {rating.calculationVersion ??
                            "—"}
                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>

      </section>

    </div>
  );
}