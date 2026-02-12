import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Type,
  TextCursor,
  MessageCircle,
  LayoutTemplate,
  Tag,
  Users,
  ShieldAlert,
  Mail,
  Home,
  User as UserIcon,
  AlignLeft,
} from "lucide-react";
import { dbGetAppConfig, dbSaveAppConfig } from "../services/db";
import {
  AppConfig,
  SortOptionConfig,
  SortDirection,
  Incident,
  UserFieldConfig,
  IncidentViewConfig,
} from "../types";

interface AdminSettingsProps {
  onClose: () => void;
  onUpdate: () => void;
}

type Tab = "categories" | "sorting" | "users" | "view";

const FIELD_LABELS: { key: keyof Incident; label: string }[] = [
  { key: "created_at", label: "Fecha Creación" },
  { key: "updated_at", label: "Última Actualización" },
  { key: "priority", label: "Prioridad" },
  { key: "status", label: "Estado" },
  { key: "title", label: "Título" },
  { key: "category", label: "Categoría" },
  { key: "user_name", label: "Nombre Vecino" },
  { key: "user_house", label: "Casa/Piso" },
  { key: "location", label: "Ubicación" },
];

const DEFAULT_VIEW_CONFIG: IncidentViewConfig = {
  showLocation: true,
  showDate: true,
  showUser: true,
  showUserName: true,
  showUserHouse: true,
  userVisibilityMode: "public",
  showPriority: true,
  showCategory: true,
};

const AdminSettings: React.FC<AdminSettingsProps> = ({ onClose, onUpdate }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("view");
  const [error, setError] = useState<string | null>(null);

  // States
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<{
    idx: number;
    val: string;
  } | null>(null);

  const [newSortLabel, setNewSortLabel] = useState("");
  const [newSortField, setNewSortField] =
    useState<keyof Incident>("created_at");
  const [newSortDir, setNewSortDir] = useState<SortDirection>("desc");
  const [editingSortId, setEditingSortId] = useState<string | null>(null);

  const [newUserFieldLabel, setNewUserFieldLabel] = useState("");
  const [newUserFieldPlaceholder, setNewUserFieldPlaceholder] = useState("");
  const [editingUserFieldId, setEditingUserFieldId] = useState<string | null>(
    null,
  );
  const [editUserFieldValues, setEditUserFieldValues] = useState<{
    label: string;
    placeholder: string;
  }>({ label: "", placeholder: "" });
  const [pendingMsg, setPendingMsg] = useState("");

  useEffect(() => {
    dbGetAppConfig().then((c) => {
      // Asegurar configuración de vista
      if (!c.viewConfig) {
        c.viewConfig = DEFAULT_VIEW_CONFIG;
      } else {
        if (c.viewConfig.showUserName === undefined)
          c.viewConfig.showUserName = true;
        if (c.viewConfig.showUserHouse === undefined)
          c.viewConfig.showUserHouse = true;
        if (!c.viewConfig.userVisibilityMode)
          c.viewConfig.userVisibilityMode = "public";
      }

      // Asegurar campos de sistema
      const requiredSystemFields: UserFieldConfig[] = [
        {
          id: "sys_fullname",
          key: "full_name",
          label: "Nombre Completo",
          placeholder: "Nombre y Apellidos",
          active: true,
          isSystem: true,
        },
        {
          id: "sys_house",
          key: "house_number",
          label: "Propiedad / Casa",
          placeholder: "Ej: 1º A",
          active: true,
          isSystem: true,
        },
        {
          id: "sys_email",
          key: "email",
          label: "Correo Electrónico",
          placeholder: "tu@email.com",
          active: true,
          isSystem: true,
        },
        {
          id: "sys_username",
          key: "username",
          label: "Usuario",
          placeholder: "nombre.usuario",
          active: true,
          isSystem: true,
        },
      ];

      let currentFields = [...(c.userFields || [])];

      requiredSystemFields.forEach((req) => {
        if (!currentFields.find((f) => f.key === req.key)) {
          if (req.key === "username")
            currentFields.unshift(req); // Username primero
          else currentFields.push(req);
        }
      });

      const loadedConfig = {
        ...c,
        userFields: currentFields,
        viewConfig: c.viewConfig,
      };

      setConfig(loadedConfig);
      if (c.pendingAccountMessage) setPendingMsg(c.pendingAccountMessage);
    });
  }, []);

  const handleSave = async () => {
    if (config) {
      const finalConfig = { ...config, pendingAccountMessage: pendingMsg };
      await dbSaveAppConfig(finalConfig);
      onUpdate();
      onClose();
    }
  };

  // --- VIEW CONFIG ---
  const toggleViewOption = (key: keyof IncidentViewConfig) => {
    if (!config || !config.viewConfig) return;
    setConfig({
      ...config,
      viewConfig: { ...config.viewConfig, [key]: !config.viewConfig[key] },
    });
  };

  const setPrivacyMode = (mode: "public" | "staff_only") => {
    if (!config || !config.viewConfig) return;
    setConfig({
      ...config,
      viewConfig: { ...config.viewConfig, userVisibilityMode: mode },
    });
  };

  // --- ACTIONS ---
  const addCategory = () => {
    if (newCategory.trim() && config) {
      if (config.categories.includes(newCategory.trim())) {
        setError("Categoría ya existe.");
        return;
      }
      setConfig({
        ...config,
        categories: [...config.categories, newCategory.trim()],
      });
      setNewCategory("");
    }
  };
  const deleteCategory = (idx: number) => {
    if (config)
      setConfig({
        ...config,
        categories: config.categories.filter((_, i) => i !== idx),
      });
  };
  const updateCategory = (idx: number) => {
    if (editingCategory && config) {
      const newCats = [...config.categories];
      newCats[idx] = editingCategory.val.trim();
      setConfig({ ...config, categories: newCats });
      setEditingCategory(null);
    }
  };
  const moveCategory = (idx: number, dir: "up" | "down") => {
    if (!config) return;
    if (
      (dir === "up" && idx === 0) ||
      (dir === "down" && idx === config.categories.length - 1)
    )
      return;
    const newCats = [...config.categories];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [newCats[idx], newCats[swapIdx]] = [newCats[swapIdx], newCats[idx]];
    setConfig({ ...config, categories: newCats });
  };

  const toggleSortActive = (id: string) => {
    if (config)
      setConfig({
        ...config,
        sortOptions: config.sortOptions.map((o) =>
          o.id === id ? { ...o, active: !o.active } : o,
        ),
      });
  };

  const addUserField = () => {
    if (newUserFieldLabel.trim() && config) {
      const newField: UserFieldConfig = {
        id: `uf_cust_${Date.now()}`,
        key: `custom_${Date.now()}`,
        label: newUserFieldLabel.trim(),
        placeholder:
          newUserFieldPlaceholder.trim() ||
          `Ingresa ${newUserFieldLabel.trim()}`,
        active: true,
        isSystem: false,
      };
      setConfig({ ...config, userFields: [...config.userFields, newField] });
      setNewUserFieldLabel("");
      setNewUserFieldPlaceholder("");
    } else {
      setError("Debes poner un nombre al campo.");
    }
  };

  const deleteUserField = (id: string) => {
    if (config)
      setConfig({
        ...config,
        userFields: config.userFields.filter((f) => f.id !== id),
      });
  };

  const toggleUserFieldActive = (id: string) => {
    const field = config?.userFields.find((f) => f.id === id);
    // IMPORTANTE: SOLO IMPEDIMOS OCULTAR USUARIO Y CONTRASEÑA. EL EMAIL YA SE PUEDE OCULTAR.
    if (field && (field.key === "username" || field.key === "password")) {
      setError("Usuario y contraseña son obligatorios y no se pueden ocultar.");
      return;
    }
    if (config)
      setConfig({
        ...config,
        userFields: config.userFields.map((f) =>
          f.id === id ? { ...f, active: !f.active } : f,
        ),
      });
  };

  const startEditUserField = (field: UserFieldConfig) => {
    setEditingUserFieldId(field.id);
    setEditUserFieldValues({
      label: field.label,
      placeholder: field.placeholder,
    });
  };

  const saveEditUserField = (id: string) => {
    if (config && editUserFieldValues.label.trim()) {
      setConfig({
        ...config,
        userFields: config.userFields.map((f) =>
          f.id === id
            ? {
                ...f,
                label: editUserFieldValues.label,
                placeholder: editUserFieldValues.placeholder,
              }
            : f,
        ),
      });
      setEditingUserFieldId(null);
    }
  };

  if (!config) return null;

  // IMPORTANTE: Mostramos todos excepto password y role para editar en la lista
  const displayedUserFields = config.userFields.filter(
    (f) => !["password", "role"].includes(f.key),
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-neutral-800 border-2 border-wood w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutral-700 flex justify-between items-center bg-neutral-900 rounded-t-lg">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="text-wood animate-spin-slow" /> Administración
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-neutral-700 bg-neutral-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("view")}
            className={`px-4 py-3 font-bold text-sm whitespace-nowrap ${activeTab === "view" ? "text-wood border-b-2 border-wood bg-neutral-900" : "text-neutral-400"}`}
          >
            <LayoutTemplate size={16} className="inline mr-2" /> Visualización
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-3 font-bold text-sm whitespace-nowrap ${activeTab === "categories" ? "text-wood border-b-2 border-wood bg-neutral-900" : "text-neutral-400"}`}
          >
            <Tag size={16} className="inline mr-2" /> Categorías
          </button>
          <button
            onClick={() => setActiveTab("sorting")}
            className={`px-4 py-3 font-bold text-sm whitespace-nowrap ${activeTab === "sorting" ? "text-wood border-b-2 border-wood bg-neutral-900" : "text-neutral-400"}`}
          >
            <ArrowUp size={16} className="inline mr-2" /> Ordenación
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-3 font-bold text-sm whitespace-nowrap ${activeTab === "users" ? "text-wood border-b-2 border-wood bg-neutral-900" : "text-neutral-400"}`}
          >
            <Users size={16} className="inline mr-2" /> Campos Vecino
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-500 text-white p-3 mx-6 mt-4 flex items-center gap-2 text-sm font-bold">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex-grow overflow-y-auto p-6 bg-neutral-800 custom-scrollbar">
          {/* TAB: VISUALIZACIÓN */}
          {activeTab === "view" && config.viewConfig && (
            <div className="space-y-6">
              <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-700">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Eye size={18} className="text-wood" /> Control de Tarjetas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2 bg-neutral-800 p-4 rounded border border-neutral-600">
                    <label className="flex items-center gap-3 cursor-pointer hover:text-wood mb-2">
                      <input
                        type="checkbox"
                        checked={config.viewConfig.showUser}
                        onChange={() => toggleViewOption("showUser")}
                        className="w-5 h-5 accent-wood"
                      />
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-lg">
                          Bloque de Vecino
                        </span>
                        <span className="text-xs text-neutral-400">
                          Información del creador
                        </span>
                      </div>
                    </label>
                    {config.viewConfig.showUser && (
                      <div className="ml-8 mt-2 space-y-3">
                        <div className="flex gap-4 p-2 bg-neutral-900/30 rounded border border-neutral-700">
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-200">
                            <input
                              type="checkbox"
                              checked={config.viewConfig.showUserName}
                              onChange={() => toggleViewOption("showUserName")}
                              className="accent-wood"
                            />{" "}
                            Mostrar Nombre
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-200">
                            <input
                              type="checkbox"
                              checked={config.viewConfig.showUserHouse}
                              onChange={() => toggleViewOption("showUserHouse")}
                              className="accent-wood"
                            />{" "}
                            Mostrar Casa
                          </label>
                        </div>
                        <div className="p-3 bg-neutral-900/50 rounded border border-neutral-700">
                          <p className="text-xs font-bold text-wood mb-2 uppercase">
                            ¿Quién puede ver esta información?
                          </p>
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={
                                  config.viewConfig.userVisibilityMode ===
                                  "public"
                                }
                                onChange={() => setPrivacyMode("public")}
                                className="accent-green-500"
                              />
                              <span className="text-sm text-white">
                                Visible para todos
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                checked={
                                  config.viewConfig.userVisibilityMode ===
                                  "staff_only"
                                }
                                onChange={() => setPrivacyMode("staff_only")}
                                className="accent-red-500"
                              />
                              <span className="text-sm text-white">
                                Solo Admin/Supervisores
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded border border-neutral-600">
                    <input
                      type="checkbox"
                      checked={config.viewConfig.showDate}
                      onChange={() => toggleViewOption("showDate")}
                      className="w-5 h-5 accent-wood"
                    />
                    <span className="text-white font-medium">Fecha</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded border border-neutral-600">
                    <input
                      type="checkbox"
                      checked={config.viewConfig.showLocation}
                      onChange={() => toggleViewOption("showLocation")}
                      className="w-5 h-5 accent-wood"
                    />
                    <span className="text-white font-medium">Ubicación</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded border border-neutral-600">
                    <input
                      type="checkbox"
                      checked={config.viewConfig.showPriority}
                      onChange={() => toggleViewOption("showPriority")}
                      className="w-5 h-5 accent-wood"
                    />
                    <span className="text-white font-medium">Prioridad</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded border border-neutral-600">
                    <input
                      type="checkbox"
                      checked={config.viewConfig.showCategory}
                      onChange={() => toggleViewOption("showCategory")}
                      className="w-5 h-5 accent-wood"
                    />
                    <span className="text-white font-medium">Categoría</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB: USERS FIELDS */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="bg-neutral-900 p-4 rounded border border-neutral-700">
                <h4 className="text-xs font-bold text-wood uppercase mb-2">
                  <MessageCircle size={14} /> Mensaje Bienvenida
                </h4>
                <textarea
                  value={pendingMsg}
                  onChange={(e) => setPendingMsg(e.target.value)}
                  rows={2}
                  className="w-full bg-neutral-800 border border-neutral-600 rounded p-2 text-white text-sm focus:border-wood"
                />
              </div>

              <div className="bg-neutral-900 p-3 rounded border border-neutral-700 mb-4">
                <h4 className="text-xs font-bold text-wood uppercase mb-2">
                  Añadir Campo
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUserFieldLabel}
                    onChange={(e) => setNewUserFieldLabel(e.target.value)}
                    className="flex-1 bg-neutral-800 border border-neutral-600 rounded p-2 text-white text-sm"
                    placeholder="Etiqueta"
                  />
                  <input
                    type="text"
                    value={newUserFieldPlaceholder}
                    onChange={(e) => setNewUserFieldPlaceholder(e.target.value)}
                    className="flex-1 bg-neutral-800 border border-neutral-600 rounded p-2 text-white text-sm"
                    placeholder="Placeholder"
                  />
                  <button
                    onClick={addUserField}
                    className="bg-wood text-white px-4 rounded font-bold"
                  >
                    <Plus />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {displayedUserFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between bg-neutral-900 p-3 rounded border border-neutral-700 hover:border-neutral-600"
                  >
                    <div className="flex items-center gap-3 flex-grow">
                      <button
                        onClick={() => toggleUserFieldActive(field.id)}
                        className={`p-1.5 rounded-full ${field.active ? "bg-green-900/50 text-green-400" : "bg-neutral-800 text-neutral-600"}`}
                      >
                        {field.key === "username" ? (
                          <Lock size={16} />
                        ) : field.active ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
                        )}
                      </button>
                      {editingUserFieldId === field.id ? (
                        <div className="flex-grow flex gap-2">
                          <input
                            value={editUserFieldValues.label}
                            onChange={(e) =>
                              setEditUserFieldValues({
                                ...editUserFieldValues,
                                label: e.target.value,
                              })
                            }
                            className="bg-neutral-800 text-white px-2 rounded border border-wood"
                          />
                          <input
                            value={editUserFieldValues.placeholder}
                            onChange={(e) =>
                              setEditUserFieldValues({
                                ...editUserFieldValues,
                                placeholder: e.target.value,
                              })
                            }
                            className="bg-neutral-800 text-neutral-300 px-2 rounded border border-wood/50"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span
                            className={`font-bold text-sm ${field.active ? "text-neutral-200" : "text-neutral-500 line-through"}`}
                          >
                            {field.label}{" "}
                            {field.isSystem && (
                              <span className="text-[9px] bg-neutral-800 border border-neutral-600 px-1 rounded uppercase">
                                Sistema
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {field.placeholder}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editingUserFieldId === field.id ? (
                        <>
                          <button
                            onClick={() => saveEditUserField(field.id)}
                            className="text-green-500"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => setEditingUserFieldId(null)}
                            className="text-red-500"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditUserField(field)}
                            className="text-blue-400"
                          >
                            <Edit2 size={16} />
                          </button>
                          {!field.isSystem && (
                            <button
                              onClick={() => deleteUserField(field.id)}
                              className="text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-grow bg-neutral-900 border border-neutral-600 rounded p-2 text-white"
                  placeholder="Nueva categoría..."
                />
                <button
                  onClick={addCategory}
                  className="bg-wood text-white px-4 rounded font-bold hover:bg-wood-hover"
                >
                  <Plus />
                </button>
              </div>
              <div className="space-y-2">
                {config.categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-neutral-900 p-2 rounded border border-neutral-700"
                  >
                    <span className="flex-grow font-bold text-neutral-200 ml-2">
                      {cat}
                    </span>
                    <button
                      onClick={() => deleteCategory(idx)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "sorting" && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-400">
                Gestiona las reglas de ordenación.
              </p>
              {config.sortOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="flex justify-between p-3 border-b border-neutral-700"
                >
                  <span className="text-white font-bold">{opt.label}</span>
                  <button onClick={() => toggleSortActive(opt.id)}>
                    {opt.active ? (
                      <Eye className="text-green-400" />
                    ) : (
                      <EyeOff className="text-neutral-500" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-700 bg-neutral-900 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-400 hover:text-white font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="bg-wood hover:bg-wood-light text-white px-6 py-2 rounded font-bold flex items-center gap-2"
          >
            <Save size={18} /> Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
