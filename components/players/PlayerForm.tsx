"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addPlayer,
  updatePlayer,
  type Player,
} from "@/services/player.service";

import {
  getCountries,
} from "@/services/country.service";

interface PlayerFormProps {
  player?: Player;
  onCancel: () => void;
  onSaved: () => void;
}

export default function PlayerForm({
  player,
  onCancel,
  onSaved,
}: PlayerFormProps) {
  /*
   * ============================================================
   * DATOS DEL FORMULARIO
   * ============================================================
   */

  const [countries, setCountries] =
    useState<
      Awaited<
        ReturnType<typeof getCountries>
      >
    >([]);

  /*
   * ============================================================
   * ESTADO DEL FORMULARIO
   * ============================================================
   */

  const [name, setName] =
    useState(
      player?.name ?? ""
    );

  const [shortName, setShortName] =
    useState(
      player?.shortName ?? ""
    );

  const [countryId, setCountryId] =
    useState(
      player?.countryId?.toString() ?? ""
    );

  const [birthDate, setBirthDate] =
    useState(
      player?.birthDate ?? ""
    );

  const [active, setActive] =
    useState(
      player?.active ?? true
    );

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

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

        const countriesData =
          await getCountries();

        if (!mounted) {
          return;
        }

        setCountries(
          countriesData
        );
      } catch (error) {
        console.error(
          "Error cargando datos del formulario:",
          error
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
   * PAÍSES ORDENADOS ALFABÉTICAMENTE
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
              sensitivity: "base",
            }
          )
      );
    }, [countries]);

  /*
   * ============================================================
   * GUARDAR
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
        "El nombre del jugador es obligatorio."
      );

      return;
    }

    /*
     * ==========================================================
     * NOMBRE CORTO
     * ==========================================================
     */

    if (!shortName.trim()) {
      setError(
        "El nombre corto es obligatorio."
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
     * FECHA DE NACIMIENTO
     * ==========================================================
     */

    if (!birthDate) {
      setError(
        "Debes introducir la fecha de nacimiento."
      );

      return;
    }

    /*
     * ==========================================================
     * DATOS DEL JUGADOR
     * ==========================================================
     *
     * IMPORTANTE:
     *
     * Ya NO guardamos:
     *
     * - teamId
     * - shirtNumber
     * - positionId
     *
     * Estos datos pertenecen al historial
     * hist_player_team.
     * ==========================================================
     */

    const playerData: Omit<
      Player,
      "id"
    > = {
      name:
        name.trim(),

      shortName:
        shortName.trim(),

      countryId:
        Number(countryId),

      birthDate,

      active,
    };

    /*
     * ==========================================================
     * GUARDAR EN SUPABASE
     * ==========================================================
     */

    setSaving(true);

    try {
      if (player) {
        await updatePlayer(
          player.id,
          playerData
        );
      } else {
        await addPlayer(
          playerData
        );
      }

      onSaved();
    } catch (error) {
      console.error(
        "Error guardando jugador:",
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
          "No se pudo guardar el jugador."
        );
      }
    } finally {
      setSaving(false);
    }
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
          {player
            ? "Editar jugador"
            : "Nuevo jugador"}
        </h2>

        <p className="mt-4 text-sm text-slate-500">
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
          {player
            ? "Editar jugador"
            : "Nuevo jugador"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {player
            ? "Modifica los datos del jugador."
            : "Introduce los datos del nuevo jugador."}
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

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* ==================================================
            NOMBRE
            ================================================== */}

        <div>

          <label
            htmlFor="player-name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Nombre
          </label>

          <input
            id="player-name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(
                event.target.value
              )
            }
            placeholder="Ej. Lamine Yamal"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
          />

        </div>

        {/* ==================================================
            NOMBRE CORTO
            ================================================== */}

        <div>

          <label
            htmlFor="player-short-name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Nombre corto
          </label>

          <input
            id="player-short-name"
            type="text"
            value={shortName}
            onChange={(event) =>
              setShortName(
                event.target.value
              )
            }
            placeholder="Ej. L. Yamal"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
          />

        </div>

        {/* ==================================================
            PAÍS
            ================================================== */}

        <div>

          <label
            htmlFor="player-country"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            País
          </label>

          <select
            id="player-country"
            value={countryId}
            onChange={(event) =>
              setCountryId(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >

            <option value="">
              Selecciona un país
            </option>

            {sortedCountries.map(
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

        {/* ==================================================
            FECHA DE NACIMIENTO
            ================================================== */}

        <div>

          <label
            htmlFor="player-birth-date"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Fecha de nacimiento
          </label>

          <input
            id="player-birth-date"
            type="date"
            value={birthDate}
            onChange={(event) =>
              setBirthDate(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
          />

        </div>

        {/* ==================================================
            ACTIVO
            ================================================== */}

        <div className="flex items-center gap-3">

          <input
            id="player-active"
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
            htmlFor="player-active"
            className="text-sm font-medium text-slate-700"
          >
            Jugador activo
          </label>

        </div>

        {/* ==================================================
            BOTONES
            ================================================== */}

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
              countries.length === 0
            }
            className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : player
              ? "Guardar cambios"
              : "Crear jugador"}
          </button>

        </div>

      </form>
    </div>
  );
}