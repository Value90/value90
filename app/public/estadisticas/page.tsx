import PublicHeader from "@/components/public/PublicHeader";
import PublicPageHeader from "@/components/public/PublicPageHeader";

export default function PublicStatisticsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />

      <main>
        <PublicPageHeader
          eyebrow="Estadísticas"
          title="Estadísticas"
          description="Consulta los principales datos de rendimiento de jugadores, equipos y competiciones."
        />

        <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ["4.892", "Jugadores"],
              ["312", "Equipos"],
              ["28", "Competiciones"],
              ["125.460", "Partidos"],
            ].map(([value, label]) => (
              <article
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
              >
                <div className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                  {value}
                </div>

                <div className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                  {label}
                </div>

                <div className="mx-auto mt-4 h-1 w-5 rounded-full bg-emerald-500" />
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}