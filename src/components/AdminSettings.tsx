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

type Tab = "view" | "categories" | "sorting" | "users";

const DEFAULT_VIEW_CONFIG: IncidentViewConfig = {
  showLocation: true,
  showDate: true,
  showUser: true,
  showPriority: true,
  showCategory: true,
};

const AdminSettings: React.FC<AdminSettingsProps> = ({ onClose, onUpdate }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("view");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Estado para Categorías
  const [newCategory, setNewCategory] = useState("");

  // Estado para Campos de Usuario (RECUPERADO AL 100%)
  const [editingField, setEditingField] = useState<UserFieldConfig | null>(
    null,
  );
  const [tempFieldLabel, setTempFieldLabel] = useState("");
  const [tempFieldPlaceholder, setTempFieldPlaceholder] = useState("");

  // Estado para Añadir Nuevo Campo
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");

  useEffect(() => {
    const load = async () => {
      const data = await dbGetAppConfig();
      // Aseguramos que exista viewConfig si es la primera vez
      if (!data.viewConfig) {
        data.viewConfig = DEFAULT_VIEW_CONFIG;
      }
      setConfig(data);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    const res = await dbSaveAppConfig(config);
    if (res.error) {
      setError(res.error);
      setTimeout(() => setError(null), 3000);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onUpdate(); // Recargar dashboard
    }
  };

  // --- VIEW CONFIG LOGIC (PUNTO 1) ---
  const toggleViewOption = (key: keyof IncidentViewConfig) => {
    if (!config || !config.viewConfig) return;
    setConfig({
      ...config,
      viewConfig: {
        ...config.viewConfig,
        [key]: !config.viewConfig[key],
      },
    });
  };

  // --- CATEGORIES LOGIC ---
  const addCategory = () => {
    if (!config || !newCategory.trim()) return;
    if (config.categories.includes(newCategory.trim())) return;
    setConfig({
      ...config,
      categories: [...config.categories, newCategory.trim()],
    });
    setNewCategory("");
  };

  const removeCategory = (cat: string) => {
    if (!config) return;
    setConfig({
      ...config,
      categories: config.categories.filter((c) => c !== cat),
    });
  };

  // --- SORTING LOGIC (PUNTO 2) ---
  const toggleSortActive = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      sortOptions: config.sortOptions.map((s) =>
        s.id === id ? { ...s, active: !s.active } : s,
      ),
    });
  };

  // --- USER FIELDS LOGIC (PUNTO 4 COMPLETO) ---
  const toggleFieldActive = (id: string) => {
    if (!config) return;
    setConfig({
      ...config,
      userFields: config.userFields.map((f) =>
        f.id === id ? { ...f, active: !f.active } : f,
      ),
    });
  };

  const startEditUserField = (field: UserFieldConfig) => {
    setEditingField(field);
    setTempFieldLabel(field.label);
    setTempFieldPlaceholder(field.placeholder);
  };

  const saveEditUserField = () => {
    if (!config || !editingField) return;
    setConfig({
      ...config,
      userFields: config.userFields.map((f) =>
        f.id === editingField.id
          ? { ...f, label: tempFieldLabel, placeholder: tempFieldPlaceholder }
          : f,
      ),
    });
    setEditingField(null);
  };

  const deleteUserField = (id: string) => {
    if (!config) return;
    if (
      confirm(
        "¿Seguro que quieres eliminar este campo? Los datos asociados a los usuarios podrían perderse.",
      )
    ) {
      setConfig({
        ...config,
        userFields: config.userFields.filter((f) => f.id !== id),
      });
    }
  };

  const addUserField = () => {
    if (!config || !newFieldKey.trim() || !newFieldLabel.trim()) return;

    // Simple sanitization for key
    const safeKey = newFieldKey.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    // Check duplicate
    if (config.userFields.some((f) => f.key === safeKey)) {
      alert("Ya existe un campo con esa clave.");
      return;
    }

    const newField: UserFieldConfig = {
      id: `uf_${Date.now()}`,
      key: safeKey,
      label: newFieldLabel,
      placeholder: newFieldPlaceholder,
      active: true,
      isSystem: false,
    };

    setConfig({
      ...config,
      userFields: [...config.userFields, newField],
    });

    setIsAddingField(false);
    setNewFieldKey("");
    setNewFieldLabel("");
    setNewFieldPlaceholder("");
  };

  if (!config)
    return <div className="p-8 text-white">Cargando configuración...</div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-800 w-full max-w-4xl rounded-xl shadow-2xl border border-neutral-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-900 rounded-t-xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="text-wood" /> Administración del Sistema
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-700 bg-neutral-900/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab("view")}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "view" ? "text-wood border-b-2 border-wood bg-neutral-800" : "text-neutral-400 hover:text-neutral-200"}`}
          >
            <LayoutTemplate size={16} /> VISUALIZACIÓN
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "categories" ? "text-wood border-b-2 border-wood bg-neutral-800" : "text-neutral-400 hover:text-neutral-200"}`}
          >
            <Tag size={16} /> CATEGORÍAS
          </button>
          <button
            onClick={() => setActiveTab("sorting")}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "sorting" ? "text-wood border-b-2 border-wood bg-neutral-800" : "text-neutral-400 hover:text-neutral-200"}`}
          >
            <ArrowUp size={16} /> ORDENACIÓN
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "users" ? "text-wood border-b-2 border-wood bg-neutral-800" : "text-neutral-400 hover:text-neutral-200"}`}
          >
            <Type size={16} /> CAMPOS USUARIO
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-neutral-800">
          {success && (
            <div className="mb-4 bg-green-900/30 border border-green-600 text-green-200 p-3 rounded flex items-center gap-2 animate-pulse">
              <Check size={18} /> Configuración guardada correctamente
            </div>
          )}

          {/* --- TAB: VISUALIZACIÓN --- */}
          {activeTab === "view" && config.viewConfig && (
            <div className="space-y-6">
              <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-700">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Eye size={18} className="text-wood" /> Control de Tarjetas de
                  Incidencia
                </h3>
                <p className="text-neutral-400 text-sm mb-4">
                  Selecciona qué datos quieres que sean visibles en el listado
                  de incidencias para todos los usuarios.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded border border-neutral-600 cursor-pointer hover:border-wood transition-colors">
                    <input
                      type="checkbox"
                      checked={config.viewConfig.showUser}
                      onChange={() => toggleViewOption("showUser")}
                      className="w-5 h-5 accent-wood"
                    />
                    <div className="flex flex-col">
                      <span className="text-white font-medium">
                        Mostrar Vecino y Casa
                      </span>
                      <span className="text-xs text-neutral-500">
                        Muestra quién creó la incidencia
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded border border-neutral-600 cursor-pointer hover:border-wood transition-colors">
                    <input
                      type="checkbox"
                      checked={config.viewConfig.showDate}
                      onChange={() => toggleViewOption("showDate")}
                      className="w-5 h-5 accent-wood"
                    />
                    <div className="flex flex-col">
                      <span className="text-white font-medium">
                        Mostrar Fecha
                      </span>
                      <span className="text-xs text-neutral-500">
                        Muestra "Hace X días/horas"
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded border border-neutral-600 cursor-pointer hover:border-wood transition-colors">
                    <input
                      type="checkbox"
                      checked={config.viewConfig.showLocation}
                      onChange={() => toggleViewOption("showLocation")}
                      className="w-5 h-5 accent-wood"
                    />
                    <div className="flex flex-col">
                      <span className="text-white font-medium">
                        Mostrar Ubicación
                      </span>
                      <span className="text-xs text-neutral-500">
                        Muestra el lugar de la incidencia
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded border border-neutral-600 cursor-pointer hover:border-wood transition-colors">
                    <input
                      type="checkbox"
                      checked={config.viewConfig.showPriority}
                      onChange={() => toggleViewOption("showPriority")}
                      className="w-5 h-5 accent-wood"
                    />
                    <div className="flex flex-col">
                      <span className="text-white font-medium">
                        Mostrar Prioridad
                      </span>
                      <span className="text-xs text-neutral-500">
                        Etiqueta Alta/Media/Baja
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-neutral-800 rounded border border-neutral-600 cursor-pointer hover:border-wood transition-colors">
                    <input
                      type="checkbox"
                      checked={config.viewConfig.showCategory}
                      onChange={() => toggleViewOption("showCategory")}
                      className="w-5 h-5 accent-wood"
                    />
                    <div className="flex flex-col">
                      <span className="text-white font-medium">
                        Mostrar Categoría
                      </span>
                      <span className="text-xs text-neutral-500">
                        Etiqueta Electricidad, Jardinería...
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB: CATEGORIES --- */}
          {activeTab === "categories" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nueva categoría..."
                  className="flex-1 bg-neutral-900 border border-neutral-600 rounded p-2 text-white focus:border-wood"
                />
                <button
                  onClick={addCategory}
                  className="bg-wood text-white px-4 rounded hover:bg-wood-hover"
                >
                  <Plus />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {config.categories.map((cat) => (
                  <div
                    key={cat}
                    className="bg-neutral-700 text-white px-3 py-2 rounded flex justify-between items-center group border border-neutral-600"
                  >
                    <span>{cat}</span>
                    <button
                      onClick={() => removeCategory(cat)}
                      className="text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TAB: SORTING --- */}
          {activeTab === "sorting" && (
            <div className="space-y-4">
              <p className="text-neutral-400 text-sm">
                Activa o desactiva las opciones de ordenación disponibles para
                los usuarios en el Dashboard.
              </p>
              <div className="space-y-2">
                {config.sortOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className={`flex items-center justify-between p-3 rounded border ${opt.active ? "bg-neutral-700 border-wood" : "bg-neutral-900 border-neutral-700 opacity-60"}`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSortActive(opt.id)}
                        className={`w-10 h-6 rounded-full relative transition-colors ${opt.active ? "bg-green-600" : "bg-neutral-600"}`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${opt.active ? "left-5" : "left-1"}`}
                        ></div>
                      </button>
                      <div>
                        <div className="text-white font-bold">{opt.label}</div>
                        <div className="text-xs text-neutral-400">
                          Campo: {opt.field} | Dirección:{" "}
                          {opt.direction === "asc"
                            ? "Ascendente"
                            : "Descendente"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TAB: USERS (COMPLETA) --- */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="bg-neutral-900/50 p-4 rounded border border-neutral-700">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <MessageCircle size={16} /> Mensaje de Cuenta Pendiente
                </h3>
                <textarea
                  className="w-full bg-neutral-800 border border-neutral-600 rounded p-2 text-white text-sm"
                  value={config.pendingAccountMessage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pendingAccountMessage: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>

              <div className="flex justify-between items-end mt-6 mb-2">
                <h3 className="text-white font-bold">
                  Campos del Formulario de Registro
                </h3>
                <button
                  onClick={() => setIsAddingField(!isAddingField)}
                  className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded flex items-center gap-1 border border-neutral-500"
                >
                  <Plus size={12} />{" "}
                  {isAddingField ? "Cancelar" : "Añadir Campo"}
                </button>
              </div>

              {/* Add Field Form */}
              {isAddingField && (
                <div className="bg-neutral-800 p-4 rounded border border-wood/50 mb-4 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-neutral-400 font-bold">
                        Etiqueta Visible (Label)
                      </label>
                      <input
                        type="text"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        className="bg-neutral-900 border border-neutral-600 rounded p-2 text-white text-sm focus:border-wood"
                        placeholder="Ej: Teléfono Móvil"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-neutral-400 font-bold">
                        Placeholder (Ejemplo)
                      </label>
                      <input
                        type="text"
                        value={newFieldPlaceholder}
                        onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                        className="bg-neutral-900 border border-neutral-600 rounded p-2 text-white text-sm focus:border-wood"
                        placeholder="Ej: +34 600..."
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-neutral-400 font-bold">
                        Clave Interna (Sin espacios)
                      </label>
                      <input
                        type="text"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        className="bg-neutral-900 border border-neutral-600 rounded p-2 text-white text-sm focus:border-wood"
                        placeholder="Ej: telefono"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addUserField}
                    className="w-full bg-wood hover:bg-wood-hover text-white py-2 rounded text-sm font-bold shadow-md"
                  >
                    Confirmar y Añadir
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {config.userFields.map((field) => (
                  <div
                    key={field.id}
                    className="bg-neutral-700 p-3 rounded flex items-center justify-between border border-neutral-600"
                  >
                    {editingField?.id === field.id ? (
                      <div className="flex-1 grid grid-cols-2 gap-2 mr-2">
                        <input
                          type="text"
                          value={tempFieldLabel}
                          onChange={(e) => setTempFieldLabel(e.target.value)}
                          className="bg-neutral-900 border border-neutral-500 rounded p-1 text-white text-xs"
                        />
                        <input
                          type="text"
                          value={tempFieldPlaceholder}
                          onChange={(e) =>
                            setTempFieldPlaceholder(e.target.value)
                          }
                          className="bg-neutral-900 border border-neutral-500 rounded p-1 text-white text-xs"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="text-white">
                          <div className="font-bold text-sm">{field.label}</div>
                          <div className="text-xs text-neutral-400">
                            Key: {field.key} {field.isSystem && "(Sistema)"}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {editingField?.id === field.id ? (
                        <>
                          <button
                            onClick={saveEditUserField}
                            className="text-green-400 hover:text-green-300 p-1"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFieldActive(field.id)}
                            className={`px-2 py-1 rounded text-xs font-bold transition-colors ${field.active ? "bg-green-900 text-green-200 border border-green-700" : "bg-neutral-800 text-neutral-400 border border-neutral-600"}`}
                          >
                            {field.active ? "Visible" : "Oculto"}
                          </button>
                          <button
                            onClick={() => startEditUserField(field)}
                            className="text-blue-400 hover:text-blue-300 p-1"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          {!field.isSystem && (
                            <button
                              onClick={() => deleteUserField(field.id)}
                              className="text-red-500 hover:text-red-400 p-1"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-700 bg-neutral-900 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-400 hover:text-white font-bold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="bg-wood hover:bg-wood-light text-white px-6 py-2 rounded font-bold flex items-center gap-2 shadow-lg"
          >
            <Save size={18} /> Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
