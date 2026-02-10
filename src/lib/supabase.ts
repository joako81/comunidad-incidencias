import { createClient } from '@supabase/supabase-js';
import { MODO_PRUEBA } from '../config';

// Safely access environment variables by defaulting env to an empty object if undefined
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

// Create client only if we have keys or if we are NOT in test mode (which would imply we expect them)
// If in test mode, we might not have keys, so we create a dummy client or null to avoid crashes if referenced.
export const supabase = (!MODO_PRUEBA && supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to check connection status
export const checkConnection = async () => {
  if (MODO_PRUEBA) return true;
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('incidents').select('count', { count: 'exact', head: true });
    return !error;
  } catch (e) {
    return false;
  }
};