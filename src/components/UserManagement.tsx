import React, { useState, useEffect } from "react";
import { User, UserRole, UserFieldConfig } from "../types";
import {
  dbCreateUser,
  dbGetAppConfig,
  dbGetAllUsers,
  dbGetPendingUsers,
  dbApproveUser,
  dbUpdateUser,
} from "../services/db";
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
  AlignLeft,
  CheckCircle2,
  Trash2,
  UserCheck,
  XCircle,
  Shield,
  Pencil,
} from "lucide-react";

interface UserManagementProps {
  onUserCreated: () => void;
  onCancel: () => void;
  userRole?: UserRole;
}

type ViewMode = "list" | "create" | "edit";

const UserManagement: React.FC<UserManagementProps> = ({
  onUserCreated,
  onCancel,
  userRole,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [role, setRole] = useState<UserRole>("user");
  const [receiveEmails, setReceiveEmails] = useState(true);
  const [fieldsConfig, setFieldsConfig] = useState<UserFieldConfig[]>([]);

  const loadData = async () => {
    setLoading(true);
    const config = await dbGetAppConfig();
    setFieldsConfig(config.userFields || []);
    const active = await dbGetAllUsers();
    setUsers(active);
    const pending = await dbGetPendingUsers();
    setPendingUsers(pending);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (userId: string) => {
    if (!confirm("¿Aprobar acceso a este vecino?")) return;
    const { error } = await dbApproveUser(userId, true);
    if (error) setMessage({ type: "error", text: error });
    else {
      setMessage({ type: "success", text: "Usuario aprobado correctamente." });
      loadData();
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm("¿Rechazar solicitud?")) return;
    const { error } = await dbApproveUser(userId, false);
    if (error) setMessage({ type: "error", text: error });
    else {
      setMessage({ type: "success", text: "Solicitud rechazada." });
      loadData();
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("¿Estás seguro de desactivar/borrar este usuario?")) return;
    const { error } = await dbApproveUser(userId, false);
    if (error) setMessage({ type: "error", text: error });
    else {
      setMessage({ type: "success", text: "Usuario desactivado." });
      loadData();
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUserId(user.id);
    setFormValues({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      house_number: user.house_number,
      ...user.custom_fields,
    });
    setRole(user.role);
    setMessage(null);
    setViewMode("edit");
  };

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    if (message?.type === "error") setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const username = formValues["username"]?.trim() || "";
    const email = formValues["email"]?.trim() || "";
    const fullName = formValues["full_name"]?.trim() || "";
    const houseNumber = formValues["house_number"]?.trim() || "";

    if (!fullName || !houseNumber || !email || !username) {
      setMessage({
        type: "error",
        text: "Todos los campos visibles son obligatorios.",
      });
      setLoading(false);
      return;
    }

    if (viewMode === "create") {
      const password = formValues["password"]?.trim() || "";
      if (!password) {
        setMessage({
          type: "error",
          text: "La contraseña es obligatoria para crear usuarios.",
        });
        setLoading(false);
        return;
      }
    }

    const custom_fields: Record<string, string> = {};
    const systemKeys = [
      "username",
      "password",
      "email",
      "full_name",
      "house_number",
      "role",
    ];
    fieldsConfig.forEach((field) => {
      if (!systemKeys.includes(field.key) && field.active) {
        custom_fields[field.label] = formValues[field.key] || "";
      }
    });

    let errorResult: string | null = null;

    if (viewMode === "create") {
      const { error } = await dbCreateUser({
        email,
        username,
        full_name: fullName,
        house_number: houseNumber,
        role,
        receive_emails: receiveEmails,
        custom_fields,
        password: formValues["password"],
        status: "active",
      });
      errorResult = error;
    } else {
      if (!editingUserId) return;
      const { error } = await dbUpdateUser(editingUserId, {
        email,
        username,
        full_name: fullName,
        house_number: houseNumber,
        role,
        custom_fields,
      });
      errorResult = error;
    }

    setLoading(false);

    if (errorResult) {
      setMessage({ type: "error", text: errorResult });
    } else {
      setMessage({
        type: "success",
        text:
          viewMode === "create"
            ? "Usuario creado correctamente."
            : "Usuario actualizado correctamente.",
      });
      setFormValues({});
      setRole("user");
      setEditingUserId(null);
      loadData();
      setTimeout(() => setViewMode("list"), 1500);
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-300">
      <div className="bg-neutral-800 border-2 border-neutral-700 rounded-lg shadow-xl p-6 max-w-5xl mx-auto relative overflow-hidden min-h-[600px]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-neutral-700 pb-4 gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              {viewMode === "edit" ? (
                <>
                  <Pencil className="text-blue-400" size={28} />
                  Editando Usuario
                </>
              ) : (
                <>
                  <UserPlus className="text-wood" size={28} />
                  Gestión de Usuarios
                </>
              )}
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              {viewMode === "list" &&
                "Administra el censo y aprueba nuevas solicitudes."}
              {viewMode === "create" &&
                "Rellena los datos para dar de alta un nuevo vecino."}
              {viewMode === "edit" &&
                "Modifica los datos del vecino seleccionado."}
            </p>
          </div>

          <div className="flex gap-3">
            {viewMode === "list" ? (
              <>
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-neutral-400 hover:text-white font-bold text-sm bg-neutral-900 rounded-lg border border-neutral-700"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setFormValues({});
                    setEditingUserId(null);
                    setRole("user");
                    setViewMode("create");
                  }}
                  className="bg-wood hover:bg-wood-light text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
                >
                  <UserPlus size={18} /> Nuevo Usuario
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setViewMode("list");
                  setMessage(null);
                  setEditingUserId(null);
                }}
                className="text-neutral-400 hover:text-white flex items-center gap-2 text-sm font-bold bg-neutral-900 px-4 py-2 rounded-lg border border-neutral-700"
              >
                <ArrowLeft size={16} /> Volver al Listado
              </button>
            )}
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 border ${
              message.type === "error"
                ? "bg-red-900/20 text-red-200 border-red-800"
                : "bg-green-900/20 text-green-200 border-green-800"
            }`}
          >
            {message.type === "error" ? (
              <AlertCircle size={24} />
            ) : (
              <CheckCircle2 size={24} />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {viewMode === "list" && (
          <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
            {pendingUsers.length > 0 && (
              <div className="bg-orange-900/10 border border-orange-700/50 rounded-xl p-4">
                <h3 className="text-lg font-bold text-orange-200 mb-3 flex items-center gap-2">
                  <AlertCircle className="text-orange-500 animate-pulse" />{" "}
                  Solicitudes Pendientes ({pendingUsers.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingUsers.map((u) => (
                    <div
                      key={u.id}
                      className="bg-neutral-900 p-3 rounded-lg border border-neutral-700 flex justify-between items-center shadow-sm"
                    >
                      <div>
                        <p className="font-bold text-white text-sm">
                          {u.full_name || "Sin nombre"}{" "}
                          <span className="text-neutral-500 font-normal">
                            ({u.username})
                          </span>
                        </p>
                        <p className="text-xs text-wood font-mono">
                          {u.house_number || "Sin casa asignada"}
                        </p>
                        <p className="text-xs text-neutral-500">{u.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(u.id)}
                          className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg shadow"
                          title="Aprobar"
                        >
                          <UserCheck size={18} />
                        </button>
                        <button
                          onClick={() => handleReject(u.id)}
                          className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow"
                          title="Rechazar"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Shield className="text-wood" /> Directorio de Vecinos (
                {users.length})
              </h3>
              <div className="overflow-x-auto rounded-lg border border-neutral-700 bg-neutral-900/50">
                <table className="w-full text-left text-sm text-neutral-300">
                  <thead className="bg-neutral-900 text-neutral-400 font-bold uppercase text-xs">
                    <tr>
                      <th className="p-3">Vecino</th>
                      <th className="p-3">Propiedad</th>
                      <th className="p-3">Rol</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-700">
                    {users.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-4 text-center text-neutral-500"
                        >
                          No hay usuarios activos.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-neutral-800 transition-colors"
                        >
                          <td className="p-3">
                            <div className="font-bold text-white">
                              {u.full_name}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {u.email}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-wood">
                            {u.house_number}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                u.role === "admin"
                                  ? "bg-purple-900/30 text-purple-200 border-purple-800"
                                  : u.role === "supervisor"
                                    ? "bg-blue-900/30 text-blue-200 border-blue-800"
                                    : "bg-neutral-700 text-neutral-300 border-neutral-600"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3 text-right flex justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(u)}
                              className="p-1.5 bg-neutral-700 hover:bg-blue-600 text-white rounded transition-colors"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 bg-neutral-700 hover:bg-red-600 text-white rounded transition-colors"
                              title="Desactivar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {(viewMode === "create" || viewMode === "edit") && (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 animate-in slide-in-from-right-4 duration-300"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-neutral-400 mb-1.5 ml-1">
                  NOMBRE COMPLETO <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserCircle
                    size={18}
                    className="absolute left-3 top-3 text-neutral-500"
                  />
                  <input
                    type="text"
                    required
                    value={formValues["full_name"] || ""}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-2.5 pl-10 text-white focus:border-wood outline-none"
                    placeholder="Nombre Apellido"
                  />
                </div>
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-neutral-400 mb-1.5 ml-1">
                  PROPIEDAD <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Home
                    size={18}
                    className="absolute left-3 top-3 text-neutral-500"
                  />
                  <input
                    type="text"
                    required
                    value={formValues["house_number"] || ""}
                    onChange={(e) =>
                      handleChange("house_number", e.target.value)
                    }
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-2.5 pl-10 text-white focus:border-wood outline-none"
                    placeholder="Ej: 1º A"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-neutral-400 mb-1.5 ml-1">
                  EMAIL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-3 text-neutral-500"
                  />
                  <input
                    type="email"
                    required
                    value={formValues["email"] || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-2.5 pl-10 text-white focus:border-wood outline-none"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1.5 ml-1">
                  USUARIO <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <AtSign
                    size={18}
                    className="absolute left-3 top-3 text-neutral-500"
                  />
                  <input
                    type="text"
                    required
                    value={formValues["username"] || ""}
                    onChange={(e) => handleChange("username", e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-2.5 pl-10 text-white focus:border-wood outline-none"
                    placeholder="nombre.usuario"
                  />
                </div>
              </div>

              {viewMode === "create" && (
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-1.5 ml-1">
                    CONTRASEÑA <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-3 text-neutral-500"
                    />
                    <input
                      type="password"
                      required
                      value={formValues["password"] || ""}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-2.5 pl-10 text-white focus:border-wood outline-none"
                      placeholder="******"
                    />
                  </div>
                </div>
              )}

              {viewMode === "edit" && (
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1.5 ml-1">
                    CONTRASEÑA
                  </label>
                  <div className="p-2.5 border border-neutral-700 rounded-lg bg-neutral-900/50 text-neutral-500 text-sm italic flex items-center gap-2">
                    <Lock size={14} /> No editable desde aquí por seguridad
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-wood mb-1.5 ml-1 uppercase">
                  ROL Y PERMISOS
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-2.5 text-white focus:border-wood outline-none cursor-pointer"
                >
                  <option value="user">Vecino (Usuario)</option>
                  <option value="supervisor">
                    Supervisor (Gestiona Incidencias)
                  </option>
                  <option value="admin">Administrador (Control Total)</option>
                </select>
                <p className="text-[11px] text-neutral-500 mt-1 ml-1">
                  * Cuidado: Dar rol de 'Administrador' permite acceso total al
                  sistema.
                </p>
              </div>

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
                  <div key={field.id} className="md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase">
                      {field.label}
                    </label>
                    <div className="relative">
                      <AlignLeft
                        size={18}
                        className="absolute left-3 top-3 text-neutral-500"
                      />
                      <input
                        type="text"
                        value={formValues[field.key] || ""}
                        onChange={(e) =>
                          handleChange(field.key, e.target.value)
                        }
                        className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-2.5 pl-10 text-white focus:border-wood outline-none"
                        placeholder={field.placeholder}
                      />
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-6 flex justify-end gap-4 border-t border-neutral-700">
              <button
                type="submit"
                disabled={loading}
                className={`${viewMode === "create" ? "bg-wood hover:bg-wood-light" : "bg-blue-600 hover:bg-blue-500"} text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 transition-colors`}
              >
                <Save size={18} />{" "}
                {loading
                  ? "Guardando..."
                  : viewMode === "create"
                    ? "Crear Usuario"
                    : "Guardar Cambios"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
