"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import AdminContent from "@/components/layout/AdminContent";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const [page, setPage] = useState("dashboard");
  const [editTeamId, setEditTeamId] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const handleEditTeam = (event: Event) => {
      const customEvent = event as CustomEvent<{ teamId: number }>;
      const teamId = customEvent.detail?.teamId;

      if (teamId === undefined || teamId === null) return;

      setEditTeamId(teamId);
      setPage("teams");
    };

    window.addEventListener("edit-team", handleEditTeam);
    return () => window.removeEventListener("edit-team", handleEditTeam);
  }, []);

  const handleEditTeamHandled = () => {
    setEditTeamId(null);
  };

  const handleLogout = async () => {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error cerrando sesión:", error);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex h-screen flex-col">
      <Header />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          page={page}
          onLogout={handleLogout}
          loggingOut={loggingOut}
          setPage={(newPage) => {
            setEditTeamId(null);
            setPage(newPage);
          }}
        />

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-100">
          <AdminContent
            page={page}
            editTeamId={editTeamId}
            onEditTeamHandled={handleEditTeamHandled}
          />
        </main>
      </div>
    </div>
  );
}
