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

  // Sort State
  const [sortOptionId, setSortOptionId] = useState<string>("");
  const [availableSortOptions, setAvailableSortOptions] = useState<
    SortOptionConfig[]
  >([]);

  // Admin Config State
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [viewConfig, setViewConfig] = useState<IncidentViewConfig>({
    showLocation: true,
    showDate: true,
    showUser: true,
    showPriority: true,
    showCategory: true,
  });

  // House Registry Modal
  const [showHouseRegistry, setShowHouseRegistry] = useState(false);

  // Batch Select State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Export Modal
  const [showExportModal, setShowExportModal] = useState(false);

  const loadData = async () => {
    setLoading(true);

    // 1. Cargar Configuración (Vista, Categorías, Ordenación)
    const config = await dbGetAppConfig();
    if (config.categories) setCategories(config.categories);

    // Cargar opciones de ordenación ACTIVAS
    if (config.sortOptions) {
      const activeSorts = config.sortOptions.filter((o) => o.active);
      setAvailableSortOptions(activeSorts);
      // Seleccionar la primera por defecto si no hay ninguna
      if (activeSorts.length > 0 && !sortOptionId) {
        setSortOptionId(activeSorts[0].id);
      }
    }

    // Cargar configuración de vista
    if (config.viewConfig) {
      setViewConfig(config.viewConfig);
    }

    // 2. Cargar Incidencias
    const res = await dbGetIncidents();
    if (res.data) {
      setIncidents(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleStatusChange = async (
    id: string,
    newStatus: Incident["status"],
  ) => {
    await dbUpdateIncidentStatus(id, newStatus);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await dbDeleteIncident(id);
    loadData();
    setSelectedIds((prev) => prev.filter((pid) => pid !== id));
  };

  // --- SORTING LOGIC ---
  const getSortedIncidents = (list: Incident[]) => {
    if (!sortOptionId) return list;
    const option = availableSortOptions.find((o) => o.id === sortOptionId);
    if (!option) return list;

    return [...list].sort((a, b) => {
      const valA = a[option.field];
      const valB = b[option.field];

      if (!valA) return 1;
      if (!valB) return -1;

      if (valA < valB) return option.direction === "asc" ? -1 : 1;
      if (valA > valB) return option.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  // --- FILTERING LOGIC ---
  const filteredIncidents = getSortedIncidents(
    incidents.filter((inc) => {
      const statusMatch =
        filter === "all"
          ? true
          : filter === "active"
            ? inc.status === "pendiente" || inc.status === "en_proceso"
            : inc.status === "resuelto" || inc.status === "rechazado";
      const catMatch =
        categoryFilter === "all" ? true : inc.category === categoryFilter;
      return statusMatch && catMatch;
    }),
  );

  // --- BATCH ACTIONS ---
  const toggleSelection = (id: string, selected: boolean) => {
    if (selected) setSelectedIds((prev) => [...prev, id]);
    else setSelectedIds((prev) => prev.filter((pid) => pid !== id));
  };

  const handleBatchDelete = async () => {
    if (
      confirm(`¿Seguro que quieres borrar ${selectedIds.length} incidencias?`)
    ) {
      for (const id of selectedIds) {
        await dbDeleteIncident(id);
      }
      setSelectedIds([]);
      setIsSelectionMode(false);
      loadData();
    }
  };

  const handleExport = (format: "pdf" | "excel") => {
    alert(
      `Exportando a ${format.toUpperCase()}... \n(Funcionalidad simulada: Se descargaría el archivo filtrado)`,
    );
    setShowExportModal(false);
  };

  if (loading)
    return (
      <div className="p-8 text-center text-neutral-500">Cargando datos...</div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight uppercase">
            Incidencias
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium">
            Gestión comunitaria inteligente
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* House Registry Button */}
          <button
            onClick={() => setShowHouseRegistry(true)}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors font-bold text-sm border border-neutral-300 dark:border-neutral-600"
            title="Censo de Casas"
          >
            <Home size={18} /> <span className="hidden sm:inline">Censo</span>
          </button>

          {user.role === "admin" && (
            <>
              <button
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-bold text-sm border ${isSelectionMode ? "bg-wood text-white border-wood" : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600"}`}
              >
                {isSelectionMode ? (
                  <>
                    <X size={18} /> Cancelar
                  </>
                ) : (
                  <>
                    <CheckSquare size={18} /> Selección
                  </>
                )}
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-bold text-sm border border-neutral-300 dark:border-neutral-600"
              >
                <FileDown size={18} />{" "}
                <span className="hidden sm:inline">Exportar</span>
              </button>

              <button
                onClick={() => setShowAdminSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-bold text-sm shadow-lg"
              >
                <Settings size={18} />{" "}
                <span className="hidden sm:inline">Configuración</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* FILTERS & SORTING BAR */}
      <div className="bg-white dark:bg-card p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          <Filter size={18} className="text-wood shrink-0" />
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${filter === "all" ? "bg-white dark:bg-neutral-700 text-wood shadow-sm" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${filter === "active" ? "bg-white dark:bg-neutral-700 text-wood shadow-sm" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"}`}
            >
              Activas
            </button>
            <button
              onClick={() => setFilter("resolved")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${filter === "resolved" ? "bg-white dark:bg-neutral-700 text-wood shadow-sm" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"}`}
            >
              Resueltas
            </button>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-neutral-100 dark:bg-neutral-800 border-none text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300 rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-wood/20 cursor-pointer"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* SORTING DROPDOWN */}
        {availableSortOptions.length > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <ArrowUpDown size={16} className="text-neutral-400" />
            <select
              value={sortOptionId}
              onChange={(e) => setSortOptionId(e.target.value)}
              className="w-full md:w-auto bg-neutral-100 dark:bg-neutral-800 border-none text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300 rounded-lg py-2 pl-3 pr-8 focus:ring-2 focus:ring-wood/20 cursor-pointer"
            >
              {availableSortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* SELECTION BAR */}
      {isSelectionMode && selectedIds.length > 0 && (
        <div className="bg-wood/10 border border-wood/20 p-3 rounded-xl mb-6 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
          <span className="text-wood font-bold text-sm px-2">
            {selectedIds.length} incidencias seleccionadas
          </span>
          <button
            onClick={handleBatchDelete}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors shadow-sm"
          >
            <Trash2 size={14} /> Eliminar Marcadas
          </button>
        </div>
      )}

      {/* INCIDENT LIST */}
      <IncidentList
        incidents={filteredIncidents}
        userRole={user.role}
        userId={user.id}
        userName={user.username}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onEdit={onEditIncident}
        onRefresh={loadData}
        selectable={isSelectionMode}
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
        viewConfig={viewConfig}
      />

      {/* MODALES */}
      {showAdminSettings && (
        <AdminSettings
          onClose={() => setShowAdminSettings(false)}
          onUpdate={loadData}
        />
      )}

      {showUserManagement && (
        <UserManagement
          onCancel={onCloseUserManagement}
          onUserCreated={() => {}}
          userRole={user.role}
        />
      )}

      {showHouseRegistry && (
        <HouseRegistry onClose={() => setShowHouseRegistry(false)} />
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-2xl shadow-2xl w-full max-w-sm relative">
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
