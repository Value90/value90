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
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [participationsLoading, setParticipationsLoading] = useState(true);
  const [participationsError, setParticipationsError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("manual");
  const [editingParticipation, setEditingParticipation] =
    useState<Participation | undefined>(undefined);
  const [participationToDelete, setParticipationToDelete] =
    useState<Participation | undefined>(undefined);

  const loadParticipations = async () => {
    try {
      setParticipationsLoading(true);
      setParticipationsError("");

      const data = await getParticipations();
      setParticipations(data);
    } catch (error) {
      console.error("Error obteniendo participaciones:", error);
      setParticipations([]);
      setParticipationsError(
        "No se pudieron cargar las participaciones."
      );
    } finally {
      setParticipationsLoading(false);
    }
  };

  useEffect(() => {
    loadParticipations();
  }, []);

  const handleNewParticipation = () => {
    setEditingParticipation(undefined);
    setFormMode("manual");
    setShowForm(true);
  };

  const handleImportFromImage = () => {
    setEditingParticipation(undefined);
    setFormMode("image");
    setShowForm(true);
  };

  const handleEditParticipation = (participation: Participation) => {
    setEditingParticipation(participation);
    setFormMode("manual");
    setShowForm(true);
  };

  const handleSaved = async () => {
    setEditingParticipation(undefined);
    setShowForm(false);
    setFormMode("manual");
    await loadParticipations();
  };

  const handleDeleteParticipation = (participation: Participation) => {
    setParticipationToDelete(participation);
  };

  const handleConfirmDelete = async () => {
    if (!participationToDelete) return;

    try {
      await deleteParticipation(participationToDelete.id);
      setParticipationToDelete(undefined);
      await loadParticipations();
    } catch (error) {
      console.error("Error eliminando participación:", error);
      alert("No se pudo eliminar la participación.");
    }
  };

  const handleCancelForm = () => {
    setEditingParticipation(undefined);
    setShowForm(false);
    setFormMode("manual");
  };

  return (
    <div className="w-full min-w-0 p-3 sm:p-5 md:p-8">
      <div className="mb-6 flex min-w-0 flex-col gap-5 sm:mb-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Participaciones
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Gestión de participaciones de jugadores en partidos de Value90
          </p>
        </div>

        {!showForm && (
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:w-auto">
            <button
              type="button"
              onClick={handleNewParticipation}
              className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto sm:px-5 sm:py-3"
            >
              + Nueva participación
            </button>

            <button
              type="button"
              onClick={handleImportFromImage}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto sm:px-5 sm:py-3"
            >
              Importar desde imagen
            </button>
          </div>
        )}
      </div>

      {participationsError && !showForm && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mb-6 sm:p-4">
          {participationsError}
        </div>
      )}

      {!showForm && !participationsError && (
        <p className="mb-5 text-sm text-slate-700 sm:mb-6 sm:text-base">
          Total de participaciones:{" "}
          <span className="font-semibold">
            {participationsLoading ? "..." : participations.length}
          </span>
        </p>
      )}

      <div className="w-full min-w-0">
        {showForm ? (
          formMode === "image" ? (
            <ParticipationImageImportForm
              onCancel={handleCancelForm}
              onSaved={handleSaved}
            />
          ) : (
            <ParticipationForm
              participation={editingParticipation}
              onCancel={handleCancelForm}
              onSaved={handleSaved}
            />
          )
        ) : (
          !participationsLoading &&
          !participationsError && (
            <ParticipationsTable
              onEdit={handleEditParticipation}
              onDelete={handleDeleteParticipation}
            />
          )
        )}
      </div>

      {!showForm && participationsLoading && (
        <div className="mt-4 rounded-xl bg-white p-5 shadow-sm sm:p-8">
          <p className="text-sm text-slate-500">
            Cargando participaciones...
          </p>
        </div>
      )}

      {participationToDelete && (
        <DeleteParticipationDialog
          participation={participationToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setParticipationToDelete(undefined)}
        />
      )}
    </div>
  );
}
