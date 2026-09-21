export default function FeaturedPlayers() {
  const players = [
    {
      position: 1,
      name: "Odyseas Vlachodimos",
      team: "Nottingham Forest",
      competition: "Premier League",
      rating: "8.72",
      matches: 24,
      form: "+4.8%",
      initials: "OV",
    },
    {
      position: 2,
      name: "Jude Bellingham",
      team: "Real Madrid",
      competition: "LaLiga",
      rating: "8.64",
      matches: 27,
      form: "+3.9%",
      initials: "JB",
    },
    {
      position: 3,
      name: "Rodri",
      team: "Manchester City",
      competition: "Premier League",
      rating: "8.58",
      matches: 25,
      form: "+3.4%",
      initials: "R",
    },
  ];

  return (
    <section
      id="jugadores"
      className="bg-slate-50"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-10 lg:py-24">

        {/* HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <div className="flex items-center gap-2">
              <span className="h-1 w-6 rounded-full bg-emerald-500" />

              <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">
                Jugadores destacados
              </span>
            </div>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-900 sm:text-4xl">
              Los jugadores que están
              <span className="block text-slate-500">
                marcando la diferencia.
              </span>
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Descubre futbolistas cuyo rendimiento destaca dentro de
              su contexto competitivo.
            </p>
          </div>

          <a
            href="#rankings"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-emerald-600 transition hover:text-emerald-700"
          >
            Ver todos los jugadores

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

        {/* PLAYER CARDS */}
        <div className="mt-10 grid gap-5 lg:grid-cols-3">

          {players.map((player) => (
            <article
              key={player.position}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-slate-200/50"
            >

              {/* TOP */}
              <div className="flex items-start justify-between p-6">

                <div className="flex items-center gap-4">

                  {/* POSITION */}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-400 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                    {String(player.position).padStart(2, "0")}
                  </div>

                  {/* PLAYER */}
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {player.name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      {player.team}
                    </p>
                  </div>

                </div>

                {/* INITIALS */}
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-xs font-black text-emerald-700">
                  {player.initials}
                </div>

              </div>

              {/* DIVIDER */}
              <div className="border-t border-slate-100" />

              {/* V90 */}
              <div className="p-6">

                <div className="flex items-end justify-between">

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      V90
                    </p>

                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-4xl font-black tracking-[-0.04em] text-slate-900">
                        {player.rating}
                      </span>

                      <span className="text-xs font-medium text-slate-400">
                        / 10
                      </span>
                    </div>
                  </div>

                  {/* FORM */}
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                      Forma
                    </p>

                    <p className="mt-0.5 text-sm font-bold text-emerald-600">
                      {player.form}
                    </p>
                  </div>

                </div>

                {/* METRICS */}
                <div className="mt-6 grid grid-cols-2 gap-3">

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Rating medio
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {(Number(player.rating) - 0.32).toFixed(2)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                      Partidos
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {player.matches}
                    </p>
                  </div>

                </div>

                {/* COMPETITION */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">

                  <span className="text-xs text-slate-400">
                    Competición
                  </span>

                  <span className="text-xs font-semibold text-slate-700">
                    {player.competition}
                  </span>

                </div>

              </div>

              {/* HOVER LINE */}
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-emerald-500 transition-all duration-300 group-hover:w-full" />

            </article>
          ))}

        </div>
      </div>
    </section>
  );
}