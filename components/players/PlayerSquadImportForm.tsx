"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSeasons,
  type Season,
} from "@/services/season.service";

import {
  getTeams,
  type Team,
} from "@/services/team.service";

import {
  getCompetitions,
  type Competition,
} from "@/services/competition.service";

import {
  getPlayers,
  type Player,
  addPlayer,
} from "@/services/player.service";

import {
  getCountries,
  type Country,
} from "@/services/country.service";

import {
  getPositions,
  type Position,
} from "@/services/position.service";

import {
  getHistPlayerTeamsByTeamAndSeason,
  saveHistPlayerTeamSquad,
  type HistPlayerTeam,
} from "@/services/hist-player-team.service";

import {
  getTeamCompetitionsBySeason,
  type TeamCompetition,
} from "@/services/team-competition.service";

interface ImportRow {
  inputName: string;
  normalizedName: string;
  countryName: string | null;
  countryId: number | null;
  birthDate: string | null;
  existingPlayer?: Player;
  status: "existing" | "new" | "duplicate";
  playerId?: number;
}

interface SquadRow {
  playerId: number;
  playerName: string;
  shirtNumber: string;
  positionId: number;
  history?: HistPlayerTeam;
}

type ImportStep = "players" | "numbers";

interface PlayerSquadImportFormProps {
  onSaved?: () => void | Promise<void>;
  onCancel?: () => void;
}

/*
 * ============================================================
 * UTILIDADES
 * ============================================================
 */

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[.'’`´]/g, "")
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Extrae:
 *
 * 1. David Raya
 * 13. Joan Garcia
 *
 * Devuelve:
 *
 * dorsal = 1
 * nombre = David Raya
 */
function parseShirtNumberLine(
  line: string,
  positions: Position[]
): {
  shirtNumber: number | null;
  name: string;
  positionId: number;
  positionName: string | null;
} {
  const trimmed = line.trim();

  const match = trimmed.match(
    /^(\d{1,3})\s*[\.\-:)]?\s+(.+)$/
  );

  if (!match) {
    return {
      shirtNumber: null,
      name: trimmed,
      positionId: 0,
      positionName: null,
    };
  }

  let name = match[2].trim();
  let positionId = 0;
  let positionName: string | null = null;

  /*
   * Buscamos la posición al final de la línea.
   * Primero intentamos los nombres reales de la tabla positions
   * y después algunas abreviaturas habituales.
   */
  const sortedPositionCandidates = [...positions]
    .filter((position) => position.active)
    .sort(
      (a, b) =>
        normalizeName(b.name).length -
        normalizeName(a.name).length
    );

  const matchedPosition = sortedPositionCandidates.find(
    (position) => {
      const normalizedName = normalizeName(name);
      const normalizedPosition = normalizeName(
        position.name
      );

      return (
        normalizedName === normalizedPosition ||
        normalizedName.endsWith(
          ` ${normalizedPosition}`
        )
      );
    }
  );

  if (matchedPosition) {
    positionId = matchedPosition.id;
    positionName = matchedPosition.name;

    const normalizedName = normalizeName(name);
    const normalizedPosition = normalizeName(
      matchedPosition.name
    );

    if (normalizedName.endsWith(` ${normalizedPosition}`)) {
      const words = name.split(/\s+/);
      const positionWords =
        matchedPosition.name.trim().split(/\s+/);

      name = words
        .slice(0, words.length - positionWords.length)
        .join(" ")
        .trim();
    } else {
      name = "";
    }
  } else {
    /*
     * Abreviaturas y variantes habituales.
     * Solo se aplican cuando existe una posición compatible
     * en la tabla de posiciones.
     */
    const normalizedName = normalizeName(name);

    const aliases: Array<{
      aliases: string[];
      positionNames: string[];
    }> = [
      {
        aliases: ["por", "port", "gk", "arquero", "guardameta"],
        positionNames: ["portero"],
      },
      {
        aliases: ["ld", "lateral diestro"],
        positionNames: ["lateral derecho"],
      },
      {
        aliases: ["li", "lateral zurdo"],
        positionNames: ["lateral izquierdo"],
      },
      {
        aliases: ["dfc", "zaguero", "defensa central"],
        positionNames: ["central"],
      },
      {
        aliases: ["mcd", "mediocentro defensivo", "pivote"],
        positionNames: ["mediocentro"],
      },
      {
        aliases: ["mc", "centrocampista"],
        positionNames: ["mediocentro"],
      },
      {
        aliases: ["md", "interior derecho"],
        positionNames: ["interior derecho"],
      },
      {
        aliases: ["mi", "interior izquierdo"],
        positionNames: ["interior izquierdo"],
      },
      {
        aliases: ["ed", "extremo diestro"],
        positionNames: ["extremo derecho"],
      },
      {
        aliases: ["ei", "extremo zurdo"],
        positionNames: ["extremo izquierdo"],
      },
      {
        aliases: ["mp", "mediapunta"],
        positionNames: ["mediapunta"],
      },
      {
        aliases: ["dc", "delantero centro", "9"],
        positionNames: ["delantero"],
      },
      {
        aliases: ["del", "punta"],
        positionNames: ["delantero"],
      },
    ];

    const matchedAlias = aliases.find(
      (item) =>
        item.aliases.includes(normalizedName.split(" ").pop() ?? "") ||
        item.aliases.some((alias) =>
          normalizedName.endsWith(` ${alias}`)
        )
    );

    if (matchedAlias) {
      const targetPosition = sortedPositionCandidates.find(
        (position) =>
          matchedAlias.positionNames.some(
            (name) =>
              normalizeName(position.name) ===
              normalizeName(name)
          )
      );

      if (targetPosition) {
        const alias = matchedAlias.aliases.find(
          (item) =>
            normalizedName === item ||
            normalizedName.endsWith(` ${item}`)
        );

        if (alias) {
          positionId = targetPosition.id;
          positionName = targetPosition.name;

          const words = name.split(/\s+/);
          name = words
            .slice(0, words.length - alias.split(" ").length)
            .join(" ")
            .trim();
        }
      }
    }
  }

  return {
    shirtNumber: Number(match[1]),
    name,
    positionId,
    positionName,
  };
}

/**
 * Analiza una línea de importación de jugador.
 *
 * Formato recomendado (copiado desde Google Sheets):
 * Nombre<TAB>País<TAB>Fecha
 *
 * También admite una columna intermedia vacía, por ejemplo:
 * Nombre<TAB><TAB>País<TAB>Fecha
 *
 * La fecha se convierte de DD/MM/YYYY a YYYY-MM-DD.
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePlayerImportLine(
  line: string,
  countries: Country[]
): {
  name: string;
  countryName: string | null;
  countryId: number | null;
  birthDate: string | null;
} {
  const trimmedLine = line.trim();

  if (!trimmedLine) {
    return {
      name: "",
      countryName: null,
      countryId: null,
      birthDate: null,
    };
  }

  /*
   * ==========================================================
   * 1. DETECTAR LA FECHA AL FINAL DE LA LÍNEA
   *
   * Admitimos:
   * 27/05/1998
   * 27-05-1998
   * 27.05.1998
   *
   * La fecha es opcional.
   * ==========================================================
   */

  let remaining = trimmedLine;
  let birthDate: string | null = null;

  const dateMatch = remaining.match(
    /(?:^|\s)(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\s*$/
  );

  if (dateMatch) {
    const day = dateMatch[1].padStart(2, "0");
    const month = dateMatch[2].padStart(2, "0");
    const year = dateMatch[3];

    birthDate = `${year}-${month}-${day}`;

    remaining = remaining
      .slice(0, dateMatch.index)
      .trim();
  }

  /*
   * ==========================================================
   * 2. DETECTAR EL PAÍS
   *
   * Buscamos el país al final del texto restante.
   * Esto funciona tanto con TAB como con espacios:
   *
   * Alessandro Bastoni\tItalia\t13/04/1999
   * Alessandro Bastoni Italia 13/04/1999
   *
   * Ordenamos por longitud para priorizar países con varias
   * palabras (por ejemplo "Estados Unidos").
   * ==========================================================
   */

  let countryName: string | null = null;
  let countryId: number | null = null;

  const countriesByLength = [...countries]
    .filter((country) => country.name?.trim())
    .sort(
      (a, b) =>
        b.name.trim().length -
        a.name.trim().length
    );

  const normalizedRemaining = normalizeName(remaining);

  const matchedCountry =
    countriesByLength.find((country) => {
      const normalizedCountry =
        normalizeName(country.name);

      return (
        normalizedRemaining ===
          normalizedCountry ||
        normalizedRemaining.endsWith(
          ` ${normalizedCountry}`
        )
      );
    });

  if (matchedCountry) {
    countryName = matchedCountry.name;
    countryId = matchedCountry.id;

    const normalizedCountry =
      normalizeName(matchedCountry.name);

    /*
     * Eliminamos el país del final respetando el texto original.
     * Para ello buscamos el último tramo equivalente mediante
     * palabras, de forma que también funcione con TAB o espacios.
     */
    const countryWords = normalizedCountry.split(" ");
    const remainingWords = remaining
      .trim()
      .split(/\s+/);

    if (remainingWords.length >= countryWords.length) {
      const candidate = remainingWords
        .slice(
          remainingWords.length -
            countryWords.length
        )
        .join(" ");

      if (
        normalizeName(candidate) ===
        normalizedCountry
      ) {
        remaining = remainingWords
          .slice(
            0,
            remainingWords.length -
              countryWords.length
          )
          .join(" ")
          .trim();
      } else {
        remaining = remaining
          .replace(
            new RegExp(
              `\\s+${escapeRegExp(matchedCountry.name)}\\s*$`,
              "i"
            ),
            ""
          )
          .trim();
      }
    }
  }

  return {
    name: remaining.trim(),
    countryName,
    countryId,
    birthDate,
  };
}

export default function PlayerSquadImportForm({
  onSaved,
  onCancel,
}: PlayerSquadImportFormProps) {
  /*
   * ============================================================
   * DATOS MAESTROS
   * ============================================================
   */

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [countries, setCountries] =
    useState<Country[]>([]);

  const [positions, setPositions] =
    useState<Position[]>([]);

  const [teamCompetitions, setTeamCompetitions] =
    useState<TeamCompetition[]>([]);

  /*
   * ============================================================
   * SELECCIÓN
   * ============================================================
   */

  const [seasonId, setSeasonId] =
    useState<number>(0);

  const [competitionId, setCompetitionId] =
    useState<number>(0);

  const [teamId, setTeamId] =
    useState<number>(0);

  const [applyCountryToAll, setApplyCountryToAll] =
    useState(false);

  const [globalCountryId, setGlobalCountryId] =
    useState<number>(0);

  /*
   * ============================================================
   * PASO
   * ============================================================
   */

  const [step, setStep] =
    useState<ImportStep>("players");

  /*
   * ============================================================
   * PASO 1 - JUGADORES
   * ============================================================
   */

  const [playerText, setPlayerText] =
    useState("");

  const [rows, setRows] =
    useState<ImportRow[]>([]);

  /*
   * ============================================================
   * PASO 2 - DORSALES / POSICIONES
   * ============================================================
   */

  const [shirtNumberText, setShirtNumberText] =
    useState("");

  const [squadRows, setSquadRows] =
    useState<SquadRow[]>([]);

  /*
   * ============================================================
   * ESTADO
   * ============================================================
   */

  const [loading, setLoading] =
    useState(true);

  const [analysing, setAnalysing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
   * ============================================================
   * CARGAR DATOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          seasonsData,
          competitionsData,
          teamsData,
          playersData,
          countriesData,
          positionsData,
        ] = await Promise.all([
          getSeasons(),
          getCompetitions(),
          getTeams(),
          getPlayers(),
          getCountries(),
          getPositions(),
        ]);

        if (!mounted) {
          return;
        }

        setSeasons(seasonsData);
        setCompetitions(
          competitionsData
        );
        setTeams(teamsData);
        setPlayers(playersData);
        setCountries(
          countriesData
        );
        setPositions(
          positionsData
        );
      } catch (err) {
        console.error(
          "Error cargando datos:",
          err
        );

        if (mounted) {
          setError(
            "No se pudieron cargar los datos necesarios."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * RELACIONES EQUIPO - COMPETICIÓN POR TEMPORADA
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadTeamCompetitions() {
      if (!seasonId) {
        setTeamCompetitions([]);
        return;
      }

      try {
        const data =
          await getTeamCompetitionsBySeason(seasonId);

        if (mounted) {
          setTeamCompetitions(data);
        }
      } catch (err) {
        console.error(
          "Error cargando relaciones equipo-competición:",
          err
        );

        if (mounted) {
          setTeamCompetitions([]);
        }
      }
    }

    loadTeamCompetitions();

    return () => {
      mounted = false;
    };
  }, [seasonId]);

  /*
   * ============================================================
   * TEMPORADAS
   *
   * Más reciente primero.
   * ============================================================
   */

  const sortedSeasons =
    useMemo(() => {
      return [...seasons].sort(
        (a, b) => {
          const aText =
            String(
              a.name ?? ""
            );

          const bText =
            String(
              b.name ?? ""
            );

          const aYear =
            Number(
              aText.substring(
                0,
                2
              )
            );

          const bYear =
            Number(
              bText.substring(
                0,
                2
              )
            );

          if (
            !Number.isNaN(
              aYear
            ) &&
            !Number.isNaN(
              bYear
            )
          ) {
            return bYear - aYear;
          }

          return bText.localeCompare(
            aText,
            "es"
          );
        }
      );
    }, [seasons]);

  /*
   * ============================================================
   * COMPETICIONES
   * ============================================================
   */

  const availableCompetitions =
    useMemo(() => {
      if (!seasonId) {
        return [];
      }

      const competitionIdsWithTeams =
        new Set(
          teamCompetitions
            .filter(
              (item) =>
                item.active &&
                item.seasonId === seasonId
            )
            .map(
              (item) => item.competitionId
            )
        );

      return competitions
        .filter(
          (competition) =>
            competition.active
        )
        .filter((competition) => {
          if (
            competition.competitionType ===
            "National Team"
          ) {
            return true;
          }

          return (
            competitionIdsWithTeams.has(
              competition.id
            ) ||
            teams.some(
              (team) =>
                team.active &&
                team.type === "Club" &&
                team.competitionId ===
                  competition.id
            )
          );
        })
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "es",
            { sensitivity: "base" }
          )
        );
    }, [
      competitions,
      seasonId,
      teamCompetitions,
      teams,
    ]);

  /*
   * ============================================================
   * COMPETICIÓN SELECCIONADA
   * ============================================================
   */

  const selectedCompetition =
    useMemo(() => {
      return competitions.find(
        (competition) =>
          competition.id ===
          competitionId
      );
    }, [
      competitions,
      competitionId,
    ]);

  /*
   * ============================================================
   * EQUIPOS DISPONIBLES
   * ============================================================
   */

  const availableTeams =
    useMemo(() => {
      if (!selectedCompetition) {
        return [];
      }

      const isNationalTeam =
        selectedCompetition.competitionType ===
        "National Team";

      if (isNationalTeam) {
        return teams
          .filter(
            (team) => team.active
          )
          .filter(
            (team) =>
              team.type
                ?.toLocaleLowerCase("es") ===
              "selección"
          )
          .sort((a, b) =>
            a.name.localeCompare(
              b.name,
              "es",
              { sensitivity: "base" }
            )
          );
      }

      const teamIdsBySeasonCompetition =
        new Set(
          teamCompetitions
            .filter(
              (item) =>
                item.active &&
                item.seasonId === seasonId &&
                item.competitionId ===
                  competitionId
            )
            .map(
              (item) => item.teamId
            )
        );

      return teams
        .filter(
          (team) => team.active
        )
        .filter(
          (team) =>
            teamIdsBySeasonCompetition.has(
              team.id
            ) ||
            team.competitionId ===
              competitionId
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "es",
            { sensitivity: "base" }
          )
        );
    }, [
      teams,
      competitionId,
      seasonId,
      teamCompetitions,
      selectedCompetition,
    ]);

  /*
   * ============================================================
   * PAÍSES
   * ============================================================
   */

  const sortedCountries =
    useMemo(() => {
      return [...countries].sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "es",
            {
              sensitivity:
                "base",
            }
          )
      );
    }, [countries]);

  /*
   * ============================================================
   * POSICIONES
   *
   * Se muestran según displayOrder.
   *
   * Usamos un fallback por ID por si alguna posición
   * antigua no tiene displayOrder informado.
   * ============================================================
   */

  const sortedPositions =
    useMemo(() => {
      return positions
        .filter(
          (position) =>
            position.active
        )
        .sort((a, b) => {
          const orderA =
            (
              a as Position & {
                displayOrder?: number;
              }
            ).displayOrder;

          const orderB =
            (
              b as Position & {
                displayOrder?: number;
              }
            ).displayOrder;

          if (
            orderA !== undefined &&
            orderB !== undefined
          ) {
            return orderA - orderB;
          }

          if (
            orderA !== undefined
          ) {
            return -1;
          }

          if (
            orderB !== undefined
          ) {
            return 1;
          }

          return a.id - b.id;
        });
    }, [positions]);

  /*
   * ============================================================
   * CAMBIO DE TEMPORADA
   * ============================================================
   */

  const handleSeasonChange = (
    value: number
  ) => {
    setSeasonId(value);

    setCompetitionId(0);
    setTeamId(0);
    setApplyCountryToAll(false);
    setGlobalCountryId(0);

    setRows([]);
    setSquadRows([]);

    setPlayerText("");
    setShirtNumberText("");

    setStep("players");

    setError("");
    setSuccess("");
  };

  /*
   * ============================================================
   * CAMBIO DE COMPETICIÓN
   * ============================================================
   */

  const handleCompetitionChange = (
    value: number
  ) => {
    setCompetitionId(value);

    setTeamId(0);
    setApplyCountryToAll(false);
    setGlobalCountryId(0);

    setRows([]);
    setSquadRows([]);

    setPlayerText("");
    setShirtNumberText("");

    setStep("players");

    setError("");
    setSuccess("");
  };

  /*
   * ============================================================
   * CAMBIO DE EQUIPO
   * ============================================================
   */

  const handleTeamChange = (
    value: number
  ) => {
    setTeamId(value);
    setApplyCountryToAll(false);
    setGlobalCountryId(0);

    setRows([]);
    setSquadRows([]);

    setPlayerText("");
    setShirtNumberText("");

    setStep("players");

    setError("");
    setSuccess("");
  };

  /*
   * ============================================================
   * ANALIZAR LISTA DE JUGADORES
   * ============================================================
   */

  const handleAnalyse = async () => {
    setError("");
    setSuccess("");

    if (!seasonId) {
      setError(
        "Selecciona una temporada."
      );
      return;
    }

    if (!competitionId) {
      setError(
        "Selecciona una competición."
      );
      return;
    }

    if (!teamId) {
      setError(
        "Selecciona un equipo."
      );
      return;
    }

    if (applyCountryToAll && !globalCountryId) {
      setError(
        "Selecciona el país que quieres asignar a todos los jugadores nuevos."
      );
      return;
    }

    const lines =
      playerText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
      setError(
        "Pega al menos un jugador."
      );
      return;
    }

    setAnalysing(true);

    try {
      /*
       * Mapa de jugadores existentes.
       */
      const playerMap =
        new Map<
          string,
          Player[]
        >();

      players.forEach(
        (player) => {
          const key =
            normalizeName(
              player.name
            );

          const list =
            playerMap.get(
              key
            ) ?? [];

          list.push(player);

          playerMap.set(
            key,
            list
          );
        }
      );

      /*
       * Analizamos nombre, país y fecha de nacimiento
       * directamente desde las columnas pegadas.
       */
      const parsedLines = lines.map((line) =>
        parsePlayerImportLine(line, countries)
      );

      /*
       * Contamos duplicados dentro del texto usando la identidad
       * completa cuando hay país y/o fecha.
       *
       * Esto permite, por ejemplo:
       *
       * Roberto Fernández    España      03/07/2002
       * Roberto Fernández    Paraguay    29/03/1988
       *
       * Son dos identidades diferentes y ambas son válidas.
       */
      const inputIdentityCount =
        new Map<string, number>();

      parsedLines.forEach((item) => {
        const normalizedName =
          normalizeName(item.name);

        const effectiveCountryId =
          applyCountryToAll
            ? globalCountryId
            : item.countryId;

        const identityKey = [
          normalizedName,
          effectiveCountryId ?? "",
          item.birthDate ?? "",
        ].join("|");

        inputIdentityCount.set(
          identityKey,
          (inputIdentityCount.get(identityKey) ?? 0) + 1
        );
      });

      const analysedRows: ImportRow[] =
        parsedLines.map((item) => {
          const inputName = item.name;
          const normalizedName =
            normalizeName(inputName);

          const effectiveCountryId =
            applyCountryToAll
              ? globalCountryId
              : item.countryId;

          const effectiveCountry = countries.find(
            (country) =>
              country.id === effectiveCountryId
          );

          const effectiveCountryName =
            effectiveCountry?.name ?? null;

          const matches =
            playerMap.get(normalizedName) ?? [];

          /*
           * ========================================================
           * IDENTIDAD DEL JUGADOR
           *
           * La prioridad es:
           *
           * 1. Nombre + país + fecha
           * 2. Nombre + país
           * 3. Nombre + fecha
           * 4. Solo nombre
           *
           * Cuando los datos proporcionados NO coinciden con un
           * jugador existente con ese nombre, entendemos que se
           * trata de una persona diferente y se crea como NUEVO.
           *
           * Ejemplo:
           *
           * Roberto Fernández - España - 03/07/2002
           * Roberto Fernández - Paraguay - 29/03/1988
           *
           * El segundo NO es un duplicado del primero.
           * ========================================================
           */

          const identityKey = [
            normalizedName,
            effectiveCountryId ?? "",
            item.birthDate ?? "",
          ].join("|");

          /*
           * El mismo jugador aparece dos veces en el texto
           * con exactamente los mismos datos.
           */
          if (
            inputIdentityCount.get(identityKey)! > 1
          ) {
            return {
              inputName,
              normalizedName,
              countryName: effectiveCountryName,
              countryId: effectiveCountryId,
              birthDate: item.birthDate,
              status: "duplicate",
            };
          }

          /*
           * Filtramos los jugadores existentes por los datos que
           * realmente se han proporcionado.
           */
          let identityMatches = matches;

          if (effectiveCountryId) {
            identityMatches =
              identityMatches.filter(
                (player) =>
                  player.countryId ===
                  effectiveCountryId
              );
          }

          if (item.birthDate) {
            identityMatches =
              identityMatches.filter(
                (player) =>
                  player.birthDate ===
                  item.birthDate
              );
          }

          /*
           * Una única coincidencia con los datos disponibles:
           * es el jugador existente.
           */
          if (
            identityMatches.length === 1
          ) {
            return {
              inputName,
              normalizedName,
              countryName: effectiveCountryName,
              countryId: effectiveCountryId,
              birthDate: item.birthDate,
              existingPlayer:
                identityMatches[0],
              playerId:
                identityMatches[0].id,
              status: "existing",
            };
          }

          /*
           * Hay varios jugadores que cumplen los datos
           * proporcionados y no podemos distinguirlos.
           */
          if (
            identityMatches.length > 1
          ) {
            return {
              inputName,
              normalizedName,
              countryName: effectiveCountryName,
              countryId: effectiveCountryId,
              birthDate: item.birthDate,
              status: "duplicate",
            };
          }

          /*
           * El nombre existe, pero ninguno de esos jugadores
           * coincide con el país/fecha proporcionados.
           *
           * Esto NO es un duplicado:
           * significa que estamos importando otro jugador
           * con el mismo nombre.
           */
          if (
            matches.length > 0 &&
            (effectiveCountryId ||
              item.birthDate)
          ) {
            return {
              inputName,
              normalizedName,
              countryName: effectiveCountryName,
              countryId: effectiveCountryId,
              birthDate: item.birthDate,
              status: "new",
            };
          }

          /*
           * Solo tenemos el nombre y ya existe un jugador con
           * ese mismo nombre. Sin más información no podemos
           * saber cuál es.
           */
          if (matches.length > 0) {
            return {
              inputName,
              normalizedName,
              countryName: effectiveCountryName,
              countryId: effectiveCountryId,
              birthDate: item.birthDate,
              status: "duplicate",
            };
          }

          /*
           * No existe ningún jugador con ese nombre.
           */
          return {
            inputName,
            normalizedName,
            countryName: effectiveCountryName,
            countryId: effectiveCountryId,
            birthDate: item.birthDate,
            status: "new",
          };
        });

      setRows(
        analysedRows
      );
    } catch (err) {
      console.error(
        "Error analizando jugadores:",
        err
      );

      setError(
        "No se pudo analizar la lista de jugadores."
      );
    } finally {
      setAnalysing(false);
    }
  };

  /*
   * ============================================================
   * RESUMEN DEL ANÁLISIS
   * ============================================================
   */

  const existingCount =
    rows.filter(
      (row) =>
        row.status ===
        "existing"
    ).length;

  const newCount =
    rows.filter(
      (row) =>
        row.status ===
        "new"
    ).length;

  const duplicateCount =
    rows.filter(
      (row) =>
        row.status ===
        "duplicate"
    ).length;

  /*
   * ============================================================
   * CREAR JUGADORES + PLANTILLA
   * ============================================================
   */

  const handleCreatePlayersAndSquad =
    async () => {
      setError("");
      setSuccess("");

      if (!seasonId) {
        setError(
          "Selecciona una temporada."
        );
        return;
      }

      if (!competitionId) {
        setError(
          "Selecciona una competición."
        );
        return;
      }

      if (!teamId) {
        setError(
          "Selecciona un equipo."
        );
        return;
      }

      if (applyCountryToAll && !globalCountryId) {
        setError(
          "Selecciona el país que quieres asignar a todos los jugadores nuevos."
        );
        return;
      }

      if (
        rows.length === 0
      ) {
        setError(
          "Primero debes analizar la lista de jugadores."
        );
        return;
      }

      if (
        duplicateCount >
        0
      ) {
        setError(
          "Hay jugadores duplicados o ambiguos. Se ha comparado nombre, país y fecha de nacimiento. Revísalos antes de continuar."
        );
        return;
      }

      setSaving(true);

      try {
        let updatedPlayers =
          [...players];

        const finalRows =
          [...rows];

        /*
         * ======================================================
         * CREAR JUGADORES NUEVOS
         * ======================================================
         */

        for (
          let index = 0;
          index <
          finalRows.length;
          index++
        ) {
          const row =
            finalRows[index];

          if (
            row.status !==
            "new"
          ) {
            continue;
          }

          const playerData:
            Omit<
              Player,
              "id"
            > = {
            name: row.inputName.trim(),
            shortName: row.inputName.trim(),
            countryId: applyCountryToAll
              ? globalCountryId
              : row.countryId,
            birthDate: row.birthDate,
            active: true,
          };

          const createdPlayer =
            await addPlayer(
              playerData
            );

          updatedPlayers.push(
            createdPlayer
          );

          finalRows[index] = {
            ...row,
            existingPlayer:
              createdPlayer,
            playerId:
              createdPlayer.id,
            status:
              "existing",
          };
        }

        /*
         * Actualizamos estado local.
         */
        setPlayers(
          updatedPlayers
        );

        setRows(
          finalRows
        );

        /*
         * ======================================================
         * COMPROBAR QUE TODOS TIENEN PLAYER ID
         * ======================================================
         */

        const incomplete =
          finalRows.filter(
            (row) =>
              !row.playerId
          );

        if (
          incomplete.length >
          0
        ) {
          throw new Error(
            "Hay jugadores sin identificar."
          );
        }

        /*
         * ======================================================
         * CREAR HISTORIAL DE PLANTILLA
         * ======================================================
         */

        const squadRecords =
          finalRows.map(
            (row) => ({
              playerId:
                row.playerId!,
              teamId,
              seasonId,
              shirtNumber:
                null,
              positionId:
                null,
              startDate:
                null,
              endDate:
                null,
              active: true,
            })
          );

        await saveHistPlayerTeamSquad(
          squadRecords
        );

        /*
         * ======================================================
         * CARGAR PLANTILLA RECIÉN CREADA
         * ======================================================
         */

        const savedSquad =
          await getHistPlayerTeamsByTeamAndSeason(
            teamId,
            seasonId
          );

        const newSquadRows: SquadRow[] =
          savedSquad
            .flatMap(
              (history) => {
                const player =
                  updatedPlayers.find(
                    (item) =>
                      item.id ===
                      history.playerId
                  );

                if (!player) {
                  return [];
                }

                const row: SquadRow = {
                  playerId:
                    player.id,

                  playerName:
                    player.name,

                  shirtNumber:
                    history.shirtNumber !==
                      null &&
                    history.shirtNumber !==
                      undefined
                      ? String(
                          history.shirtNumber
                        )
                      : "",

                  positionId:
                    history.positionId ??
                    0,

                  history,
                };

                return [row];
              }
            )

            .sort(
              (a, b) =>
                a.playerName.localeCompare(
                  b.playerName,
                  "es"
                )
            );

        setSquadRows(
          newSquadRows
        );

        setStep(
          "numbers"
        );

        setShirtNumberText(
          ""
        );

        setSuccess(
          `Plantilla creada correctamente: ${newSquadRows.length} jugadores. Ahora puedes pegar la lista con los dorsales.`
        );
      } catch (err) {
        console.error(
          "Error creando jugadores y plantilla:",
          err
        );

        setError(
          "No se pudo crear la plantilla. Comprueba los datos e inténtalo de nuevo."
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ============================================================
   * ANALIZAR DORSALES
   * ============================================================
   */

  const handleAnalyseShirtNumbers =
    () => {
      setError("");
      setSuccess("");

      if (
        squadRows.length ===
        0
      ) {
        setError(
          "No hay una plantilla cargada."
        );
        return;
      }

      const lines =
        shirtNumberText
          .split(/\r?\n/)
          .map(
            (line) =>
              line.trim()
          )
          .filter(Boolean);

      if (
        lines.length === 0
      ) {
        setError(
          "Pega la lista de jugadores con sus dorsales."
        );
        return;
      }

      /*
       * ========================================================
       * MAPA DE JUGADORES DE LA PLANTILLA
       * ========================================================
       */

      const squadMap =
        new Map<
          string,
          SquadRow
        >();

      squadRows.forEach(
        (row) => {
          squadMap.set(
            normalizeName(
              row.playerName
            ),
            row
          );
        }
      );

      /*
       * ========================================================
       * ANALIZAR LISTA
       * ========================================================
       */

      const updatedRows =
        squadRows.map(
          (row) => ({
            ...row,
            shirtNumber:
              row.shirtNumber,
          })
        );

      const matchedPlayerIds =
        new Set<number>();

      const usedShirtNumbers =
        new Map<
          number,
          string[]
        >();

      const errors: string[] =
        [];

      lines.forEach(
        (line) => {
          const parsed =
            parseShirtNumberLine(
              line,
              positions
            );

          /*
           * Si no tiene dorsal.
           */
          if (
            parsed.shirtNumber ===
            null
          ) {
            errors.push(
              `"${line}" no tiene un dorsal válido.`
            );
            return;
          }

          /*
           * Dorsal válido 1-99.
           */
          if (
            parsed.shirtNumber <
              1 ||
            parsed.shirtNumber >
              99
          ) {
            errors.push(
              `${parsed.name}: el dorsal ${parsed.shirtNumber} debe estar entre 1 y 99.`
            );
            return;
          }

          const normalized =
            normalizeName(
              parsed.name
            );

          const squadPlayer =
            squadMap.get(
              normalized
            );

          /*
           * Jugador no encontrado
           * en la plantilla.
           */
          if (
            !squadPlayer
          ) {
            errors.push(
              `${parsed.name}: no pertenece a la plantilla seleccionada.`
            );
            return;
          }

          /*
           * Jugador repetido.
           */
          if (
            matchedPlayerIds.has(
              squadPlayer.playerId
            )
          ) {
            errors.push(
              `${parsed.name}: aparece más de una vez en la lista.`
            );
            return;
          }

          matchedPlayerIds.add(
            squadPlayer.playerId
          );

          /*
           * Control de dorsales repetidos.
           */
          const names =
            usedShirtNumbers.get(
              parsed.shirtNumber
            ) ?? [];

          names.push(
            parsed.name
          );

          usedShirtNumbers.set(
            parsed.shirtNumber,
            names
          );

          /*
           * Actualizar dorsal.
           */
          const rowIndex =
            updatedRows.findIndex(
              (row) =>
                row.playerId ===
                squadPlayer.playerId
            );

          if (
            rowIndex >= 0
          ) {
            updatedRows[
              rowIndex
            ] = {
              ...updatedRows[
                rowIndex
              ],
              shirtNumber:
                String(
                  parsed.shirtNumber
                ),
              positionId:
                parsed.positionId ||
                updatedRows[rowIndex]
                  .positionId,
            };
          }
        }
      );

      /*
       * ========================================================
       * DORSALES DUPLICADOS
       * ========================================================
       */

      usedShirtNumbers.forEach(
        (
          names,
          shirtNumber
        ) => {
          if (
            names.length >
            1
          ) {
            errors.push(
              `El dorsal ${shirtNumber} está repetido: ${names.join(
                ", "
              )}.`
            );
          }
        }
      );

      if (
        errors.length > 0
      ) {
        setError(
          errors.join(" ")
        );
        return;
      }

      /*
       * ========================================================
       * COMPROBAR QUE SE HAN ENCONTRADO TODOS
       * ========================================================
       */

      if (
        matchedPlayerIds.size !==
        lines.length
      ) {
        setError(
          "No se han podido identificar correctamente todos los jugadores."
        );
        return;
      }

      setSquadRows(
        updatedRows
      );

      setSuccess(
        `Dorsales reconocidos correctamente: ${matchedPlayerIds.size} jugadores. Las posiciones reconocidas se han asignado automáticamente; puedes corregirlas manualmente si es necesario.`
      );
    };

  /*
   * ============================================================
   * CAMBIAR POSICIÓN
   * ============================================================
   */

  const handlePositionChange =
    (
      playerId: number,
      positionId: number
    ) => {
      setSquadRows(
        (current) =>
          current.map(
            (row) =>
              row.playerId ===
              playerId
                ? {
                    ...row,
                    positionId,
                  }
                : row
          )
      );
    };

  /*
   * ============================================================
   * REINICIAR FORMULARIO
   * ============================================================
   */

  const resetForm = () => {
    setSeasonId(0);
    setCompetitionId(0);
    setTeamId(0);

    setStep("players");

    setPlayerText("");
    setRows([]);

    setShirtNumberText("");
    setSquadRows([]);

    setError("");
  };

  /*
   * ============================================================
   * GUARDAR DORSALES + POSICIONES
   * ============================================================
   */

  const handleSaveNumbersAndPositions =
    async () => {
      setError("");
      setSuccess("");

      if (
        squadRows.length ===
        0
      ) {
        setError(
          "No hay jugadores en la plantilla."
        );
        return;
      }

      /*
       * ========================================================
       * VALIDAR DORSALES
       * ========================================================
       */

      const validationErrors: string[] =
        [];

      const shirtNumberMap =
        new Map<
          number,
          string[]
        >();

      squadRows.forEach(
        (row) => {
          if (
            !row.shirtNumber
          ) {
            validationErrors.push(
              `${row.playerName}: falta el dorsal.`
            );
            return;
          }

          const shirtNumber =
            Number(
              row.shirtNumber
            );

          if (
            !Number.isInteger(
              shirtNumber
            ) ||
            shirtNumber < 1 ||
            shirtNumber > 99
          ) {
            validationErrors.push(
              `${row.playerName}: el dorsal debe estar entre 1 y 99.`
            );
            return;
          }

          const names =
            shirtNumberMap.get(
              shirtNumber
            ) ?? [];

          names.push(
            row.playerName
          );

          shirtNumberMap.set(
            shirtNumber,
            names
          );
        }
      );

      shirtNumberMap.forEach(
        (
          names,
          shirtNumber
        ) => {
          if (
            names.length >
            1
          ) {
            validationErrors.push(
              `El dorsal ${shirtNumber} está repetido: ${names.join(
                ", "
              )}.`
            );
          }
        }
      );

      /*
       * ========================================================
       * VALIDAR POSICIONES
       * ========================================================
       */

      squadRows.forEach(
        (row) => {
          if (
            !row.positionId ||
            row.positionId <= 0
          ) {
            validationErrors.push(
              `${row.playerName}: debes seleccionar una posición.`
            );
          }
        }
      );

      if (
        validationErrors.length >
        0
      ) {
        setError(
          validationErrors.join(
            " "
          )
        );
        return;
      }

      /*
       * ========================================================
       * GUARDAR
       * ========================================================
       */

      setSaving(true);

      try {
        const records =
          squadRows.map(
            (row) => ({
              playerId:
                row.playerId,

              teamId,

              seasonId,

              shirtNumber:
                Number(
                  row.shirtNumber
                ),

              positionId:
                row.positionId,

              startDate:
                row.history
                  ?.startDate ??
                null,

              endDate:
                row.history
                  ?.endDate ??
                null,

              active: true,
            })
          );

        await saveHistPlayerTeamSquad(
          records
        );

        const savedMessage =
          `Plantilla completada correctamente: ${records.length} jugadores con dorsal y posición.`;

        /*
         * Reiniciamos el formulario para poder
         * registrar inmediatamente otra plantilla.
         */
        resetForm();

        setSuccess(savedMessage);

        if (onSaved) {
          await onSaved();
        }
      } catch (err) {
        console.error(
          "Error guardando dorsales y posiciones:",
          err
        );

        setError(
          "No se pudieron guardar los dorsales y posiciones."
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ============================================================
   * VOLVER AL PASO 1
   * ============================================================
   */

  const handleBackToPlayers =
    () => {
      setStep(
        "players"
      );

      setError("");
      setSuccess("");
    };

  /*
   * ============================================================
   * CARGANDO
   * ============================================================
   */

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow">
        <h2 className="text-xl font-bold text-slate-800">
          Importar plantilla
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Cargando datos...
        </p>
      </div>
    );
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="rounded-xl border bg-white p-6 shadow">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          Importar plantilla
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Crea o reconoce jugadores y
          completa después sus dorsales
          y posiciones.
        </p>
      </div>

      {/* ======================================================
          MENSAJES
          ====================================================== */}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong className="font-semibold">
            Revisa los siguientes errores:
          </strong>

          <p className="mt-1">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* ======================================================
          DATOS DE LA PLANTILLA
          ====================================================== */}

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">

        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
          Datos de la plantilla
        </h3>

        <div className="grid gap-5 md:grid-cols-4">

          {/* TEMPORADA */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Temporada
            </label>

            <select
              value={seasonId}
              onChange={(event) =>
                handleSeasonChange(
                  Number(
                    event.target.value
                  )
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value={0}>
                Selecciona temporada
              </option>

              {sortedSeasons.map(
                (season) => (
                  <option
                    key={season.id}
                    value={season.id}
                  >
                    {season.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* COMPETICIÓN */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Competición
            </label>

            <select
              value={competitionId}
              onChange={(event) =>
                handleCompetitionChange(
                  Number(
                    event.target.value
                  )
                )
              }
              disabled={
                !seasonId
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value={0}>
                Selecciona competición
              </option>

              {availableCompetitions.map(
                (
                  competition
                ) => (
                  <option
                    key={
                      competition.id
                    }
                    value={
                      competition.id
                    }
                  >
                    {
                      competition.name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {/* EQUIPO */}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Equipo
            </label>

            <select
              value={teamId}
              onChange={(event) =>
                handleTeamChange(
                  Number(
                    event.target.value
                  )
                )
              }
              disabled={
                !competitionId
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value={0}>
                Selecciona equipo
              </option>

              {availableTeams.map(
                (team) => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {`${team.shortName ?? team.name} - ${team.name}`}
                  </option>
                )
              )}
            </select>
          </div>

          {/* PAÍS PARA TODOS (SOLO SELECCIONES) */}

          {selectedCompetition?.competitionType ===
            "National Team" && (
            <div className="md:col-span-1">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                País para todos
              </label>

              <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={applyCountryToAll}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setApplyCountryToAll(checked);

                    if (!checked) {
                      setGlobalCountryId(0);
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Asignar el mismo país a todos los jugadores nuevos
              </label>

              {applyCountryToAll && (
                <select
                  value={globalCountryId}
                  onChange={(event) =>
                    setGlobalCountryId(
                      Number(event.target.value)
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value={0}>
                    Selecciona país
                  </option>

                  {sortedCountries.map((country) => (
                    <option
                      key={country.id}
                      value={country.id}
                    >
                      {country.name}
                    </option>
                  ))}
                </select>
              )}

              {!applyCountryToAll && (
                <p className="text-xs text-slate-500">
                  Puedes indicar el país de cada jugador en la lista pegada.
                </p>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ======================================================
          PASO 1
          ====================================================== */}

      {step === "players" && (
        <div className="space-y-6">

          <div className="rounded-xl border border-slate-200 p-5">

            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-800">
                Paso 1 · Jugadores
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Pega un jugador por línea con las columnas:
                Nombre, País y Fecha de nacimiento.
                Si estás importando una selección, puedes activar
                la opción "País para todos" y no tendrás que repetir
                el país en cada línea.
                El sistema comprobará cuáles existen
                y creará automáticamente los nuevos.
              </p>
            </div>

            <textarea
              value={playerText}
              onChange={(event) =>
                setPlayerText(
                  event.target.value
                )
              }
              rows={12}
              placeholder={`Josep Martínez\tEspaña\t27/05/1998
Ivan Provedel\tItalia\t17/03/1994
Raffaele Di Gennaro\tItalia\t03/10/1993
Alessandro Bastoni\tItalia\t13/04/1999
Yann Bisseck\tAlemania\t29/11/2000
Manuel Akanji\tSuiza\t19/07/1995
John Stones\tInglaterra\t28/05/1994
Benjamin Pavard\tFrancia\t28/03/1996
Federico Dimarco\tItalia\t10/11/1997
Carlos Augusto\tBrasil\t07/01/1999
Djed Spence\tInglaterra\t09/08/2000
Marcos Llorente
Pedro Porro`}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            />

            <div className="mt-4 flex flex-wrap gap-3">

              <button
                type="button"
                onClick={
                  handleAnalyse
                }
                disabled={
                  analysing ||
                  !playerText.trim()
                }
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {analysing
                  ? "Analizando..."
                  : "Analizar jugadores"}
              </button>

            </div>
          </div>

          {/* RESULTADO */}

          {rows.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-5">

              <div className="mb-4 flex flex-wrap items-center gap-3">

                <h3 className="text-base font-bold text-slate-800">
                  Resultado
                </h3>

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  Existentes:{" "}
                  {existingCount}
                </span>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  Nuevos:{" "}
                  {newCount}
                </span>

                {duplicateCount >
                  0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    Duplicados:{" "}
                    {
                      duplicateCount
                    }
                  </span>
                )}

              </div>

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-3 py-3 font-semibold text-slate-600">
                        Jugador
                      </th>

                      <th className="px-3 py-3 font-semibold text-slate-600">
                        País
                      </th>

                      <th className="px-3 py-3 font-semibold text-slate-600">
                        Fecha de nacimiento
                      </th>

                      <th className="px-3 py-3 font-semibold text-slate-600">
                        Estado
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {rows.map(
                      (
                        row,
                        index
                      ) => (
                        <tr
                          key={`${row.normalizedName}-${index}`}
                          className="border-b border-slate-100"
                        >

                          <td className="px-3 py-3 font-medium text-slate-800">
                            {
                              row.inputName
                            }
                          </td>

                          <td className="px-3 py-3">

                            {row.status ===
                              "existing" && (
                              <span className="font-medium text-green-600">
                                ✓ Ya existe
                              </span>
                            )}

                            {row.status ===
                              "new" && (
                              <span className="font-medium text-blue-600">
                                + Se creará
                              </span>
                            )}

                            {row.status ===
                              "duplicate" && (
                              <span className="font-medium text-red-600">
                                ⚠ Revisar
                              </span>
                            )}

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

              <div className="mt-5 flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={
                    handleCreatePlayersAndSquad
                  }
                  disabled={
                    saving ||
                    duplicateCount >
                      0
                  }
                  className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Creando..."
                    : `Crear jugadores y plantilla (${rows.length})`}
                </button>

              </div>

            </div>
          )}

        </div>
      )}

      {/* ======================================================
          PASO 2
          ====================================================== */}

      {step === "numbers" && (
        <div className="space-y-6">

          <div className="rounded-xl border border-slate-200 p-5">

            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-800">
                Paso 2 · Dorsales y posiciones
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Pega ahora la misma lista,
                incluyendo dorsal y posición.
                El sistema asociará automáticamente
                el dorsal y la posición con cada
                jugador. Si alguna posición no se
                reconoce, podrás seleccionarla
                manualmente.
              </p>
            </div>

            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <strong>
                Ejemplo:
              </strong>

              <pre className="mt-2 whitespace-pre-wrap font-sans">
{`1. David Raya portero
13. Joan Garcia portero
23. Unai Simon portero
2. Marc Pubill lateral derecho
3. Alejandro Grimaldo lateral izquierdo
4. Eric García central
5. Marcos Llorente mediocentro
12. Pedro Porro lateral derecho`}
              </pre>
            </div>

            <textarea
              value={
                shirtNumberText
              }
              onChange={(event) =>
                setShirtNumberText(
                  event.target.value
                )
              }
              rows={12}
              placeholder={`1. David Raya portero
13. Joan Garcia portero
23. Unai Simon portero
2. Marc Pubill lateral derecho`}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            />

            <div className="mt-4 flex flex-wrap gap-3">

              <button
                type="button"
                onClick={
                  handleAnalyseShirtNumbers
                }
                disabled={
                  !shirtNumberText.trim()
                }
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reconocer dorsales y posiciones
              </button>

              <button
                type="button"
                onClick={
                  handleBackToPlayers
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Volver al paso 1
              </button>

            </div>

          </div>

          {/* ==================================================
              TABLA DORSALES + POSICIONES
              ================================================== */}

          <div className="rounded-xl border border-slate-200 p-5">

            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-800">
                Plantilla · Dorsales y posiciones
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Los dorsales y las posiciones
                reconocidas se rellenan
                automáticamente. Puedes corregir
                cualquier dato manualmente.
              </p>
            </div>

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>
                  <tr className="border-b border-slate-200 text-left">

                    <th className="px-3 py-3 font-semibold text-slate-600">
                      Jugador
                    </th>

                    <th className="w-32 px-3 py-3 text-center font-semibold text-slate-600">
                      Dorsal
                    </th>

                    <th className="w-64 px-3 py-3 font-semibold text-slate-600">
                      Posición
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {squadRows.map(
                    (row) => (
                      <tr
                        key={
                          row.playerId
                        }
                        className="border-b border-slate-100"
                      >

                        <td className="px-3 py-3 font-medium text-slate-800">
                          {
                            row.playerName
                          }
                        </td>

                        <td className="px-3 py-3 text-center">

                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={
                              row.shirtNumber
                            }
                            onChange={(
                              event
                            ) => {
                              const value =
                                event.target
                                  .value;

                              setSquadRows(
                                (
                                  current
                                ) =>
                                  current.map(
                                    (
                                      item
                                    ) =>
                                      item.playerId ===
                                      row.playerId
                                        ? {
                                            ...item,
                                            shirtNumber:
                                              value,
                                          }
                                        : item
                                  )
                              );
                            }}
                            className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-center"
                          />

                        </td>

                        <td className="px-3 py-3">

                          <select
                            value={
                              row.positionId
                            }
                            onChange={(
                              event
                            ) =>
                              handlePositionChange(
                                row.playerId,
                                Number(
                                  event.target
                                    .value
                                )
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                          >

                            <option value={0}>
                              Selecciona posición
                            </option>

                            {sortedPositions.map(
                              (
                                position
                              ) => (
                                  <option
                                    key={
                                      position.id
                                    }
                                    value={
                                      position.id
                                    }
                                  >
                                    {
                                      position.name
                                    }
                                  </option>
                                )
                              )}

                          </select>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

            {squadRows.length >
              0 && (
              <div className="mt-5 flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={
                    handleSaveNumbersAndPositions
                  }
                  disabled={
                    saving
                  }
                  className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Guardando..."
                    : "Guardar dorsales y posiciones"}
                </button>

              </div>
            )}

          </div>

        </div>
      )}

      {/* ======================================================
          CANCELAR
          ====================================================== */}

      {onCancel && (
        <div className="mt-6 border-t border-slate-200 pt-5">

          <button
            type="button"
            onClick={
              onCancel
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>

        </div>
      )}

    </div>
  );
}