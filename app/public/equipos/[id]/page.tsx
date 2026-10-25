import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicPageHeader from "@/components/public/PublicPageHeader";
import TeamCrest from "@/components/public/TeamCrest";
import { getPublicTeamProfile } from "@/services/public-data.server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Ficha de equipo ${id}`, description: "Información, plantilla y partidos del equipo." };
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" }).format(new Date(value));
}

export default async function PublicTeamProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isSafeInteger(teamId) || teamId <= 0) notFound();
  const profile = await getPublicTeamProfile(teamId);
  if (!profile) notFound();

  const matchList = (matches: typeof profile.recentMatches, empty: string) => matches.length ? <div className="mt-4 divide-y divide-slate-100">{matches.map((match) => <div key={match.id} className="grid gap-2 py-4 first:pt-0 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-semibold text-emerald-700">{match.competition}</p><p className="mt-1 font-bold">{match.homeTeam} {match.homeScore ?? "–"} vs {match.awayScore ?? "–"} {match.awayTeam}</p></div><p className="text-sm text-slate-500">{dateTime(match.date)}{match.status === "EN VIVO" ? " · EN VIVO" : match.status === "Finalizado" ? " · Finalizado" : ""}</p></div>)}</div> : <p className="mt-4 text-sm text-slate-500">{empty}</p>;
  const displayMarketValue = (value: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

  return <div className="min-h-screen bg-slate-50 text-slate-900"><PublicHeader /><main>
    <PublicPageHeader eyebrow="Ficha del equipo" title={profile.team.name} description={profile.currentSeason ? `Información y calendario · ${profile.currentSeason.name}` : "Información, plantilla y calendario del equipo."} />
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-8 sm:py-10">
      <Link href="/public/equipos" className="inline-flex min-h-10 items-center text-sm font-bold text-emerald-700">← Volver a equipos</Link>
      <article className="flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:flex-row sm:text-left sm:p-7">
        {profile.crest ? <figure className="w-36 shrink-0"><Image src={profile.crest.imageUrl} alt={`Escudo de ${profile.team.name}`} width={144} height={144} unoptimized referrerPolicy="no-referrer" className="mx-auto h-36 w-36 object-contain" /><figcaption className="mt-2 text-center text-[10px] leading-4 text-slate-500">{profile.crest.attribution} · <a href={profile.crest.pageUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">Fuente</a> · <a href={profile.crest.licenseUrl ?? profile.crest.pageUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">{profile.crest.license}</a></figcaption></figure> : <TeamCrest name={profile.team.name} shortName={profile.team.shortName} isNational={profile.team.type === "Selección"} />}
        <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Datos del equipo</p><h2 className="mt-2 text-2xl font-black">{profile.team.name}</h2><dl className="mt-4 grid gap-3 text-left sm:grid-cols-2"><div><dt className="text-xs font-semibold text-slate-500">Ciudad</dt><dd className="font-bold">{profile.team.city || "No disponible"}</dd></div><div><dt className="text-xs font-semibold text-slate-500">País</dt><dd className="font-bold">{profile.team.country ?? "No disponible"}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Tipo</dt><dd className="font-bold">{profile.team.type || "No disponible"}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Fundación</dt><dd className="font-bold">{profile.team.foundationYear ?? "No disponible"}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Estadio</dt><dd className="font-bold">{profile.team.stadium || "No disponible"}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Aforo</dt><dd className="font-bold">{profile.team.stadiumCapacity == null ? "No disponible" : `${profile.team.stadiumCapacity.toLocaleString("es-ES")} plazas`}</dd></div></dl></div>
      </article>
      {profile.marketValue && <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-7"><p className="text-xs font-black uppercase tracking-widest text-emerald-800">Estimación propia Value90</p><h2 className="mt-2 text-xl font-black">Valor estimado de la plantilla</h2><p className="mt-1 text-sm text-slate-600">Suma de las estimaciones de los jugadores registrados para la temporada. No equivale a un precio de traspaso del equipo.</p><div className="mt-4 flex flex-wrap items-baseline gap-3"><p className="text-3xl font-black text-emerald-800">{displayMarketValue(profile.marketValue.totalEur)}</p><p className="text-sm text-slate-600">{profile.marketValue.valuedPlayers} jugadores con estimación</p>{profile.marketValue.updatedAt && <p className="text-xs text-slate-500">Actualizado {dateTime(profile.marketValue.updatedAt)}</p>}</div></article>}
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-black">Plantilla</h2><p className="mt-1 text-sm text-slate-500">{profile.currentSeason?.name ?? "Temporada activa"}</p></div><span className="text-sm text-slate-500">{profile.roster.length} jugadores</span></div>{profile.roster.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{profile.roster.map((player) => <Link key={player.playerId} href={`/public/jugadores/${player.playerId}`} className="flex min-h-14 items-center justify-between rounded-xl bg-slate-50 px-4 py-3 hover:bg-emerald-50"><span className="font-bold">{player.name}</span><span className="text-right text-xs text-slate-500">{player.shirtNumber ? `#${player.shirtNumber}` : ""}{player.position ? ` ${player.position}` : ""}</span></Link>)}</div> : <p className="mt-4 text-sm text-slate-500">No hay plantilla registrada para la temporada activa.</p>}</article>
      <div className="grid gap-6 lg:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">Próximos partidos</h2>{matchList(profile.upcomingMatches, "No hay próximos partidos registrados.")}</article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">Partidos disputados</h2>{matchList(profile.recentMatches, "No hay partidos anteriores registrados.")}</article></div>
    </section>
  </main><PublicFooter /></div>;
}
