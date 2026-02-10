// Cambiar a false para conectar con Supabase en Producción
export const MODO_PRUEBA = true; 

export const APP_NAME = "Comunidad Valle del Cabriel 38";
export const STORAGE_KEYS = {
  USERS: 'cvc38_users',
  INCIDENTS: 'cvc38_incidents',
  SESSION: 'cvc38_session',
  CATEGORIES: 'cvc38_categories'
};

export const DEFAULT_CATEGORIES = [
  'General',
  'Limpieza',
  'Jardinería',
  'Electricidad',
  'Fontanería',
  'Ascensores',
  'Pintura',
  'Suelos/Pavimento'
];