import React, { useState, useEffect } from "react";
import { UserRole, UserFieldConfig } from "../types";
import { dbCreateUser, dbGetAppConfig } from "../services/db";
import {
  Save,
  UserPlus,
  AlertCircle,
  Mail,
  ArrowLeft,
  AtSign,
  UserCircle,
  Home,
  Lock,
} from "lucide-react";

interface UserManagementProps {
  onUserCreated: () => void;
  onCancel: () => void;
  userRole?: UserRole;
}

const UserManagement: React.FC<UserManagementProps> = ({
  onUserCreated,
  onCancel,
}) => {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [role, setRole] = useState<UserRole>("user");
  const [receiveEmails, setReceiveEmails] = useState(true);

  const [fieldsConfig, setFieldsConfig] = useState<UserFieldConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    dbGetAppConfig().then((config) => {
      setFieldsConfig(config.userFields || []);
    });
  }, []);

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const username = formValues["username"] || "";
    const password = formValues["password"] || "";
    const email = formValues["email"] || "";
    const fullName = formValues["full_name"] || "";
    const houseNumber = formValues["house_number"] || "";

    // Validar campos obligatorios
    if (!fullName || !houseNumber || !email || !password || !username) {
      setMessage({
        type: "error",
        text: "Todos los campos básicos son obligatorios.",
      });
      setLoading(false);
      return;
    }

    const systemKeys = [
      "username",
      "password",
      "email",
      "full_name",
      "house_number",
      "role",
    ];
    const custom_fields: Record<string, string> = {};

    fieldsConfig.forEach((field) => {
      if (!systemKeys.includes(field.key) && field.active) {
        custom_fields[field.label] = formValues[field.key] || "";
      }
    });

    const { error } = await dbCreateUser({
      email,
      username,
      full_name: fullName,
      house_number: houseNumber,
      role,
      receive_emails: receiveEmails,
      custom_fields,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage({ type: "error", text: error });
    } else {
      setMessage({ type: "success", text: "Usuario creado correctamente." });
      setFormValues({});
      setRole("user");
      onUserCreated();
    }
  };

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
          <div
            className={`mb-4 p-3 rounded flex items-center gap-2 ${message.type === "error" ? "bg-red-900/20 text-red-700 border-red-800" : "bg-green-900/20 text-green-700 border-green-800"} border`}
          >
            <AlertCircle size={18} />
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CAMPOS FIJOS OBLIGATORIOS */}
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-2 top-2.5 text-neutral-500"
                />
                <input
                  type="email"
                  required
                  value={formValues["email"] || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 pl-8 text-neutral-200 focus:border-wood outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-1">
                Usuario
              </label>
              <div className="relative">
                <AtSign
                  size={16}
                  className="absolute left-2 top-2.5 text-neutral-500"
                />
                <input
                  type="text"
                  required
                  value={formValues["username"] || ""}
                  onChange={(e) => handleChange("username", e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 pl-8 text-neutral-200 focus:border-wood outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-2 top-2.5 text-neutral-500"
                />
                <input
                  type="password"
                  required
                  value={formValues["password"] || ""}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 pl-8 text-neutral-200 focus:border-wood outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-1">
                Rol
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white focus:border-wood outline-none"
              >
                <option value="user">Vecino (Usuario)</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* NOMBRE Y CASA (Que antes faltaban) */}
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-1">
                Nombre Completo
              </label>
              <div className="relative">
                <UserCircle
                  size={16}
                  className="absolute left-2 top-2.5 text-neutral-500"
                />
                <input
                  type="text"
                  required
                  value={formValues["full_name"] || ""}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 pl-8 text-neutral-200 focus:border-wood outline-none"
                  placeholder="Nombre Apellido"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-1">
                Propiedad
              </label>
              <div className="relative">
                <Home
                  size={16}
                  className="absolute left-2 top-2.5 text-neutral-500"
                />
                <input
                  type="text"
                  required
                  value={formValues["house_number"] || ""}
                  onChange={(e) => handleChange("house_number", e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 pl-8 text-neutral-200 focus:border-wood outline-none"
                  placeholder="Ej: 1º A"
                />
              </div>
            </div>

            {/* Campos dinámicos extra si los hubiera */}
            {fieldsConfig
              .filter(
                (f) =>
                  f.active &&
                  ![
                    "username",
                    "password",
                    "email",
                    "role",
                    "full_name",
                    "house_number",
                  ].includes(f.key),
              )
              .map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-bold text-neutral-400 mb-1">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={formValues[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-neutral-200 focus:border-wood outline-none"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
          </div>

          <div className="flex items-center pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300 font-medium">
              <input
                type="checkbox"
                checked={receiveEmails}
                onChange={(e) => setReceiveEmails(e.target.checked)}
                className="w-5 h-5 accent-wood"
              />
              <Mail size={18} className="text-neutral-400" />
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
              <Save size={18} /> {loading ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
