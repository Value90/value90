import { NextResponse } from "next/server";
import {
  createRecognitionResult,
  getLearningContext,
} from "@/services/ai.feedback.service";
import { createClient as createServerClient } from "@/lib/supabase/server";

interface RosterPlayer {
  playerId: number;
  playerName: string;
  shortName: string;
  teamId: number;
  teamSide: "home" | "away";
  shirtNumber: number | null;
}

interface AnalyzeRequest {
  matchId?: number | null;
  image?: string;
  matchDuration?: number;
  homeTeamName?: string;
  awayTeamName?: string;
  roster?: RosterPlayer[];
}

interface OpenAIResponsePayload {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{ type?: unknown; text?: unknown }>;
  }>;
}

function extractOutputText(responseData: unknown): string {
  const response = responseData as OpenAIResponsePayload;
  if (typeof response.output_text === "string") {
    return response.output_text.trim();
  }

  const parts: string[] = [];

  for (const outputItem of response.output ?? []) {
    for (const contentItem of outputItem?.content ?? []) {
      if (
        contentItem?.type === "output_text" &&
        typeof contentItem?.text === "string"
      ) {
        parts.push(contentItem.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }

    throw new Error("La IA devolvió una respuesta JSON no válida.");
  }
}

export async function POST(request: Request) {
  try {
    /*
     * Cliente de Supabase para el servidor.
     *
     * Es importante utilizar este cliente porque esta ruta se ejecuta
     * en el servidor y necesitamos que Supabase reciba la sesión
     * autenticada mediante las cookies.
     */
    const supabase = await createServerClient();

    /*
     * Comprobamos que existe una sesión autenticada.
     */
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(
        "[participations/analyze-image] Usuario no autenticado:",
        authError,
      );

      return NextResponse.json(
        {
          error:
            "La sesión ha expirado o no existe un usuario autenticado.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as AnalyzeRequest;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "No está configurada OPENAI_API_KEY." },
        { status: 500 },
      );
    }

    if (!body.image) {
      return NextResponse.json(
        { error: "No se ha recibido ninguna imagen." },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.roster)) {
      return NextResponse.json(
        {
          error:
            "No se ha recibido una plantilla válida para analizar.",
        },
        { status: 400 },
      );
    }

    const matchDuration =
      Number.isFinite(body.matchDuration) && body.matchDuration
        ? body.matchDuration
        : 90;

    const homeTeamName =
      body.homeTeamName ?? "Equipo local";

    const awayTeamName =
      body.awayTeamName ?? "Equipo visitante";

    /*
     * Recuperamos el contexto de aprendizaje utilizando el cliente
     * autenticado del servidor.
     *
     * Antes se utilizaba el cliente del navegador de forma indirecta,
     * lo que provocaba el error RLS.
     */
    let learningContext = "";

    try {
      learningContext = await getLearningContext(
        "participations",
        {},
        supabase,
      );
    } catch (learningError) {
      console.error(
        "[participations/analyze-image] No se pudo cargar el contexto de aprendizaje:",
        learningError,
      );
    }

    const rosterText = body.roster
      .map(
        (player) =>
          `ID=${player.playerId} | equipo=${player.teamSide} | equipoId=${player.teamId} | dorsal=${player.shirtNumber ?? "-"} | nombre=${player.playerName} | nombreCorto=${player.shortName}`,
      )
      .join("\n");

    const prompt = `
Analiza esta imagen de un acta/alineación de un partido de fútbol y devuelve exclusivamente los jugadores que realmente participaron en el partido.

PARTIDO:
- Local: ${homeTeamName}
- Visitante: ${awayTeamName}
- Duración reglamentaria del partido: ${matchDuration} minutos.

PLANTILLAS DISPONIBLES:
${rosterText}

CONTEXTO DE CORRECCIONES CONFIRMADAS:
${learningContext || "No hay correcciones confirmadas disponibles."}

Utiliza este contexto únicamente como ayuda para evitar errores repetidos. No copies un valor si no aparece respaldado por la imagen actual.

REGLAS IMPORTANTES:

1. En "players", usa exclusivamente playerId de la plantilla y no inventes IDs. Si un participante visible no coincide con ninguna persona de la plantilla, inclúyelo en "unmatchedPlayers" con nombre legible y teamSide home/away. No inventes nombres ni repitas personas entre las listas; omite nombres ilegibles.

2. Identifica qué jugadores fueron titulares y cuáles fueron suplentes que realmente entraron al campo.

3. No incluyas suplentes que permanecieron en el banquillo y no jugaron.

4. Si la imagen muestra las sustituciones con sus minutos, utiliza esos minutos:
   - substituteInMinute = minuto en el que el jugador entra.
   - substituteOutMinute = minuto en el que el jugador sale.
   - Si un titular no aparece sustituido, substituteOutMinute debe ser null.
   - Si un suplente entra y no sale, substituteOutMinute debe ser null.
   - Si un jugador no tiene minuto de entrada porque fue titular, substituteInMinute debe ser null.

5. CAPITÁN:
   - Esta fuente identifica al capitán escribiendo literalmente la marca "(c)" justo antes del nombre del jugador.
   - Busca específicamente ese indicador textual "(c)" o una representación visual inequívoca de esa misma marca inmediatamente antes del nombre.
   - Si aparece "(c)" antes del nombre de un jugador, devuelve captain=true para ese jugador.
   - Si NO aparece claramente esa marca, devuelve captain=false.
   - NO deduzcas el capitán por posición, dorsal, brazalete, fama, historial, orden de jugadores ni conocimiento externo.
   - captainConfidence debe estar entre 0 y 1 y reflejar exclusivamente la claridad con la que se observa la marca de capitán.
   - Si la marca "(c)" es clara, utiliza una confianza alta (por ejemplo 0.90-1.00).
   - Si existe una posible marca pero no es suficientemente clara, utiliza captain=false y una confianza baja.
   - Puede existir como máximo un capitán por equipo.

6. La marca "(c)" pertenece al nombre que aparece inmediatamente después de ella. No la confundas con iconos, números de dorsal, indicadores gráficos, tarjetas, escudos o cualquier otro elemento de la imagen.

7. confidence debe representar la confianza general en la identificación del jugador y su participación.

8. Devuelve todos los jugadores participantes de ambos equipos, aunque alguno tenga una confianza moderada.

9. No devuelvas explicaciones, comentarios ni texto adicional. Devuelve únicamente el JSON definido por el esquema.
`;

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_PARTICIPATION_MODEL ??
            "gpt-5.6-luna",
          store: false,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: prompt,
                },
                {
                  type: "input_image",
                  image_url: body.image,
                  detail: "high",
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "participation_analysis",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  players: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        playerId: {
                          type: "integer",
                        },
                        isStartingXI: {
                          type: "boolean",
                        },
                        substituteInMinute: {
                          type: ["integer", "null"],
                        },
                        substituteOutMinute: {
                          type: ["integer", "null"],
                        },
                        confidence: {
                          type: "number",
                        },
                        captain: {
                          type: "boolean",
                        },
                        captainConfidence: {
                          type: "number",
                        },
                      },
                      required: [
                        "playerId",
                        "isStartingXI",
                        "substituteInMinute",
                        "substituteOutMinute",
                        "confidence",
                        "captain",
                        "captainConfidence",
                      ],
                    },
                  },
                  unmatchedPlayers: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        name: { type: "string" },
                        teamSide: { type: "string", enum: ["home", "away"] },
                        shirtNumber: { type: ["integer", "null"] },
                        isStartingXI: { type: "boolean" },
                        substituteInMinute: { type: ["integer", "null"] },
                        substituteOutMinute: { type: ["integer", "null"] },
                        confidence: { type: "number" },
                        captain: { type: "boolean" },
                        captainConfidence: { type: "number" },
                      },
                      required: ["name", "teamSide", "shirtNumber", "isStartingXI", "substituteInMinute", "substituteOutMinute", "confidence", "captain", "captainConfidence"],
                    },
                  },
                },
                required: ["players", "unmatchedPlayers"],
              },
            },
          },
        }),
      },
    );

    const responseData = await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI error:",
        responseData,
      );

      return NextResponse.json(
        {
          error:
            responseData?.error?.message ??
            "OpenAI no pudo analizar la imagen.",
        },
        {
          status:
            openAIResponse.status || 500,
        },
      );
    }

    const outputText =
      extractOutputText(responseData);

    if (!outputText) {
      console.error(
        "OpenAI response sin texto de salida:",
        responseData,
      );

      return NextResponse.json(
        {
          error:
            "OpenAI no devolvió ningún resultado.",
        },
        { status: 502 },
      );
    }

    const parsed = parseJson(outputText) as {
      players?: unknown[];
      unmatchedPlayers?: unknown[];
    };

    if (!Array.isArray(parsed.players)) {
      return NextResponse.json(
        {
          error:
            "La respuesta de OpenAI no tiene el formato esperado.",
        },
        { status: 502 },
      );
    }

    const rosterIds = new Set(
      body.roster.map(
        (player) => player.playerId,
      ),
    );

    const seenIds = new Set<number>();

    const players = (parsed.players as unknown[])
      .filter((item): item is Record<string, unknown> => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return false;
        const player = item as Record<string, unknown>;
        const playerId = Number(player.playerId);

        if (!Number.isInteger(playerId)) {
          return false;
        }

        if (!rosterIds.has(playerId)) {
          return false;
        }

        if (seenIds.has(playerId)) {
          return false;
        }

        seenIds.add(playerId);

        return true;
      })
      .map((item) => {
        const playerId = Number(
          item.playerId,
        );

        const inMinute =
          item.substituteInMinute === null ||
          item.substituteInMinute === undefined
            ? null
            : Number(
                item.substituteInMinute,
              );

        const outMinute =
          item.substituteOutMinute === null ||
          item.substituteOutMinute === undefined
            ? null
            : Number(
                item.substituteOutMinute,
              );

        const confidence = Number(
          item.confidence,
        );

        const captainConfidence =
          Number(
            item.captainConfidence,
          );

        return {
          playerId,

          isStartingXI:
            item.isStartingXI === true,

          substituteInMinute:
            typeof inMinute === "number" &&
            Number.isInteger(inMinute) &&
            inMinute >= 0
              ? inMinute
              : null,

          substituteOutMinute:
            typeof outMinute === "number" &&
            Number.isInteger(outMinute) &&
            outMinute >= 0
              ? outMinute
              : null,

          confidence:
            Number.isFinite(confidence)
              ? Math.max(
                  0,
                  Math.min(1, confidence),
                )
              : 0,

          captain:
            item.captain === true,

          captainConfidence:
            Number.isFinite(
              captainConfidence,
            )
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    captainConfidence,
                  ),
                )
              : 0,
        };
      });

    const normalizedRosterNames = new Set(
      body.roster.map((player) => player.playerName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]/g, "")),
    );
    const seenUnknownNames = new Set<string>();
    const unmatchedPlayers = (parsed.unmatchedPlayers ?? []).flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const candidate = item as Record<string, unknown>;
      const name = typeof candidate.name === "string" ? candidate.name.trim().replace(/\s+/g, " ") : "";
      const teamSide = candidate.teamSide === "home" || candidate.teamSide === "away" ? candidate.teamSide : null;
      const confidence = Number(candidate.confidence);
      if (!name || !teamSide || !Number.isFinite(confidence) || confidence < 0.65) return [];
      const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]/g, "");
      const dedupeKey = `${teamSide}:${normalizedName}`;
      if (normalizedRosterNames.has(normalizedName) || seenUnknownNames.has(dedupeKey)) return [];
      seenUnknownNames.add(dedupeKey);
      const safeMinute = (value: unknown) => {
        const minute = Number(value);
        return Number.isInteger(minute) && minute >= 0 && minute <= matchDuration ? minute : null;
      };
      const shirtNumber = Number(candidate.shirtNumber);
      const captainConfidence = Number(candidate.captainConfidence);
      return [{
        name,
        teamSide,
        shirtNumber: Number.isInteger(shirtNumber) && shirtNumber > 0 && shirtNumber <= 99 ? shirtNumber : null,
        isStartingXI: candidate.isStartingXI === true,
        substituteInMinute: safeMinute(candidate.substituteInMinute),
        substituteOutMinute: safeMinute(candidate.substituteOutMinute),
        confidence,
        captain: candidate.captain === true,
        captainConfidence: Number.isFinite(captainConfidence) ? Math.max(0, Math.min(1, captainConfidence)) : 0,
      }];
    }).slice(0, 30);
    let recognitionResultId:
      number | null = null;

    /*
     * Guardamos el resultado bruto/normalizado
     * para poder comparar posteriormente las
     * correcciones manuales del usuario.
     *
     * IMPORTANTE:
     * Utilizamos el cliente servidor autenticado.
     */
    try {
      const recognitionResult =
        await createRecognitionResult(
          {
            matchId:
              body.matchId ?? null,

            recognitionType:
              "participations",

            source:
              "participation-image",

            rawResponse: {
              players,
              unmatchedPlayers,
            },

            requestContext: {
              homeTeamName,
              awayTeamName,
              matchDuration,
              roster: body.roster,
            },
          },
          supabase,
        );

      recognitionResultId =
        recognitionResult?.id ?? null;

      console.log(
        "[participations/analyze-image] Resultado de reconocimiento guardado:",
        recognitionResultId,
      );
    } catch (feedbackError) {
      console.error(
        "[participations/analyze-image] No se pudo registrar el feedback:",
        feedbackError,
      );
    }

    /*
     * Seguridad adicional:
     * como máximo un capitán por equipo.
     */
    for (const side of [
      "home",
      "away",
    ] as const) {
      const sidePlayers =
        players.filter((item) => {
          const rosterPlayer =
            body.roster!.find(
              (candidate) =>
                candidate.playerId ===
                item.playerId,
            );

          return (
            rosterPlayer?.teamSide === side
          );
        });

      const captains =
        sidePlayers.filter(
          (item) => item.captain,
        );

      if (captains.length > 1) {
        captains
          .sort(
            (a, b) =>
              b.captainConfidence -
              a.captainConfidence,
          )
          .slice(1)
          .forEach((item) => {
            item.captain = false;
          });
      }
    }

    return NextResponse.json({
      players,
      unmatchedPlayers,
      recognitionResultId,
    });
  } catch (error) {
    console.error(
      "Error analizando imagen de participación:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo analizar la imagen.",
      },
      { status: 500 },
    );
  }
}
