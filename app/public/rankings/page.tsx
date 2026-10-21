"use client";

import { useEffect, useMemo, useState } from "react";

import PublicHeader from "@/components/public/PublicHeader";
import PublicPageHeader from "@/components/public/PublicPageHeader";
import {
  getPublicPlayers,
  type PublicPlayer,
} from "@/services/player.service";
import {
  getPublicPlayerV90MatchFacts,
  type PublicPlayerV90MatchFact,
} from "@/services/v90-match.service";

interface RankedPlayer {
  player: PublicPlayer;
  v90: number;
  matches: number;
}

function formatV90(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export default function PublicRankingsPage() {
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [facts, setFacts] = useState<PublicPlayerV90MatchFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    Promise.all([getPublicPlayers(), getPublicPlayerV90MatchFacts()])
      .then(([playersData, factsData]) => {
        if (!mounted) return;
        setPlayers(playersData);
        setFacts(factsData.filter((fact) => Number.isFinite(fact.v90Match)));
      })
      .catch((loadError) => {
        console.error("Error cargando el ranking público:", loadError);
        if (mounted) setError("No se pudo cargar el ranking V90.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const ranking = useMemo(() => {
    const playerMap = new Map(players.map((player) => [player.id, player]));
    const aggregates = new Map<number, { contribution: number; weight: number; matches: number }>();

    for (const fact of facts) {
      const aggregate = aggregates.get(fact.playerId) ?? {
        contribution: 0,
        weight: 0,
        matches: 0,
      };

      aggregate.contribution += fact.weightedContribution;
      aggregate.weight += fact.totalWeight;
      aggregate.matches += 1;
      aggregates.set(fact.playerId, aggregate);
    }

    return Array.from(aggregates.entries())
      .flatMap(([playerId, aggregate]): RankedPlayer[] => {
        const player = playerMap.get(playerId);
        if (!player || aggregate.weight <= 0) return [];

        return [{
          player,
          v90: aggregate.contribution / aggregate.weight,
          matches: aggregate.matches,
        }];
      })
      .sort((a, b) => b.v90 - a.v90)
      .slice(0, 5);
  }, [facts, players]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />

      <main>
        <PublicPageHeader
          eyebrow="Rankings"
          title="Rankings V90"
          description="Clasificación de jugadores según la media ponderada de sus valoraciones V90 calculadas."
        />

        <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-14">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-5 sm:px-8">
              <h2 className="text-lg font-bold text-slate-900">Ranking V90</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ordenado por puntuación V90 acumulada.
              </p>
            </div>

            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-8" role="status">
                Calculando clasificación...
              </p>
            ) : error ? (
              <p className="px-4 py-8 text-center text-sm text-red-700 sm:px-8" role="alert">
                {error}
              </p>
            ) : ranking.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 sm:px-8">
                Todavía no hay valoraciones V90 suficientes para mostrar el ranking.
              </p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {ranking.map((item, index) => (
                  <li
                    key={item.player.id}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[3rem_minmax(0,1fr)_7rem] sm:gap-4 sm:px-8"
                  >
                    <span className="text-sm font-bold text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {item.player.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.matches} {item.matches === 1 ? "partido calculado" : "partidos calculados"}
                      </p>
                    </div>
                    <span className="text-right text-xl font-black tracking-tight text-emerald-600">
                      {formatV90(item.v90)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
