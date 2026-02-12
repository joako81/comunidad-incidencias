import React, { useState, useEffect } from "react";
import { User } from "../types";
import {
  LogOut,
  Plus,
  UserCog,
  UserCircle,
  X,
  Mail,
  UserPlus,
} from "lucide-react";
import { dbLogout, dbUpdateUser, dbGetPendingUsers } from "../services/db";
import AccessibilityWidget from "./AccessibilityWidget";
import { useNavigate } from "react-router-dom";

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  onNewIncident: () => void;
  onToggleUserView?: () => void;
  showUserView?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  user,
  onLogout,
  children,
  onNewIncident,
  onToggleUserView,
  showUserView,
}) => {
  const [showProfile, setShowProfile] = useState(false);
  const [emailPref, setEmailPref] = useState(user.receive_emails || false);
  const [savingPref, setSavingPref] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const [logoError, setLogoError] = useState(false);

  const navigate = useNavigate();

  const canManageUsers = user.role === "admin" || user.role === "supervisor";

  useEffect(() => {
    if (canManageUsers) {
      const checkPending = async () => {
        const pending = await dbGetPendingUsers();
        setPendingCount(pending.length);
      };
      checkPending();
      const interval = setInterval(checkPending, 5000);
      return () => clearInterval(interval);
    }
  }, [canManageUsers]);

  const savePreferences = async () => {
    setSavingPref(true);
    await dbUpdateUser(user.id, { receive_emails: emailPref });
    setSavingPref(false);
    setShowProfile(false);
  };

  return (
    <div className="min-h-screen bg-background text-txt-primary flex flex-col font-sans transition-colors duration-300">
      <nav className="bg-card border-b border-border-subtle sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-4">
              {!logoError ? (
                <img
                  src="/logo_cvc38.png"
                  alt="Logo Comunidad"
                  className="h-12 w-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="h-12 w-12 bg-wood rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                  CVC
                </div>
              )}
              <div className="hidden md:block h-8 w-px bg-border-subtle mx-2"></div>
              <div>
                <span className="text-xl font-black text-wood tracking-tight hidden md:block">
                  Valle del Cabriel 38
                </span>
                <span className="text-xs text-txt-muted font-bold tracking-widest uppercase hidden md:block">
                  Portal de Vecinos
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={onNewIncident}
                className="hidden md:flex bg-wood hover:bg-wood-hover text-white px-6 py-2.5 rounded-full font-bold transition-all shadow-md hover:shadow-lg active:scale-95 items-center gap-2"
              >
                <Plus size={20} strokeWidth={3} />
                <span>NUEVA INCIDENCIA</span>
              </button>

              <button
                onClick={onNewIncident}
                className="md:hidden bg-wood text-white p-3 rounded-full shadow-lg"
              >
                <Plus size={24} />
              </button>

              {canManageUsers && (
                <button
                  onClick={onToggleUserView}
                  className={`p-2.5 rounded-full transition-colors relative ${
                    showUserView
                      ? "bg-wood text-white"
                      : "text-txt-muted hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                  title="Gestión de Usuarios"
                >
                  <UserCog size={24} />
                  {pendingCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full animate-bounce">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="flex items-center gap-3 p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-border-subtle"
                >
                  <div className="h-10 w-10 rounded-full bg-wood text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </main>

      <div className="fixed bottom-6 left-6 z-50">
        <AccessibilityWidget />
      </div>

      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 mt-16 animate-in slide-in-from-right-10 fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setShowProfile(false)}
          ></div>
          <div className="bg-neutral-800 border-2 border-wood w-full max-w-sm rounded-xl shadow-2xl p-6 relative z-10">
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-wood text-white flex items-center justify-center font-black text-3xl shadow-inner">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg leading-tight">
                  {user.full_name || user.username}
                </h3>
                <span className="text-xs font-medium text-wood bg-wood/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-neutral-400">
                Hola,{" "}
                <span className="text-wood font-bold">{user.full_name}</span>.
                Configura aquí tus preferencias.
              </p>

              {/* CONDICIONAL: Solo mostrar si el usuario tiene email */}
              {user.email && (
                <label className="flex items-center gap-3 p-3 bg-neutral-900 rounded border border-neutral-700 cursor-pointer hover:border-wood transition-colors">
                  <input
                    type="checkbox"
                    checked={emailPref}
                    onChange={(e) => setEmailPref(e.target.checked)}
                    className="w-5 h-5 accent-wood"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-neutral-200 flex items-center gap-2">
                      <Mail size={16} /> Email Informativo
                    </span>
                    <span className="text-xs text-neutral-500">
                      Recibir avisos sobre el estado de la comunidad.
                    </span>
                  </div>
                </label>
              )}

              <button
                onClick={savePreferences}
                disabled={savingPref}
                className="w-full bg-wood hover:bg-wood-light text-white font-bold py-2 rounded mt-2 disabled:opacity-50 transition-colors shadow-lg"
              >
                {savingPref ? "Guardando..." : "Guardar Cambios"}
              </button>

              <div className="border-t border-neutral-700 pt-4 mt-2">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 font-bold py-2 rounded hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={18} /> Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
