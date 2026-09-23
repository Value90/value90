import PublicHeader from "@/components/public/PublicHeader";
import PublicPageHeader from "@/components/public/PublicPageHeader";

export default function PublicRankingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />

      <main>
        <PublicPageHeader
          eyebrow="Rankings"
          title="Rankings V90"
          description="Consulta las clasificaciones de jugadores según el índice V90."
        />

        <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
              <h2 className="text-lg font-bold text-slate-900">
                Ranking V90
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Clasificación de ejemplo para la primera versión pública.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                ["01", "Jugador 1", "91.8"],
                ["02", "Jugador 2", "90.9"],
                ["03", "Jugador 3", "89.7"],
                ["04", "Jugador 4", "88.9"],
                ["05", "Jugador 5", "88.2"],
              ].map(([position, player, value]) => (
                <div
                  key={position}
                  className="flex items-center gap-4 px-6 py-4 sm:px-8"
                >
                  <div className="w-8 text-sm font-bold text-slate-400">
                    {position}
                  </div>

                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">
                      {player}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      V90 Ranking
                    </div>
                  </div>

                  <div className="text-xl font-black tracking-tight text-emerald-600">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}