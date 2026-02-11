import React, { useEffect, useState } from "react";
import {
  Incident,
  User,
  IncidentViewConfig,
  SortOptionConfig,
  Attachment,
} from "../types";
import {
  dbGetIncidents,
  dbUpdateIncidentStatus,
  dbDeleteIncident,
  dbGetAppConfig,
  dbSendBatchEmail,
  dbGetPendingUsers,
  dbApproveUser,
  dbCreateIncident,
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
  HelpCircle,
  Home,
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
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [sortOptionId, setSortOptionId] = useState<string>("");
  const [availableSortOptions, setAvailableSortOptions] = useState<
    SortOptionConfig[]
  >([]);
  const [showViewConfig, setShowViewConfig] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [viewConfig, setViewConfig] = useState<IncidentViewConfig>({
    showLocation: true,
    showDate: true,
    showUser: true,
    showPriority: true,
    showCategory: true,
  });
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>("");
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHouseRegistry, setShowHouseRegistry] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const appConfig = await dbGetAppConfig();
    if (user.status === "pending") {
      if (appConfig)
        setPendingMessage(
          appConfig.pendingAccountMessage ||
            "Tu cuenta está pendiente de aprobación.",
        );
      setLoading(false);
      return;
    }
    const { data } = await dbGetIncidents();
    if (data) setIncidents(data);
    if (appConfig) {
      setCategories(appConfig.categories);
      const activeOptions = appConfig.sortOptions.filter((o) => o.active);
      setAvailableSortOptions(activeOptions);
      if (
        activeOptions.length > 0 &&
        (!sortOptionId || !activeOptions.find((o) => o.id === sortOptionId))
      ) {
        setSortOptionId(activeOptions[0].id);
      }
    }
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

  const handleStatusChange = async (id: string, status: Incident["status"]) => {
    const { data } = await dbUpdateIncidentStatus(id, status);
    if (data) fetchData();
  };

  const handleDelete = async (id: string) => {
    const { data } = await dbDeleteIncident(id);
    if (data) fetchData();
  };

  const handleSelectIncident = (id: string, selected: boolean) => {
    if (selected) setSelectedIncidents((prev) => [...prev, id]);
    else setSelectedIncidents((prev) => prev.filter((i) => i !== id));
  };

  const handleSendEmail = async () => {
    if (!emailMessage.trim()) return;
    setSendingEmail(true);
    await dbSendBatchEmail(selectedIncidents, emailMessage);
    setSendingEmail(false);
    setShowEmailModal(false);
    setSelectedIncidents([]);
    setEmailMessage("");
    alert("Informe enviado por correo a los vecinos suscritos.");
  };

  const handleApproveUser = async (userId: string) => {
    await dbApproveUser(userId, true);
    fetchData();
  };

  const handleRejectUser = async (userId: string) => {
    if (confirm("¿Estás seguro de rechazar y eliminar esta solicitud?")) {
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
    if (
      !confirm(
        `¿Aprobar acceso a los ${selectedPendingIds.length} usuarios seleccionados?`,
      )
    )
      return;
    for (const id of selectedPendingIds) {
      await dbApproveUser(id, true);
    }
    setSelectedPendingIds([]);
    fetchData();
  };

  const handleBulkReject = async () => {
    if (
      !confirm(
        `¿Rechazar y eliminar las ${selectedPendingIds.length} solicitudes seleccionadas?`,
      )
    )
      return;
    for (const id of selectedPendingIds) {
      await dbApproveUser(id, false);
    }
    setSelectedPendingIds([]);
    fetchData();
  };

  const handleExport = (format: "pdf" | "excel") => {
    setShowExportModal(false);
    const formatName = format === "pdf" ? "PDF" : "Excel";
    alert(
      `Descargando listado en ${formatName} con ${filteredIncidents.length} incidencias... (Simulación)`,
    );
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r\n|\n/);
      const startIndex =
        lines[0].toLowerCase().includes("título") ||
        lines[0].toLowerCase().includes("title")
          ? 1
          : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(",");
        if (cols.length < 2) continue;
        const title = cols[0]?.trim();
        const description = cols[1]?.trim() || "Sin descripción";
        const category = cols[2]?.trim() || "General";
        const priorityRaw = cols[3]?.trim().toLowerCase();
        const location = cols[4]?.trim() || "Sin ubicación";
        let priority: any = "media";
        if (["baja", "media", "alta", "urgente"].includes(priorityRaw))
          priority = priorityRaw;
        if (title) {
          await dbCreateIncident({
            title,
            description,
            category,
            priority,
            location,
            status: "pendiente",
            user_id: user.id,
            attachments: [],
          });
        }
      }
      setImporting(false);
      setShowImportModal(false);
      alert(`Importación completada.`);
      fetchData();
    };
    reader.readAsText(file);
    e.target.value = "";
  };

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

  let filteredIncidents = incidents.filter((inc) => {
    const statusMatch =
      filter === "all"
        ? true
        : filter === "active"
          ? inc.status === "pendiente" || inc.status === "en_proceso"
          : inc.status === "resuelto" || inc.status === "rechazado";
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
                  <div className="grid grid-cols-2 gap-2 mt-3 bg-neutral-900/50 p-3 rounded">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">
                        Usuario
                      </span>
                      <span className="text-sm font-bold text-white">
                        {pu.username}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">
                        Propiedad
                      </span>
                      <span className="text-wood font-bold text-sm">
                        {pu.house_number}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-auto">
                  <button
                    onClick={() => handleApproveUser(pu.id)}
                    className="flex-1 bg-neutral-700 hover:bg-green-700 text-white py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-green-500"
                  >
                    <Check size={14} /> Aceptar
                  </button>
                  <button
                    onClick={() => handleRejectUser(pu.id)}
                    className="flex-1 bg-neutral-700 hover:bg-red-900/80 text-white py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-red-500"
                  >
                    <Trash2 size={14} /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-200">
          Tablero de Incidencias
        </h1>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-neutral-800 p-1 rounded-lg border border-neutral-700 shadow-sm">
            {["all", "active", "resolved"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${filter === f ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
              >
                {f === "all"
                  ? "Todas"
                  : f === "active"
                    ? "Activas"
                    : "Resueltas"}
              </button>
            ))}
          </div>
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
          <div className="flex gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowAdminSettings(true)}
                className="p-2 rounded border border-neutral-600 bg-neutral-800 text-neutral-400 hover:text-white"
                title="Configuración"
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
            <button
              onClick={() => setShowViewConfig(!showViewConfig)}
              className={`p-2 rounded border border-neutral-600 ${showViewConfig ? "bg-wood text-white" : "bg-neutral-800 text-neutral-400"}`}
              title="Vista"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="p-2 rounded border border-neutral-600 bg-neutral-800 text-neutral-400 hover:text-white"
              title="Importar"
            >
              <FileUp size={18} />
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded font-bold text-sm shadow-sm"
              title="Exportar"
            >
              <FileDown size={18} />{" "}
              <span className="hidden md:inline">Exportar</span>
            </button>
          </div>
        </div>
      </div>

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
            selectable={canManageUsers}
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
              placeholder="Mensaje..."
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
                  <span className="font-bold text-sm">Seleccionar CSV</span>
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
