"use client";

import { useEffect, useMemo, useState } from "react";

import {
  addTeam,
  updateTeam,
  type Team,
} from "@/services/team.service";

import {
  getCountries,
  type Country,
} from "@/services/country.service";

import {
  getCompetitions,
  type Competition,
} from "@/services/competition.service";

import {
  getSeasons,
  type Season,
} from "@/services/season.service";

import {
  getTeamCompetitionsByTeamAndSeason,
  saveTeamCompetitions,
  deleteTeamCompetition,
} from "@/services/team-competition.service";

interface TeamFormProps {
  team?: Team;
  onCancel: () => void;
}

export default function TeamForm({
  team,
  onCancel,
}: TeamFormProps) {
  /*
   * ============================================================
   * ESTADO DEL FORMULARIO
   * ============================================================
   */

  const [name, setName] = useState(
    team?.name ?? ""
  );

  const [shortName, setShortName] = useState(
    team?.shortName ?? ""
  );

  const [countryId, setCountryId] = useState(
    team?.countryId ?? 0
  );

  /*
   * ============================================================
   * LIGA
   * ============================================================
   *
   * Un club puede pertenecer a una competición de tipo League.
   *
   * Las selecciones nacionales no pertenecen a una liga.
   *
   * Por eso utilizamos:
   *
   * number | null
   * ============================================================
   */

  const [competitionId, setCompetitionId] =
    useState<number | null>(
      team?.competitionId ?? null
    );

  /*
   * ============================================================
   * COMPETICIONES POR TEMPORADA
   * ============================================================
   *
   * Un equipo puede participar en varias competiciones durante
   * una misma temporada. Estas relaciones se guardan en:
   *
   * hist_team_competitions
   * ============================================================
   */

  const [seasonId, setSeasonId] =
    useState<number>(0);

  const [selectedCompetitionIds, setSelectedCompetitionIds] =
    useState<number[]>([]);

  const [loadingTeamCompetitions, setLoadingTeamCompetitions] =
    useState(false);

  const [confederation, setConfederation] =
    useState(
      team?.confederation ?? ""
    );

  const [city, setCity] = useState(
    team?.city ?? ""
  );

  const [stadium, setStadium] = useState(
    team?.stadium ?? ""
  );

  const [type, setType] = useState<
    "Club" | "Selección"
  >(
    team?.type ?? "Club"
  );

  const [active, setActive] = useState(
    team?.active ?? true
  );

  const [displayOrder, setDisplayOrder] =
    useState(
      team?.displayOrder ?? 1
    );

  /*
   * ============================================================
   * DATOS AUXILIARES
   * ============================================================
   */

  const [countries, setCountries] =
    useState<Country[]>([]);

  const [competitions, setCompetitions] =
    useState<Competition[]>([]);

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [loadingData, setLoadingData] =
    useState(true);

  const [error, setError] = useState("");

  const [saving, setSaving] =
    useState(false);

  /*
   * ============================================================
   * CARGAR PAÍSES Y LIGAS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoadingData(true);
        setError("");

        const [
          countriesData,
          competitionsData,
          seasonsData,
        ] = await Promise.all([
          getCountries(),
          getCompetitions(),
          getSeasons(),
        ]);

        if (!mounted) {
          return;
        }

        setCountries(
          countriesData
        );

        setCompetitions(
          competitionsData
        );

        setSeasons(
          seasonsData
        );

        /*
         * Seleccionamos por defecto la temporada activa más
         * reciente. Esto permite gestionar las competiciones
         * del equipo nada más abrir el formulario.
         */
        const activeSeasons = seasonsData
          .filter((season) => season.active)
          .sort((a, b) =>
            b.name.localeCompare(a.name, "es", {
              numeric: true,
              sensitivity: "base",
            })
          );

        if (activeSeasons.length > 0) {
          setSeasonId(activeSeasons[0].id);
        }

        /*
         * Si estamos creando un equipo y todavía
         * no hay país seleccionado, seleccionamos
         * el primer país disponible.
         *
         * Los países se ordenarán posteriormente
         * alfabéticamente en availableCountries.
         */

        if (
          !team &&
          countriesData.length > 0
        ) {
          setCountryId(
            countriesData[0].id
          );
        }
      } catch (error) {
        console.error(
          "Error cargando datos del formulario:",
          error
        );

        if (!mounted) {
          return;
        }

        setError(
          "No se pudieron cargar los datos necesarios."
        );
      } finally {
        if (mounted) {
          setLoadingData(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [team]);

  /*
   * ============================================================
   * TEMPORADAS DISPONIBLES
   * ============================================================
   */

  const availableSeasons =
    useMemo(() => {
      return seasons
        .filter((season) => season.active)
        .sort((a, b) =>
          b.name.localeCompare(a.name, "es", {
            numeric: true,
            sensitivity: "base",
          })
        );
    }, [seasons]);

  /*
   * ============================================================
   * CARGAR COMPETICIONES DEL EQUIPO PARA LA TEMPORADA
   * ============================================================
   */

  useEffect(() => {
    if (!team || !seasonId) {
      if (!team) {
        setSelectedCompetitionIds(
          competitionId ? [competitionId] : []
        );
      }
      return;
    }

    let mounted = true;

    async function loadTeamCompetitions() {
      try {
        setLoadingTeamCompetitions(true);
        setError("");

        const relations =
          await getTeamCompetitionsByTeamAndSeason(
            team!.id,
            seasonId
          );

        if (!mounted) {
          return;
        }

        if (relations.length > 0) {
          setSelectedCompetitionIds(
            relations
              .filter((item) => item.active)
              .map((item) => item.competitionId)
          );
        } else if (team!.competitionId) {
          /*
           * Compatibilidad con equipos antiguos: si todavía no
           * existe una relación en hist_team_competitions, usamos
           * la competición principal guardada en teams.
           */
          setSelectedCompetitionIds([
            team!.competitionId,
          ]);
        } else {
          setSelectedCompetitionIds([]);
        }
      } catch (error) {
        console.error(
          "Error cargando competiciones del equipo:",
          error
        );

        if (mounted) {
          setSelectedCompetitionIds(
            team?.competitionId
              ? [team.competitionId]
              : []
          );
        }
      } finally {
        if (mounted) {
          setLoadingTeamCompetitions(false);
        }
      }
    }

    loadTeamCompetitions();

    return () => {
      mounted = false;
    };
  }, [team, seasonId]);

  /*
   * ============================================================
   * COMPETICIONES DE LA TEMPORADA
   * ============================================================
   *
   * Para clubes mostramos competiciones de clubes.
   * Para selecciones mostramos competiciones de selecciones.
   * ============================================================
   */

  const availableSeasonCompetitions =
    useMemo(() => {
      return competitions
        .filter((competition) => competition.active)
        .filter((competition) =>
          type === "Club"
            ? competition.competitionType !==
              "National Team"
            : competition.competitionType ===
              "National Team"
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name, "es", {
            sensitivity: "base",
          })
        );
    }, [competitions, type]);

  const handleSeasonCompetitionToggle = (
    competitionIdToToggle: number
  ) => {
    setSelectedCompetitionIds((current) => {
      if (current.includes(competitionIdToToggle)) {
        return current.filter(
          (id) => id !== competitionIdToToggle
        );
      }

      return [
        ...current,
        competitionIdToToggle,
      ];
    });
  };

  /*
   * ============================================================
   * PAÍSES ORDENADOS ALFABÉTICAMENTE
   * ============================================================
   */

  const availableCountries =
    useMemo(() => {
      return [...countries].sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "es",
            {
              sensitivity: "base",
            }
          )
      );
    }, [countries]);

  /*
   * ============================================================
   * LIGAS DISPONIBLES
   * ============================================================
   *
   * Solo:
   *
   * - competitionType === "League"
   * - active === true
   *
   * Y ordenadas alfabéticamente.
   * ============================================================
   */

  const availableLeagues =
    useMemo(() => {
      return competitions
        .filter(
          (competition) =>
            competition.competitionType ===
              "League" &&
            competition.active
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              "es",
              {
                sensitivity: "base",
              }
            )
        );
    }, [competitions]);

  /*
   * ============================================================
   * CAMBIO DE TIPO
   * ============================================================
   *
   * Si cambiamos de Club a Selección:
   *
   * - No debe existir una liga asociada.
   *
   * Si volvemos a Club:
   *
   * - Se podrá seleccionar una liga.
   * ============================================================
   */

  const handleTypeChange = (
    value: "Club" | "Selección"
  ) => {
    setType(value);

    if (value === "Selección") {
      setCompetitionId(null);
      setSelectedCompetitionIds([]);
    }
  };

  /*
   * ============================================================
   * GUARDAR EQUIPO
   * ============================================================
   */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    /*
     * ==========================================================
     * NOMBRE
     * ==========================================================
     */

    if (!name.trim()) {
      setError(
        "El nombre del equipo es obligatorio."
      );

      return;
    }

    /*
     * ==========================================================
     * ABREVIATURA
     * ==========================================================
     */

    if (!shortName.trim()) {
      setError(
        "La abreviatura es obligatoria."
      );

      return;
    }

    /*
     * ==========================================================
     * PAÍS
     * ==========================================================
     */

    if (!countryId) {
      setError(
        "Debes seleccionar un país."
      );

      return;
    }

    /*
     * ==========================================================
     * LIGA
     * ==========================================================
     *
     * Solo es obligatoria para los clubes.
     * ==========================================================
     */

    if (
      type === "Club" &&
      !competitionId
    ) {
      setError(
        "Debes seleccionar una liga para el club."
      );

      return;
    }

    /*
     * ==========================================================
     * VALIDAR QUE LA COMPETICIÓN SEA UNA LIGA
     * ==========================================================
     */

    if (
      type === "Club" &&
      competitionId
    ) {
      const selectedLeague =
        availableLeagues.find(
          (competition) =>
            competition.id ===
            competitionId
        );

      if (!selectedLeague) {
        setError(
          "La competición seleccionada no es una liga válida."
        );

        return;
      }
    }

    /*
     * ==========================================================
     * TEMPORADA Y COMPETICIONES
     * ==========================================================
     */

    if (!seasonId) {
      setError(
        "Debes seleccionar una temporada."
      );

      return;
    }

    if (
      selectedCompetitionIds.length === 0
    ) {
      setError(
        type === "Club"
          ? "Debes seleccionar al menos una competición para el club."
          : "Debes seleccionar al menos una competición para la selección."
      );

      return;
    }

    /*
     * ==========================================================
     * CONFEDERACIÓN
     * ==========================================================
     */

    if (!confederation) {
      setError(
        "Debes seleccionar una confederación."
      );

      return;
    }

    /*
     * ==========================================================
     * ORDEN DE VISUALIZACIÓN
     * ==========================================================
     */

    if (
      team &&
      displayOrder < 1
    ) {
      setError(
        "El orden de visualización debe ser mayor que 0."
      );

      return;
    }

    /*
     * ==========================================================
     * GUARDAR
     * ==========================================================
     */

    setSaving(true);

    try {
      /*
       * ========================================================
       * VALOR FINAL DE LA LIGA
       * ========================================================
       *
       * Club       → competitionId
       * Selección  → null
       * ========================================================
       */

      const finalCompetitionId =
        type === "Club"
          ? competitionId
          : null;

      /*
       * ========================================================
       * CREAR
       * ========================================================
       *
       * displayOrder se genera automáticamente
       * dentro de addTeam().
       * ========================================================
       */

      let savedTeamId: number;

      if (!team) {
        const createdTeam = await addTeam({
          name: name.trim(),

          shortName:
            shortName.trim(),

          countryId,

          competitionId:
            finalCompetitionId,

          confederation,

          city: city.trim(),

          stadium:
            stadium.trim(),

          type,

          active,
        });

        savedTeamId = createdTeam.id;
      } else {
        await updateTeam(
          team.id,
          {
            name: name.trim(),

            shortName:
              shortName.trim(),

            countryId,

            competitionId:
              finalCompetitionId,

            confederation,

            city: city.trim(),

            stadium:
              stadium.trim(),

            type,

            active,

            displayOrder,
          }
        );

        savedTeamId = team.id;
      }

      /*
       * ========================================================
       * GUARDAR COMPETICIONES DE LA TEMPORADA
       * ========================================================
       *
       * Primero eliminamos las relaciones existentes de esta
       * temporada que ya no estén seleccionadas y después hacemos
       * upsert de las seleccionadas.
       *
       * Esto permite marcar y desmarcar competiciones sin crear
       * duplicados gracias a la restricción UNIQUE de la tabla.
       * ========================================================
       */

      const existingRelations =
        await getTeamCompetitionsByTeamAndSeason(
          savedTeamId,
          seasonId
        );

      const selectedSet =
        new Set(selectedCompetitionIds);

      const relationsToDelete =
        existingRelations.filter(
          (relation) =>
            !selectedSet.has(
              relation.competitionId
            )
        );

      await Promise.all(
        relationsToDelete.map((relation) =>
          deleteTeamCompetition(
            savedTeamId,
            relation.competitionId,
            seasonId
          )
        )
      );

      if (selectedCompetitionIds.length > 0) {
        await saveTeamCompetitions(
          selectedCompetitionIds.map(
            (selectedCompetitionId) => ({
              teamId: savedTeamId,
              competitionId:
                selectedCompetitionId,
              seasonId,
              active: true,
            })
          )
        );
      }

      /*
       * ========================================================
       * CERRAR FORMULARIO
       * ========================================================
       */

      onCancel();
    } catch (error) {
      console.error(
        "Error guardando equipo:",
        error
      );

      if (
        error &&
        typeof error === "object" &&
        "message" in error
      ) {
        setError(
          String(
            (
              error as {
                message: unknown;
              }
            ).message
          )
        );
      } else {
        setError(
          "No se pudo guardar el equipo."
        );
      }
    } finally {
      setSaving(false);
    }
  };

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
          {team
            ? "Editar equipo"
            : "Nuevo equipo"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {team
            ? "Modifica los datos del equipo."
            : "Introduce los datos del nuevo equipo."}
        </p>

      </div>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ======================================================
          FORMULARIO
          ====================================================== */}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* ====================================================
            NOMBRE
            ==================================================== */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Nombre
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) =>
              setName(
                event.target.value
              )
            }
            placeholder="Ej. Real Madrid"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
          />

        </div>

        {/* ====================================================
            ABREVIATURA
            ==================================================== */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Abreviatura
          </label>

          <input
            type="text"
            value={shortName}
            onChange={(event) =>
              setShortName(
                event.target.value
              )
            }
            placeholder="Ej. RMA"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
          />

        </div>

        {/* ====================================================
            PAÍS
            ==================================================== */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            País
          </label>

          <select
            value={countryId}
            onChange={(event) =>
              setCountryId(
                Number(
                  event.target.value
                )
              )
            }
            disabled={loadingData}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >

            <option value={0}>
              {loadingData
                ? "Cargando países..."
                : "Selecciona un país"}
            </option>

            {availableCountries.map(
              (country) => (
                <option
                  key={country.id}
                  value={country.id}
                >
                  {country.name}
                </option>
              )
            )}

          </select>

        </div>

        {/* ====================================================
            LIGA
            ==================================================== */}

        <div>

          <label
            htmlFor="team-competition"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Liga
          </label>

          <select
            id="team-competition"
            value={
              competitionId ?? ""
            }
            onChange={(event) =>
              setCompetitionId(
                event.target.value
                  ? Number(
                      event.target.value
                    )
                  : null
              )
            }
            disabled={
              loadingData ||
              type === "Selección"
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >

            <option value="">
              {type === "Selección"
                ? "No aplica para selecciones"
                : loadingData
                ? "Cargando ligas..."
                : availableLeagues.length ===
                  0
                ? "No hay ligas disponibles"
                : "Selecciona una liga"}
            </option>

            {availableLeagues.map(
              (competition) => (
                <option
                  key={competition.id}
                  value={competition.id}
                >
                  {competition.name}
                </option>
              )
            )}

          </select>

          {type === "Club" &&
            availableLeagues.length ===
              0 && (
              <p className="mt-2 text-xs text-amber-600">
                No hay ligas activas creadas.
              </p>
            )}

          {type === "Selección" && (
            <p className="mt-2 text-xs text-slate-500">
              Las selecciones nacionales no pertenecen a una liga.
            </p>
          )}

        </div>

        {/* ====================================================
            COMPETICIONES POR TEMPORADA
            ==================================================== */}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Competiciones por temporada
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Un equipo puede participar en varias competiciones durante una misma temporada.
            </p>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Temporada
            </label>

            <select
              value={seasonId}
              onChange={(event) =>
                setSeasonId(
                  Number(event.target.value)
                )
              }
              disabled={
                loadingData ||
                saving ||
                loadingTeamCompetitions
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value={0}>
                {loadingData
                  ? "Cargando temporadas..."
                  : "Selecciona una temporada"}
              </option>

              {availableSeasons.map((season) => (
                <option
                  key={season.id}
                  value={season.id}
                >
                  {season.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Competiciones
              </label>

              {loadingTeamCompetitions && (
                <span className="text-xs text-slate-500">
                  Cargando...
                </span>
              )}
            </div>

            {availableSeasonCompetitions.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
                No hay competiciones activas disponibles.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {availableSeasonCompetitions.map(
                  (competition) => {
                    const checked =
                      selectedCompetitionIds.includes(
                        competition.id
                      );

                    return (
                      <label
                        key={competition.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-sm transition ${
                          checked
                            ? "border-slate-400 bg-slate-100"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            handleSeasonCompetitionToggle(
                              competition.id
                            )
                          }
                          disabled={
                            !seasonId ||
                            saving ||
                            loadingTeamCompetitions
                          }
                          className="h-4 w-4"
                        />

                        <span className="text-slate-700">
                          {competition.name}
                        </span>
                      </label>
                    );
                  }
                )}
              </div>
            )}
          </div>

        </div>

        {/* ====================================================
            CONFEDERACIÓN
            ==================================================== */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Confederación
          </label>

          <select
            value={confederation}
            onChange={(event) =>
              setConfederation(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500"
          >

            <option value="">
              Selecciona una confederación
            </option>

            <option value="UEFA">
              UEFA
            </option>

            <option value="CONMEBOL">
              CONMEBOL
            </option>

            <option value="CONCACAF">
              CONCACAF
            </option>

            <option value="CAF">
              CAF
            </option>

            <option value="AFC">
              AFC
            </option>

            <option value="OFC">
              OFC
            </option>

          </select>

        </div>

        {/* ====================================================
            CIUDAD
            ==================================================== */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Ciudad
          </label>

          <input
            type="text"
            value={city}
            onChange={(event) =>
              setCity(
                event.target.value
              )
            }
            placeholder="Ej. Madrid"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
          />

        </div>

        {/* ====================================================
            ESTADIO
            ==================================================== */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Estadio
          </label>

          <input
            type="text"
            value={stadium}
            onChange={(event) =>
              setStadium(
                event.target.value
              )
            }
            placeholder="Ej. Santiago Bernabéu"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
          />

        </div>

        {/* ====================================================
            TIPO
            ==================================================== */}

        <div>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Tipo
          </label>

          <select
            value={type}
            onChange={(event) =>
              handleTypeChange(
                event.target.value as
                  | "Club"
                  | "Selección"
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500"
          >

            <option value="Club">
              Club
            </option>

            <option value="Selección">
              Selección
            </option>

          </select>

        </div>

        {/* ====================================================
            ORDEN DE VISUALIZACIÓN
            ==================================================== */}

        {team && (
          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Orden de visualización
            </label>

            <input
              type="number"
              min="1"
              value={displayOrder}
              onChange={(event) =>
                setDisplayOrder(
                  Number(
                    event.target.value
                  )
                )
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
            />

            <p className="mt-1 text-xs text-slate-500">
              Determina la posición del equipo en la lista.
            </p>

          </div>
        )}

        {!team && (
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            El orden de visualización se asignará automáticamente.
          </div>
        )}

        {/* ====================================================
            ACTIVO
            ==================================================== */}

        <div className="flex items-center gap-3">

          <input
            id="team-active"
            type="checkbox"
            checked={active}
            onChange={(event) =>
              setActive(
                event.target.checked
              )
            }
            className="h-4 w-4"
          />

          <label
            htmlFor="team-active"
            className="text-sm font-medium text-slate-700"
          >
            Equipo activo
          </label>

        </div>

        {/* ====================================================
            BOTONES
            ==================================================== */}

        <div className="flex justify-end gap-3 border-t pt-6">

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={
              saving ||
              loadingData ||
              loadingTeamCompetitions
            }
            className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : team
              ? "Guardar cambios"
              : "Crear equipo"}
          </button>

        </div>

      </form>

    </div>
  );
}