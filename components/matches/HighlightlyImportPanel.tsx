"use client";

import { useCallback, useEffect, useState } from "react";
import { getPlayers, type Player } from "@/services/player.service";
import PlayerForm from "@/components/players/PlayerForm";
import { getPositions, type Position } from "@/services/position.service";

type PendingPlayer = { provider: string; external_player_key: string; source_name: string; team_id: number; match_id: number; shirt_number: number | null; is_starting_xi: boolean; position_id: number | null };

export default function HighlightlyImportPanel({ onImported }: { onImported?: () => void }) {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingPlayer[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState("");
  const [creatingFor, setCreatingFor] = useState<PendingPlayer | null>(null);

  const loadPending = useCallback(async () => {
    const response = await fetch("/api/admin/sports/pending-players", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar jugadores pendientes.");
    setPending(payload.pending ?? []);
  }, []);

  useEffect(() => {
    loadPending().catch((error) => setMessage(error instanceof Error ? error.message : "Error cargando pendientes."));
    getPlayers().then(setPlayers).catch(() => undefined);
    getPositions().then(setPositions).catch(() => undefined);
  }, [loadPending]);

  async function importFixtures() {
    setImporting(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/sports/import", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo importar el calendario.");
      if (!payload.alreadyImported) onImported?.();
      setMessage(payload.alreadyImported ? payload.message : `Importados o vinculados: ${payload.imported}. Pendientes: ${payload.skipped}. ${payload.missingTeams?.length ? `Equipos por crear/asociar: ${payload.missingTeams.join(", ")}.` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo importar el calendario.");
    } finally {
      setImporting(false);
    }
  }

  async function linkPlayer(item: PendingPlayer, playerIdOverride?: number) {
    const key = `${item.external_player_key}:${item.match_id}`;
    const playerId = playerIdOverride ?? Number(selected[key]);
    if (!playerId) return;
    setSavingKey(key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/sports/pending-players", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: item.provider, external_player_key: item.external_player_key, match_id: item.match_id, player_id: playerId, position_id: item.position_id ?? Number(selected[`${item.external_player_key}:${item.match_id}:position`]) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo vincular.");
      await loadPending();
      setMessage(`${item.source_name} vinculado; se completaron ${payload.linkedParticipations ?? 1} participación(es) y las próximas alineaciones reconocerán la ficha automáticamente.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo vincular.");
    } finally {
      setSavingKey("");
    }
  }

  async function createAndLink(item: PendingPlayer) {
    try {
      const refreshed = await getPlayers();
      setPlayers(refreshed);
      const norm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const candidates = refreshed.filter((player) => norm(player.name) === norm(item.source_name));
      if (candidates.length !== 1) throw new Error("La ficha se guardó, pero no encontré una coincidencia única. Selecciónala manualmente en la lista.");
      setSelected((current) => ({ ...current, [`${item.external_player_key}:${item.match_id}`]: String(candidates[0].id) }));
      setCreatingFor(null);
      await linkPlayer(item, candidates[0].id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo vincular la ficha creada.");
    }
  }

  return <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="font-semibold text-slate-900">Calendario automático</h2><p className="mt-1 text-sm text-slate-600">Importa LaLiga (jornadas 11–14) y Champions League (jornadas 4–5) de noviembre de 2026.</p></div>
      <button type="button" onClick={importFixtures} disabled={importing} className="min-h-11 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{importing ? "Importando…" : "Importar calendario"}</button>
    </div>
    {message && <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
    {pending.length > 0 && <div className="mt-5 border-t border-slate-200 pt-4"><h3 className="font-semibold text-amber-900">Jugadores por identificar ({pending.length})</h3><p className="mt-1 text-sm text-slate-600">Crea la ficha si aún no existe y después selecciónala para completar la participación.</p><ul className="mt-3 space-y-3">{pending.map((item) => {
      const key = `${item.external_player_key}:${item.match_id}`;
      const positionKey = `${key}:position`;
      return <li key={key} className="rounded-lg bg-amber-50 p-3"><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,1fr)_minmax(11rem,1fr)_auto_auto] sm:items-center"><div className="min-w-0"><p className="truncate font-medium text-slate-900">{item.source_name}{item.shirt_number ? ` · #${item.shirt_number}` : ""}</p><p className="text-xs text-slate-600">{item.is_starting_xi ? "Titular" : "Suplente"} · partido {item.match_id}</p></div>{!item.position_id && <select aria-label={`Posición de ${item.source_name}`} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm" value={selected[positionKey] ?? ""} onChange={(event) => setSelected((current) => ({ ...current, [positionKey]: event.target.value }))}><option value="">Selecciona posición</option>{positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}</select>}<select aria-label={`Asociar ${item.source_name}`} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm" value={selected[key] ?? ""} onChange={(event) => setSelected((current) => ({ ...current, [key]: event.target.value }))}><option value="">Selecciona ficha existente</option>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select><button type="button" onClick={() => linkPlayer(item)} disabled={!selected[key] || (!item.position_id && !selected[positionKey]) || savingKey === key} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-medium disabled:opacity-50">{savingKey === key ? "Guardando…" : "Vincular"}</button><button type="button" onClick={() => setCreatingFor(item)} className="min-h-11 rounded-md border border-amber-300 px-3 text-sm font-medium text-amber-950">Crear ficha</button></div>{creatingFor?.match_id === item.match_id && creatingFor.external_player_key === item.external_player_key && <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3"><p className="mb-2 text-sm text-slate-600">Completa manualmente los datos que no aporte la alineación y guarda la ficha para asignarla al partido.</p><PlayerForm onCancel={() => setCreatingFor(null)} onSaved={() => createAndLink(item)} /></div>}</li>;
    })}</ul></div>}
  </section>;
}
