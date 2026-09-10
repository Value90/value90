"use client";

import { useEffect, useState } from "react";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(null);

    getTeams()
      .then((data) => {
        if (!mounted) {
          return;
        }

        setTeams(data);
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }

        console.error(
          "Error cargando equipos:",
          err
        );

        setError(err);
      })
      .finally(() => {
        if (!mounted) {
          return;
        }

        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    teams,
    loading,
    error,
  };
}