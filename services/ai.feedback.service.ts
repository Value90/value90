
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cliente utilizado desde el navegador.
const supabase = createClient();

export type RecognitionType = "participations" | "ratings";

export type RecognitionCorrectionType =
  | "player_identification"
  | "participation_status"
  | "substitute_in_minute"
  | "substitute_out_minute"
  | "captain"
  | "rating"
  | "other";

export type RecognitionCorrectionStatus =
  | "pending"
  | "confirmed"
  | "rejected";

export interface CreateRecognitionResultInput {
  matchId?: number | null;
  recognitionType: RecognitionType;
  source?: string | null;
  imageReference?: string | null;
  rawResponse?: unknown;
  requestContext?: unknown;
}

export interface CreateRecognitionCorrectionInput {
  resultId?: number | null;
  matchId?: number | null;
  playerId?: number | null;
  participationId?: number | null;
  fieldName: string;
  detectedValue?: unknown;
  correctedValue?: unknown;
  correctionType: RecognitionCorrectionType;
  confidence?: number | null;
  status?: RecognitionCorrectionStatus;
  createdBy?: string | null;
}

interface ConfirmedCorrection {
  id: number;
  result_id: number | null;
  match_id: number | null;
  player_id: number | null;
  participation_id: number | null;
  field_name: string;
  detected_value: unknown;
  corrected_value: unknown;
  correction_type: RecognitionCorrectionType;
  confidence: number | null;
  created_at: string;
}

export interface RecognitionAccuracyMetric {
  recognitionType: RecognitionType;
  fieldName: string;
  reviewed: number;
  correct: number;
  accuracy: number;
}

function isMissingResultRelation(error: {
  code?: string;
  message?: string;
}) {
  return (
    error.code === "PGRST200" ||
    error.code === "PGRST201" ||
    error.message?.includes("Could not find a relationship") === true
  );
}

function resultRow(input: CreateRecognitionResultInput) {
  return {
    match_id: input.matchId ?? null,
    recognition_type: input.recognitionType,
    source: input.source ?? null,
    image_reference: input.imageReference ?? null,
    raw_response: input.rawResponse ?? null,
    request_context: input.requestContext ?? null,
  };
}

function correctionRow(input: CreateRecognitionCorrectionInput) {
  return {
    result_id: input.resultId ?? null,
    match_id: input.matchId ?? null,
    player_id: input.playerId ?? null,
    participation_id: input.participationId ?? null,
    field_name: input.fieldName,
    detected_value: input.detectedValue ?? null,
    corrected_value: input.correctedValue ?? null,
    correction_type: input.correctionType,
    confidence: input.confidence ?? null,
    status: input.status ?? "pending",
    created_by: input.createdBy ?? null,
  };
}

export async function createRecognitionResult(
  input: CreateRecognitionResultInput,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("ai_recognition_results")
    .insert(resultRow(input))
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Error registrando resultado de reconocimiento: ${error.message}`,
    );
  }

  return data;
}

export async function recordRecognitionCorrection(
  input: CreateRecognitionCorrectionInput,
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("ai_recognition_corrections")
    .insert(correctionRow(input))
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Error registrando corrección de reconocimiento: ${error.message}`,
    );
  }

  return data;
}

export async function recordRecognitionCorrectionsBatch(
  inputs: CreateRecognitionCorrectionInput[],
  client: SupabaseClient = supabase,
) {
  if (inputs.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("ai_recognition_corrections")
    .insert(inputs.map(correctionRow))
    .select("*");

  if (error) {
    throw new Error(
      `Error registrando correcciones de reconocimiento: ${error.message}`,
    );
  }

  return data ?? [];
}

export async function updateRecognitionCorrectionStatus(
  correctionId: number,
  status: "confirmed" | "rejected",
  client: SupabaseClient = supabase,
) {
  const { data, error } = await client
    .from("ai_recognition_corrections")
    .update({
      status,
      confirmed_at:
        status === "confirmed"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", correctionId)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      `Error actualizando el estado de la corrección: ${error.message}`,
    );
  }

  return data;
}

export async function getConfirmedRecognitionCorrections(
  fieldName?: string,
  client: SupabaseClient = supabase,
) {
  let query = client
    .from("ai_recognition_corrections")
    .select("*")
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  if (fieldName) {
    query = query.eq("field_name", fieldName);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Error obteniendo correcciones confirmadas: ${error.message}`,
    );
  }

  return data ?? [];
}

/**
 * Recupera correcciones confirmadas del tipo de reconocimiento solicitado
 * y las convierte en un contexto breve para incluirlo en el prompt de la IA.
 *
 * Esto no reentrena el modelo: aporta ejemplos confirmados en cada análisis.
 */
export async function getLearningContext(
  recognitionType: RecognitionType,
  options: {
    limit?: number;
    maxCharacters?: number;
  } = {},
  client: SupabaseClient = supabase,
): Promise<string> {
  const limit = Math.min(
    Math.max(options.limit ?? 30, 1),
    100,
  );

  const maxCharacters = Math.min(
    Math.max(options.maxCharacters ?? 8_000, 500),
    20_000,
  );

  const { data: joinedCorrections, error: joinError } = await client
    .from("ai_recognition_corrections")
    .select(
      "id,result_id,match_id,player_id,participation_id,field_name,detected_value,corrected_value,correction_type,confidence,created_at,result:ai_recognition_results!inner(recognition_type)",
    )
    .eq("status", "confirmed")
    .eq("result.recognition_type", recognitionType)
    .order("created_at", { ascending: false })
    .limit(limit);

  let corrections: ConfirmedCorrection[];

  if (!joinError) {
    corrections = (joinedCorrections ?? []) as ConfirmedCorrection[];
  } else if (isMissingResultRelation(joinError)) {
    // Keep the established behavior for projects without an exposed FK relation.
    const { data: results, error: resultsError } = await client
      .from("ai_recognition_results")
      .select("id")
      .eq("recognition_type", recognitionType);

    if (resultsError) {
      throw new Error(
        `Error obteniendo resultados de aprendizaje: ${resultsError.message}`,
      );
    }

    const resultIds = (results ?? [])
      .map((item: { id: number }) => item.id)
      .filter((id: number) => Number.isInteger(id));

    if (resultIds.length === 0) return "";

    const { data: fallbackCorrections, error: correctionsError } = await client
      .from("ai_recognition_corrections")
      .select(
        "id,result_id,match_id,player_id,participation_id,field_name,detected_value,corrected_value,correction_type,confidence,created_at",
      )
      .eq("status", "confirmed")
      .in("result_id", resultIds)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (correctionsError) {
      throw new Error(
        `Error obteniendo correcciones de aprendizaje: ${correctionsError.message}`,
      );
    }

    corrections = (fallbackCorrections ?? []) as ConfirmedCorrection[];
  } else {
    throw new Error(
      `Error obteniendo correcciones de aprendizaje: ${joinError.message}`,
    );
  }

  const safeCorrections = corrections;

  if (safeCorrections.length === 0) {
    return "";
  }

  const lines = safeCorrections.map((correction, index) => {
    const detected = JSON.stringify(
      correction.detected_value,
    );

    const corrected = JSON.stringify(
      correction.corrected_value,
    );

    return `${index + 1}. campo=${correction.field_name}; tipo=${correction.correction_type}; jugador=${correction.player_id ?? "-"}; participacion=${correction.participation_id ?? "-"}; detectado=${detected}; corregido=${corrected}; confianza=${correction.confidence ?? "-"}`;
  });

  return lines.join("\n").slice(0, maxCharacters);
}

/**
 * Calcula el acierto observado en las últimas revisiones confirmadas.
 * Una revisión se considera correcta cuando el valor detectado coincide
 * con el valor final guardado por la persona.
 */
export async function getRecognitionAccuracySummary(
  client: SupabaseClient = supabase,
): Promise<RecognitionAccuracyMetric[]> {
  const sampleLimit = 500;
  const { data, error } = await client
    .from("ai_recognition_corrections")
    .select(
      "field_name,detected_value,corrected_value,result:ai_recognition_results!inner(recognition_type)",
    )
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(sampleLimit * 2);

  let rows: Array<{
    field_name: string;
    detected_value: unknown;
    corrected_value: unknown;
    recognition_type: RecognitionType;
  }>;

  if (!error) {
    rows = (data ?? []).map((row: any) => ({
      field_name: row.field_name,
      detected_value: row.detected_value,
      corrected_value: row.corrected_value,
      recognition_type: Array.isArray(row.result)
        ? row.result[0]?.recognition_type
        : row.result?.recognition_type,
    })).filter((row: any) =>
      row.recognition_type === "participations" ||
      row.recognition_type === "ratings"
    );
  } else if (isMissingResultRelation(error)) {
    rows = [];

    for (const recognitionType of ["participations", "ratings"] as const) {
      const { data: results, error: resultsError } = await client
        .from("ai_recognition_results")
        .select("id")
        .eq("recognition_type", recognitionType)
        .order("id", { ascending: false })
        .limit(sampleLimit);

      if (resultsError) {
        throw new Error(`Error obteniendo resultados de IA: ${resultsError.message}`);
      }

      const resultIds = (results ?? []).map((result) => result.id);
      if (resultIds.length === 0) continue;

      const { data: corrections, error: correctionsError } = await client
        .from("ai_recognition_corrections")
        .select("field_name,detected_value,corrected_value,result_id")
        .eq("status", "confirmed")
        .in("result_id", resultIds)
        .order("created_at", { ascending: false })
        .limit(sampleLimit);

      if (correctionsError) {
        throw new Error(`Error obteniendo revisiones de IA: ${correctionsError.message}`);
      }

      rows.push(...(corrections ?? []).map((row) => ({
        field_name: row.field_name,
        detected_value: row.detected_value,
        corrected_value: row.corrected_value,
        recognition_type: recognitionType,
      })));
    }
  } else {
    throw new Error(`Error calculando el acierto observado: ${error.message}`);
  }

  const groups = new Map<string, RecognitionAccuracyMetric>();
  for (const row of rows) {
    // Count one captain review per team: only the manually confirmed captain
    // is a denominator case; other players' false flags must not inflate it.
    if (row.recognition_type === "participations" && row.field_name === "captain") {
      if (row.corrected_value !== true) continue;
    }
    const key = `${row.recognition_type}:${row.field_name}`;
    const metric = groups.get(key) ?? {
      recognitionType: row.recognition_type,
      fieldName: row.field_name,
      reviewed: 0,
      correct: 0,
      accuracy: 0,
    };
    metric.reviewed += 1;
    const isCorrect =
      row.recognition_type === "participations" && row.field_name === "captain"
        ? row.detected_value === true
        : JSON.stringify(row.detected_value) === JSON.stringify(row.corrected_value);
    if (isCorrect) {
      metric.correct += 1;
    }
    metric.accuracy = Math.round((metric.correct / metric.reviewed) * 100);
    groups.set(key, metric);
  }

  return [...groups.values()].sort((a, b) =>
    a.recognitionType.localeCompare(b.recognitionType) ||
    a.fieldName.localeCompare(b.fieldName)
  );
}
