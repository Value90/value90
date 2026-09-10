import { NextResponse } from "next/server";

interface RosterPlayer {
  playerId: number;
  playerName: string;
  shortName: string;
  teamId: number;
  teamSide: "home" | "away";
  shirtNumber: number | null;
}

interface AnalyzeRequest {
  image?: string;
  matchDuration?: number;
  homeTeamName?: string;
  awayTeamName?: string;
  roster?: RosterPlayer[];
}

function extractOutputText(responseData: any): string {
  if (typeof responseData?.output_text === "string") {
    return responseData.output_text.trim();
  }

  const parts: string[] = [];

  for (const outputItem of responseData?.output ?? []) {
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
    const body = (await request.json()) as AnalyzeRequest;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "No está configurada OPENAI_API_KEY." },
        { status: 500 }
      );
    }

    if (!body.image) {
      return NextResponse.json(
        { error: "No se ha recibido ninguna imagen." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.roster) || body.roster.length === 0) {
      return NextResponse.json(
        { error: "No se han recibido jugadores de las plantillas." },
        { status: 400 }
      );
    }

    const matchDuration =
      Number.isFinite(body.matchDuration) && body.matchDuration
        ? body.matchDuration
        : 90;

    const homeTeamName = body.homeTeamName ?? "Equipo local";
    const awayTeamName = body.awayTeamName ?? "Equipo visitante";

    const rosterText = body.roster
      .map(
        (player) =>
          `ID=${player.playerId} | equipo=${player.teamSide} | equipoId=${player.teamId} | dorsal=${player.shirtNumber ?? "-"} | nombre=${player.playerName} | nombreCorto=${player.shortName}`
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

REGLAS IMPORTANTES:

1. Identifica a los jugadores utilizando EXCLUSIVAMENTE los playerId de la lista de plantillas proporcionada. No inventes IDs.

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
            process.env.OPENAI_PARTICIPATION_MODEL ?? "gpt-5.6-luna",
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
                },
                required: ["players"],
              },
            },
          },
        }),
      }
    );

    const responseData = await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.error("OpenAI error:", responseData);

      return NextResponse.json(
        {
          error:
            responseData?.error?.message ??
            "OpenAI no pudo analizar la imagen.",
        },
        { status: openAIResponse.status || 500 }
      );
    }

    const outputText = extractOutputText(responseData);

    if (!outputText) {
      console.error("OpenAI response sin texto de salida:", responseData);

      return NextResponse.json(
        { error: "OpenAI no devolvió ningún resultado." },
        { status: 502 }
      );
    }

    const parsed = parseJson(outputText) as {
      players?: unknown;
    };

    if (!Array.isArray(parsed.players)) {
      return NextResponse.json(
        { error: "La respuesta de OpenAI no tiene el formato esperado." },
        { status: 502 }
      );
    }

    const rosterIds = new Set(
      body.roster.map((player) => player.playerId)
    );

    const seenIds = new Set<number>();

    const players = parsed.players
      .filter((item: any) => {
        const playerId = Number(item?.playerId);

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
      .map((item: any) => {
        const playerId = Number(item.playerId);
        const inMinute =
          item.substituteInMinute === null ||
          item.substituteInMinute === undefined
            ? null
            : Number(item.substituteInMinute);
        const outMinute =
          item.substituteOutMinute === null ||
          item.substituteOutMinute === undefined
            ? null
            : Number(item.substituteOutMinute);
        const confidence = Number(item.confidence);
        const captainConfidence = Number(item.captainConfidence);

        return {
          playerId,
          isStartingXI: item.isStartingXI === true,
          substituteInMinute:
            typeof inMinute === "number" &&
            Number.isInteger(inMinute) && inMinute >= 0
              ? inMinute
              : null,
          substituteOutMinute:
            typeof outMinute === "number" &&
            Number.isInteger(outMinute) && outMinute >= 0
              ? outMinute
              : null,
          confidence:
            Number.isFinite(confidence)
              ? Math.max(0, Math.min(1, confidence))
              : 0,
          captain: item.captain === true,
          captainConfidence:
            Number.isFinite(captainConfidence)
              ? Math.max(0, Math.min(1, captainConfidence))
              : 0,
        };
      });

    // Seguridad adicional: como máximo un capitán por equipo.
    for (const side of ["home", "away"] as const) {
      const sidePlayers = players.filter((item) => {
        const rosterPlayer = body.roster!.find(
          (candidate) => candidate.playerId === item.playerId
        );
        return rosterPlayer?.teamSide === side;
      });

      const captains = sidePlayers.filter((item) => item.captain);

      if (captains.length > 1) {
        captains
          .sort(
            (a, b) => b.captainConfidence - a.captainConfidence
          )
          .slice(1)
          .forEach((item) => {
            item.captain = false;
          });
      }
    }

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error analizando imagen de participación:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo analizar la imagen.",
      },
      { status: 500 }
    );
  }
}
