import PublicHeader from "@/components/public/PublicHeader";
import PublicPageHeader from "@/components/public/PublicPageHeader";

export default function PublicTeamsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />

      <main>
        <PublicPageHeader
          eyebrow="Equipos"
          title="Equipos"
          description="Consulta equipos, plantillas, rendimiento y valoración de sus jugadores."
        />

        <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Buscar equipo
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Busca equipos por nombre, país o competición.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Ej. Real Madrid"
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <button
                type="button"
                className="h-11 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Buscar
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}