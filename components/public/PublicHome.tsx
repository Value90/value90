import PublicHeader from "./PublicHeader";
import PublicHero from "./PublicHero";
import PublicStats from "./PublicStats";
import FeaturedPlayers from "./FeaturedPlayers";
import V90Ranking from "./V90Ranking";

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-white text-slate-900">

      <PublicHeader />

      <main>

        {/* HERO */}
        <PublicHero />

        {/* ESTADÍSTICAS GENERALES */}
        <PublicStats />

        {/* JUGADORES DESTACADOS */}
        <FeaturedPlayers />

        {/* RANKING V90 */}
        <V90Ranking />

      </main>
    </div>
  );
}