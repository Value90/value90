import { supabase } from "@/lib/supabase";

export interface Country {
  id: number;
  name: string;
  code: string;
  fifaCode: string;
  continent: string;
}

/*
 * ============================================================
 * OBTENER PAÍSES
 * ============================================================
 */

export async function getCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error(
      "Error obteniendo países:",
      error
    );

    throw error;
  }

  return (data ?? []).map((country) => ({
    id: country.id,
    name: country.name,
    code: country.code,
    fifaCode: country.fifa_code,
    continent: country.continent,
  }));
}

/*
 * ============================================================
 * CREAR PAÍS
 * ============================================================
 */

export async function addCountry(
  country: Omit<Country, "id">
): Promise<Country> {
  const { data, error } = await supabase
    .from("countries")
    .insert({
      name: country.name,
      code: country.code,
      fifa_code: country.fifaCode,
      continent: country.continent,
    })
    .select()
    .single();

if (error) {
  console.error(
    "Error creando país:",
    JSON.stringify(error, null, 2)
  );

  throw error;
}

  return {
    id: data.id,
    name: data.name,
    code: data.code,
    fifaCode: data.fifa_code,
    continent: data.continent,
  };
}

/*
 * ============================================================
 * ACTUALIZAR PAÍS
 * ============================================================
 */

export async function updateCountry(
  id: number,
  changes: Omit<Country, "id">
): Promise<Country | undefined> {
  const { data, error } = await supabase
    .from("countries")
    .update({
      name: changes.name,
      code: changes.code,
      fifa_code: changes.fifaCode,
      continent: changes.continent,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(
      "Error actualizando país:",
      error
    );

    throw error;
  }

  if (!data) {
    return undefined;
  }

  return {
    id: data.id,
    name: data.name,
    code: data.code,
    fifaCode: data.fifa_code,
    continent: data.continent,
  };
}

/*
 * ============================================================
 * ELIMINAR PAÍS
 * ============================================================
 */

export async function deleteCountry(
  id: number
): Promise<boolean> {
  const { error } = await supabase
    .from("countries")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(
      "Error eliminando país:",
      error
    );

    throw error;
  }

  return true;
}