export interface Stat {
  id: number;

  name: string;

  code: string;

  category:
    | "Ataque"
    | "Pase"
    | "Regate"
    | "Defensa"
    | "Duelos"
    | "Disciplina"
    | "Portería"
    | "Errores";

  dataType:
    | "INTEGER"
    | "DECIMAL"
    | "BOOLEAN";

  unit?: string;

  displayOrder: number;

  active: boolean;
}