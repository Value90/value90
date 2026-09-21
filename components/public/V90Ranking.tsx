export default function V90Ranking() {
  const ranking = [
    {
      position: 1,
      name: "Odyseas Vlachodimos",
      team: "Nottingham Forest",
      competition: "Premier League",
      v90: "8.72",
      change: "+0.18",
      trend: "up",
    },
    {
      position: 2,
      name: "Jude Bellingham",
      team: "Real Madrid",
      competition: "LaLiga",
      v90: "8.64",
      change: "+0.12",
      trend: "up",
    },
    {
      position: 3,
      name: "Rodri",
      team: "Manchester City",
      competition: "Premier League",
      v90: "8.58",
      change: "-0.04",
      trend: "down",
    },
    {
      position: 4,
      name: "Kevin De Bruyne",
      team: "Manchester City",
      competition: "Premier League",
      v90: "8.51",
      change: "+0.09",
      trend: "up",
    },
    {
      position: 5,
      name: "Vinícius Júnior",
      team: "Real Madrid",
      competition: "LaLiga",
      v90: "8.47",
      change: "+0.15",
      trend: "up",
    },
  ];

  return (
    <section
      id="rankings"
      className="bg-white"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-10 lg:py-24">

        {/* HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <div className="flex items-center gap-2">
              <span className="h-1 w-6 rounded-full bg-emerald-500" />

              <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
                Ranking V90
              </span>
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-900 sm:text-4xl">
              El rendimiento,
              <span className="block text-slate-500">
                llevado a una cifra.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Consulta los jugadores con mejor valoración V90 según
              su rendimiento y contexto competitivo.
            </p>
          </div>

          <a
            href="#jugadores"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-emerald-600 transition hover:text-emerald-700"
          >
            Explorar ranking completo

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

        {/* RANKING */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* TABLE HEADER */}
          <div className="hidden border-b border-slate-200 bg-slate-50 px-6 py-4 md:grid md:grid-cols-[70px_minmax(220px,1fr)_180px_150px_130px_120px] md:items-center md:gap-4">

            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              #
            </span>

            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Jugador
            </span>

            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Equipo
            </span>

            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Competición
            </span>

            <span className="text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Evolución
            </span>

            <span className="text-right text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              V90
            </span>

          </div>

          {/* ROWS */}
          <div className="divide-y divide-slate-100">

            {ranking.map((player) => (
              <article
                key={player.position}
                className="group px-5 py-5 transition hover:bg-slate-50 sm:px-6"
              >

                {/* DESKTOP */}
                <div className="hidden md:grid md:grid-cols-[70px_minmax(220px,1fr)_180px_150px_130px_120px] md:items-center md:gap-4">

                  {/* POSITION */}
                  <div>
                    <span
                      className={`text-lg font-black ${
                        player.position === 1
                          ? "text-emerald-600"
                          : "text-slate-300"
                      }`}
                    >
                      {String(player.position).padStart(2, "0")}
                    </span>
                  </div>

                  {/* PLAYER */}
                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                      {player.name
                        .split(" ")
                        .map((word) => word[0])
                        .slice(0, 2)
                        .join("")}
                    </div>

                    <div>
                      <p className="font-bold text-slate-900">
                        {player.name}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        Rendimiento actual
                      </p>
                    </div>

                  </div>

                  {/* TEAM */}
                  <div className="text-sm font-medium text-slate-700">
                    {player.team}
                  </div>

                  {/* COMPETITION */}
                  <div className="text-sm text-slate-500">
                    {player.competition}
                  </div>

                  {/* CHANGE */}
                  <div className="flex justify-end">

                    <div
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                        player.trend === "up"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      {player.trend === "up" ? "↑" : "↓"}

                      {player.change}
                    </div>

                  </div>

                  {/* V90 */}
                  <div className="text-right">

                    <span className="text-2xl font-black tracking-[-0.03em] text-slate-900">
                      {player.v90}
                    </span>

                    <span className="ml-1 text-[10px] font-medium text-slate-400">
                      /10
                    </span>

                  </div>

                </div>

                {/* MOBILE */}
                <div className="flex items-center gap-4 md:hidden">

                  {/* POSITION */}
                  <div className="w-7 shrink-0">
                    <span
                      className={`text-lg font-black ${
                        player.position === 1
                          ? "text-emerald-600"
                          : "text-slate-300"
                      }`}
                    >
                      {player.position}
                    </span>
                  </div>

                  {/* PLAYER */}
                  <div className="flex min-w-0 flex-1 items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                      {player.name
                        .split(" ")
                        .map((word) => word[0])
                        .slice(0, 2)
                        .join("")}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {player.name}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {player.team}
                      </p>
                    </div>

                  </div>

                  {/* V90 */}
                  <div className="shrink-0 text-right">

                    <p className="text-xl font-black text-slate-900">
                      {player.v90}
                    </p>

                    <div
                      className={`text-[10px] font-bold ${
                        player.trend === "up"
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {player.trend === "up" ? "↑" : "↓"}{" "}
                      {player.change}
                    </div>

                  </div>

                </div>

              </article>
            ))}

          </div>

          {/* FOOTER */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-xs text-slate-400">
                Ranking de demostración · Datos actualizados después de
                cada partido.
              </p>

              <a
                href="#como-funciona"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                ¿Cómo se calcula V90?
              </a>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}