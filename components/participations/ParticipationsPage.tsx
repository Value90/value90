"use client";

import { useEffect, useState } from "react";

import ParticipationsTable from "@/components/participations/ParticipationsTable";
import ParticipationForm from "@/components/participations/ParticipationForm";
import ParticipationImageImportForm from "@/components/participations/ParticipationImageImportForm";
import DeleteParticipationDialog from "@/components/participations/DeleteParticipationDialog";

import {
  deleteParticipation,
  getParticipations,
  type Participation,
} from "@/services/participation.service";

type FormMode = "manual" | "image";

export default function ParticipationsPage() {
  /*
   * ============================================================
   * ESTADO
   * ============================================================
   */

  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [participationsLoading, setParticipationsLoading] =
    useState(true);

  const [participationsError, setParticipationsError] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [formMode, setFormMode] =
    useState<FormMode>("manual");

  const [editingParticipation, setEditingParticipation] =
    useState<Participation | undefined>(
      undefined
    );

  const [participationToDelete, setParticipationToDelete] =
    useState<Participation | undefined>(
      undefined
    );

  /*
   * ============================================================
   * CARGAR PARTICIPACIONES
   * ============================================================
   */

  const loadParticipations = async () => {
    try {
      setParticipationsLoading(true);
      setParticipationsError("");

      const data = await getParticipations();

      setParticipations(data);
    } catch (error) {
      console.error(
        "Error obteniendo participaciones:",
        error
      );

      setParticipations([]);

      setParticipationsError(
        "No se pudieron cargar las participaciones."
      );
    } finally {
      setParticipationsLoading(false);
    }
  };

  /*
   * ============================================================
   * CARGA INICIAL
   * ============================================================
   */

  useEffect(() => {
    loadParticipations();
  }, []);

  /*
   * ============================================================
   * NUEVA PARTICIPACIÓN MANUAL
   * ============================================================
   */

  const handleNewParticipation = () => {
    setEditingParticipation(undefined);
    setFormMode("manual");
    setShowForm(true);
  };

  /*
   * ============================================================
   * IMPORTAR PARTICIPACIONES DESDE IMAGEN
   * ============================================================
   */

  const handleImportFromImage = () => {
    setEditingParticipation(undefined);
    setFormMode("image");
    setShowForm(true);
  };

  /*
   * ============================================================
   * EDITAR PARTICIPACIÓN
   * ============================================================
   */

  const handleEditParticipation = (
    participation: Participation
  ) => {
    setEditingParticipation(participation);

    // La edición siempre se realiza desde
    // el formulario manual.
    setFormMode("manual");
    setShowForm(true);
  };

  /*
   * ============================================================
   * FINALIZAR / GUARDADO
   * ============================================================
   *
   * Tanto el formulario manual como el de
   * importación desde imagen llaman a esta
   * función cuando terminan correctamente.
   */

  const handleSaved = async () => {
    setEditingParticipation(undefined);

    setShowForm(false);
    setFormMode("manual");

    await loadParticipations();
  };

  /*
   * ============================================================
   * ELIMINAR PARTICIPACIÓN
   * ============================================================
   */

  const handleDeleteParticipation = (
    participation: Participation
  ) => {
    setParticipationToDelete(participation);
  };

  /*
   * ============================================================
   * CONFIRMAR ELIMINACIÓN
   * ============================================================
   */

  const handleConfirmDelete = async () => {
    if (!participationToDelete) {
      return;
    }

    try {
      await deleteParticipation(
        participationToDelete.id
      );

      setParticipationToDelete(undefined);

      await loadParticipations();
    } catch (error) {
      console.error(
        "Error eliminando participación:",
        error
      );

      alert(
        "No se pudo eliminar la participación."
      );
    }
  };

  /*
   * ============================================================
   * CANCELAR FORMULARIO
   * ============================================================
   */

  const handleCancelForm = () => {
    setEditingParticipation(undefined);

    setShowForm(false);
    setFormMode("manual");
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
            Participaciones
          </h1>

          <p className="mt-2 text-slate-600">
            Gestión de participaciones de
            jugadores en partidos de Value90
          </p>

        </div>

        {!showForm && (
          <div className="flex gap-3">

            <button
              type="button"
              onClick={
                handleNewParticipation
              }
              className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              + Nueva participación
            </button>

            <button
              type="button"
              onClick={
                handleImportFromImage
              }
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Importar desde imagen
            </button>

          </div>
        )}

      </div>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {participationsError &&
        !showForm && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {participationsError}
          </div>
        )}

      {/* ======================================================
          CONTADOR
          ====================================================== */}

      {!showForm &&
        !participationsError && (
          <p className="mb-6 text-slate-700">

            Total de participaciones:{" "}

            <span className="font-semibold">
              {participationsLoading
                ? "..."
                : participations.length}
            </span>

          </p>
        )}

      {/* ======================================================
          FORMULARIO / TABLA
          ====================================================== */}

      {showForm ? (

        formMode === "image" ? (

          <ParticipationImageImportForm
            onCancel={
              handleCancelForm
            }
            onSaved={
              handleSaved
            }
          />

        ) : (

          <ParticipationForm
            participation={
              editingParticipation
            }
            onCancel={
              handleCancelForm
            }
            onSaved={
              handleSaved
            }
          />

        )

      ) : (

        !participationsLoading &&
        !participationsError && (
          <ParticipationsTable
            onEdit={
              handleEditParticipation
            }
            onDelete={
              handleDeleteParticipation
            }
          />
        )

      )}

      {/* ======================================================
          CARGANDO
          ====================================================== */}

      {!showForm &&
        participationsLoading && (
          <div className="rounded-xl bg-white p-8 shadow-sm">

            <p className="text-sm text-slate-500">
              Cargando participaciones...
            </p>

          </div>
        )}

      {/* ======================================================
          DIÁLOGO DE ELIMINACIÓN
          ====================================================== */}

      {participationToDelete && (
        <DeleteParticipationDialog
          participation={
            participationToDelete
          }
          onConfirm={
            handleConfirmDelete
          }
          onCancel={() =>
            setParticipationToDelete(
              undefined
            )
          }
        />
      )}

    </div>
  );
}