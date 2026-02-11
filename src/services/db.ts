import { MODO_PRUEBA, STORAGE_KEYS, DEFAULT_CATEGORIES } from "../config";
import { supabase } from "../lib/supabase";
import {
  Incident,
  User,
  DataResponse,
  IncidentStatus,
  IncidentNote,
  AppConfig,
  SortOptionConfig,
  UserFieldConfig,
} from "../types";
import { MOCK_INCIDENTS, MOCK_USERS } from "./mockData";

const DEFAULT_PENDING_MSG = "Tu cuenta está pendiente de aprobación.";

const DEFAULT_CONFIG: AppConfig = {
  categories: DEFAULT_CATEGORIES,
  sortOptions: [],
  userFields: [],
  pendingAccountMessage: DEFAULT_PENDING_MSG,
};

// --- AUTHENTICATION ---

export const dbLogin = async (
  identifier: string,
  password?: string,
): Promise<DataResponse<User>> => {
  if (MODO_PRUEBA) {
    const user = MOCK_USERS.find(
      (u) =>
        (u.email === identifier || u.username === identifier) &&
        u.password === password,
    );
    if (user) return { data: user, error: null };
    return { data: null, error: "Credenciales inválidas (Modo Prueba)" };
  } else {
    if (!supabase) return { data: null, error: "Error de conexión" };
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password: password || "",
    });
    if (error) return { data: null, error: error.message };

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();
    if (profile?.status === "pending") {
      await supabase.auth.signOut();
      return { data: null, error: "Cuenta pendiente de aprobación." };
    }
    return { data: profile as User, error: null };
  }
};

export const dbCreateUser = async (
  user: Partial<User>,
): Promise<DataResponse<User>> => {
  if (MODO_PRUEBA) {
    const newUser = {
      ...user,
      id: `u${Date.now()}`,
      status: "pending" as const,
    };
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
    stored.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(stored));
    return { data: newUser as User, error: null };
  } else {
    if (!supabase) return { data: null, error: "Error de conexión" };

    // 1. REGISTRO EN SUPABASE AUTH (Con Metadatos para el Trigger)
    const { data, error } = await supabase.auth.signUp({
      email: user.email || "",
      password: user.password || "",
      options: {
        data: {
          username: user.username,
          full_name: user.full_name, // IMPORTANTE: Enviamos esto para el Trigger
          house_number: user.house_number, // IMPORTANTE: Enviamos esto para el Trigger
        },
      },
    });

    if (error) return { data: null, error: error.message };

    // Si el Trigger de SQL funciona bien, el perfil ya se habrá creado solo.
    // Devolvemos los datos básicos simulando éxito.
    if (data.user) {
      return {
        data: {
          id: data.user.id,
          email: user.email!,
          role: "user",
          status: "pending",
          username: user.username!,
          full_name: user.full_name,
          house_number: user.house_number,
        } as User,
        error: null,
      };
    }

    return { data: null, error: "No se pudo crear el usuario." };
  }
};

export const dbGetSession = async (): Promise<User | null> => {
  if (MODO_PRUEBA)
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION) || "null");
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();
  return data as User;
};

export const dbLogout = async () => {
  if (MODO_PRUEBA) localStorage.removeItem(STORAGE_KEYS.SESSION);
  else if (supabase) await supabase.auth.signOut();
};

export const dbUpdateUser = async (
  userId: string,
  data: Partial<User>,
): Promise<DataResponse<boolean>> => {
  if (!supabase) return { data: true, error: null }; // En prueba no hacemos nada
  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", userId);
  return { data: !error, error: error?.message || null };
};

// --- INCIDENTS ---

export const dbGetIncidents = async (): Promise<DataResponse<Incident[]>> => {
  if (MODO_PRUEBA) return { data: MOCK_INCIDENTS, error: null };
  if (!supabase) return { data: null, error: "No connection" };
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false });
  return { data: data as Incident[], error: error?.message || null };
};

export const dbCreateIncident = async (
  incident: Omit<Incident, "id" | "created_at" | "updated_at" | "notes">,
): Promise<DataResponse<Incident>> => {
  if (MODO_PRUEBA) return { data: null, error: null };
  if (!supabase) return { data: null, error: "No connection" };
  const { data, error } = await supabase
    .from("incidents")
    .insert([
      {
        ...incident,
        status: "pendiente",
        attachments: incident.attachments || [],
        notes: [],
      },
    ])
    .select()
    .single();
  return { data: data as Incident, error: error?.message || null };
};

export const dbUpdateIncidentStatus = async (
  id: string,
  status: IncidentStatus,
): Promise<DataResponse<Incident>> => {
  if (!supabase) return { data: null, error: "No connection" };
  const { data, error } = await supabase
    .from("incidents")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  return { data: data as Incident, error: error?.message || null };
};

export const dbDeleteIncident = async (
  id: string,
): Promise<DataResponse<boolean>> => {
  if (!supabase) return { data: null, error: "No connection" };
  const { error } = await supabase.from("incidents").delete().eq("id", id);
  return { data: !error, error: error?.message || null };
};

export const dbAddNote = async (
  incidentId: string,
  content: string,
  authorName: string,
): Promise<DataResponse<IncidentNote>> => {
  if (MODO_PRUEBA)
    return {
      data: {
        id: "n-1",
        content,
        author_name: authorName,
        created_at: new Date().toISOString(),
      },
      error: null,
    };
  if (!supabase) return { data: null, error: "No connection" };

  // Obtener notas actuales
  const { data: inc } = await supabase
    .from("incidents")
    .select("notes")
    .eq("id", incidentId)
    .single();
  const currentNotes = inc?.notes || [];
  const newNote = {
    id: `n-${Date.now()}`,
    content,
    author_name: authorName,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("incidents")
    .update({ notes: [...currentNotes, newNote] })
    .eq("id", incidentId);
  return { data: newNote, error: error?.message || null };
};

// --- ADMIN / USERS (Las funciones que te faltaban) ---

export const dbGetPendingUsers = async (): Promise<User[]> => {
  // DIAGNÓSTICO: Ver si está entrando aquí y en qué modo
  console.log("--- BUSCANDO USUARIOS PENDIENTES ---");
  console.log("Modo Prueba:", MODO_PRUEBA);

  if (MODO_PRUEBA) {
    console.log("Devolviendo array vacío por Modo Prueba");
    return [];
  }

  if (!supabase) {
    console.error("ERROR CRÍTICO: No hay conexión con Supabase");
    return [];
  }

  // Traemos los perfiles con estado 'pending'
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "pending");

  if (error) {
    console.error("ERROR SQL AL BUSCAR:", error.message);
  } else {
    console.log("RESULTADO SUPABASE:", data);
    console.log("Usuarios encontrados:", data?.length || 0);
  }

  return (data as User[]) || [];
};

export const dbApproveUser = async (
  userId: string,
  approve: boolean,
): Promise<DataResponse<boolean>> => {
  if (!supabase) return { data: false, error: "No connection" };
  if (approve) {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", userId);
    return { data: !error, error: error?.message || null };
  } else {
    // En Supabase Auth no podemos borrar usuarios desde el cliente fácilmente sin una Edge Function,
    // así que cambiamos el estado a 'rejected'
    const { error } = await supabase
      .from("profiles")
      .update({ status: "rejected" })
      .eq("id", userId);
    return { data: !error, error: error?.message || null };
  }
};

export const dbSendBatchEmail = async (
  ids: string[],
  msg: string,
): Promise<DataResponse<boolean>> => {
  console.log("Simulando envío de email:", ids);
  return { data: true, error: null };
};

// --- CONFIG ---

export const dbGetAppConfig = async (): Promise<AppConfig> => {
  if (MODO_PRUEBA) return DEFAULT_CONFIG;
  if (!supabase) return DEFAULT_CONFIG;
  const { data } = await supabase
    .from("app_config")
    .select("config_json")
    .limit(1)
    .single();
  if (data) return { ...DEFAULT_CONFIG, ...data.config_json };
  return DEFAULT_CONFIG;
};

export const dbSaveAppConfig = async (
  config: AppConfig,
): Promise<DataResponse<boolean>> => {
  if (MODO_PRUEBA) return { data: true, error: null };
  if (!supabase) return { data: false, error: "No connection" };
  const { error } = await supabase
    .from("app_config")
    .upsert({ id: 1, config_json: config });
  return { data: !error, error: error?.message || null };
};

export const dbGetCategories = async (): Promise<string[]> => {
  const config = await dbGetAppConfig();
  return config.categories;
};

export const dbAddCategory = async (
  cat: string,
): Promise<DataResponse<boolean>> => {
  const config = await dbGetAppConfig();
  if (!config.categories.includes(cat)) {
    config.categories.push(cat);
    return dbSaveAppConfig(config);
  }
  return { data: true, error: null };
};

export const dbGetAllUsers = async (): Promise<User[]> => {
  if (MODO_PRUEBA) return MOCK_USERS;
  if (!supabase) return [];

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "active");

  return (data as User[]) || [];
};
