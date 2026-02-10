import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { LogOut, Plus, UserCog, UserCircle, X, Mail, Bell, UserPlus } from 'lucide-react';
import { dbLogout, dbUpdateUser, dbGetPendingUsers } from '../services/db';
import AccessibilityWidget from './AccessibilityWidget';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  onNewIncident: () => void;
  onToggleUserView?: () => void;
  showUserView?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, onNewIncident, onToggleUserView, showUserView }) => {
  const [showProfile, setShowProfile] = useState(false);
  const [emailPref, setEmailPref] = useState(user.receive_emails || false);
  const [savingPref, setSavingPref] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  const canManageUsers = user.role === 'admin' || user.role === 'supervisor';

  // Check for pending users periodically if admin/supervisor
  useEffect(() => {
    if (canManageUsers) {
      const checkPending = async () => {
        const pending = await dbGetPendingUsers();
        setPendingCount(pending.length);
      };
      checkPending();
      const interval = setInterval(checkPending, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [user.role, canManageUsers]);

  const handleLogout = async () => {
    await dbLogout();
    onLogout();
  };

  const savePreferences = async () => {
      setSavingPref(true);
      await dbUpdateUser(user.id, { receive_emails: emailPref });
      setSavingPref(false);
      setShowProfile(false);
      window.location.reload(); 
  }

  const handleNotificationClick = () => {
      // Navigate to dashboard to ensure we are there
      navigate('/');
      // Scroll to top to see the pending requests box
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen bg-background text-neutral-200 transition-colors duration-300">
      {/* Navbar */}
      <nav className="fixed top-0 w-full h-16 bg-neutral-900 border-b border-wood/20 z-40 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-wood rounded-md flex items-center justify-center font-bold text-white text-xl shadow-inner border border-white/20">
            V
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block text-neutral-200">Valle del Cabriel 38</span>
        </div>
        
        <div className="flex items-center gap-4">
          
          <div className="hidden md:flex flex-col items-end mr-2 relative">
            <span className="text-sm font-bold text-neutral-200">{user.full_name || user.email}</span>
            
            {/* NOTIFICATION ICON BETWEEN PROFILE NAME AND ROLE */}
            {canManageUsers && pendingCount > 0 && (
                <button 
                    onClick={handleNotificationClick}
                    className="absolute -left-8 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center"
                    title={`${pendingCount} solicitudes de acceso pendientes`}
                >
                    <UserPlus size={14} className="animate-pulse"/>
                    <span className="text-[10px] font-bold ml-0.5 mr-0.5">{pendingCount}</span>
                </button>
            )}

            <span className="text-xs text-wood font-bold uppercase tracking-wider">{user.role}</span>
          </div>

          <button 
             onClick={() => setShowProfile(true)}
             className="p-2 text-neutral-400 hover:text-white transition-colors"
             title="Mi Perfil / Preferencias"
          >
             <UserCircle size={24} />
          </button>

          {canManageUsers && onToggleUserView && (
              <button 
              onClick={onToggleUserView}
              className={`p-2 rounded transition-colors border border-transparent ${showUserView ? 'bg-neutral-800 text-white border-wood' : 'text-neutral-400 hover:text-white'}`}
              title="Gestión de Usuarios (Crear Manual)"
            >
              <UserCog size={24} />
            </button>
          )}

          {!showUserView && user.status !== 'pending' && (
            <button 
                onClick={onNewIncident}
                className="bg-wood hover:bg-wood-light text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 transition-colors shadow-sm border border-wood-light"
            >
                <Plus size={18} /> <span className="hidden sm:inline">Nueva Incidencia</span>
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={24} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 px-4 pb-20 max-w-7xl mx-auto">
        {children}
      </main>

      {/* Floating Accessibility Widget */}
      <AccessibilityWidget />

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-neutral-800 border-2 border-neutral-700 w-full max-w-sm rounded-lg shadow-2xl p-6 relative card">
                <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20}/></button>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><UserCircle/> Mis Preferencias</h2>
                
                <div className="space-y-4">
                    <p className="text-sm text-neutral-400">Hola, <span className="text-wood font-bold">{user.full_name}</span>. Configura aquí tus notificaciones.</p>
                    
                    <label className="flex items-center gap-3 p-3 bg-neutral-900 rounded border border-neutral-700 cursor-pointer hover:border-wood transition-colors">
                        <input 
                            type="checkbox" 
                            checked={emailPref} 
                            onChange={e => setEmailPref(e.target.checked)}
                            className="w-5 h-5 accent-wood"
                        />
                        <div className="flex flex-col">
                            <span className="font-bold text-neutral-200 flex items-center gap-2"><Mail size={16}/> Email Informativo</span>
                            <span className="text-xs text-neutral-500">Recibir avisos sobre el estado de la comunidad.</span>
                        </div>
                    </label>

                    <button 
                        onClick={savePreferences}
                        disabled={savingPref}
                        className="w-full bg-wood hover:bg-wood-light text-white font-bold py-2 rounded mt-2 disabled:opacity-50"
                    >
                        {savingPref ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Layout;