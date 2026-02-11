export type UserRole = "admin" | "supervisor" | "user";
export type UserStatus = "active" | "pending" | "rejected";

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  full_name?: string;
  house_number?: string;
  receive_emails?: boolean;
  custom_fields?: Record<string, string>; // Campos dinámicos
}

export interface IncidentNote {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export type AttachmentType = "image" | "video";

export interface Attachment {
  id: string;
  type: AttachmentType;
  url: string;
  name: string;
}

export type IncidentStatus =
  | "pendiente"
  | "en_proceso"
  | "resuelto"
  | "rechazado";
export type IncidentPriority = "baja" | "media" | "alta" | "urgente";

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  location: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_name?: string;
  user_house?: string;
  attachments?: Attachment[];
  assigned_to?: string;
  notes?: IncidentNote[];
}

// --- CONFIGURACIÓN DE VISTA (RECUPERADO) ---
export interface IncidentViewConfig {
  showLocation: boolean;
  showDate: boolean;
  showUser: boolean;
  showPriority: boolean;
  showCategory: boolean;
}

export interface AuthResponse {
  user: User | null;
  error: string | null;
}

export interface DataResponse<T> {
  data: T | null;
  error: string | null;
}

// --- CONFIGURATION TYPES ---

export type SortDirection = "asc" | "desc";

export interface SortOptionConfig {
  id: string;
  label: string;
  field: keyof Incident;
  direction: SortDirection;
  active: boolean;
}

export interface UserFieldConfig {
  id: string;
  key: string;
  label: string;
  placeholder: string;
  active: boolean;
  isSystem: boolean;
}

export interface AppConfig {
  categories: string[];
  sortOptions: SortOptionConfig[];
  userFields: UserFieldConfig[];
  pendingAccountMessage: string;
  viewConfig?: IncidentViewConfig; // AÑADIDO PARA PERSISTENCIA
}
