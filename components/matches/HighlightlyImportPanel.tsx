"use client";

import { useCallback, useEffect, useState } from "react";
import { getPlayers, type Player } from "@/services/player.service";
import PlayerForm from "@/components/players/PlayerForm";
import { getPositions, type Position } from "@/services/position.service";

type PendingOccurrence = { match_id: number; date: string | null; fixture: string; status: string | null; is_starting_xi: boolean; minutes_played: number | null };
type Candidate = { id: number; name: string; score: number; countryId: number | null; birthDate: string | null; teamName?: string | null; shirtNumber?: number | null };
type PendingPlayer = {
  provider: string; external_player_key: string; source_name: string; team_id: number; team_name: string; season_id: number;
  shirt_number: number | null; position_id: number | null; is_starting_xi: boolean; provisional_player: Player | null;
  suggestions: Candidate[]; occurrences: PendingOccurrence[]; auto_match: { player_id: number; player_name: string; position_id: number } | null;
};
type CompetitionKey = "laliga" | "champions";
type ImportMode = "round" | "dates";
type QuotaState = { remaining: number | null; limit: number | null; checkedAt: string };

const QUOTA_STORAGE_KEY = "value90-highlightly-quota";

function madridToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function incidentKey(item: PendingPlayer) { return `${item.provider}:${item.external_player_key}`; }
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]/g, ""); }
function formatDate(value: string | null) {
  if (!value) return "Fecha pendiente";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function HighlightlyImportPanel({ onImported }: { onImported?: () => void }) {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingPlayer[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Record<string, string>>({});
  const [search, setSearch] = useState<Record<string, string>>({});
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, Candidate>>({});
  const [savingKey, setSavingKey] = useState("");
  const [creatingFor, setCreatingFor] = useState<PendingPlayer | null>(null);
  const [competition, setCompetition] = useState<CompetitionKey>("laliga");
  const [importMode, setImportMode] = useState<ImportMode>("round");
  const [round, setRound] = useState("1");
  const [startDate, setStartDate] = useState(madridToday);
  const [endDate, setEndDate] = useState(madridToday);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [checkingQuota, setCheckingQuota] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(QUOTA_STORAGE_KEY);
      if (saved) setQuota(JSON.parse(saved) as QuotaState);
    } catch {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
    }
  }, []);

  const loadPending = useCallback(async () => {
    const response = await fetch("/api/admin/sports/pending-players", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "No se pudieron cargar las incidencias.");
    let rows: PendingPlayer[] = payload.pending ?? [];
    let autoLinked = 0;
    for (const item of rows) {
      if (!item.auto_match) continue;
      const linked = await fetch("/api/admin/sports/pending-players", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: item.provider, external_player_key: item.external_player_key, player_id: item.auto_match.player_id, position_id: item.auto_match.position_id, decision: "matched_existing" }),
      });
      if (linked.ok) autoLinked += 1;
    }
    if (autoLinked) {
      const refreshed = await fetch("/api/admin/sports/pending-players", { cache: "no-store" });
      const refreshedPayload = await refreshed.json();
      if (!refreshed.ok) throw new Error(refreshedPayload.error ?? "No se pudieron actualizar las incidencias.");
      rows = refreshedPayload.pending ?? [];
      setMessage(`${autoLinked} jugador(es) se asignaron automáticamente: coincidían el nombre, el equipo y el dorsal.`);
    }
    setPending(rows);
    return autoLinked;
  }, []);

  const loadPlayers = useCallback(async () => {
    const refreshed = await getPlayers();
    setPlayers(refreshed);
  }, []);

  useEffect(() => {
    loadPending().catch((error) => setMessage(error instanceof Error ? error.message : "Error cargando incidencias."));
    loadPlayers().catch(() => undefined);
    getPositions().then(setPositions).catch(() => undefined);
  }, [loadPending, loadPlayers]);

  async function refreshQuota() {
    setCheckingQuota(true);
    try {
      const response = await fetch(`/api/admin/sports/quota?competition=${competition}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo consultar el saldo.");
      if (payload.remaining == null) throw new Error("Highlightly no informó el saldo en esta respuesta.");
      const next: QuotaState = { remaining: Number(payload.remaining), limit: payload.limit == null ? null : Number(payload.limit), checkedAt: payload.checkedAt };
      setQuota(next);
      localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo consultar el saldo de Highlightly.");
    } finally {
      setCheckingQuota(false);
    }
  }

  const estimatedCalls = importMode === "round"
    ? (competition === "laliga" ? 4 : 2)
    : Math.max(0, Math.floor((new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / 86_400_000) + 1);
  const invalidDateRange = importMode === "dates" && (!startDate || !endDate || endDate < startDate || estimatedCalls > 31);

  async function importFixtures() {
    setImporting(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/sports/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importMode === "round"
          ? { competition, mode: importMode, round: Number(round) }
          : { competition, mode: importMode, startDate, endDate }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo importar el calendario.");
      if (payload.callsRemaining != null) {
        const next: QuotaState = { remaining: Number(payload.callsRemaining), limit: payload.callsLimit == null ? quota?.limit ?? null : Number(payload.callsLimit), checkedAt: new Date().toISOString() };
        setQuota(next);
        localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(next));
      }
      onImported?.();
      const autoLinked = await loadPending();
      setMessage(`${payload.message} Partidos guardados o vinculados: ${payload.imported}. Pendientes por equipos no asociados: ${payload.skipped}. Jugadores asignados automáticamente: ${autoLinked}.${payload.missingTeams?.length ? ` Equipos por crear/asociar: ${payload.missingTeams.join(", ")}.` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo importar el calendario.");
    } finally {
      setImporting(false);
    }
  }

  async function linkPlayer(item: PendingPlayer, playerId: number, decision: "matched_existing" | "confirmed_new" | "updated_existing") {
    const key = incidentKey(item);
    const positionId = item.position_id ?? Number(selectedPosition[key]);
    if (!positionId) {
      setMessage(`Selecciona la posición de ${item.source_name} antes de confirmar.`);
      return;
    }
    setSavingKey(key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/sports/pending-players", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: item.provider, external_player_key: item.external_player_key, player_id: playerId, position_id: positionId, decision, target_team_id: decision === "updated_existing" ? item.team_id : undefined, target_season_id: decision === "updated_existing" ? item.season_id : undefined }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo resolver la incidencia.");
      await Promise.all([loadPending(), loadPlayers()]);
      onImported?.();
      setMessage(decision === "updated_existing"
        ? `${item.source_name} vinculado y ficha actualizada: ${item.team_name} · dorsal ${item.shirt_number ?? "sin dorsal"}. Se actualizaron sus participaciones y esta coincidencia se reutilizará en futuras importaciones.`
        : `${item.source_name} vinculado: ${payload.linkedParticipations ?? 0} participación(es), ${payload.rosterTeams ?? 0} plantilla(s). Esta coincidencia se reutilizará en futuras importaciones.${payload.deactivatedProvisionalPlayers ? ` Se archivó ${payload.deactivatedProvisionalPlayers} ficha provisional sin otras referencias.` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo resolver la incidencia.");
    } finally {
      setSavingKey("");
    }
  }

  async function confirmNewPlayer(item: PendingPlayer, player?: Player) {
    if (!player) {
      setMessage("No se pudo recuperar la ficha guardada; vuelve a intentarlo.");
      return;
    }
    setPlayers((current) => [...current.filter((entry) => entry.id !== player.id), player]);
    setCreatingFor(null);
    await linkPlayer(item, player.id, "confirmed_new");
  }

  return <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-semibold text-slate-900">Importar calendario</h2>
        <p className="mt-1 text-sm text-slate-600">Elige la competición y carga una jornada o un periodo de fechas.</p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <button type="button" onClick={refreshQuota} disabled={checkingQuota || importing} className="min-h-11 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60 sm:w-auto">{checkingQuota ? "Consultando saldo…" : "Actualizar saldo"}</button>
        <button type="button" onClick={importFixtures} disabled={importing || invalidDateRange} className="min-h-11 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto">{importing ? "Importando…" : "Importar partidos"}</button>
      </div>
    </div>

    <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 sm:p-4">
      <label className="block min-w-0">
        <span className="mb-1 block text-sm font-medium text-slate-700">Competición</span>
        <select value={competition} onChange={(event) => setCompetition(event.target.value as CompetitionKey)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
          <option value="laliga">LaLiga</option>
          <option value="champions">Champions League</option>
        </select>
      </label>
      <label className="block min-w-0">
        <span className="mb-1 block text-sm font-medium text-slate-700">Qué quieres importar</span>
        <select value={importMode} onChange={(event) => setImportMode(event.target.value as ImportMode)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">
          <option value="round">Una jornada / fase</option>
          <option value="dates">Periodo de fechas</option>
        </select>
      </label>
      {importMode === "round" ? <label className="block min-w-0 sm:col-span-2">
        <span className="mb-1 block text-sm font-medium text-slate-700">Jornada</span>
        <select value={round} onChange={(event) => setRound(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-sm">
          {Array.from({ length: competition === "laliga" ? 38 : 8 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{competition === "champions" ? `League stage · Jornada ${value}` : `Jornada ${value}`}</option>)}
        </select>
      </label> : <>
        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-medium text-slate-700">Desde</span>
          <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm" />
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-medium text-slate-700">Hasta</span>
          <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm" />
        </label>
        {invalidDateRange && <p className="text-sm text-red-700 sm:col-span-2">El intervalo debe ser válido y no superar 31 días.</p>}
      </>}
      <div className="flex flex-col justify-center gap-1 text-sm text-slate-600 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p>{importMode === "round" ? "Estimación aproximada" : "Estimación"}: <strong className="text-slate-900">{estimatedCalls} llamada(s)</strong> a Highlightly para consultar estos partidos.</p>
        <p>Saldo de la cuenta: <strong className="text-slate-900">{quota?.remaining ?? "Sin consultar"}{quota?.limit != null ? ` / ${quota.limit}` : ""}</strong>{quota?.checkedAt ? ` · última lectura ${new Date(quota.checkedAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}` : ""}</p>
      </div>
      <p className="text-xs text-slate-500 sm:col-span-2">Por jornada, Highlightly no ofrece un filtro directo: se consulta el calendario de la competición y se extrae esa jornada (aprox. 4 llamadas para LaLiga y 2 para Champions). Por fechas, se realiza una llamada por día. Actualizar el saldo también consume 1 llamada; el contador muestra el saldo de la última respuesta de Highlightly.</p>
    </div>
    {message && <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}

    {pending.length > 0 && <div className="mt-5 border-t border-slate-200 pt-4">
      <h3 className="font-semibold text-amber-900">Incidencias de jugadores ({pending.length})</h3>
      <p className="mt-1 text-sm text-slate-600">No se crean jugadores automáticamente. Revisa las coincidencias propuestas; al resolver una incidencia, esa referencia se recordará para próximas importaciones.</p>
      <ul className="mt-3 space-y-4">{pending.map((item) => {
        const key = incidentKey(item);
        const isSaving = savingKey === key;
        const isEditing = creatingFor != null && incidentKey(creatingFor) === key;
        const query = normalize(search[key] ?? "");
        const searchedPlayers = query ? players.filter((player) => player.id !== item.provisional_player?.id && normalize(player.name).includes(query)).slice(0, 8) : [];
        return <li key={key} className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><p className="font-semibold text-slate-900">{item.source_name}{item.shirt_number ? ` · #${item.shirt_number}` : ""}</p><p className="mt-1 text-sm text-slate-600">{item.team_name} · {item.occurrences.length} partido(s)</p></div>
            {item.provisional_player && <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-900">Ficha provisional por revisar</span>}
          </div>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">{item.occurrences.map((occurrence) => <li key={occurrence.match_id}>{formatDate(occurrence.date)} · {occurrence.fixture} · {occurrence.is_starting_xi ? "Titular" : occurrence.minutes_played != null && occurrence.minutes_played > 0 ? `${occurrence.minutes_played} min` : "Suplente"}</li>)}</ul>
          {!item.position_id && <label className="mt-3 block max-w-sm"><span className="mb-1 block text-xs font-semibold text-slate-700">Posición necesaria</span><select aria-label={`Posición de ${item.source_name}`} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={selectedPosition[key] ?? ""} onChange={(event) => setSelectedPosition((current) => ({ ...current, [key]: event.target.value }))}><option value="">Selecciona posición</option>{positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}</select></label>}

          <div className="mt-4 rounded-lg border border-white/80 bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Posibles coincidencias de nombre · orientativas</p>
            {item.suggestions.length ? <div className="mt-2 flex flex-wrap gap-2">{item.suggestions.map((candidate) => <button key={candidate.id} type="button" onClick={() => setSelectedCandidates((current) => ({ ...current, [key]: candidate }))} disabled={isSaving} aria-pressed={selectedCandidates[key]?.id === candidate.id} className={`min-h-10 rounded-lg border px-3 py-2 text-left text-sm font-medium disabled:opacity-50 ${selectedCandidates[key]?.id === candidate.id ? "border-emerald-600 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}><span>{candidate.name}</span><span className="ml-2 text-xs text-emerald-800">{candidate.score}%</span></button>)}</div> : <p className="mt-2 text-sm text-slate-500">No hay coincidencias claras; busca manualmente o confirma una ficha nueva.</p>}
            <label className="mt-3 block"><span className="mb-1 block text-xs font-semibold text-slate-600">Buscar en las fichas existentes</span><input value={search[key] ?? ""} onChange={(event) => setSearch((current) => ({ ...current, [key]: event.target.value }))} placeholder="Escribe el nombre del jugador" className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
            {searchedPlayers.length > 0 && <div className="mt-2 grid gap-2 sm:grid-cols-2">{searchedPlayers.map((player) => <button key={player.id} type="button" onClick={() => setSelectedCandidates((current) => ({ ...current, [key]: item.suggestions.find((candidate) => candidate.id === player.id) ?? { id: player.id, name: player.name, score: 0, countryId: null, birthDate: null } }))} disabled={isSaving} aria-pressed={selectedCandidates[key]?.id === player.id} className={`min-h-10 rounded-lg border px-3 py-2 text-left text-sm font-medium disabled:opacity-50 ${selectedCandidates[key]?.id === player.id ? "border-emerald-600 bg-emerald-100" : "border-slate-200 hover:border-emerald-400"}`}>{player.name}</button>)}</div>}
            {selectedCandidates[key] && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"><p className="font-semibold">Ficha seleccionada: {selectedCandidates[key].name}</p><p className="mt-1">En Value90: {selectedCandidates[key].teamName ?? "equipo actual no disponible"}{selectedCandidates[key].shirtNumber != null ? ` · dorsal ${selectedCandidates[key].shirtNumber}` : " · dorsal no disponible"}</p><p>En la incidencia: {item.team_name}{item.shirt_number != null ? ` · dorsal ${item.shirt_number}` : " · dorsal no identificado"}</p><p className="mt-1 text-xs">Al actualizar, se aplicarán el equipo y dorsal reconocidos en la incidencia y se asociarán las participaciones a esta ficha.</p></div>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setCreatingFor(isEditing ? null : item)} disabled={isSaving} className="min-h-11 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-50">{isEditing ? "Cerrar ficha" : item.provisional_player ? "Revisar ficha y confirmar como nuevo" : "Revisar ficha y guardar como nuevo"}</button>{selectedCandidates[key] && <button type="button" onClick={() => linkPlayer(item, selectedCandidates[key].id, "updated_existing")} disabled={isSaving || (!item.position_id && !selectedPosition[key])} className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Actualizar ficha</button>}{isSaving && <span className="self-center text-sm text-slate-600">Guardando vínculo…</span>}</div>
          {isEditing && <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3"><p className="mb-3 text-sm text-slate-600">Completa o corrige los datos de la ficha. Al guardar, el jugador se asociará a esta plantilla y a las participaciones que correspondan.</p><PlayerForm key={item.provisional_player?.id ?? key} player={item.provisional_player ?? undefined} onCancel={() => setCreatingFor(null)} onSaved={(savedPlayer) => confirmNewPlayer(item, savedPlayer)} /></div>}
        </li>;
      })}</ul>
    </div>}
    {!pending.length && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">No hay incidencias de jugadores pendientes.</p>}
  </section>;
}
