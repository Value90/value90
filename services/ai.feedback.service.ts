
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

  // COMPROBACIÓN PROVISIONAL DE SESIÓN
  const {
    data: { user },
    error: sessionError,
  } = await client.auth.getUser();

  console.log(
    "Usuario de Supabase:",
    user?.id ?? "SIN SESIÓN",
  );

  console.log(
    "Error de sesión:",
    sessionError,
  );

  if (!user) {
    console.warn(
      "No se ha detectado un usuario autenticado al guardar las correcciones.",
    );
  }

  const { data, error } = await client
    .from("ai_recognition_corrections")
    .insert(inputs.map(correctionRow))
    .select("*");

  if (error) {
    console.error(
      "Error original de Supabase al guardar correcciones:",
      error,
    );

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

  if (resultIds.length === 0) {
    return "";
  }

  const { data: corrections, error: correctionsError } = await client
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

  const safeCorrections =
    (corrections ?? []) as ConfirmedCorrection[];

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