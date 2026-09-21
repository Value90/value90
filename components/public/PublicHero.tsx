export default function PublicHero() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-400/5 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:py-28">

        {/* LEFT */}
        <div className="max-w-2xl">

          {/* Eyebrow */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold tracking-wide text-emerald-300">
              FOOTBALL PERFORMANCE DATA
            </span>
          </div>

          {/* Main title */}
          <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
            El valor del
            <span className="block text-emerald-400">
              rendimiento.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
            Datos, contexto y rendimiento para entender cuánto vale
            realmente un futbolista dentro del terreno de juego.
          </p>

          {/* Actions */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">

            <a
              href="#jugadores"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              Explorar jugadores

              <svg
                width="17"
                height="17"
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

            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Cómo funciona
            </a>
          </div>

          {/* Features */}
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
            {[
              "Rendimiento por partido",
              "Contexto competitivo",
              "Evolución del jugador",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm text-slate-400"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <svg
                    width="12"
                    height="12"
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

                {item}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — V90 DATA CARD */}
        <div className="relative mx-auto w-full max-w-[560px] lg:ml-auto">

          {/* Glow */}
          <div className="absolute inset-10 rounded-full bg-emerald-500/10 blur-3xl" />

          {/* Main card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl sm:p-7">

            {/* Card header */}
            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Player Performance
                </p>

                <h2 className="mt-2 text-xl font-bold text-white">
                  V90 Score
                </h2>
              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10">
                <span className="text-3xl font-black text-emerald-400">
                  8.7
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="mt-8">

              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Evolución del rendimiento
                </span>

                <span className="text-xs font-semibold text-emerald-400">
                  +12.4%
                </span>
              </div>

              <div className="relative h-[180px] overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60">

                {/* Horizontal lines */}
                <div className="absolute inset-x-0 top-1/4 border-t border-white/5" />
                <div className="absolute inset-x-0 top-2/4 border-t border-white/5" />
                <div className="absolute inset-x-0 top-3/4 border-t border-white/5" />

                {/* Chart line */}
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 500 180"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="v90Area"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="rgb(52 211 153)"
                        stopOpacity="0.25"
                      />
                      <stop
                        offset="100%"
                        stopColor="rgb(52 211 153)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  <path
                    d="M0 140 C45 135 55 122 90 126 C125 130 145 100 175 108 C205 116 220 80 250 86 C280 92 300 66 325 72 C350 78 370 48 395 55 C420 62 445 35 500 25 L500 180 L0 180 Z"
                    fill="url(#v90Area)"
                  />

                  <path
                    d="M0 140 C45 135 55 122 90 126 C125 130 145 100 175 108 C205 116 220 80 250 86 C280 92 300 66 325 72 C350 78 370 48 395 55 C420 62 445 35 500 25"
                    fill="none"
                    stroke="rgb(52 211 153)"
                    strokeWidth="3"
                  />

                  <circle
                    cx="500"
                    cy="25"
                    r="5"
                    fill="rgb(52 211 153)"
                  />
                </svg>

                {/* Chart labels */}
                <div className="absolute bottom-3 left-4 right-4 flex justify-between text-[10px] text-slate-600">
                  <span>J1</span>
                  <span>J5</span>
                  <span>J10</span>
                  <span>J15</span>
                  <span>J20</span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-5 grid grid-cols-3 gap-3">

              <div className="rounded-xl bg-white/[0.035] p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-600">
                  Rating
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  8.4
                </p>
              </div>

              <div className="rounded-xl bg-white/[0.035] p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-600">
                  Matches
                </p>
                <p className="mt-1 text-lg font-bold text-white">
                  24
                </p>
              </div>

              <div className="rounded-xl bg-white/[0.035] p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-600">
                  Form
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-400">
                  +8.2%
                </p>
              </div>

            </div>
          </div>

          {/* Floating mini card */}
          <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-xl sm:block">
            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgb(52 211 153)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 3v18h18" />
                  <path d="m7 16 4-5 3 3 6-8" />
                </svg>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  Market trend
                </p>

                <p className="text-sm font-bold text-white">
                  Performance ↑
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}