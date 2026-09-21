export default function PublicStats() {
  const stats = [
    {
      value: "4.892",
      label: "Jugadores",
    },
    {
      value: "312",
      label: "Equipos",
    },
    {
      value: "28",
      label: "Competiciones",
    },
    {
      value: "125.460",
      label: "Partidos",
    },
  ];

  return (
    <section
      id="estadisticas"
      className="border-b border-slate-200 bg-white"
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 sm:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`relative px-5 py-8 text-center sm:px-8 sm:py-9 ${
              index !== 0
                ? "border-l border-slate-200"
                : ""
            }`}
          >
            {/* Número */}
            <div className="text-3xl font-black tracking-[-0.04em] text-slate-900 sm:text-4xl">
              {stat.value}
            </div>

            {/* Label */}
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-xs">
              {stat.label}
            </div>

            {/* Indicador */}
            <div className="mx-auto mt-4 h-1 w-5 rounded-full bg-emerald-500" />
          </div>
        ))}
      </div>
    </section>
  );
}