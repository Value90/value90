import PublicHeader from "@/components/public/PublicHeader";
import PublicPageHeader from "@/components/public/PublicPageHeader";

export default function PublicCompetitionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />

      <main>
        <PublicPageHeader
          eyebrow="Competiciones"
          title="Competiciones"
          description="Consulta las competiciones disponibles y explora sus equipos, jugadores y partidos."
        />

        <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "LaLiga",
              "Premier League",
              "Serie A",
              "Bundesliga",
              "Ligue 1",
              "Champions League",
            ].map((competition) => (
              <article
                key={competition}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-600">
                  V90
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-900">
                  {competition}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Equipos, jugadores y partidos.
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}