import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import PublicPageHeader from "@/components/public/PublicPageHeader";
import PlayerSeasonRatings from "@/components/public/PlayerSeasonRatings";
import PlayerAvatar from "@/components/public/PlayerAvatar";
import { getPublicPlayerProfile } from "@/services/public-data.server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Ficha de jugador ${id}`, description: "Datos personales, trayectoria y valoraciones por temporada." };
}

export default async function PublicPlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isSafeInteger(playerId) || playerId <= 0) notFound();
  const profile = await getPublicPlayerProfile(playerId);
  if (!profile) notFound();
  const displayDate = (value: string | null) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "No disponible";
  const displayMarketValue = (value: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

  return <div className="min-h-screen bg-slate-50 text-slate-900"><PublicHeader /><main>
    <PublicPageHeader eyebrow="Ficha del jugador" title={profile.player.name} description={profile.currentSeason ? `Temporada actual: ${profile.currentSeason.name}` : "Consulta datos personales, trayectoria y valoraciones."} />
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-8 sm:py-10">
      <Link href="/public/jugadores" className="inline-flex min-h-10 items-center text-sm font-bold text-emerald-700">← Volver a jugadores</Link>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">Datos personales</h2><div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">{profile.photo ? <figure className="w-32 shrink-0"><Image src={profile.photo.imageUrl} alt={`Fotografía de ${profile.player.name}`} width={128} height={152} priority unoptimized referrerPolicy="no-referrer" className="h-36 w-32 rounded-2xl object-cover object-top shadow-sm" /><figcaption className="mt-2 text-[10px] leading-4 text-slate-500">Foto: {profile.photo.attribution}. <a href={profile.photo.pageUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">Fuente</a> · <a href={profile.photo.licenseUrl ?? profile.photo.pageUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">{profile.photo.license}</a></figcaption></figure> : <PlayerAvatar name={profile.player.name} size={112} />}<dl className="grid flex-1 gap-4 sm:grid-cols-2"><div><dt className="text-xs font-semibold text-slate-500">Nombre</dt><dd className="mt-1 font-bold">{profile.player.name}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Fecha de nacimiento</dt><dd className="mt-1 font-bold">{displayDate(profile.player.birthDate)}</dd></div><div><dt className="text-xs font-semibold text-slate-500">País</dt><dd className="mt-1 font-bold">{profile.player.country ?? "No disponible"}</dd></div></dl></div></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">Equipo actual</h2>{profile.currentTeam ? <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-xs font-semibold text-slate-500">Equipo</dt><dd className="mt-1 font-bold">{profile.currentTeam.name}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Posición</dt><dd className="mt-1 font-bold">{profile.currentTeam.position ?? "No disponible"}</dd></div><div><dt className="text-xs font-semibold text-slate-500">Dorsal</dt><dd className="mt-1 font-bold">{profile.currentTeam.shirtNumber ?? "No disponible"}</dd></div></dl> : <p className="mt-4 text-sm text-slate-500">No hay un equipo actual registrado.</p>}</article>
      <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-800">Estimación propia Value90</p><h2 className="mt-2 text-xl font-black">Valor de mercado orientativo</h2><p className="mt-1 text-xs text-slate-600">Rendimiento reciente, temporada actual y edad. No es un precio de traspaso.</p></div>{profile.marketValue && <p className="text-xs text-slate-500">Actualizado {displayDate(profile.marketValue.periodStart)}</p>}</div>{profile.marketValue ? <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2"><p className="text-3xl font-black text-emerald-800 sm:text-4xl">{displayMarketValue(profile.marketValue.valueEur)}</p>{profile.marketValue.changePercent != null && <p className={`text-sm font-bold ${profile.marketValue.changePercent >= 0 ? "text-emerald-800" : "text-red-700"}`}>{profile.marketValue.changePercent > 0 ? "+" : ""}{profile.marketValue.changePercent.toLocaleString("es-ES", { maximumFractionDigits: 2 })}% desde el cálculo anterior</p>}<p className="w-full text-xs text-slate-600">V90 estimado: {profile.marketValue.marketRating.toLocaleString("es-ES", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} · {profile.marketValue.eligibleMatches} partidos en la temporada</p></div> : <p className="mt-4 text-sm text-slate-600">Aún no hay una estimación disponible para este jugador.</p>}</article>
      <PlayerSeasonRatings seasons={profile.seasons} matchHistory={profile.matchHistory} currentSeasonId={profile.currentSeason?.id ?? null} />
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black">Trayectoria de equipos</h2>{profile.history.length ? <div className="mt-5 divide-y divide-slate-100">{profile.history.map((item, index) => <div key={`${item.season}-${item.team}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-4 first:pt-0 last:pb-0"><div><p className="font-bold">{item.team}{item.current ? " · Actual" : ""}</p><p className="mt-1 text-sm text-slate-500">{item.season}{item.position ? ` · ${item.position}` : ""}{item.shirtNumber != null ? ` · Dorsal ${item.shirtNumber}` : ""}</p></div><p className="text-xs text-slate-500">{item.startDate ?? ""}{item.endDate ? ` – ${item.endDate}` : ""}</p></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No hay historial registrado.</p>}</article>
    </section>
  </main><PublicFooter /></div>;
}
