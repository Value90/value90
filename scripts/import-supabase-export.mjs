import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const repoRoot = process.cwd();
const exportDir = path.resolve(
  process.argv[2] ??
    "C:/Users/josep/Documents/Codex/value90-supabase-export-gaczjchabakggaufnajt-2026-11-01T10-33-00-484Z",
);

function readLocalEnv(filePath) {
  return fs.readFile(filePath, "utf8").then((contents) => {
    const parsed = {};
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || match[1].startsWith("#")) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      parsed[match[1]] = value;
    }
    return parsed;
  });
}

const migrationEnvPath = path.join(repoRoot, ".env.migration.local");
let localEnv = {};
try {
  localEnv = await readLocalEnv(migrationEnvPath);
} catch {
  // Environment variables may be supplied by the caller instead.
}

const supabaseUrl = process.env.TARGET_SUPABASE_URL ?? localEnv.TARGET_SUPABASE_URL;
const serviceKey =
  process.env.TARGET_SUPABASE_SECRET_KEY ??
  localEnv.TARGET_SUPABASE_SECRET_KEY ??
  process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY ??
  localEnv.TARGET_SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error("Falta TARGET_SUPABASE_URL o la clave secreta de servidor (sb_secret/service_role) en .env.migration.local.");
}
if (serviceKey.startsWith("sb_publishable_")) {
  throw new Error("La clave configurada es publishable y solo permite acceso público. Usa la clave server-side sb_secret o service_role del proyecto nuevo.");
}
if (supabaseUrl.includes("gaczjchabakggaufnajt")) {
  throw new Error("Por seguridad, el importador no permite escribir en el proyecto antiguo de origen.");
}

const manifest = JSON.parse(await fs.readFile(path.join(exportDir, "manifest.json"), "utf8"));
if (manifest.sourceProjectRef !== "gaczjchabakggaufnajt" || manifest.readOnly !== true) {
  throw new Error("La exportación no coincide con la instantánea de recuperación validada de Value90.");
}
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Parent relations first; preserve primary keys so all historical references remain stable.
const importOrder = [
  "countries",
  "seasons",
  "positions",
  "competitions",
  "competition_weights",
  "rival_weights",
  "participation_weights",
  "teams",
  "players",
  "stages",
  "hist_team_competitions",
  "hist_player_teams",
  "matches",
  "participations",
  "match_ratings",
  "player_match_stats",
  "fact_player_v90_match",
];

for (const tableName of importOrder) {
  const tableManifest = manifest.tables.find((table) => table.table === tableName);
  if (
    !tableManifest ||
    ![200, 206].includes(tableManifest.httpStatus) ||
    tableManifest.complete !== true ||
    tableManifest.rowsVisibleAccordingToRange !== tableManifest.rowsFetched
  ) {
    throw new Error(`No se pudo validar el recuento de origen para ${tableName}.`);
  }

  const rows = JSON.parse(await fs.readFile(path.join(exportDir, `${tableName}.json`), "utf8"));
  if (!Array.isArray(rows) || rows.length !== tableManifest.rowsFetched) {
    throw new Error(`El archivo ${tableName}.json no coincide con el manifiesto.`);
  }

  for (let offset = 0; offset < rows.length; offset += 200) {
    const batch = rows.slice(offset, offset + 200);
    const { error } = await supabase.from(tableName).upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`Importación detenida en ${tableName} (${offset}): ${error.message}`);
  }

  const { count, error } = await supabase.from(tableName).select("id", { count: "exact", head: true });
  if (error) throw new Error(`No se pudo verificar ${tableName}: ${error.message}`);
  if (count !== rows.length) {
    throw new Error(`Recuento distinto en ${tableName}: esperado ${rows.length}, encontrado ${count}.`);
  }
  console.log(`${tableName}: ${count}/${rows.length} filas importadas y verificadas`);
}

console.log("Importación de las 17 relaciones de datos finalizada. Ejecuta la migración post-import de secuencias en SQL Editor.");
