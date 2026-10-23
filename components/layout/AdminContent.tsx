
import dynamic from "next/dynamic";

function AdminPageLoading() {
  return (
    <div
      className="p-4 text-sm text-slate-500 sm:p-6"
      role="status"
      aria-live="polite"
    >
      Cargando sección...
    </div>
  );
}

const Dashboard = dynamic(
  () => import("@/components/layout/Dashboard"),
  { loading: AdminPageLoading },
);
const CountriesPage = dynamic(
  () => import("@/components/countries/CountriesPage"),
  { loading: AdminPageLoading },
);
const CompetitionsPage = dynamic(
  () => import("@/components/competitions/CompetitionsPage"),
  { loading: AdminPageLoading },
);
const TeamsPage = dynamic(
  () => import("@/components/teams/TeamsPage"),
  { loading: AdminPageLoading },
);
const HistPlayerTeamPage = dynamic(
  () => import("@/components/hist-player-teams/HistPlayerTeamPage"),
  { loading: AdminPageLoading },
);
const PlayersPage = dynamic(
  () => import("@/components/players/PlayersPage"),
  { loading: AdminPageLoading },
);
const PositionsPage = dynamic(
  () => import("@/components/positions/PositionsPage"),
  { loading: AdminPageLoading },
);
const MatchesPage = dynamic(
  () => import("@/components/matches/MatchesPage"),
  { loading: AdminPageLoading },
);
const SeasonsPage = dynamic(
  () => import("@/components/seasons/SeasonsPage"),
  { loading: AdminPageLoading },
);
const StagesPage = dynamic(
  () => import("@/components/stages/StagesPage"),
  { loading: AdminPageLoading },
);
const ParticipationsPage = dynamic(
  () => import("@/components/participations/ParticipationsPage"),
  { loading: AdminPageLoading },
);
const PlayerMatchStatsPage = dynamic(
  () => import("@/components/player-match-stats/PlayerMatchStatsPage"),
  { loading: AdminPageLoading },
);
const MatchRatingsPage = dynamic(
  () => import("@/components/match-ratings/MatchRatingsPage"),
  { loading: AdminPageLoading },
);
const MatchDataPage = dynamic(
  () => import("@/components/match-data/MatchDataPage"),
  { loading: AdminPageLoading },
);
const DatosV90Page = dynamic(
  () => import("@/components/dashboard/DatosV90Page"),
  { loading: AdminPageLoading },
);
const ProgresoPage = dynamic(
  () => import("@/components/dashboard/ProgresoPage"),
  { loading: AdminPageLoading },
);
const RankingsPage = dynamic(
  () => import("@/components/rankings/RankingsPage"),
  { loading: AdminPageLoading },
);
const MarketPage = dynamic(
  () => import("@/components/market/MarketPage"),
  { loading: AdminPageLoading },
);

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

    case "matches":
      return <MatchesPage />;

    case "participations":
      return <ParticipationsPage />;

    case "player-match-stats":
      return <PlayerMatchStatsPage />;

    case "match-ratings":
      return <MatchRatingsPage />;

    case "match-data":
      return <MatchDataPage />;

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
      return <MarketPage />;

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

    case "stages":
      return <StagesPage />;

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
        <div className="w-full min-w-0 p-3 sm:p-5 md:p-8">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
            Configuración
          </h1>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
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
