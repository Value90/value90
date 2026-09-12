"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  addStage,
  updateStage,
  getStages,
  type Stage,
} from "@/services/stage.service";

import {
  getSeasons,
  type Season,
} from "@/services/season.service";

interface StageFormProps {
  stage?: Stage;
  onCancel: () => void;
  onSaved: () => void;
}

export default function StageForm({
  stage,
  onCancel,
  onSaved,
}: StageFormProps) {
  /*
   * ============================================================
   * DATOS
   * ============================================================
   */

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [seasonsLoading, setSeasonsLoading] =
    useState(true);

  /*
   * ============================================================
   * CAMPOS DEL FORMULARIO
   * ============================================================
   */

  const [name, setName] =
    useState(stage?.name ?? "");

  const [seasonId, setSeasonId] =
    useState(stage?.seasonId ?? 0);

  const [active, setActive] =
    useState(stage?.active ?? true);

  const [error, setError] =
    useState("");

  /*
   * ============================================================
   * CARGAR TEMPORADAS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadSeasons() {
      try {
        setSeasonsLoading(true);
        setError("");

        const data =
          await getSeasons();

        if (!mounted) {
          return;
        }

        setSeasons(data);

        /*
         * Si estamos creando una nueva fase y todavía
         * no hay temporada seleccionada, seleccionamos
         * la primera temporada activa.
         */

        if (!stage) {
          const firstActiveSeason =
            data.find(
              (season) =>
                season.active
            );

          if (
            firstActiveSeason &&
            !seasonId
          ) {
            setSeasonId(
              firstActiveSeason.id
            );
          }
        }
      } catch (loadError) {
        console.error(
          "Error cargando temporadas:",
          loadError
        );

        if (mounted) {
          setSeasons([]);

          setError(
            "No se pudieron cargar las temporadas."
          );
        }
      } finally {
        if (mounted) {
          setSeasonsLoading(false);
        }
      }
    }

    loadSeasons();

    return () => {
      mounted = false;
    };
  }, [stage]);

  /*
   * ============================================================
   * ACTUALIZAR CAMPOS AL EDITAR
   * ============================================================
   */

  useEffect(() => {
    if (!stage) {
      return;
    }

    setName(stage.name);
    setSeasonId(stage.seasonId);
    setActive(stage.active);
  }, [stage]);

  /*
   * ============================================================
   * TEMPORADAS DISPONIBLES
   * ============================================================
   */

  const availableSeasons =
    seasons.filter(
      (season) =>
        season.active
    );

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
     * ========================================================
     * NOMBRE
     * ========================================================
     */

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      setError(
        "El nombre de la jornada/fase es obligatorio."
      );

      return;
    }

    /*
     * ========================================================
     * TEMPORADA
     * ========================================================
     */

    if (!seasonId) {
      setError(
        "Debes seleccionar una temporada."
      );

      return;
    }

    /*
     * ========================================================
     * CALCULAR ORDEN AUTOMÁTICAMENTE
     * ========================================================
     */

    try {
      let displayOrder =
        stage?.displayOrder ?? 1;

      /*
       * Al crear una nueva jornada/fase:
       *
       * buscamos las existentes de esa temporada
       * y colocamos la nueva al final.
       */

      if (!stage) {
        const existingStages =
          await getStages();

        const seasonStages =
          existingStages.filter(
            (item) =>
              item.seasonId ===
              seasonId
          );

        if (
          seasonStages.length > 0
        ) {
          const maxOrder =
            Math.max(
              ...seasonStages.map(
                (item) =>
                  item.displayOrder
              )
            );

          displayOrder =
            maxOrder + 1;
        }
      }

      /*
       * ======================================================
       * DATOS
       * ======================================================
       */

      const stageData:
        Omit<Stage, "id"> = {
        name: trimmedName,
        seasonId,
        displayOrder,
        active,
      };

      /*
       * ======================================================
       * GUARDAR
       * ======================================================
       */

      if (stage) {
        await updateStage(
          stage.id,
          stageData
        );
      } else {
        await addStage(
          stageData
        );
      }

      onSaved();
    } catch (saveError) {
      console.error(
        "Error guardando jornada/fase:",
        saveError
      );

      setError(
        "No se pudo guardar la jornada/fase."
      );
    }
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full min-w-0 rounded-xl border bg-white p-3 shadow sm:p-5 md:p-6">

      {/* CABECERA */}

      <div className="mb-5 sm:mb-6">

        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
          {stage
            ? "Editar jornada/fase"
            : "Nueva jornada/fase"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {stage
            ? "Modifica los datos de la jornada o fase."
            : "Introduce los datos de la nueva jornada o fase."}
        </p>

      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-6 sm:p-4">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="min-w-0 space-y-5 sm:space-y-6"
      >

        {/* NOMBRE */}

        <div className="min-w-0">

          <label
            htmlFor="stage-name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Nombre
          </label>

          <input
            id="stage-name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(
                event.target.value
              )
            }
            placeholder="Ej. Jornada 1"
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 sm:px-4"
            required
          />

        </div>

        {/* TEMPORADA */}

        <div className="min-w-0">

          <label
            htmlFor="stage-season"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Temporada
          </label>

          <select
            id="stage-season"
            value={seasonId}
            onChange={(event) =>
              setSeasonId(
                Number(
                  event.target.value
                )
              )
            }
            disabled={seasonsLoading}
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 sm:px-4"
            required
          >

            <option value={0}>
              {seasonsLoading
                ? "Cargando temporadas..."
                : availableSeasons.length === 0
                  ? "No hay temporadas activas"
                  : "Selecciona una temporada"}
            </option>

            {availableSeasons.map(
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

        {/* ACTIVA */}

        <div>

          <label className="flex cursor-pointer items-center gap-3">

            <input
              type="checkbox"
              checked={active}
              onChange={(event) =>
                setActive(
                  event.target.checked
                )
              }
              className="h-4 w-4 shrink-0"
            />

            <span className="text-sm font-medium text-slate-700">
              Jornada / fase activa
            </span>

          </label>

        </div>

        {/* BOTONES */}

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end sm:pt-6">

          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:w-auto"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={
              seasonsLoading ||
              availableSeasons.length === 0
            }
            className="w-full rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {stage
              ? "Guardar cambios"
              : "Crear jornada/fase"}
          </button>

        </div>

      </form>
    </div>
  );
}