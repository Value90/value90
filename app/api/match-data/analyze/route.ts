
import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  createRecognitionResult,
  getLearningContext,
} from "@/services/ai.feedback.service";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type RatingSource = "marca" | "as" | "sofascore" | "flashscore";
type TeamSide = "home" | "away" | "unknown";

interface ImageInput {
  source: RatingSource;
  image: string;
}

interface RosterPlayer {
  playerId: number;
  participationId: number;
  playerName: string;
  shortName: string;
  teamId: number;
  teamSide: "home" | "away";
  shirtNumber: number | null;
}

interface RequestBody {
  matchId?: number | null;
  match: {
    homeTeam: string;
    awayTeam: string;
    date: string | null;
  };
  images: ImageInput[];
  roster?: RosterPlayer[];
}

interface ExtractedRow {
  playerName: string;
  team: TeamSide;
  shirtNumber: number | null;
  rating: number | null;
  isCaptain: boolean;
  observations: string;
}

interface ResultPlayer {
  playerId: number | null;
  participationId: number | null;
  playerName: string;
  team: TeamSide;
  shirtNumber: number | null;
  marca: number | null;
  as: number | null;
  sofascore: number | null;
  flashscore: number | null;
  isCaptain: boolean;
  observations: string;
}

const sourceLabels: Record<RatingSource, string> = {
  marca: "Marca",
  as: "AS",
  sofascore: "SofaScore",
  flashscore: "FlashScore",
};

const sourceRules: Record<RatingSource, string> = {
  marca: `
La fuente es MARCA. Extrae únicamente la valoración de Marca.
Marca utiliza normalmente de 0 a 3 símbolos/estrellas.
Cuenta solo los símbolos pertenecientes a la columna o zona de valoración.
No confundas dorsal, minutos, goles, tarjetas o cualquier otro número con la valoración.
Devuelve un número entero entre 0 y 3. Si los símbolos no se distinguen con seguridad, devuelve null.
`,
  as: `
La fuente es AS. Extrae únicamente la valoración de AS.
AS utiliza una escala entera de 0 a 4.
Lee exclusivamente la columna de valoración de AS.
No confundas dorsal, minutos, goles, tarjetas u otros números con la valoración.
Devuelve un número entero entre 0 y 4. Si no se lee con seguridad, devuelve null.
`,
  sofascore: `
La fuente es SofaScore. Extrae únicamente la valoración numérica de SofaScore.
La escala válida es de 0 a 10 y puede tener un decimal.
No confundas la valoración con goles, asistencias, minutos u otras estadísticas.
Si no se lee con seguridad, devuelve null.
`,
  flashscore: `
La fuente es FlashScore. Extrae únicamente la valoración numérica de FlashScore.
La escala válida es de 0 a 10 y puede tener un decimal.
No confundas la valoración con goles, asistencias, minutos u otras estadísticas.
Si no se lee con seguridad, devuelve null.
`,
};

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    players: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          playerName: { type: "string" },
          team: {
            type: "string",
            enum: ["home", "away", "unknown"],
          },
          shirtNumber: {
            type: ["integer", "null"],
          },
          rating: {
            type: ["number", "null"],
          },
          isCaptain: {
            type: "boolean",
          },
          observations: {
            type: "string",
          },
        },
        required: [
          "playerName",
          "team",
          "shirtNumber",
          "rating",
          "isCaptain",
          "observations",
        ],
      },
    },
  },
  required: ["players"],
};

function isDataImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(value)
  );
}

function isSource(value: unknown): value is RatingSource {
  return (
    value === "marca" ||
    value === "as" ||
    value === "sofascore" ||
    value === "flashscore"
  );
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRating(
  source: RatingSource,
  value: unknown,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const limits = {
    marca: { min: 0, max: 3, decimals: 0 },
    as: { min: 0, max: 4, decimals: 0 },
    sofascore: { min: 0, max: 10, decimals: 1 },
    flashscore: { min: 0, max: 10, decimals: 1 },
  }[source];

  const clamped = Math.min(
    limits.max,
    Math.max(limits.min, value),
  );

  const factor = 10 ** limits.decimals;

  return Math.round(clamped * factor) / factor;
}

function emptyResult(player: RosterPlayer): ResultPlayer {
  return {
    playerId: player.playerId,
    participationId: player.participationId,
    playerName: player.playerName,
    team: player.teamSide,
    shirtNumber: player.shirtNumber,
    marca: null,
    as: null,
    sofascore: null,
    flashscore: null,
    isCaptain: false,
    observations: "No se ha detectado ninguna valoración.",
  };
}

function sameTeam(
  detected: ExtractedRow,
  player: RosterPlayer,
): boolean {
  return (
    detected.team === "unknown" ||
    detected.team === player.teamSide
  );
}

function findRosterPlayer(row: ExtractedRow, roster: RosterPlayer[]): RosterPlayer | undefined {
  const normalized = normalizeName(row.playerName);
  const levenshtein = (left: string, right: string) => {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
      let diagonal = previous[0]; previous[0] = i;
      for (let j = 1; j <= right.length; j += 1) {
        const above = previous[j];
        previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
        diagonal = above;
      }
    }
    return previous[right.length];
  };
  const nameScore = (value: string) => {
    const candidate = normalizeName(value);
    if (!normalized || !candidate) return 0;
    if (normalized === candidate) return 1;
    if (normalized.length >= 4 && (candidate.includes(normalized) || normalized.includes(candidate))) return 0.88;
    const leftWords = normalized.split(" ").filter((word) => word.length > 1);
    const rightWords = candidate.split(" ").filter((word) => word.length > 1);
    const tokens = leftWords.filter((word) => rightWords.includes(word)).length / Math.max(leftWords.length, rightWords.length, 1);
    const left = normalized.replace(/\s/g, "");
    const right = candidate.replace(/\s/g, "");
    return Math.max(tokens, (1 - levenshtein(left, right) / Math.max(left.length, right.length, 1)) * 0.85);
  };
  const candidates = roster.filter((player) => sameTeam(row, player)).map((player) => {
    const similarity = Math.max(nameScore(player.playerName), nameScore(player.shortName));
    const shirtMatches = row.shirtNumber !== null && player.shirtNumber === row.shirtNumber;
    return { player, similarity, score: similarity + (shirtMatches ? 0.35 : 0), shirtMatches };
  }).sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best || best.score < 0.58) return undefined;
  if (best.similarity < 0.5 && !(best.shirtMatches && best.similarity >= 0.25)) return undefined;
  if (candidates[1] && best.score - candidates[1].score < 0.12) return undefined;
  return best.player;
}

async function analyzeSource(
  source: RatingSource,
  images: ImageInput[],
  body: RequestBody,
  learningContext: string,
): Promise<ExtractedRow[]> {
  const rosterText = (body.roster ?? [])
    .map(
      (player) =>
        `${player.teamSide} | dorsal=${player.shirtNumber ?? "-"} | nombre=${player.playerName} | nombreCorto=${player.shortName}`,
    )
    .join("\n");

  const prompt = `
Eres un extractor visual de valoraciones deportivas.
Analiza SOLO las imágenes de ${sourceLabels[source]} que se adjuntan a este mensaje.
No utilices información externa y no inventes jugadores ni valoraciones.

PARTIDO: ${body.match.homeTeam} vs ${body.match.awayTeam}
FECHA: ${body.match.date ?? "desconocida"}

PLANTILLA DE REFERENCIA:
${rosterText || "No se ha proporcionado plantilla."}

CONTEXTO DE CORRECCIONES CONFIRMADAS:
${learningContext || "No hay correcciones confirmadas disponibles."}

Utiliza este contexto únicamente como ayuda para evitar errores repetidos.
No copies un valor si no aparece respaldado por la imagen actual.

${sourceRules[source]}

LECTURA DE LA CAPTURA:
- Recorre todas las filas visibles, incluidas las situadas en los bordes.
- Transcribe el nombre aunque sea parcial; no omitas una fila porque el dorsal no se lea.
- Lee la valoración desde su columna o símbolo específico.
- El equipo solo puede ser home, away o unknown.
- Marca isCaptain=true únicamente si el nombre aparece precedido por '(c)' o una marca inequívoca equivalente.
- No deduzcas el capitán por posición, brazalete u orden.
- Si una fila no se puede leer con seguridad, conserva el jugador si se identifica, pero usa rating=null.
- Devuelve una sola fila por jugador si aparece repetido en esta captura.
- No inventes filas ni valoraciones que no aparezcan en esta captura.

Devuelve exclusivamente el JSON solicitado.
`;

  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "high" }
  > = [
    {
      type: "input_text",
      text: prompt,
    },
  ];

  for (const image of images) {
    content.push({
      type: "input_image",
      image_url: image.image,
      detail: "high",
    });
  }

  const runExtraction = async (retry: boolean) => {
    const requestContent = retry
      ? [...content, { type: "input_text" as const, text: "Vuelve a revisar esta captura, prestando especial atencion a todas las filas y a la columna de valoraciones. Devuelve cada valor visible; usa null solo cuando el dato no aparezca o no se distinga." }]
      : content;
    const response = await openai.responses.create({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o",
      store: false,
      input: [{ role: "user", content: requestContent }],
      text: { format: { type: "json_schema", name: source + "_rating_extraction", strict: true, schema: extractionSchema } },
    });
    if (!response.output_text) throw new Error("El modelo no devolvio resultados para " + sourceLabels[source] + ".");
    const parsed = JSON.parse(response.output_text) as { players: ExtractedRow[] };
    return parsed.players.map((row) => ({ ...row, rating: normalizeRating(source, row.rating) }));
  };
  const firstPass = await runExtraction(false);
  return firstPass.some((row) => row.rating !== null) ? firstPass : runExtraction(true);
}

export async function POST(request: Request) {
  const analysisStartedAt = Date.now();
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "Falta configurar OPENAI_API_KEY en .env.local.",
        },
        { status: 500 },
      );
    }

    // Cliente de Supabase específico para el servidor.
    const supabase = await createServerClient();

    // Comprobamos que la petición procede de un usuario autenticado.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(
        "[match-data/analyze] Usuario no autenticado:",
        authError,
      );

      return NextResponse.json(
        {
          error: "La sesión ha expirado o el usuario no está autenticado.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as RequestBody;

    if (
      !body?.match ||
      !Array.isArray(body.images) ||
      body.images.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "La petición debe incluir el partido y al menos una imagen.",
        },
        { status: 400 },
      );
    }

    const images = body.images.filter(
      (item) =>
        item &&
        isSource(item.source) &&
        isDataImage(item.image),
    );

    if (!images.length) {
      return NextResponse.json(
        {
          error: "No se ha recibido ninguna imagen válida.",
        },
        { status: 400 },
      );
    }

    const roster = Array.isArray(body.roster)
      ? body.roster.filter(
          (player) =>
            player &&
            Number.isInteger(player.playerId) &&
            Number.isInteger(player.participationId) &&
            (player.teamSide === "home" ||
              player.teamSide === "away"),
        )
      : [];

    const grouped = (
      Object.keys(sourceLabels) as RatingSource[]
    ).reduce<Record<RatingSource, ImageInput[]>>(
      (accumulator, source) => {
        accumulator[source] = images.filter(
          (image) => image.source === source,
        );

        return accumulator;
      },
      {
        marca: [],
        as: [],
        sofascore: [],
        flashscore: [],
      },
    );

    let learningContext = "";

    try {
      learningContext = await getLearningContext(
        "ratings",
        {},
        supabase,
      );
    } catch (learningError) {
      console.error(
        "[match-data/analyze] No se pudo cargar el contexto de aprendizaje:",
        learningError,
      );
    }

    const extractedBySource = new Map<
      RatingSource,
      ExtractedRow[]
    >();

    for (const source of Object.keys(grouped) as RatingSource[]) {
      if (grouped[source].length > 0) {
        extractedBySource.set(
          source,
          (await Promise.all(
            grouped[source].map((image) => analyzeSource(
              source,
              [image],
              { ...body, roster },
              learningContext,
            )),
          )).flat(),
        );
      }
    }

    const results = roster.map(emptyResult);

    for (const [source, rows] of extractedBySource.entries()) {
      for (const row of rows) {
        const matched = findRosterPlayer(row, roster);

        if (!matched) {
          continue;
        }

        const target = results.find(
          (player) => player.playerId === matched.playerId,
        );

        if (!target) {
          continue;
        }

        const field = source as
          | "marca"
          | "as"
          | "sofascore"
          | "flashscore";

        const value = normalizeRating(source, row.rating);

        if (
          target[field] !== null &&
          value !== null &&
          target[field] !== value
        ) {
          target[field] = null;
          target.observations = `${target.observations} Contradicción detectada en ${sourceLabels[source]}.`;
        } else if (value !== null) {
          target[field] = value;
        }

        if (row.isCaptain) {
          target.isCaptain = true;
        }

        if (row.observations) {
          target.observations =
            target.observations ===
            "No se ha detectado ninguna valoración."
              ? row.observations
              : `${target.observations} ${row.observations}`;
        }
      }
    }

    const diagnostics = Object.fromEntries(
      [...extractedBySource.entries()].map(([source, rows]) => [
        source,
        {
          extractedRows: rows.length,
          ratedRows: rows.filter((row) => row.rating !== null).length,
          unmatchedPlayers: rows
            .filter((row) => !findRosterPlayer(row, roster))
            .map((row) => row.playerName || "Nombre ilegible"),
        },
      ]),
    );

    let recognitionResultId: number | null = null;

    try {
      const recognitionResult = await createRecognitionResult(
        {
          matchId: body.matchId ?? null,
          recognitionType: "ratings",
          source: "match-data-analyze",
          rawResponse: {
            extractedBySource: Object.fromEntries(
              extractedBySource,
            ),
            players: results,
            diagnostics,
          },
          requestContext: {
            match: body.match,
            imagesBySource: Object.fromEntries(
              Object.entries(grouped).map(
                ([source, sourceImages]) => [
                  source,
                  sourceImages.length,
                ],
              ),
            ),
            roster,
          },
        },
        supabase,
      );

      recognitionResultId = recognitionResult?.id ?? null;
    } catch (feedbackError) {
      console.error(
        "[match-data/analyze] No se pudo registrar el feedback:",
        feedbackError,
      );
    }

    return NextResponse.json({
      success: true,
      recognitionResultId,
      players: results,
      diagnostics,
      sourcesAnalyzed: [...extractedBySource.keys()],
      imagesAnalyzed: images.length,
      analysisDurationMs: Date.now() - analysisStartedAt,
      imagesBySource: Object.fromEntries(
        Object.entries(grouped).map(
          ([source, sourceImages]) => [
            source,
            sourceImages.length,
          ],
        ),
      ),
      rosterCount: roster.length,
      recognizedCount: results.filter(
        (player) =>
          player.marca !== null ||
          player.as !== null ||
          player.sofascore !== null ||
          player.flashscore !== null,
      ).length,
    });
  } catch (error) {
    console.error("[match-data/analyze] Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se han podido analizar las imágenes.",
      },
      { status: 500 },
    );
  }
}
