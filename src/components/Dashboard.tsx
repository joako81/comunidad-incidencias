import React, { useEffect, useState } from "react";
import { Incident, User, IncidentViewConfig, SortOptionConfig } from "../types";
import {
  dbGetIncidents,
  dbUpdateIncidentStatus,
  dbDeleteIncident,
  dbGetAppConfig,
  dbSendBatchEmail,
  dbGetPendingUsers,
  dbApproveUser,
  dbCreateIncident,
  dbSaveAppConfig,
} from "../services/db";
import IncidentList from "./IncidentList";
import UserManagement from "./UserManagement";
import AdminSettings from "./AdminSettings";
import HouseRegistry from "./HouseRegistry";
import {
  RefreshCcw,
  Filter,
  Mail,
  Send,
  X,
  UserPlus,
  Check,
  Trash2,
  FileDown,
  ArrowUpDown,
  Eye,
  Settings,
  FileText,
  FileSpreadsheet,
  Lock,
  CheckSquare,
  Square,
  Upload,
  FileUp,
  AlertCircle,
  Home,
  Save,
} from "lucide-react";

interface DashboardProps {
  user: User;
  refreshTrigger: number;
  showUserManagement: boolean;
  onCloseUserManagement: () => void;
  onEditIncident: (incident: Incident) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  user,
  refreshTrigger,
  showUserManagement,
  onCloseUserManagement,
  onEditIncident,
}) => {
  // Datos
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros - AÑADIDO 'pending'
  const [filter, setFilter] = useState<
    "all" | "active" | "resolved" | "pending"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);

  // Ordenación
  const [sortOptionId, setSortOptionId] = useState<string>("");
  const [availableSortOptions, setAvailableSortOptions] = useState<
    SortOptionConfig[]
  >([]);

  // Configuración de Vista (EL OJO) - AÑADIDO showViewConfigMenu
  const [showViewConfigMenu, setShowViewConfigMenu] = useState(false);
  const [viewConfig, setViewConfig] = useState<IncidentViewConfig>({
    showLocation: true,
    showDate: true,
    showUser: true,
    showPriority: true,
    showCategory: true,
  });

  // Admin / Modales
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showHouseRegistry, setShowHouseRegistry] = useState(false);

  // Gestión de Usuarios Pendientes
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>("");
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);

  // Selección Múltiple Incidencias
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modales de Acción
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Estados de carga/acción
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [importing, setImporting] = useState(false);

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    setLoading(true);

    const appConfig = await dbGetAppConfig();
    if (appConfig) {
      if (appConfig.categories) setCategories(appConfig.categories);

      if (appConfig.sortOptions) {
        const activeOptions = appConfig.sortOptions.filter((o) => o.active);
        setAvailableSortOptions(activeOptions);
        if (
          activeOptions.length > 0 &&
          (!sortOptionId || !activeOptions.find((o) => o.id === sortOptionId))
        ) {
          setSortOptionId(activeOptions[0].id);
        }
      }

      if (appConfig.viewConfig) {
        setViewConfig(appConfig.viewConfig);
      }

      setPendingMessage(
        appConfig.pendingAccountMessage ||
          "Tu cuenta está pendiente de aprobación.",
      );
    }

    if (user.status === "pending") {
      setLoading(false);
      return;
    }

    const { data } = await dbGetIncidents();
    if (data) setIncidents(data);

    if (user.role === "admin" || user.role === "supervisor") {
      const pending = await dbGetPendingUsers();
      setPendingUsers(pending);
      setSelectedPendingIds((prev) =>
        prev.filter((id) => pending.some((u) => u.id === id)),
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger, user.role, user.status]);

  // --- HANDLERS INCIDENCIAS ---
  const handleStatusChange = async (id: string, status: Incident["status"]) => {
    const { data } = await dbUpdateIncidentStatus(id, status);
    if (data) fetchData();
  };

  const handleDelete = async (id: string) => {
    const { data } = await dbDeleteIncident(id);
    if (data) fetchData();
  };

  // --- HANDLERS VISTA (EL OJO) ---
  const toggleViewOption = (key: keyof IncidentViewConfig) => {
    setViewConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveViewConfigGlobal = async () => {
    if (
      !confirm(
        "¿Guardar esta configuración de vista como predeterminada para TODOS los usuarios?",
      )
    )
      return;
    const currentConfig = await dbGetAppConfig();
    await dbSaveAppConfig({
      ...currentConfig,
      viewConfig: viewConfig,
    });
    setShowViewConfigMenu(false);
    alert("Configuración de vista guardada globalmente.");
  };

  // --- HANDLERS SELECCIÓN MÚLTIPLE ---
  const handleSelectIncident = (id: string, selected: boolean) => {
    if (selected) setSelectedIncidents((prev) => [...prev, id]);
    else setSelectedIncidents((prev) => prev.filter((i) => i !== id));
  };

  const handleBatchDelete = async () => {
    if (
      confirm(
        `¿Seguro que quieres borrar ${selectedIncidents.length} incidencias?`,
      )
    ) {
      for (const id of selectedIncidents) {
        await dbDeleteIncident(id);
      }
      setSelectedIncidents([]);
      setIsSelectionMode(false);
      fetchData();
    }
  };

  // --- HANDLERS EMAIL / USUARIOS ---
  const handleSendEmail = async () => {
    if (!emailMessage.trim()) return;
    setSendingEmail(true);
    await dbSendBatchEmail(selectedIncidents, emailMessage);
    setSendingEmail(false);
    setShowEmailModal(false);
    setSelectedIncidents([]);
    setEmailMessage("");
    alert("Informe enviado por correo.");
  };

  const handleApproveUser = async (userId: string) => {
    await dbApproveUser(userId, true);
    fetchData();
  };

  const handleRejectUser = async (userId: string) => {
    if (confirm("¿Rechazar solicitud?")) {
      await dbApproveUser(userId, false);
      fetchData();
    }
  };

  const togglePendingSelection = (userId: string) => {
    setSelectedPendingIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const toggleAllPending = () => {
    if (selectedPendingIds.length === pendingUsers.length)
      setSelectedPendingIds([]);
    else setSelectedPendingIds(pendingUsers.map((u) => u.id));
  };

  const handleBulkApprove = async () => {
    if (!confirm(`¿Aprobar ${selectedPendingIds.length} usuarios?`)) return;
    for (const id of selectedPendingIds) await dbApproveUser(id, true);
    setSelectedPendingIds([]);
    fetchData();
  };

  const handleBulkReject = async () => {
    if (!confirm(`¿Rechazar ${selectedPendingIds.length} solicitudes?`)) return;
    for (const id of selectedPendingIds) await dbApproveUser(id, false);
    setSelectedPendingIds([]);
    fetchData();
  };

  // --- HANDLERS EXPORT / IMPORT ---
  const handleExport = (format: "pdf" | "excel") => {
    setShowExportModal(false);
    alert(`Exportando a ${format.toUpperCase()}... (Simulación)`);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    setTimeout(async () => {
      setImporting(false);
      setShowImportModal(false);
      alert("Importación simulada completada.");
      fetchData();
    }, 1500);

    e.target.value = "";
  };

  // --- RENDER BLOQUEADO ---
  if (user.status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in zoom-in duration-500">
        <div className="bg-[#FAF7F2] border-4 border-wood rounded-full p-8 mb-6 shadow-xl">
          <Lock size={64} className="text-wood" />
        </div>
        <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 mb-4">
          Acceso Restringido
        </h2>
        <div className="bg-neutral-800 border-l-4 border-wood p-6 rounded shadow-lg max-w-lg">
          <p className="text-lg text-white font-medium leading-relaxed">
            {pendingMessage}
          </p>
        </div>
      </div>
    );
  }

  // --- FILTROS Y ORDENACIÓN ---
  let filteredIncidents = incidents.filter((inc) => {
    // NUEVA LÓGICA DE FILTROS: Pendientes vs Activas vs Resueltas
    const statusMatch =
      filter === "all"
        ? true
        : filter === "active"
          ? inc.status === "pendiente" || inc.status === "en_proceso"
          : filter === "resolved"
            ? inc.status === "resuelto" || inc.status === "rechazado"
            : filter === "pending"
              ? inc.status === "pendiente"
              : true;

    const categoryMatch =
      categoryFilter === "all" ? true : inc.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const currentSortConfig = availableSortOptions.find(
    (o) => o.id === sortOptionId,
  );
  if (currentSortConfig) {
    filteredIncidents.sort((a, b) => {
      const field = currentSortConfig.field;
      const valA = a[field] || "";
      const valB = b[field] || "";
      let comparison = 0;

      if (field === "priority") {
        const pWeight = { urgente: 4, alta: 3, media: 2, baja: 1 };
        comparison =
          (pWeight[valA as keyof typeof pWeight] || 0) -
          (pWeight[valB as keyof typeof pWeight] || 0);
      } else if (field === "created_at" || field === "updated_at") {
        comparison =
          new Date(valA as string).getTime() -
          new Date(valB as string).getTime();
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }
      return currentSortConfig.direction === "asc" ? comparison : -comparison;
    });
  }

  const canManageUsers = user.role === "admin" || user.role === "supervisor";
  const isAdmin = user.role === "admin";

  if (showUserManagement && canManageUsers) {
    return (
      <div>
        <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-200 mb-6">
          Gestión de Vecinos
        </h1>
        <UserManagement
          userRole={user.role}
          onUserCreated={() => {
            fetchData();
            onCloseUserManagement();
          }}
          onCancel={onCloseUserManagement}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 1. SECCIÓN DE SOLICITUDES PENDIENTES */}
      {canManageUsers && pendingUsers.length > 0 && (
        <div className="mb-8 p-6 bg-wood/10 border-2 border-wood rounded-lg animate-in fade-in slide-in-from-top-4 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-wood flex items-center gap-2">
                <UserPlus size={24} /> Solicitudes ({pendingUsers.length})
              </h2>
              <button
                onClick={toggleAllPending}
                className="flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-wood transition-colors bg-white/50 px-3 py-1 rounded border border-neutral-300"
              >
                {selectedPendingIds.length === pendingUsers.length &&
                pendingUsers.length > 0 ? (
                  <CheckSquare size={18} className="text-wood" />
                ) : (
                  <Square size={18} />
                )}{" "}
                Seleccionar Todo
              </button>
            </div>
            {selectedPendingIds.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleBulkApprove}
                  className="bg-green-700 hover:bg-green-600 text-white px-4 py-1.5 rounded font-bold text-sm flex items-center gap-2 shadow-sm"
                >
                  <Check size={16} /> Aceptar ({selectedPendingIds.length})
                </button>
                <button
                  onClick={handleBulkReject}
                  className="bg-red-700 hover:bg-red-600 text-white px-4 py-1.5 rounded font-bold text-sm flex items-center gap-2 shadow-sm"
                >
                  <Trash2 size={16} /> Rechazar ({selectedPendingIds.length})
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendingUsers.map((pu) => (
              <div
                key={pu.id}
                className={`bg-neutral-800 p-5 rounded-lg border-2 shadow-lg flex flex-col transition-all cursor-pointer relative ${selectedPendingIds.includes(pu.id) ? "border-wood ring-1 ring-wood" : "border-neutral-600 hover:border-neutral-500"}`}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest("button"))
                    togglePendingSelection(pu.id);
                }}
              >
                <div className="absolute top-3 right-3 text-wood">
                  {selectedPendingIds.includes(pu.id) ? (
                    <CheckSquare size={24} className="fill-wood/20" />
                  ) : (
                    <Square size={24} className="text-neutral-600" />
                  )}
                </div>
                <div className="mb-4 pr-8">
                  <h3 className="font-bold text-white text-lg">
                    {pu.full_name}
                  </h3>
                  <p className="text-neutral-400 text-sm mb-2">{pu.email}</p>
                  <p className="text-wood font-bold text-sm">
                    {pu.house_number}
                  </p>
                </div>
                <div className="flex gap-3 mt-auto">
                  <button
                    onClick={() => handleApproveUser(pu.id)}
                    className="flex-1 bg-neutral-700 hover:bg-green-700 text-white py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Check size={14} /> Aceptar
                  </button>
                  <button
                    onClick={() => handleRejectUser(pu.id)}
                    className="flex-1 bg-neutral-700 hover:bg-red-900/80 text-white py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 size={14} /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. CABECERA Y BOTONES DE ACCIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 relative z-20">
        <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-200">
          Tablero de Incidencias
        </h1>

        {/* BARRA DE HERRAMIENTAS */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filtros Básicos - AHORA CON PENDIENTES */}
          <div className="flex items-center gap-2 bg-neutral-800 p-1 rounded-lg border border-neutral-700 shadow-sm">
            {[
              { id: "all", label: "Todas" },
              { id: "pending", label: "Pendientes" },
              { id: "active", label: "Activas" },
              { id: "resolved", label: "Resueltas" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${filter === f.id ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtro Categoría */}
          <div className="flex items-center gap-2 bg-neutral-200 px-3 py-1.5 rounded-lg border border-neutral-400 shadow-sm">
            <Filter size={16} className="text-neutral-800" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-sm text-neutral-900 font-bold focus:outline-none cursor-pointer w-32 md:w-auto"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenación */}
          {availableSortOptions.length > 0 && (
            <div className="flex items-center gap-2 bg-neutral-200 px-3 py-1.5 rounded-lg border border-neutral-400 shadow-sm">
              <ArrowUpDown size={16} className="text-neutral-800" />
              <select
                value={sortOptionId}
                onChange={(e) => setSortOptionId(e.target.value)}
                className="bg-transparent text-sm text-neutral-900 font-bold focus:outline-none cursor-pointer w-32 md:w-auto"
              >
                {availableSortOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* --- BOTONERA DE ACCIONES --- */}
          <div className="flex gap-2 relative">
            {isAdmin && (
              <button
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={`p-2 rounded border border-neutral-600 ${isSelectionMode ? "bg-wood text-white" : "bg-neutral-800 text-neutral-400 hover:text-white"}`}
                title="Selección Múltiple"
              >
                <CheckSquare size={18} />
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowAdminSettings(true)}
                className="p-2 rounded border border-neutral-600 bg-neutral-800 text-neutral-400 hover:text-white"
                title="Configuración Global"
              >
                <Settings size={18} />
              </button>
            )}

            <button
              onClick={() => setShowHouseRegistry(true)}
              className="p-2 rounded border border-neutral-600 bg-neutral-800 text-neutral-400 hover:text-white"
              title="Censo"
            >
              <Home size={18} />
            </button>

            {/* --- BOTÓN OJO (VISTA) --- */}
            <div className="relative">
              <button
                onClick={() => setShowViewConfigMenu(!showViewConfigMenu)}
                className={`p-2 rounded border border-neutral-600 ${showViewConfigMenu ? "bg-wood text-white border-wood" : "bg-neutral-800 text-neutral-400 hover:text-white"}`}
                title="Configurar Vista"
              >
                <Eye size={18} />
              </button>

              {/* MENÚ FLOTANTE DEL OJO (RECUPERADO) */}
              {showViewConfigMenu && (
                <div className="absolute top-10 right-0 bg-neutral-900 border border-neutral-700 p-4 rounded-xl shadow-2xl z-50 w-64 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-neutral-700">
                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                      <Eye size={14} /> Mostrar en Tarjeta
                    </h4>
                    <button onClick={() => setShowViewConfigMenu(false)}>
                      <X
                        size={14}
                        className="text-neutral-500 hover:text-white"
                      />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-2 hover:bg-neutral-800 rounded cursor-pointer group">
                      <span className="text-xs font-bold text-neutral-300 group-hover:text-white">
                        Ubicación
                      </span>
                      <input
                        type="checkbox"
                        checked={viewConfig.showLocation}
                        onChange={() => toggleViewOption("showLocation")}
                        className="accent-wood w-4 h-4"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 hover:bg-neutral-800 rounded cursor-pointer group">
                      <span className="text-xs font-bold text-neutral-300 group-hover:text-white">
                        Fecha
                      </span>
                      <input
                        type="checkbox"
                        checked={viewConfig.showDate}
                        onChange={() => toggleViewOption("showDate")}
                        className="accent-wood w-4 h-4"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 hover:bg-neutral-800 rounded cursor-pointer group">
                      <span className="text-xs font-bold text-neutral-300 group-hover:text-white">
                        Usuario
                      </span>
                      <input
                        type="checkbox"
                        checked={viewConfig.showUser}
                        onChange={() => toggleViewOption("showUser")}
                        className="accent-wood w-4 h-4"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 hover:bg-neutral-800 rounded cursor-pointer group">
                      <span className="text-xs font-bold text-neutral-300 group-hover:text-white">
                        Prioridad
                      </span>
                      <input
                        type="checkbox"
                        checked={viewConfig.showPriority}
                        onChange={() => toggleViewOption("showPriority")}
                        className="accent-wood w-4 h-4"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 hover:bg-neutral-800 rounded cursor-pointer group">
                      <span className="text-xs font-bold text-neutral-300 group-hover:text-white">
                        Categoría
                      </span>
                      <input
                        type="checkbox"
                        checked={viewConfig.showCategory}
                        onChange={() => toggleViewOption("showCategory")}
                        className="accent-wood w-4 h-4"
                      />
                    </label>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={saveViewConfigGlobal}
                      className="mt-4 w-full bg-wood hover:bg-wood-hover text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2"
                    >
                      <Save size={14} /> Guardar como Defecto
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowImportModal(true)}
              className="p-2 rounded border border-neutral-600 bg-neutral-800 text-neutral-400 hover:text-white"
              title="Importar CSV"
            >
              <FileUp size={18} />
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded font-bold text-sm shadow-sm transition-colors"
              title="Exportar"
            >
              <FileDown size={18} />{" "}
              <span className="hidden lg:inline">Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* BARRA DE SELECCIÓN */}
      {isSelectionMode && selectedIncidents.length > 0 && (
        <div className="bg-wood/10 border border-wood/20 p-3 rounded-xl mb-6 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
          <span className="text-wood font-bold text-sm px-2">
            {selectedIncidents.length} incidencias seleccionadas
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors shadow-sm"
            >
              <Mail size={14} /> Email
            </button>
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors shadow-sm"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        </div>
      )}

      {/* LISTA DE INCIDENCIAS */}
      <div className="bg-[#E8DCCA] dark:bg-[#202124] border-2 border-[#8B5A2B]/30 dark:border-[#3c4043] rounded-xl p-6 min-h-[500px] shadow-inner">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-wood-hover font-bold text-lg">
            <RefreshCcw className="animate-spin mr-2" /> Cargando datos...
          </div>
        ) : (
          <IncidentList
            incidents={filteredIncidents}
            userRole={user.role}
            userId={user.id}
            userName={user.full_name || user.email}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onEdit={onEditIncident}
            onRefresh={fetchData}
            selectable={isSelectionMode}
            selectedIds={selectedIncidents}
            onToggleSelection={handleSelectIncident}
            viewConfig={viewConfig}
          />
        )}
      </div>

      {showAdminSettings && (
        <AdminSettings
          onClose={() => setShowAdminSettings(false)}
          onUpdate={fetchData}
        />
      )}
      {showHouseRegistry && (
        <HouseRegistry onClose={() => setShowHouseRegistry(false)} />
      )}

      {showEmailModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-neutral-800 border-2 border-neutral-700 w-full max-w-lg rounded-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setShowEmailModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Mail className="text-wood" /> Enviar Informe
            </h2>
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              rows={5}
              className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-white mb-4 focus:border-wood focus:outline-none"
              placeholder="Escribe tu mensaje para los vecinos seleccionados..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-neutral-400 font-medium hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="bg-wood hover:bg-wood-light text-white px-6 py-2 rounded font-bold flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={18} />{" "}
                {sendingEmail ? "Enviando..." : "Enviar Informe"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#FAF7F2] dark:bg-[#303134] border-2 border-wood w-full max-w-lg rounded-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-4 right-4 text-neutral-400"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <FileUp className="text-wood" /> Importar CSV
            </h2>
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:bg-white transition-colors">
              {importing ? (
                <div className="text-wood animate-pulse font-bold">
                  Procesando...
                </div>
              ) : (
                <>
                  <Upload size={32} className="text-neutral-400 mb-2" />
                  <span className="font-bold text-sm">
                    Seleccionar Archivo CSV
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
                disabled={importing}
              />
            </label>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-neutral-800 border-2 border-neutral-700 w-full max-w-sm rounded-lg shadow-2xl p-6 relative card">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <FileDown className="text-wood" /> Exportar Listado
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleExport("pdf")}
                className="flex flex-col items-center justify-center p-4 bg-red-900/30 hover:bg-red-900/50 border border-red-800 rounded text-red-100 group"
              >
                <FileText
                  size={32}
                  className="mb-2 group-hover:scale-110 transition-transform"
                />
                <span className="font-bold">PDF</span>
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="flex flex-col items-center justify-center p-4 bg-green-900/30 hover:bg-green-900/50 border border-green-800 rounded text-green-100 group"
              >
                <FileSpreadsheet
                  size={32}
                  className="mb-2 group-hover:scale-110 transition-transform"
                />
                <span className="font-bold">Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
