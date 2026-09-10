"use client";

import {
  useEffect,
  useState,
} from "react";

import StagesTable from "@/components/stages/StagesTable";
import StageForm from "@/components/stages/StageForm";
import DeleteStageDialog from "@/components/stages/DeleteStageDialog";

import {
  deleteStage,
  getStages,
  type Stage,
} from "@/services/stage.service";

export default function StagesPage() {
  /*
   * ============================================================
   * ESTADO DEL FORMULARIO
   * ============================================================
   */

  const [showForm, setShowForm] =
    useState(false);

  const [editingStage, setEditingStage] =
    useState<Stage | undefined>(
      undefined
    );

  const [stageToDelete, setStageToDelete] =
    useState<Stage | undefined>(
      undefined
    );

  /*
   * ============================================================
   * JORNADAS / FASES
   * ============================================================
   */

  const [stages, setStages] =
    useState<Stage[]>([]);

  const [stagesLoading, setStagesLoading] =
    useState(true);

  const [stagesError, setStagesError] =
    useState("");

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   */

  const [refreshKey, setRefreshKey] =
    useState(0);

  /*
   * ============================================================
   * CARGAR JORNADAS / FASES
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadStages() {
      try {
        setStagesLoading(true);
        setStagesError("");

        const data =
          await getStages();

        if (!mounted) {
          return;
        }

        setStages(data);
      } catch (error) {
        console.error(
          "Error cargando jornadas / fases:",
          error
        );

        if (!mounted) {
          return;
        }

        setStages([]);

        setStagesError(
          "No se pudieron cargar las jornadas / fases."
        );
      } finally {
        if (mounted) {
          setStagesLoading(false);
        }
      }
    }

    loadStages();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  /*
   * ============================================================
   * NUEVA JORNADA / FASE
   * ============================================================
   */

  const handleNewStage = () => {
    setEditingStage(undefined);
    setShowForm(true);
  };

  /*
   * ============================================================
   * EDITAR JORNADA / FASE
   * ============================================================
   */

  const handleEditStage = (
    stage: Stage
  ) => {
    setEditingStage(stage);
    setShowForm(true);
  };

  /*
   * ============================================================
   * GUARDAR
   * ============================================================
   */

  const handleSaved = () => {
    setEditingStage(undefined);
    setShowForm(false);

    setRefreshKey(
      (value) => value + 1
    );
  };

  /*
   * ============================================================
   * PREPARAR ELIMINACIÓN
   * ============================================================
   */

  const handleDeleteStage = (
    stage: Stage
  ) => {
    setStageToDelete(stage);
  };

  /*
   * ============================================================
   * CONFIRMAR ELIMINACIÓN
   * ============================================================
   */

  const handleConfirmDelete =
    async () => {
      if (!stageToDelete) {
        return;
      }

      try {
        await deleteStage(
          stageToDelete.id
        );

        setStageToDelete(
          undefined
        );

        setRefreshKey(
          (value) => value + 1
        );
      } catch (error) {
        console.error(
          "Error eliminando jornada / fase:",
          error
        );

        setStagesError(
          "No se pudo eliminar la jornada / fase."
        );
      }
    };

  /*
   * ============================================================
   * CANCELAR FORMULARIO
   * ============================================================
   */

  const handleCancelForm = () => {
    setEditingStage(undefined);
    setShowForm(false);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="w-full p-8">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div className="mb-8 flex items-start justify-between">

        <div>
          <h1 className="text-3xl font-bold">
            Jornadas / Fases
          </h1>

          <p className="mt-2 text-slate-600">
            Gestión de jornadas y fases de Value90
          </p>
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={handleNewStage}
            className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            + Nueva jornada / fase
          </button>
        )}

      </div>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {stagesError && !showForm && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {stagesError}
        </div>
      )}

      {/* ======================================================
          CONTADOR
          ====================================================== */}

      {!showForm && (
        <p className="mb-6 text-slate-700">
          Total de fases y jornadas:{" "}

          <span className="font-semibold">
            {stagesLoading
              ? "Cargando..."
              : stages.length}
          </span>
        </p>
      )}

      {/* ======================================================
          FORMULARIO / TABLA
          ====================================================== */}

      {showForm ? (
        <StageForm
          stage={editingStage}
          onCancel={handleCancelForm}
          onSaved={handleSaved}
        />
      ) : (
        <StagesTable
          key={refreshKey}
          onEdit={handleEditStage}
          onDelete={handleDeleteStage}
        />
      )}

      {/* ======================================================
          DIÁLOGO DE ELIMINACIÓN
          ====================================================== */}

      {stageToDelete && (
        <DeleteStageDialog
          stage={stageToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() =>
            setStageToDelete(
              undefined
            )
          }
        />
      )}

    </div>
  );
}