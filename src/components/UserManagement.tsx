import React, { useState, useEffect } from 'react';
import { User, UserRole, UserFieldConfig } from '../types';
import { dbCreateUser, dbGetAppConfig } from '../services/db';
import { Save, UserPlus, AlertCircle, Mail, ArrowLeft, AtSign, AlignLeft } from 'lucide-react';

interface UserManagementProps {
  onUserCreated: () => void;
  onCancel: () => void;
  userRole?: UserRole;
}

const UserManagement: React.FC<UserManagementProps> = ({ onUserCreated, onCancel, userRole }) => {
  // We store all values in a single map for flexibility, but we'll extract specific ones for the DB call
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [role, setRole] = useState<UserRole>('user');
  const [receiveEmails, setReceiveEmails] = useState(true);
  
  const [fieldsConfig, setFieldsConfig] = useState<UserFieldConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
      dbGetAppConfig().then(config => {
          setFieldsConfig(config.userFields || []);
          // Initialize defaults just in case, mainly for role if not in config
          setRole('user');
      });
  }, []);

  const handleChange = (key: string, value: string) => {
      setFormValues(prev => ({...prev, [key]: value}));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Extract core fields from the dynamic map
    const username = formValues['username'] || '';
    const password = formValues['password'] || '';
    const email = formValues['email'] || '';
    const fullName = formValues['full_name'] || '';
    const houseNumber = formValues['house_number'] || '';
    
    // Extract custom fields (everything that is NOT a system key)
    const systemKeys = ['username', 'password', 'email', 'full_name', 'house_number', 'role'];
    const custom_fields: Record<string, string> = {};
    
    // Iterate over CONFIG to find active custom fields and get their values
    fieldsConfig.forEach(field => {
        if (!systemKeys.includes(field.key) && field.active) {
            custom_fields[field.label] = formValues[field.key] || '';
        }
    });

    const { error } = await dbCreateUser({
      email,
      username,
      full_name: fullName,
      house_number: houseNumber,
      role, // Role is managed by separate state mostly
      receive_emails: receiveEmails,
      custom_fields,
      password
    });

    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error });
    } else {
      setMessage({ type: 'success', text: 'Usuario creado correctamente.' });
      setFormValues({});
      setRole('user');
      setReceiveEmails(true);
      onUserCreated();
    }
  };

  // Helper to render an input based on config
  const renderField = (field: UserFieldConfig) => {
      if (!field.active && field.key !== 'role') return null; // Role is special handled below

      // Map field key to input type
      let type = 'text';
      if (field.key === 'password') type = 'password';
      if (field.key === 'email') type = 'email';

      // Special handling for Role which is a select
      if (field.key === 'role') {
           return (
               <div key={field.id}>
                    <label className="block text-sm font-bold text-neutral-400 mb-1">{field.label}</label>
                    <select
                        value={role}
                        onChange={e => setRole(e.target.value as UserRole)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:border-wood focus:outline-none"
                    >
                        <option value="user" className="bg-neutral-900 text-white">Vecino (Usuario)</option>
                        <option value="supervisor" className="bg-neutral-900 text-white">Supervisor</option>
                        <option value="admin" className="bg-neutral-900 text-white">Administrador</option>
                    </select>
                </div>
           )
      }

      return (
        <div key={field.id}>
            <label className="block text-sm font-bold text-neutral-400 mb-1">{field.label}</label>
            <div className="relative">
                {field.key === 'username' && <AtSign size={16} className="absolute left-2 top-2.5 text-neutral-500" />}
                {field.key === 'email' && <Mail size={16} className="absolute left-2 top-2.5 text-neutral-500" />}
                {!['username', 'email'].includes(field.key) && <AlignLeft size={16} className="absolute left-2 top-2.5 text-neutral-600 opacity-50" />}
                
                <input
                    type={type}
                    required={field.key === 'username' || field.key === 'password'} // Only mandatory logic enforced here
                    value={formValues[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    className={`w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-neutral-200 focus:border-wood focus:outline-none pl-8`}
                    placeholder={field.placeholder}
                />
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-6">
        
        <div className="bg-neutral-800 border-2 border-neutral-700 rounded-lg p-6 max-w-2xl mx-auto card relative">
        
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-200 flex items-center gap-2">
                <UserPlus className="text-wood" /> Crear Nuevo Usuario
            </h2>
            <button 
                onClick={onCancel}
                className="text-neutral-400 hover:text-white flex items-center gap-1 text-sm font-bold transition-colors"
            >
                <ArrowLeft size={18} /> Volver
            </button>
        </div>

        {message && (
            <div className={`mb-4 p-3 rounded flex items-center gap-2 ${message.type === 'error' ? 'bg-red-900/20 text-red-700 border-red-800' : 'bg-green-900/20 text-green-700 border-green-800'} border`}>
            <AlertCircle size={18} />
            <span>{message.text}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Render active fields dynamically */}
                {fieldsConfig.map(field => renderField(field))}
            </div>

            <div className="flex items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300 font-medium">
                    <input 
                        type="checkbox" 
                        checked={receiveEmails}
                        onChange={e => setReceiveEmails(e.target.checked)}
                        className="w-5 h-5 accent-wood"
                    />
                    <Mail size={18} className="text-neutral-400"/>
                    Recibir notificaciones por email
                </label>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-neutral-700 mt-4">
                <button 
                    type="button" 
                    onClick={onCancel}
                    className="px-4 py-2 text-neutral-400 hover:text-white font-bold transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-wood hover:bg-wood-light text-white px-6 py-2 rounded font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    {loading ? 'Creando...' : 'Crear Usuario'}
                </button>
            </div>
        </form>
        </div>
    </div>
  );
};

export default UserManagement;