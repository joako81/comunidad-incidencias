import { MODO_PRUEBA, STORAGE_KEYS, DEFAULT_CATEGORIES } from "../config";
import { supabase } from "../lib/supabase";
import {
  Incident,
  User,
  DataResponse,
  IncidentStatus,
  IncidentNote,
  AppConfig,
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
    if (!supabase)
      return {
        data: null,
        error: "Error de conexión: Verifica las claves en Netlify",
      };

    // 1. Login en Auth
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password: password || "",
    });

    if (error)
      return { data: null, error: "Usuario o contraseña incorrectos." };
    if (!authData.user) return { data: null, error: "No se pudo autenticar." };

    // 2. Obtener Perfil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    // 3. Verificaciones de seguridad
    if (profileError || !profile) {
      console.error(
        "Login Error: Usuario Auth existe pero no tiene Perfil.",
        profileError,
      );
      await supabase.auth.signOut();
      return {
        data: null,
        error:
          "Tu usuario no tiene ficha de vecino. Contacta al administrador.",
      };
    }

    if (profile.status === "pending") {
      await supabase.auth.signOut();
      return { data: null, error: "Tu cuenta está pendiente de aprobación." };
    }

    if (profile.status === "rejected") {
      await supabase.auth.signOut();
      return { data: null, error: "Tu solicitud ha sido rechazada." };
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
    return { data: newUser as User, error: null };
  } else {
    if (!supabase) return { data: null, error: "Error de conexión" };

    // --- CORRECCIÓN CRÍTICA APLICADA AQUÍ ---
    // Ahora sí enviamos los metadatos (nombre, casa) para que el Trigger los lea
    const { data, error } = await supabase.auth.signUp({
      email: user.email || "",
      password: user.password || "",
      options: {
        data: {
          username: user.username,
          full_name: user.full_name, // IMPORTANTE
          house_number: user.house_number, // IMPORTANTE
        },
      },
    });

    if (error) return { data: null, error: error.message };

    if (data.user) {
      return {
        data: { ...user, id: data.user.id, status: "pending" } as User,
        error: null,
      };
    }

    return { data: null, error: "No se recibió respuesta del servidor." };
  }
};

export const dbGetSession = async (): Promise<User | null> => {
  if (MODO_PRUEBA)
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION) || "null");
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    return data as User;
  }
  return null;
};

export const dbLogout = async () => {
  if (MODO_PRUEBA) localStorage.removeItem(STORAGE_KEYS.SESSION);
  else if (supabase) await supabase.auth.signOut();
};

export const dbUpdateUser = async (
  userId: string,
  data: Partial<User>,
): Promise<DataResponse<boolean>> => {
  if (!supabase) return { data: true, error: null };
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
  incident: Partial<Incident>,
): Promise<DataResponse<Incident>> => {
  if (MODO_PRUEBA) return { data: incident as Incident, error: null };
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
): Promise<DataResponse<boolean>> => {
  if (!supabase) return { data: true, error: null };
  const { error } = await supabase
    .from("incidents")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { data: !error, error: error?.message || null };
};

export const dbDeleteIncident = async (
  id: string,
): Promise<DataResponse<boolean>> => {
  if (!supabase) return { data: true, error: null };
  const { error } = await supabase.from("incidents").delete().eq("id", id);
  return { data: !error, error: error?.message || null };
};

export const dbAddNote = async (
  incidentId: string,
  content: string,
  authorName: string,
): Promise<DataResponse<IncidentNote>> => {
  if (MODO_PRUEBA) return { data: null, error: null };
  if (!supabase) return { data: null, error: "No connection" };

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

// --- ADMIN / USERS ---

export const dbGetPendingUsers = async (): Promise<User[]> => {
  if (MODO_PRUEBA) return [];
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "pending");
  return (data as User[]) || [];
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
