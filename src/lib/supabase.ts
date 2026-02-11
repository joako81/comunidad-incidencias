import { createClient } from "@supabase/supabase-js";
import { MODO_PRUEBA } from "../config";

// Corrección para evitar error de TypeScript con 'env'
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || "";

export const supabase =
  !MODO_PRUEBA && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const checkConnection = async () => {
  if (MODO_PRUEBA) return true;
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("incidents")
      .select("count", { count: "exact", head: true });
    return !error;
  } catch (e) {
    return false;
  }
};
