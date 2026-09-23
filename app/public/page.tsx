import PublicHeader from "@/components/public/PublicHeader";
import PublicPageHeader from "@/components/public/PublicPageHeader";

export default function PublicMatchesPage() {
  const matches = [
    {
      id: 1,
      competition: "LaLiga",
      season: "2026/27",
      round: "Jornada 5",
      date: "20 Sep 2026",
      status: "Finalizado",
      homeTeam: "Real Madrid",
      awayTeam: "Sevilla",
      homeScore: 3,
      awayScore: 1,
    },
    {
      id: 2,
      competition: "Premier League",
      season: "2026/27",
      round: "Jornada 6",
      date: "19 Sep 2026",
      status: "Finalizado",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      homeScore: 2,
      awayScore: 0,
    },
    {
      id: 3,
      competition: "Serie A",
      season: "2026/27",
      round: "Jornada 4",
      date: "19 Sep 2026",
      status: "Finalizado",
      homeTeam: "Inter",
      awayTeam: "Milan",
      homeScore: 1,
      awayScore: 1,
    },
    {
      id: 4,
      competition: "Bundesliga",
      season: "2026/27",
      round: "Jornada 5",
      date: "18 Sep 2026",
      status: "Finalizado",
      homeTeam: "Bayern München",
      awayTeam: "Dortmund",
      homeScore: 3,
      awayScore: 2,
    },
    {
      id: 5,
      competition: "LaLiga",
      season: "2026/27",
      round: "Jornada 5",
      date: "18 Sep 2026",
      status: "Finalizado",
      homeTeam: "Barcelona",
      awayTeam: "Villarreal",
      homeScore: 2,
      awayScore: 1,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader />

      <main>
        <PublicPageHeader
          eyebrow="Partidos"
          title="Partidos"
          description="Consulta resultados, jornadas y competiciones y accede al análisis de cada encuentro."
        />

        <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">

          {/* FILTROS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end">

              {/* TEMPORADA */}
              <div className="flex-1">
                <label
                  htmlFor="season"
                  className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400"
                >
                  Temporada
                </label>

                <select
                  id="season"
                  defaultValue="2026/27"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option>2026/27</option>
                  <option>2025/26</option>
                  <option>2024/25</option>
                </select>
              </div>

              {/* COMPETICIÓN */}
              <div className="flex-1">
                <label
                  htmlFor="competition"
                  className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400"
                >
                  Competición
                </label>

                <select
                  id="competition"
                  defaultValue="Todas"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option>Todas</option>
                  <option>LaLiga</option>
                  <option>Premier League</option>
                  <option>Serie A</option>
                  <option>Bundesliga</option>
                </select>
              </div>

              {/* JORNADA */}
              <div className="flex-1">
                <label
                  htmlFor="round"
                  className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400"
                >
                  Jornada
                </label>

                <select
                  id="round"
                  defaultValue="Todas"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option>Todas</option>
                  <option>Jornada 1</option>
                  <option>Jornada 2</option>
                  <option>Jornada 3</option>
                  <option>Jornada 4</option>
                  <option>Jornada 5</option>
                  <option>Jornada 6</option>
                </select>
              </div>

              {/* BOTÓN */}
              <button
                type="button"
                className="h-11 rounded-lg bg-emerald-600 px-6 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Filtrar
              </button>

            </div>
          </div>

          {/* CABECERA DEL LISTADO */}
          <div className="mt-8 flex items-center justify-between">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Partidos recientes
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {matches.length} partidos encontrados
              </p>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-xs font-medium text-slate-400">
                Finalizados
              </span>
            </div>

          </div>

          {/* LISTADO */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="divide-y divide-slate-100">

              {matches.map((match) => (
                <article
                  key={match.id}
                  className="group transition hover:bg-slate-50"
                >

                  {/* DESKTOP */}
                  <div className="hidden items-center px-6 py-6 md:grid md:grid-cols-[180px_minmax(0,1fr)_170px] md:gap-6">

                    {/* INFORMACIÓN */}
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {match.competition}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {match.season} · {match.round}
                      </p>

                      <p className="mt-2 text-[11px] text-slate-400">
                        {match.date}
                      </p>
                    </div>

                    {/* PARTIDO */}
                    <div className="flex min-w-0 items-center justify-center gap-6">

                      {/* LOCAL */}
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-3">

                        <span className="truncate text-right text-sm font-bold text-slate-800">
                          {match.homeTeam}
                        </span>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                          {getTeamInitials(match.homeTeam)}
                        </div>

                      </div>

                      {/* RESULTADO CENTRAL */}
                      <div className="flex shrink-0 flex-col items-center">

                        <div className="flex items-center rounded-xl bg-slate-100 px-4 py-2.5">
                          <span className="text-xl font-black tracking-tight text-slate-900">
                            {match.homeScore}
                          </span>

                          <span className="mx-2 text-sm font-medium text-slate-300">
                            -
                          </span>

                          <span className="text-xl font-black tracking-tight text-slate-900">
                            {match.awayScore}
                          </span>
                        </div>

                        <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                          {match.status}
                        </span>

                      </div>

                      {/* VISITANTE */}
                      <div className="flex min-w-0 flex-1 items-center gap-3">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                          {getTeamInitials(match.awayTeam)}
                        </div>

                        <span className="truncate text-sm font-bold text-slate-800">
                          {match.awayTeam}
                        </span>

                      </div>

                    </div>

                    {/* ACCIÓN */}
                    <div className="flex justify-end">

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                      >
                        Ver partido

                        <svg
                          width="14"
                          height="14"
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
                      </button>

                    </div>

                  </div>

                  {/* MOBILE */}
                  <div className="px-5 py-5 md:hidden">

                    {/* COMPETICIÓN */}
                    <div className="flex items-start justify-between">

                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {match.competition}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {match.season} · {match.round}
                        </p>
                      </div>

                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                        {match.status}
                      </span>

                    </div>

                    {/* PARTIDO MOBILE */}
                    <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">

                      {/* LOCAL */}
                      <div className="flex min-w-0 flex-col items-center">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                          {getTeamInitials(match.homeTeam)}
                        </div>

                        <span className="mt-2 w-full truncate text-center text-xs font-bold text-slate-800">
                          {match.homeTeam}
                        </span>

                      </div>

                      {/* RESULTADO */}
                      <div className="text-center">

                        <div className="flex items-center rounded-xl bg-slate-100 px-3 py-2">
                          <span className="text-xl font-black text-slate-900">
                            {match.homeScore}
                          </span>

                          <span className="mx-1.5 text-xs text-slate-300">
                            -
                          </span>

                          <span className="text-xl font-black text-slate-900">
                            {match.awayScore}
                          </span>
                        </div>

                        <p className="mt-2 text-[10px] text-slate-400">
                          {match.date}
                        </p>

                      </div>

                      {/* VISITANTE */}
                      <div className="flex min-w-0 flex-col items-center">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                          {getTeamInitials(match.awayTeam)}
                        </div>

                        <span className="mt-2 w-full truncate text-center text-xs font-bold text-slate-800">
                          {match.awayTeam}
                        </span>

                      </div>

                    </div>

                    {/* ACCIÓN */}
                    <button
                      type="button"
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                    >
                      Ver partido

                      <svg
                        width="14"
                        height="14"
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
                    </button>

                  </div>

                </article>
              ))}

            </div>

          </div>

        </section>
      </main>
    </div>
  );
}

function getTeamInitials(teamName: string) {
  return teamName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}