import Dashboard from "@/components/layout/Dashboard";

import CountriesPage from "@/components/countries/CountriesPage";
import CompetitionsPage from "@/components/competitions/CompetitionsPage";
import TeamsPage from "@/components/teams/TeamsPage";
import HistPlayerTeamPage from "@/components/hist-player-teams/HistPlayerTeamPage";
import PlayersPage from "@/components/players/PlayersPage";
import PositionsPage from "@/components/positions/PositionsPage";

import MatchesPage from "@/components/matches/MatchesPage";
import SeasonsPage from "@/components/seasons/SeasonsPage";
import StagesPage from "@/components/stages/StagesPage";

import ParticipationsPage from "@/components/participations/ParticipationsPage";
import PlayerMatchStatsPage from "@/components/player-match-stats/PlayerMatchStatsPage";
import MatchRatingsPage from "@/components/match-ratings/MatchRatingsPage";

import DatosV90Page from "@/components/dashboard/DatosV90Page";
import ProgresoPage from "@/components/dashboard/ProgresoPage";
import RankingsPage from "@/components/rankings/RankingsPage";

interface AdminContentProps {
  page: string;
  editTeamId?: number | null;
  onEditTeamHandled?: () => void;
}

export default function AdminContent({
  page,
  editTeamId = null,
  onEditTeamHandled,
}: AdminContentProps) {
  switch (page) {
    /*
     * ============================================================
     * DATOS DEPORTIVOS
     * ============================================================
     */

    case "stages":
      return <StagesPage />;

    case "matches":
      return <MatchesPage />;

    case "participations":
      return <ParticipationsPage />;

    case "player-match-stats":
      return <PlayerMatchStatsPage />;

    case "match-ratings":
      return <MatchRatingsPage />;

    /*
     * ============================================================
     * DATOS V90
     * ============================================================
     */

    case "datos-v90":
      return <DatosV90Page />;

    case "progreso":
      return <ProgresoPage />;

    /*
     * ============================================================
     * RANKINGS
     * ============================================================
     */

    case "rankings":
      return <RankingsPage />;

    /*
     * ============================================================
     * MERCADO
     * ============================================================
     */

    case "market":
      return (
        <div className="w-full p-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Mercado
          </h1>

          <p className="mt-2 text-slate-600">
            Esta sección se desarrollará cuando
            el motor V90 disponga de datos suficientes
            para generar valores de mercado.
          </p>
        </div>
      );

    /*
     * ============================================================
     * DATOS MAESTROS
     * ============================================================
     */

    case "players":
      return <PlayersPage />;

    case "teams":
      return (
        <TeamsPage
          editTeamId={editTeamId}
          onEditTeamHandled={onEditTeamHandled}
        />
      );

    case "hist-player-teams":
      return <HistPlayerTeamPage />;

    case "countries":
      return <CountriesPage />;

    case "competitions":
      return <CompetitionsPage />;

    case "seasons":
      return <SeasonsPage />;

    case "positions":
      return <PositionsPage />;

    /*
     * ============================================================
     * CONFIGURACIÓN
     * ============================================================
     */

    case "settings":
      return (
        <div className="w-full p-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Configuración
          </h1>

          <p className="mt-2 text-slate-600">
            Configuración general del panel de administración.
          </p>
        </div>
      );

    /*
     * ============================================================
     * DASHBOARD
     * ============================================================
     */

    case "dashboard":
    default:
      return <Dashboard />;
  }
}