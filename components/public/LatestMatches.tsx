export default function LatestMatches() {
  const matches = [
    {
      competition: "LaLiga",
      round: "Jornada 5",
      homeTeam: "Real Madrid",
      awayTeam: "Sevilla",
      homeScore: 3,
      awayScore: 1,
      status: "Finalizado",
      date: "20 Sep 2026",
    },
    {
      competition: "Premier League",
      round: "Jornada 6",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      homeScore: 2,
      awayScore: 0,
      status: "Finalizado",
      date: "19 Sep 2026",
    },
    {
      competition: "Serie A",
      round: "Jornada 4",
      homeTeam: "Inter",
      awayTeam: "Milan",
      homeScore: 1,
      awayScore: 1,
      status: "Finalizado",
      date: "19 Sep 2026",
    },
    {
      competition: "Bundesliga",
      round: "Jornada 5",
      homeTeam: "Bayern München",
      awayTeam: "Dortmund",
      homeScore: 3,
      awayScore: 2,
      status: "Finalizado",
      date: "18 Sep 2026",
    },
  ];

  return (
    <section
      id="partidos"
      className="bg-slate-50"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-10 lg:py-24">

        {/* HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <div className="flex items-center gap-2">
              <span className="h-1 w-6 rounded-full bg-emerald-500" />

              <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
                Últimos partidos
              </span>
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-900 sm:text-4xl">
              El fútbol,
              <span className="block text-slate-500">
                convertido en datos.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Consulta los partidos más recientes y descubre cómo
              evoluciona el rendimiento de los jugadores.
            </p>
          </div>

          <a
            href="#partidos"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-emerald-600 transition hover:text-emerald-700"
          >
            Ver todos los partidos

            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </a>
        </div>

        {/* CONTENT */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

          {/* MATCHES */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* DESKTOP HEADER */}
            <div className="hidden border-b border-slate-200 bg-slate-50 px-6 py-4 md:grid md:grid-cols-[150px_1fr_110px_90px] md:items-center md:gap-4">

              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Competición
              </span>

              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Partido
              </span>

              <span className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Resultado
              </span>

              <span className="text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Estado
              </span>
            </div>

            {/* MATCH LIST */}
            <div className="divide-y divide-slate-100">

              {matches.map((match, index) => (
                <article
                  key={`${match.homeTeam}-${match.awayTeam}`}
                  className="group px-5 py-5 transition hover:bg-slate-50 sm:px-6"
                >

                  {/* DESKTOP */}
                  <div className="hidden md:grid md:grid-cols-[150px_1fr_110px_90px] md:items-center md:gap-4">

                    {/* COMPETITION */}
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {match.competition}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {match.round}
                      </p>
                    </div>

                    {/* TEAMS */}
                    <div className="min-w-0">

                      <div className="flex items-center justify-between gap-4">

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                            {match.homeTeam
                              .split(" ")
                              .map((word) => word[0])
                              .slice(0, 2)
                              .join("")}
                          </div>

                          <span className="truncate text-sm font-semibold text-slate-800">
                            {match.homeTeam}
                          </span>

                        </div>

                        <span className="shrink-0 text-xs font-medium text-slate-300">
                          vs
                        </span>

                        <div className="flex min-w-0 items-center gap-3">

                          <span className="truncate text-sm font-semibold text-slate-800">
                            {match.awayTeam}
                          </span>

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                            {match.awayTeam
                              .split(" ")
                              .map((word) => word[0])
                              .slice(0, 2)
                              .join("")}
                          </div>

                        </div>

                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        {match.date}
                      </p>

                    </div>

                    {/* SCORE */}
                    <div className="text-center">

                      <div className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-2">
                        <span className="text-sm font-black text-slate-900">
                          {match.homeScore}
                        </span>

                        <span className="mx-2 text-xs text-slate-300">
                          -
                        </span>

                        <span className="text-sm font-black text-slate-900">
                          {match.awayScore}
                        </span>
                      </div>

                    </div>

                    {/* STATUS */}
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {match.status}
                      </span>
                    </div>

                  </div>

                  {/* MOBILE */}
                  <div className="md:hidden">

                    <div className="flex items-center justify-between">

                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {match.competition}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {match.round} · {match.date}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {match.status}
                      </span>

                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">

                      {/* HOME */}
                      <div className="flex min-w-0 flex-1 items-center gap-2">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500">
                          {match.homeTeam
                            .split(" ")
                            .map((word) => word[0])
                            .slice(0, 2)
                            .join("")}
                        </div>

                        <span className="truncate text-xs font-semibold text-slate-800">
                          {match.homeTeam}
                        </span>

                      </div>

                      {/* SCORE */}
                      <div className="shrink-0 rounded-lg bg-slate-100 px-3 py-2">
                        <span className="text-sm font-black text-slate-900">
                          {match.homeScore}
                        </span>

                        <span className="mx-1.5 text-xs text-slate-300">
                          -
                        </span>

                        <span className="text-sm font-black text-slate-900">
                          {match.awayScore}
                        </span>
                      </div>

                      {/* AWAY */}
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">

                        <span className="truncate text-right text-xs font-semibold text-slate-800">
                          {match.awayTeam}
                        </span>

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500">
                          {match.awayTeam
                            .split(" ")
                            .map((word) => word[0])
                            .slice(0, 2)
                            .join("")}
                        </div>

                      </div>

                    </div>

                  </div>

                </article>
              ))}

            </div>

            {/* TABLE FOOTER */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center justify-between">

                <p className="text-xs text-slate-400">
                  Los datos de rendimiento se actualizan después de cada
                  partido.
                </p>

                <span className="hidden text-xs font-semibold text-slate-400 sm:block">
                  {matches.length} partidos
                </span>

              </div>
            </div>

          </div>

          {/* UPDATE CARD */}
          <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-7 text-white">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">

              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="m7 16 4-5 3 3 6-8" />
              </svg>

            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
              Última actualización
            </p>

            <h3 className="mt-3 text-2xl font-black tracking-tight">
              V90 evoluciona
              <span className="block text-slate-400">
                partido a partido.
              </span>
            </h3>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Cada encuentro aporta nueva información sobre el
              rendimiento de los jugadores y su contexto competitivo.
            </p>

            <div className="mt-8 space-y-3">

              {[
                "Valoraciones por partido",
                "Rendimiento acumulado",
                "Forma reciente",
                "Contexto competitivo",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">

                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>

                  </span>

                  <span className="text-xs font-medium text-slate-300">
                    {item}
                  </span>
                </div>
              ))}

            </div>

            <div className="mt-8 border-t border-white/10 pt-6">

              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                Actualización
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-300">
                Después de cada partido
              </p>

            </div>

          </aside>

        </div>
      </div>
    </section>
  );
}