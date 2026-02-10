import React, { useState, useEffect } from 'react';
import { MODO_PRUEBA } from '../config';
import { dbLogin, dbCreateUser, dbGetAppConfig } from '../services/db';
import { User, UserFieldConfig } from '../types';
import { ShieldCheck, User as UserIcon, Hammer, AlertTriangle, X, Mail, Send, CheckCircle, Lock, AtSign, AlignLeft } from 'lucide-react';
import AccessibilityWidget from './AccessibilityWidget';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  // Login States
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  
  // Register States (Dynamic)
  const [regValues, setRegValues] = useState<Record<string, string>>({});
  const [fieldsConfig, setFieldsConfig] = useState<UserFieldConfig[]>([]);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  
  // Forgot Pwd State
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (showRegister) {
        dbGetAppConfig().then(config => setFieldsConfig(config.userFields || []));
    }
  }, [showRegister]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await dbLogin(emailOrUser, password);
      if (error) throw new Error(error);
      if (data) onLogin(data);
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: 'admin' | 'supervisor' | 'user') => {
    const demoEmail = role === 'admin' ? 'admin@vc38.com' 
                    : role === 'supervisor' ? 'supervisor@vc38.com' 
                    : 'vecino@vc38.com';
    setEmailOrUser(demoEmail);
    setPassword('123'); // Auto-fill mock password
    
    // Auto submit effectively
    setTimeout(() => {
        dbLogin(demoEmail, '123').then(({ data, error }) => {
            if (data) onLogin(data);
            if (error) setError(error);
        });
    }, 200);
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Extract core fields
    const username = regValues['username'] || '';
    const pass = regValues['password'] || '';
    const email = regValues['email'] || '';
    const fullName = regValues['full_name'] || '';
    const houseNumber = regValues['house_number'] || '';

    // Extract custom fields
    const systemKeys = ['username', 'password', 'email', 'full_name', 'house_number', 'role'];
    const custom_fields: Record<string, string> = {};
    
    fieldsConfig.forEach(field => {
        if (!systemKeys.includes(field.key) && field.active) {
            custom_fields[field.label] = regValues[field.key] || '';
        }
    });

    const { error } = await dbCreateUser({
        email,
        username,
        full_name: fullName,
        house_number: houseNumber,
        role: 'user',
        receive_emails: true,
        password: pass,
        custom_fields
    });
    setLoading(false);

    if (error) {
        alert(error);
    } else {
        setRegSuccess("Solicitud enviada correctamente. El administrador ha sido notificado y recibirás un correo cuando tu cuenta sea aprobada.");
    }
  };

  const submitForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => {
        setResetSuccess(`Se ha enviado un enlace de recuperación a ${resetEmail}`);
        setResetEmail('');
    }, 1000);
  };

  const closeModals = () => {
    setShowForgotPwd(false);
    setShowRegister(false);
    setRegSuccess(null);
    setResetSuccess(null);
    setRegValues({});
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#E8DCCA] dark:bg-[#202124] transition-colors duration-300">
      <AccessibilityWidget />
      
      {/* Main Login Card - Light: Bone White (#FAF7F2) | Dark: Google Surface (#303134) */}
      <div className="w-full max-w-md bg-[#FAF7F2] dark:bg-[#303134] border-2 border-[#8B5A2B]/40 dark:border-neutral-700 rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-8 animate-in fade-in zoom-in duration-300 card relative overflow-hidden transition-colors">
        
        {/* Decorative Top Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-wood"></div>

        <div className="text-center mb-8 pt-2">
          <h1 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 mb-2">Valle del Cabriel 38</h1>
          <p className="text-neutral-600 dark:text-neutral-400 font-bold">Portal de Gestión de Comunidad</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-600 text-red-900 dark:text-red-200 rounded font-medium flex items-center gap-2 text-sm shadow-sm">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-black text-neutral-900 dark:text-neutral-300 mb-1">Correo o Usuario</label>
            <div className="relative">
                <Mail className="absolute left-3 top-3 text-neutral-200" size={18} />
                <input
                type="text"
                required
                value={emailOrUser}
                onChange={(e) => setEmailOrUser(e.target.value)}
                // Inputs kept dark gray (neutral-600) in both modes for contrast with white text, or adapted slightly for google dark
                className="w-full bg-neutral-600 dark:bg-[#3C4043] border-2 border-neutral-400 dark:border-neutral-600 text-white placeholder-neutral-300 px-4 py-3 pl-10 rounded focus:outline-none focus:border-wood focus:ring-1 focus:ring-wood transition-colors font-medium"
                placeholder="tu@email.com o usuario"
                />
            </div>
          </div>
          <div>
            <label className="block text-sm font-black text-neutral-900 dark:text-neutral-300 mb-1">Contraseña</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3 text-neutral-200" size={18} />
                <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-600 dark:bg-[#3C4043] border-2 border-neutral-400 dark:border-neutral-600 text-white placeholder-neutral-300 px-4 py-3 pl-10 rounded focus:outline-none focus:border-wood focus:ring-1 focus:ring-wood transition-colors font-medium"
                placeholder="••••••••"
                />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-wood hover:bg-wood-hover text-white font-bold py-3 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform active:scale-95 duration-150"
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3 text-sm text-center font-semibold">
             <button onClick={() => setShowRegister(true)} className="text-wood hover:text-wood-hover hover:underline transition-colors">
                 ¿Eres nuevo? Solicita tu acceso aquí
             </button>
             <button onClick={() => setShowForgotPwd(true)} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 underline transition-colors">
                 Olvidé mi contraseña
             </button>
        </div>

        {MODO_PRUEBA && (
          <div className="mt-8 pt-6 border-t border-neutral-300 dark:border-neutral-700">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mb-4 uppercase tracking-widest font-bold">
              Modo Prueba Activo (Autocompletar)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleDemoLogin('admin')}
                className="flex flex-col items-center p-2 bg-neutral-200 dark:bg-[#3C4043] hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded border border-neutral-300 dark:border-neutral-600 transition-all group"
              >
                <ShieldCheck className="text-neutral-600 dark:text-neutral-400 group-hover:text-wood mb-1" size={20} />
                <span className="text-[10px] text-neutral-700 dark:text-neutral-300 font-bold">Admin</span>
              </button>
              <button
                onClick={() => handleDemoLogin('supervisor')}
                className="flex flex-col items-center p-2 bg-neutral-200 dark:bg-[#3C4043] hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded border border-neutral-300 dark:border-neutral-600 transition-all group"
              >
                <Hammer className="text-neutral-600 dark:text-neutral-400 group-hover:text-wood mb-1" size={20} />
                <span className="text-[10px] text-neutral-700 dark:text-neutral-300 font-bold">Superv.</span>
              </button>
              <button
                onClick={() => handleDemoLogin('user')}
                className="flex flex-col items-center p-2 bg-neutral-200 dark:bg-[#3C4043] hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded border border-neutral-300 dark:border-neutral-600 transition-all group"
              >
                <UserIcon className="text-neutral-600 dark:text-neutral-400 group-hover:text-wood mb-1" size={20} />
                <span className="text-[10px] text-neutral-700 dark:text-neutral-300 font-bold">Vecino</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* Forgot Password Modal */}
      {showForgotPwd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#FAF7F2] dark:bg-[#303134] border-2 border-wood dark:border-neutral-600 w-full max-w-md rounded-lg shadow-2xl p-6 relative">
                <button onClick={closeModals} className="absolute top-4 right-4 text-neutral-500 hover:text-black dark:hover:text-white"><X size={20}/></button>
                
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">Recuperar Contraseña</h2>
                
                {resetSuccess ? (
                    <div className="text-center py-6 text-green-700 dark:text-green-400">
                        <CheckCircle size={48} className="mx-auto mb-4"/>
                        <p className="font-bold">{resetSuccess}</p>
                        <button onClick={closeModals} className="mt-4 text-sm underline text-neutral-600 dark:text-neutral-400">Cerrar</button>
                    </div>
                ) : (
                    <form onSubmit={submitForgotPassword} className="space-y-4">
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 font-medium">Introduce tu correo electrónico y te enviaremos las instrucciones.</p>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-neutral-200" size={18}/>
                            <input 
                                type="email" 
                                required
                                value={resetEmail} 
                                onChange={e => setResetEmail(e.target.value)}
                                className="w-full bg-neutral-600 dark:bg-[#3C4043] border border-neutral-400 dark:border-neutral-600 rounded p-2 pl-10 text-white focus:border-wood placeholder-neutral-300"
                                placeholder="tu@email.com"
                            />
                        </div>
                        <button type="submit" className="w-full bg-wood hover:bg-wood-hover text-white py-2 rounded font-bold shadow-md">
                            Enviar Enlace
                        </button>
                    </form>
                )}
            </div>
        </div>
      )}

      {/* Register User Modal (Dynamic) */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#FAF7F2] dark:bg-[#303134] border-2 border-wood dark:border-neutral-600 w-full max-w-lg rounded-lg shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={closeModals} className="absolute top-4 right-4 text-neutral-500 hover:text-black dark:hover:text-white"><X size={20}/></button>
                
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">Solicitar Alta de Vecino</h2>
                
                {regSuccess ? (
                    <div className="text-center py-6 text-green-700 dark:text-green-400">
                        <CheckCircle size={48} className="mx-auto mb-4"/>
                        <p className="font-bold text-lg">{regSuccess}</p>
                        <button onClick={closeModals} className="mt-6 bg-neutral-800 dark:bg-neutral-700 text-white px-4 py-2 rounded font-bold">Entendido</button>
                    </div>
                ) : (
                    <form onSubmit={submitRegister} className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 text-sm text-blue-900 dark:text-blue-200 mb-4">
                            <p className="font-medium">El administrador recibirá un correo para verificar tu identidad antes de activar tu cuenta.</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                             {/* Render dynamic fields excluding Role */}
                             {fieldsConfig.filter(f => f.active && f.key !== 'role').map(field => {
                                 let type = 'text';
                                 if (field.key === 'password') type = 'password';
                                 if (field.key === 'email') type = 'email';

                                 return (
                                     <div key={field.id} className={field.key === 'email' || field.key === 'full_name' ? 'col-span-2' : ''}>
                                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">{field.label}</label>
                                        <div className="relative">
                                            {field.key === 'username' && <AtSign size={14} className="absolute left-2 top-2.5 text-neutral-300"/>}
                                            {field.key === 'password' && <Lock size={14} className="absolute left-2 top-2.5 text-neutral-300"/>}
                                            {field.key === 'email' && <Mail size={14} className="absolute left-2 top-2.5 text-neutral-300"/>}
                                            {!['username','password','email'].includes(field.key) && <AlignLeft size={14} className="absolute left-2 top-2.5 text-neutral-300 opacity-70"/>}
                                            
                                            <input 
                                                type={type} 
                                                required={field.key === 'username' || field.key === 'password'}
                                                value={regValues[field.key] || ''}
                                                onChange={e => setRegValues({...regValues, [field.key]: e.target.value})}
                                                className="w-full bg-neutral-600 dark:bg-[#3C4043] border border-neutral-400 dark:border-neutral-600 rounded p-2 pl-8 text-white focus:border-wood placeholder-neutral-300 text-sm"
                                                placeholder={field.placeholder}
                                            />
                                        </div>
                                     </div>
                                 );
                             })}
                        </div>

                        <button type="submit" disabled={loading} className="w-full bg-wood hover:bg-wood-hover text-white py-3 rounded font-bold flex items-center justify-center gap-2 shadow-md">
                            <Send size={16} /> {loading ? 'Enviando...' : 'Enviar Solicitud'}
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