import type { Stat } from "@/types/stat";

export const stats: Stat[] = [

  // ATAQUE

  {
    id: 1,
    name: "Goles",
    code: "goals",
    category: "Ataque",
    dataType: "INTEGER",
    displayOrder: 1,
    active: true,
  },

  {
    id: 2,
    name: "Asistencias",
    code: "assists",
    category: "Ataque",
    dataType: "INTEGER",
    displayOrder: 2,
    active: true,
  },

  {
    id: 3,
    name: "Tiros",
    code: "shots",
    category: "Ataque",
    dataType: "INTEGER",
    displayOrder: 3,
    active: true,
  },

  {
    id: 4,
    name: "Tiros a puerta",
    code: "shots_on_target",
    category: "Ataque",
    dataType: "INTEGER",
    displayOrder: 4,
    active: true,
  },

  // PASE

  {
    id: 5,
    name: "Pases",
    code: "passes",
    category: "Pase",
    dataType: "INTEGER",
    displayOrder: 5,
    active: true,
  },

  {
    id: 6,
    name: "Pases completados",
    code: "passes_completed",
    category: "Pase",
    dataType: "INTEGER",
    displayOrder: 6,
    active: true,
  },

  // REGATE

  {
    id: 7,
    name: "Regates",
    code: "dribbles",
    category: "Regate",
    dataType: "INTEGER",
    displayOrder: 7,
    active: true,
  },

  {
    id: 8,
    name: "Regates completados",
    code: "dribbles_completed",
    category: "Regate",
    dataType: "INTEGER",
    displayOrder: 8,
    active: true,
  },

  // DEFENSA

  {
    id: 9,
    name: "Intercepciones",
    code: "interceptions",
    category: "Defensa",
    dataType: "INTEGER",
    displayOrder: 9,
    active: true,
  },

  {
    id: 10,
    name: "Despejes",
    code: "clearances",
    category: "Defensa",
    dataType: "INTEGER",
    displayOrder: 10,
    active: true,
  },

  // DUELOS

  {
    id: 11,
    name: "Duelos",
    code: "duels",
    category: "Duelos",
    dataType: "INTEGER",
    displayOrder: 11,
    active: true,
  },

  {
    id: 12,
    name: "Duelos ganados",
    code: "duels_won",
    category: "Duelos",
    dataType: "INTEGER",
    displayOrder: 12,
    active: true,
  },

  // DISCIPLINA

  {
    id: 13,
    name: "Faltas cometidas",
    code: "fouls_committed",
    category: "Disciplina",
    dataType: "INTEGER",
    displayOrder: 13,
    active: true,
  },

  {
    id: 14,
    name: "Faltas recibidas",
    code: "fouls_suffered",
    category: "Disciplina",
    dataType: "INTEGER",
    displayOrder: 14,
    active: true,
  },

  {
    id: 15,
    name: "Tarjetas amarillas",
    code: "yellow_cards",
    category: "Disciplina",
    dataType: "INTEGER",
    displayOrder: 15,
    active: true,
  },

  {
    id: 16,
    name: "Tarjetas rojas",
    code: "red_cards",
    category: "Disciplina",
    dataType: "INTEGER",
    displayOrder: 16,
    active: true,
  },

  // PORTERÍA

  {
    id: 17,
    name: "Paradas",
    code: "saves",
    category: "Portería",
    dataType: "INTEGER",
    displayOrder: 17,
    active: true,
  },

  {
    id: 18,
    name: "Goles encajados",
    code: "goals_conceded",
    category: "Portería",
    dataType: "INTEGER",
    displayOrder: 18,
    active: true,
  },

  // ERRORES

  {
    id: 19,
    name: "Errores que provocan tiro",
    code: "errors_leading_to_shot",
    category: "Errores",
    dataType: "INTEGER",
    displayOrder: 19,
    active: true,
  },

  {
    id: 20,
    name: "Errores que provocan gol",
    code: "errors_leading_to_goal",
    category: "Errores",
    dataType: "INTEGER",
    displayOrder: 20,
    active: true,
  },

];