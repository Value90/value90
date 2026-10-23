export async function getPublicJson<T>(
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/public?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? "No se han podido cargar los datos públicos.");
  }
  return data as T;
}

export interface PublicFilters {
  competitions: Array<{ id: number; name: string; active?: boolean }>;
  seasons: Array<{ id: number; name: string; active: boolean }>;
  teams: Array<{ id: number; name: string; short_name?: string | null; active?: boolean }>;
  stages: Array<{ id: number; name: string; season_id: number }>;
  positions: Array<{ id: number; name: string; short_name?: string | null }>;
}

export interface PublicPageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
