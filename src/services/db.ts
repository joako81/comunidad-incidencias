import { MODO_PRUEBA, STORAGE_KEYS, DEFAULT_CATEGORIES } from '../config';
import { supabase } from '../lib/supabase';
import { Incident, User, DataResponse, IncidentStatus, IncidentNote, AppConfig, SortOptionConfig, UserFieldConfig } from '../types';
import { MOCK_INCIDENTS, MOCK_USERS } from './mockData';

const DEFAULT_SORT_OPTIONS: SortOptionConfig[] = [
    { id: 'def_1', label: 'Más recientes', field: 'created_at', direction: 'desc', active: true },
    { id: 'def_2', label: 'Más antiguas', field: 'created_at', direction: 'asc', active: true },
    { id: 'def_3', label: 'Prioridad (Alta a Baja)', field: 'priority', direction: 'desc', active: true }, 
    { id: 'def_4', label: 'Estado', field: 'status', direction: 'asc', active: true },
    { id: 'def_5', label: 'Última actualización', field: 'updated_at', direction: 'desc', active: false }
];

const DEFAULT_USER_FIELDS: UserFieldConfig[] = [
    { id: 'uf_user', key: 'username', label: 'Nombre de Usuario', placeholder: 'juan.perez', active: true, isSystem: true },
    { id: 'uf_pass', key: 'password', label: 'Contraseña', placeholder: '••••••••', active: true, isSystem: true },
    { id: 'uf_email', key: 'email', label: 'Correo Electrónico', placeholder: 'tu@email.com', active: true, isSystem: true },
    { id: 'uf_name', key: 'full_name', label: 'Nombre Completo', placeholder: 'Juan Pérez', active: true, isSystem: true },
    { id: 'uf_house', key: 'house_number', label: 'Piso / Puerta', placeholder: 'Ej: 4º B', active: true, isSystem: true },
    { id: 'uf_role', key: 'role', label: 'Rol', placeholder: 'Seleccionar rol', active: true, isSystem: true }, // Only relevant for admin creation
];

const DEFAULT_PENDING_MSG = "Estamos esperando que tengas confirmación por parte del administrador para acceder a todas las funcionalidades.";

// --- INITIALIZATION ---
const initializeLocalStorage = () => {
  if (typeof window === 'undefined') return;
  
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(MOCK_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.INCIDENTS)) {
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(MOCK_INCIDENTS));
  }
  
  // Initialize App Config if not exists
  if (!localStorage.getItem('cvc38_config')) {
      const initialConfig: AppConfig = {
          categories: DEFAULT_CATEGORIES,
          sortOptions: DEFAULT_SORT_OPTIONS,
          userFields: DEFAULT_USER_FIELDS,
          pendingAccountMessage: DEFAULT_PENDING_MSG
      };
      localStorage.setItem('cvc38_config', JSON.stringify(initialConfig));
  } else {
      // MIGRATION: 
      const existing = JSON.parse(localStorage.getItem('cvc38_config') || '{}');
      let updated = false;
      
      if (!existing.userFields) {
          existing.userFields = DEFAULT_USER_FIELDS;
          // Migrate old custom fields string array to new object structure
          if (existing.userCustomFields && Array.isArray(existing.userCustomFields)) {
              existing.userCustomFields.forEach((field: string, idx: number) => {
                  existing.userFields.push({
                      id: `uf_cust_legacy_${idx}`,
                      key: field, 
                      label: field,
                      placeholder: `Valor para ${field}`,
                      active: true,
                      isSystem: false
                  });
              });
          }
          updated = true;
      }

      if (!existing.pendingAccountMessage) {
          existing.pendingAccountMessage = DEFAULT_PENDING_MSG;
          updated = true;
      }

      if (updated) localStorage.setItem('cvc38_config', JSON.stringify(existing));
  }
};

if (MODO_PRUEBA) {
  initializeLocalStorage();
}

// --- CONFIGURATION SERVICES ---

export const dbGetAppConfig = async (): Promise<AppConfig> => {
    if (MODO_PRUEBA) {
        const stored = localStorage.getItem('cvc38_config');
        if (stored) return JSON.parse(stored);
        return { 
            categories: DEFAULT_CATEGORIES, 
            sortOptions: DEFAULT_SORT_OPTIONS, 
            userFields: DEFAULT_USER_FIELDS,
            pendingAccountMessage: DEFAULT_PENDING_MSG 
        };
    }
    return { 
        categories: DEFAULT_CATEGORIES, 
        sortOptions: DEFAULT_SORT_OPTIONS, 
        userFields: DEFAULT_USER_FIELDS,
        pendingAccountMessage: DEFAULT_PENDING_MSG 
    };
}

export const dbSaveAppConfig = async (config: AppConfig): Promise<boolean> => {
    if (MODO_PRUEBA) {
        localStorage.setItem('cvc38_config', JSON.stringify(config));
        return true;
    }
    return false;
}

// --- AUTH SERVICES ---

export const dbLogin = async (identifier: string, password?: string): Promise<DataResponse<User>> => {
  if (MODO_PRUEBA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    const user = users.find((u: User) => 
        (u.email && u.email.toLowerCase() === identifier.toLowerCase()) || 
        (u.username && u.username.toLowerCase() === identifier.toLowerCase())
    );
    
    if (user) {
        if (user.password && user.password !== password) {
            return { data: null, error: 'Contraseña incorrecta' };
        }
        // MODIFIED: Allow pending users to login so UI can show the block screen
        if (user.status === 'rejected') {
            return { data: null, error: 'Su cuenta ha sido denegada o desactivada por el administrador.' };
        }
        
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
        return { data: user, error: null };
    }
    
    return { data: null, error: 'Usuario no encontrado' };
  } else {
      return { data: null, error: "Not implemented" };
  }
};

export const dbLogout = async () => {
  if (MODO_PRUEBA) {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } else {
    if (supabase) await supabase.auth.signOut();
  }
};

export const dbGetSession = async (): Promise<User | null> => {
  if (MODO_PRUEBA) {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    return session ? JSON.parse(session) : null;
  } 
  return null;
};

export const dbCreateUser = async (user: Omit<User, 'id' | 'status'>): Promise<DataResponse<User>> => {
    if (MODO_PRUEBA) {
        await new Promise(resolve => setTimeout(resolve, 800));
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        
        if (!user.username) return { data: null, error: 'El nombre de usuario es obligatorio.' };
        if (!user.password) return { data: null, error: 'La contraseña es obligatoria.' };

        if (users.find((u: User) => u.username && u.username.toLowerCase() === user.username.toLowerCase())) {
            return { data: null, error: 'El nombre de usuario ya está en uso.' };
        }

        if (user.email && users.find((u: User) => u.email && u.email.toLowerCase() === user.email.toLowerCase())) {
            return { data: null, error: 'El correo electrónico ya está registrado.' };
        }
        
        const newUser: User = { 
            ...user, 
            id: `u-${Date.now()}`,
            status: 'pending' // Always created as pending
        };
        
        users.push(newUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        
        // Simulate sending email to admin
        console.log(`[SYSTEM EMAIL] To: Admin | Subject: Nueva petición de usuario | Body: El usuario ${newUser.username} (${newUser.email}) ha solicitado acceso.`);

        return { data: newUser, error: null };
    } else {
        return { data: null, error: 'Backend registration not implemented' };
    }
}

export const dbGetPendingUsers = async (): Promise<User[]> => {
    if (MODO_PRUEBA) {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        return users.filter((u: User) => u.status === 'pending');
    }
    return [];
}

export const dbApproveUser = async (userId: string, approve: boolean): Promise<boolean> => {
    if (MODO_PRUEBA) {
        let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        const index = users.findIndex((u: User) => u.id === userId);
        
        if (index !== -1) {
            if (approve) {
                users[index].status = 'active';
            } else {
                // Remove user if rejected (or could set status='rejected' if history needed)
                users.splice(index, 1); 
            }
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            return true;
        }
        return false;
    }
    return false;
}

export const dbUpdateUser = async (userId: string, updates: Partial<User>): Promise<DataResponse<boolean>> => {
    if (MODO_PRUEBA) {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        const index = users.findIndex((u: User) => u.id === userId);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            
            const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION) || '{}');
            if (session.id === userId) {
                localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(users[index]));
            }
            return { data: true, error: null };
        }
        return { data: false, error: 'Usuario no encontrado' };
    }
    return { data: false, error: 'Not implemented in prod mode' };
}

// ... Rest of services remain unchanged ...
export const dbGetCategories = async (): Promise<string[]> => {
    if (MODO_PRUEBA) {
        const config = await dbGetAppConfig();
        return config.categories;
    } else {
        return DEFAULT_CATEGORIES;
    }
}

export const dbAddCategory = async (category: string): Promise<boolean> => {
    if (MODO_PRUEBA) {
        const config = await dbGetAppConfig();
        if (!config.categories.includes(category)) {
            config.categories.push(category);
            await dbSaveAppConfig(config);
        }
        return true;
    }
    return false;
}

export const dbGetIncidents = async (): Promise<DataResponse<Incident[]>> => {
  if (MODO_PRUEBA) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const incidents = JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || '[]');
    incidents.sort((a: Incident, b: Incident) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { data: incidents, error: null };
  } else {
    return { data: null, error: "Supabase not configured" };
  }
};

export const dbCreateIncident = async (incident: Omit<Incident, 'id' | 'created_at' | 'updated_at' | 'notes'>): Promise<DataResponse<Incident>> => {
  if (MODO_PRUEBA) {
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
        const incidents = JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || '[]');
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        const creator = users.find((u: User) => u.id === incident.user_id);

        const newIncident: Incident = {
          ...incident,
          id: `inc-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_name: creator?.full_name || 'Desconocido',
          user_house: creator?.house_number || '',
          notes: []
        };
        
        incidents.unshift(newIncident);
        localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
        
        return { data: newIncident, error: null };
    } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
             return { data: null, error: 'QuotaExceededError: El almacenamiento local está lleno.' };
        }
        return { data: null, error: 'Error desconocido al guardar.' };
    }
  } else {
    return { data: null, error: "Supabase not configured" };
  }
};

export const dbUpdateIncidentStatus = async (id: string, status: IncidentStatus): Promise<DataResponse<boolean>> => {
  if (MODO_PRUEBA) {
    const incidents = JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || '[]');
    const index = incidents.findIndex((i: Incident) => i.id === id);
    if (index !== -1) {
      incidents[index].status = status;
      incidents[index].updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
      return { data: true, error: null };
    }
    return { data: false, error: 'Incident not found' };
  } else {
    return { data: null, error: "Supabase not configured" };
  }
};

export const dbAddNote = async (incidentId: string, noteContent: string, authorName: string): Promise<DataResponse<IncidentNote>> => {
    if (MODO_PRUEBA) {
        const incidents = JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || '[]');
        const index = incidents.findIndex((i: Incident) => i.id === incidentId);
        if (index !== -1) {
            const newNote: IncidentNote = {
                id: `n-${Date.now()}`,
                content: noteContent,
                author_name: authorName,
                created_at: new Date().toISOString()
            };
            if (!incidents[index].notes) incidents[index].notes = [];
            incidents[index].notes.push(newNote);
            incidents[index].updated_at = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
            return { data: newNote, error: null };
        }
        return { data: null, error: "Incidencia no encontrada" };
    } else {
         return { data: null, error: "Backend notes not implemented" };
    }
}

export const dbDeleteIncident = async (id: string): Promise<DataResponse<boolean>> => {
    if (MODO_PRUEBA) {
        let incidents = JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || '[]');
        const newIncidents = incidents.filter((i: Incident) => i.id !== id);
        localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(newIncidents));
        return { data: true, error: null };
    } else {
        return { data: null, error: "Supabase not configured" };
    }
}

export const dbSendBatchEmail = async (incidentIds: string[], message: string): Promise<DataResponse<boolean>> => {
    if (MODO_PRUEBA) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { data: true, error: null };
    }
    return { data: false, error: "Not implemented in prod" };
}