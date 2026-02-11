import React, { useState, useEffect } from "react";
import { MODO_PRUEBA } from "../config";
import { dbLogin, dbCreateUser, dbGetAppConfig } from "../services/db";
import { User, UserFieldConfig } from "../types";
import {
  User as UserIcon,
  Hammer,
  AlertTriangle,
  X,
  Send,
  CheckCircle,
  Lock,
  AtSign,
  Home,
  UserCircle,
} from "lucide-react";
import AccessibilityWidget from "./AccessibilityWidget";

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados Modales
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Registro
  const [regValues, setRegValues] = useState<Record<string, string>>({});
  const [fieldsConfig, setFieldsConfig] = useState<UserFieldConfig[]>([]);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Recuperar Contraseña
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (showRegister) {
      dbGetAppConfig().then((config) =>
        setFieldsConfig(config.userFields || []),
      );
    }
  }, [showRegister]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await dbLogin(emailOrUser, password);
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        onLogin(response.data);
      }
    } catch (err) {
      setError("Error de conexión. Verifica tu internet.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!regValues.full_name || !regValues.house_number) {
      setError("Por favor rellena Nombre y Nº de Casa");
      setLoading(false);
      return;
    }

    const newUser: any = {
      email: regValues.email,
      username: regValues.username,
      password: regValues.password,
      full_name: regValues.full_name,
      house_number: regValues.house_number,
      role: "user",
      receive_emails: true,
      custom_fields: {},
    };

    fieldsConfig.forEach((f) => {
      if (!f.isSystem && regValues[f.key]) {
        newUser.custom_fields[f.key] = regValues[f.key];
      }
    });

    const response = await dbCreateUser(newUser);
    setLoading(false);

    if (response.error) {
      setError(response.error);
    } else {
      setRegSuccess(
        "Cuenta solicitada correctamente. Un administrador revisará tu solicitud.",
      );
      setTimeout(() => {
        setShowRegister(false);
        setRegSuccess(null);
        setRegValues({});
      }, 4000);
    }
  };

  const handleForgotPwd = (e: React.FormEvent) => {
    e.preventDefault();
    setResetSuccess(
      `Si existe una cuenta asociada a ${resetEmail}, recibirás un correo.`,
    );
    setTimeout(() => {
      setShowForgotPwd(false);
      setResetSuccess(null);
      setResetEmail("");
    }, 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-wood to-wood-hover"></div>

      <div className="bg-card w-full max-w-md p-8 rounded-xl shadow-2xl border-t-4 border-wood relative z-10 card animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {/* --- AQUI VA TU LOGO --- */}
            <img
              src="/logo_nuevo_letras_blancas-removebg-preview.png"
              alt="Logo Comunidad"
              className="h-24 w-auto object-contain mx-auto"
            />
          </div>
          <h1 className="text-3xl font-black text-txt-primary mb-2 tracking-tight">
            Comunidad 38
          </h1>
          <p className="text-txt-muted text-sm">
            Gestión de Incidencias y Vecinos
          </p>

          {MODO_PRUEBA && (
            <div className="mt-4 bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full inline-flex items-center gap-2">
              <AlertTriangle size={12} /> MODO PRUEBA
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm flex items-start gap-2">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-txt-secondary uppercase tracking-wider ml-1">
              Usuario o Email
            </label>
            <div className="relative">
              <UserIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted"
                size={18}
              />
              <input
                type="text"
                value={emailOrUser}
                onChange={(e) => setEmailOrUser(e.target.value)}
                className="w-full bg-bg-input border border-border rounded-lg py-2.5 pl-10 pr-4 text-txt-primary focus:border-wood outline-none"
                placeholder="ej. vecino@vc38.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-txt-secondary uppercase tracking-wider ml-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted"
                size={18}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-input border border-border rounded-lg py-2.5 pl-10 pr-4 text-txt-primary focus:border-wood outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPwd(true)}
                className="text-xs text-wood hover:underline font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-wood hover:bg-wood-hover text-white py-3 rounded-lg font-bold text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <Hammer className="animate-spin" size={20} />
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <div className="mt-6 text-center pt-6 border-t border-border-subtle">
          <p className="text-txt-muted text-sm mb-3">
            ¿Eres nuevo en la comunidad?
          </p>
          <button
            onClick={() => setShowRegister(true)}
            className="text-wood font-bold border border-wood px-4 py-2 rounded-lg hover:bg-wood/5 text-sm"
          >
            Solicitar Acceso
          </button>
        </div>
      </div>

      <AccessibilityWidget />

      {/* MODAL: REGISTRO */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-neutral-800 border border-neutral-700 w-full max-w-md rounded-lg shadow-2xl p-6 relative my-8">
            <button
              onClick={() => setShowRegister(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
              Registro Vecinal
            </h2>

            {regSuccess ? (
              <div className="bg-green-900/30 border border-green-500 text-green-200 p-6 rounded text-center">
                <CheckCircle
                  size={48}
                  className="mx-auto mb-4 text-green-400"
                />
                <h3 className="text-xl font-bold text-white mb-2">
                  ¡Solicitud Enviada!
                </h3>
                <p>{regSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 uppercase font-bold ml-1">
                      Email
                    </label>
                    <div className="relative">
                      <AtSign
                        size={16}
                        className="absolute left-3 top-3 text-neutral-500"
                      />
                      <input
                        type="email"
                        required
                        value={regValues.email || ""}
                        onChange={(e) =>
                          setRegValues({ ...regValues, email: e.target.value })
                        }
                        className="w-full bg-neutral-700 border border-neutral-600 rounded p-2 pl-9 text-white focus:border-wood placeholder-neutral-400"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 uppercase font-bold ml-1">
                      Usuario
                    </label>
                    <div className="relative">
                      <UserIcon
                        size={16}
                        className="absolute left-3 top-3 text-neutral-500"
                      />
                      <input
                        type="text"
                        required
                        value={regValues.username || ""}
                        onChange={(e) =>
                          setRegValues({
                            ...regValues,
                            username: e.target.value,
                          })
                        }
                        className="w-full bg-neutral-700 border border-neutral-600 rounded p-2 pl-9 text-white focus:border-wood placeholder-neutral-400"
                        placeholder="NombreUsuario"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 uppercase font-bold ml-1">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock
                        size={16}
                        className="absolute left-3 top-3 text-neutral-500"
                      />
                      <input
                        type="password"
                        required
                        value={regValues.password || ""}
                        onChange={(e) =>
                          setRegValues({
                            ...regValues,
                            password: e.target.value,
                          })
                        }
                        className="w-full bg-neutral-700 border border-neutral-600 rounded p-2 pl-9 text-white focus:border-wood placeholder-neutral-400"
                        placeholder="******"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 uppercase font-bold ml-1">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <UserCircle
                        size={16}
                        className="absolute left-3 top-3 text-neutral-500"
                      />
                      <input
                        type="text"
                        required
                        value={regValues.full_name || ""}
                        onChange={(e) =>
                          setRegValues({
                            ...regValues,
                            full_name: e.target.value,
                          })
                        }
                        className="w-full bg-neutral-700 border border-neutral-600 rounded p-2 pl-9 text-white focus:border-wood placeholder-neutral-400"
                        placeholder="Nombre y Apellidos"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-400 uppercase font-bold ml-1">
                      Nº Casa / Piso
                    </label>
                    <div className="relative">
                      <Home
                        size={16}
                        className="absolute left-3 top-3 text-neutral-500"
                      />
                      <input
                        type="text"
                        required
                        value={regValues.house_number || ""}
                        onChange={(e) =>
                          setRegValues({
                            ...regValues,
                            house_number: e.target.value,
                          })
                        }
                        className="w-full bg-neutral-700 border border-neutral-600 rounded p-2 pl-9 text-white focus:border-wood placeholder-neutral-400"
                        placeholder="Ej: 4º B o Casa 12"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-wood hover:bg-wood-hover text-white py-3 rounded font-bold flex items-center justify-center gap-2 shadow-md mt-4"
                >
                  <Send size={16} />{" "}
                  {loading ? "Enviando..." : "Enviar Solicitud"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: RECUPERAR PASSWORD */}
      {showForgotPwd && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-neutral-800 border border-neutral-700 w-full max-w-sm rounded-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setShowForgotPwd(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-2">
              Recuperar Contraseña
            </h2>
            <p className="text-neutral-400 text-sm mb-4">
              Ingresa tu email y te enviaremos instrucciones.
            </p>

            {resetSuccess ? (
              <div className="bg-green-900/30 border border-green-600 text-green-200 p-3 rounded text-sm flex items-center gap-2">
                <CheckCircle size={16} /> {resetSuccess}
              </div>
            ) : (
              <form onSubmit={handleForgotPwd} className="space-y-4">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-white focus:border-wood"
                  placeholder="tu@email.com"
                />
                <button
                  type="submit"
                  className="w-full bg-wood hover:bg-wood-hover text-white py-2 rounded font-bold"
                >
                  Enviar
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
