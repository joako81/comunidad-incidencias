import React, { useEffect, useState } from 'react';
import { Incident, User, IncidentViewConfig, SortOptionConfig, Attachment } from '../types';
import { dbGetIncidents, dbUpdateIncidentStatus, dbDeleteIncident, dbGetAppConfig, dbSendBatchEmail, dbGetPendingUsers, dbApproveUser, dbCreateIncident } from '../services/db';
import IncidentList from './IncidentList';
import UserManagement from './UserManagement';
import AdminSettings from './AdminSettings';
import { RefreshCcw, Filter, Mail, Send, X, UserPlus, Check, Trash2, FileDown, ArrowUpDown, Eye, Settings, FileText, FileSpreadsheet, Lock, CheckSquare, Square, Upload, FileUp, AlertCircle, HelpCircle } from 'lucide-react';

interface DashboardProps {
  user: User;
  refreshTrigger: number;
  showUserManagement: boolean;
  onCloseUserManagement: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, refreshTrigger, showUserManagement, onCloseUserManagement }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Sort State
  const [sortOptionId, setSortOptionId] = useState<string>('');
  const [availableSortOptions, setAvailableSortOptions] = useState<SortOptionConfig[]>([]);

  // Admin: View Config
  const [showViewConfig, setShowViewConfig] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  
  const [viewConfig, setViewConfig] = useState<IncidentViewConfig>({
      showLocation: true,
      showDate: true,
      showUser: true,
      showPriority: true,
      showCategory: true
  });
  
  // Admin: Pending Users State
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);

  // Selection & Email State (Incidents)
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false); // NEW: Import Modal State
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [importing, setImporting] = useState(false); // NEW: Importing loading state

  const fetchData = async () => {
    setLoading(true);
    const appConfig = await dbGetAppConfig();

    // PENDING USER CHECK
    if (user.status === 'pending') {
        if (appConfig) setPendingMessage(appConfig.pendingAccountMessage || "Cuenta pendiente.");
        setLoading(false);
        return; // Stop fetching other data
    }

    const { data } = await dbGetIncidents();
    
    if (data) setIncidents(data);
    if (appConfig) {
        setCategories(appConfig.categories);
        // Only show ACTIVE sort options
        const activeOptions = appConfig.sortOptions.filter(o => o.active);
        setAvailableSortOptions(activeOptions);
        
        // Set default sort if none selected or invalid
        if (activeOptions.length > 0 && (!sortOptionId || !activeOptions.find(o => o.id === sortOptionId))) {
            setSortOptionId(activeOptions[0].id);
        }
    }
    
    if (user.role === 'admin' || user.role === 'supervisor') {
        const pending = await dbGetPendingUsers();
        setPendingUsers(pending);
        // Clean up selection if users are no longer pending
        setSelectedPendingIds(prev => prev.filter(id => pending.some(u => u.id === id)));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger, user.role, user.status]);

  const handleStatusChange = async (id: string, status: Incident['status']) => {
    const { data } = await dbUpdateIncidentStatus(id, status);
    if (data) fetchData();
  };

  const handleDelete = async (id: string) => {
      const { data } = await dbDeleteIncident(id);
      if(data) fetchData();
  }

  const handleSelectIncident = (id: string, selected: boolean) => {
      if (selected) {
          setSelectedIncidents(prev => [...prev, id]);
      } else {
          setSelectedIncidents(prev => prev.filter(i => i !== id));
      }
  }

  const handleSendEmail = async () => {
      if (!emailMessage.trim()) return;
      setSendingEmail(true);
      await dbSendBatchEmail(selectedIncidents, emailMessage);
      setSendingEmail(false);
      setShowEmailModal(false);
      setSelectedIncidents([]);
      setEmailMessage('');
      alert("Informe enviado por correo a los vecinos suscritos.");
  }

  // --- Pending User Actions ---

  const handleApproveUser = async (userId: string) => {
      await dbApproveUser(userId, true);
      // alert("Usuario aprobado y activado."); // Less intrusive UX
      fetchData();
  }

  const handleRejectUser = async (userId: string) => {
      if(confirm("¿Estás seguro de rechazar y eliminar esta solicitud?")) {
          await dbApproveUser(userId, false);
          fetchData();
      }
  }

  const togglePendingSelection = (userId: string) => {
      setSelectedPendingIds(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
  }

  const toggleAllPending = () => {
      if (selectedPendingIds.length === pendingUsers.length) {
          setSelectedPendingIds([]);
      } else {
          setSelectedPendingIds(pendingUsers.map(u => u.id));
      }
  }

  const handleBulkApprove = async () => {
      if (!confirm(`¿Aprobar acceso a los ${selectedPendingIds.length} usuarios seleccionados?`)) return;
      
      for (const id of selectedPendingIds) {
          await dbApproveUser(id, true);
      }
      setSelectedPendingIds([]);
      fetchData();
  }

  const handleBulkReject = async () => {
    if (!confirm(`¿Rechazar y eliminar las ${selectedPendingIds.length} solicitudes seleccionadas?`)) return;
    
    for (const id of selectedPendingIds) {
        await dbApproveUser(id, false);
    }
    setSelectedPendingIds([]);
    fetchData();
}

  const handleExport = (format: 'pdf' | 'excel') => {
      setShowExportModal(false);
      const formatName = format === 'pdf' ? 'PDF' : 'Excel';
      const currentSortLabel = availableSortOptions.find(o => o.id === sortOptionId)?.label || 'Ordenación actual';
      alert(`Descargando listado en ${formatName} con ${filteredIncidents.length} incidencias. (${currentSortLabel})... (Simulación)`);
  }

  // --- CSV IMPORT LOGIC ---
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImporting(true);
      const reader = new FileReader();

      reader.onload = async (event) => {
          const text = event.target?.result as string;
          if (!text) return;

          // Simple CSV parsing (Split by line, then by comma)
          // Assumption: No commas inside fields. For robust parsing, use a library like PapaParse in real prod.
          const lines = text.split(/\r\n|\n/);
          
          let successCount = 0;
          let errorCount = 0;

          // Skip header if it exists (simple check: if first line contains "titulo" or "title")
          const startIndex = lines[0].toLowerCase().includes('título') || lines[0].toLowerCase().includes('title') ? 1 : 0;

          for (let i = startIndex; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const cols = line.split(',');
              
              // Map columns: Title, Description, Category, Priority, Location, ImageURL (Optional)
              if (cols.length < 2) { 
                  errorCount++; 
                  continue; 
              }

              const title = cols[0]?.trim();
              const description = cols[1]?.trim() || "Sin descripción";
              const category = cols[2]?.trim() || "General";
              const priorityRaw = cols[3]?.trim().toLowerCase();
              const location = cols[4]?.trim() || "Sin ubicación";
              const imageUrl = cols[5]?.trim();

              // Normalize priority
              let priority: any = 'media';
              if (['baja', 'media', 'alta', 'urgente'].includes(priorityRaw)) {
                  priority = priorityRaw;
              }

              // Handle Image Attachment
              const attachments: Attachment[] = [];
              if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('data:image'))) {
                  attachments.push({
                      id: `imp-${Date.now()}-${i}`,
                      type: 'image',
                      url: imageUrl,
                      name: 'Imagen Importada'
                  });
              }

              if (title) {
                  await dbCreateIncident({
                      title,
                      description,
                      category,
                      priority,
                      location,
                      status: 'pendiente',
                      user_id: user.id, // Imported by current admin
                      attachments
                  });
                  successCount++;
              } else {
                  errorCount++;
              }
          }

          setImporting(false);
          setShowImportModal(false);
          alert(`Importación completada.\nCorrectos: ${successCount}\nErrores/Saltados: ${errorCount}`);
          fetchData();
      };

      reader.onerror = () => {
          setImporting(false);
          alert("Error al leer el archivo.");
      };

      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  // --- BLOCKED VIEW FOR PENDING USERS ---
  if (user.status === 'pending') {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in zoom-in duration-500">
              <div className="bg-[#FAF7F2] border-4 border-wood rounded-full p-8 mb-6 shadow-xl">
                  <Lock size={64} className="text-wood" />
              </div>
              <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 mb-4">Acceso Restringido</h2>
              <div className="bg-neutral-800 border-l-4 border-wood p-6 rounded shadow-lg max-w-lg">
                  <p className="text-lg text-white font-medium leading-relaxed">
                      {pendingMessage}
                  </p>
              </div>
          </div>
      );
  }

  // Filter Logic
  let filteredIncidents = incidents.filter(inc => {
    const statusMatch = 
        filter === 'all' ? true :
        filter === 'active' ? (inc.status === 'pendiente' || inc.status === 'en_proceso') :
        (inc.status === 'resuelto' || inc.status === 'rechazado');
    
    const categoryMatch = categoryFilter === 'all' ? true : inc.category === categoryFilter;

    return statusMatch && categoryMatch;
  });

  // Dynamic Sort Logic
  const currentSortConfig = availableSortOptions.find(o => o.id === sortOptionId);
  if (currentSortConfig) {
      filteredIncidents.sort((a, b) => {
          const field = currentSortConfig.field;
          const valA = a[field] || '';
          const valB = b[field] || '';
          
          let comparison = 0;

          // Special Handling for Priority
          if (field === 'priority') {
             const pWeight = { urgente: 4, alta: 3, media: 2, baja: 1 };
             comparison = pWeight[valA as string] - pWeight[valB as string];
          } 
          // Date Handling
          else if (field === 'created_at' || field === 'updated_at') {
              comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
          }
          // String Handling
          else {
              comparison = String(valA).localeCompare(String(valB));
          }

          return currentSortConfig.direction === 'asc' ? comparison : -comparison;
      });
  }

  const canManageUsers = user.role === 'admin' || user.role === 'supervisor';
  const isAdmin = user.role === 'admin';

  if (showUserManagement && canManageUsers) {
      return (
        <div>
             <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-200 mb-6">Gestión de Vecinos</h1>
             <UserManagement 
                userRole={user.role} 
                onUserCreated={() => {
                    alert("Usuario creado.");
                    onCloseUserManagement();
                }}
                onCancel={onCloseUserManagement}
             />
        </div>
      )
  }

  return (
    <div className="relative">
      
      {/* ADMIN SECTION: Pending Approvals (Visible Data List) */}
      {canManageUsers && pendingUsers.length > 0 && (
          <div className="mb-8 p-6 bg-wood/10 border-2 border-wood rounded-lg animate-in fade-in slide-in-from-top-4 shadow-xl">
              
              {/* Header with Select All and Bulk Actions */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                  <div className="flex items-center gap-4">
                      <h2 className="text-xl font-bold text-wood flex items-center gap-2">
                          <UserPlus size={24} /> Solicitudes de Acceso ({pendingUsers.length})
                      </h2>
                      
                      {/* Select All Checkbox */}
                      <button 
                        onClick={toggleAllPending}
                        className="flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-wood transition-colors bg-white/50 px-3 py-1 rounded border border-neutral-300"
                      >
                         {selectedPendingIds.length === pendingUsers.length && pendingUsers.length > 0 
                            ? <CheckSquare size={18} className="text-wood"/> 
                            : <Square size={18}/>
                         }
                         Seleccionar Todo
                      </button>
                  </div>

                  {/* Bulk Actions Toolbar */}
                  {selectedPendingIds.length > 0 ? (
                      <div className="flex gap-2 animate-in slide-in-from-right-5 fade-in">
                           <button 
                                onClick={handleBulkApprove}
                                className="bg-green-700 hover:bg-green-600 text-white px-4 py-1.5 rounded font-bold text-sm flex items-center gap-2 shadow-sm"
                           >
                               <Check size={16}/> Aceptar ({selectedPendingIds.length})
                           </button>
                           <button 
                                onClick={handleBulkReject}
                                className="bg-red-700 hover:bg-red-600 text-white px-4 py-1.5 rounded font-bold text-sm flex items-center gap-2 shadow-sm"
                           >
                               <Trash2 size={16}/> Rechazar ({selectedPendingIds.length})
                           </button>
                      </div>
                  ) : (
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest hidden md:block">Revisión Requerida</span>
                  )}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pendingUsers.map(pu => {
                      const isSelected = selectedPendingIds.includes(pu.id);
                      return (
                      <div 
                        key={pu.id} 
                        className={`bg-neutral-800 p-5 rounded-lg border-2 shadow-lg flex flex-col transition-all cursor-pointer relative ${isSelected ? 'border-wood ring-1 ring-wood' : 'border-neutral-600 hover:border-neutral-500'}`}
                        onClick={(e) => {
                            // Prevent triggering when clicking buttons directly
                            if((e.target as HTMLElement).closest('button')) return;
                            togglePendingSelection(pu.id);
                        }}
                      >
                          {/* Selection Indicator */}
                          <div className="absolute top-3 right-3 text-wood">
                             {isSelected ? <CheckSquare size={24} className="fill-wood/20"/> : <Square size={24} className="text-neutral-600"/>}
                          </div>

                          <div className="mb-4 pr-8">
                              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                  {pu.full_name}
                              </h3>
                              <p className="text-neutral-400 text-sm mb-2">{pu.email}</p>
                              
                              <div className="grid grid-cols-2 gap-2 mt-3 bg-neutral-900/50 p-3 rounded pointer-events-none">
                                  <div>
                                      <span className="text-[10px] text-neutral-500 uppercase block">Usuario</span>
                                      <span className="text-sm font-bold text-white">{pu.username}</span>
                                  </div>
                                  <div>
                                      <span className="text-[10px] text-neutral-500 uppercase block">Propiedad</span>
                                      <span className="text-wood font-bold text-sm">{pu.house_number}</span>
                                  </div>
                                  {/* Show custom fields if any */}
                                  {pu.custom_fields && Object.entries(pu.custom_fields).map(([k, v]) => (
                                      <div key={k} className="col-span-2 border-t border-neutral-700 pt-1 mt-1">
                                          <span className="text-[10px] text-neutral-500 uppercase block">{k}</span>
                                          <span className="text-sm text-neutral-300">{v}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div className="flex gap-3 mt-auto">
                              <button 
                                onClick={() => handleApproveUser(pu.id)}
                                className="flex-1 bg-neutral-700 hover:bg-green-700 text-white py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-green-500"
                              >
                                  <Check size={14}/> Aceptar
                              </button>
                              <button 
                                onClick={() => handleRejectUser(pu.id)}
                                className="flex-1 bg-neutral-700 hover:bg-red-900/80 text-white py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-red-500"
                              >
                                  <Trash2 size={14}/> Rechazar
                              </button>
                          </div>
                      </div>
                  )})}
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        {/* Title Updated: font-black for Light Mode strong contrast */}
        <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-200">Tablero de Incidencias</h1>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-neutral-800 p-1 rounded-lg border border-neutral-700 shadow-sm">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${filter === 'all' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              Todas
            </button>
            <button 
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${filter === 'active' ? 'bg-wood/20 text-wood' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              Activas
            </button>
             <button 
              onClick={() => setFilter('resolved')}
              className={`px-3 py-1.5 rounded font-bold text-sm transition-colors ${filter === 'resolved' ? 'bg-green-900/20 text-green-600' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              Resueltas
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-neutral-200 px-3 py-1.5 rounded-lg border border-neutral-400 shadow-sm">
             <Filter size={16} className="text-neutral-800" />
             <select 
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-transparent text-sm text-neutral-900 font-bold focus:outline-none cursor-pointer w-32 md:w-auto"
             >
                 <option value="all" className="text-neutral-900">Todas las Categorías</option>
                 {categories.map(cat => (
                     <option key={cat} value={cat} className="text-neutral-900">{cat}</option>
                 ))}
             </select>
          </div>

          {/* Sort Dropdown (Dynamic) */}
          {availableSortOptions.length > 0 && (
            <div className="flex items-center gap-2 bg-neutral-800 px-2 py-1.5 rounded-lg border border-neutral-700">
                    <ArrowUpDown size={16} className="text-wood" />
                    <select 
                        value={sortOptionId}
                        onChange={e => setSortOptionId(e.target.value)}
                        className="bg-transparent text-sm text-neutral-200 font-bold focus:outline-none cursor-pointer"
                    >
                        {availableSortOptions.map(opt => (
                            <option key={opt.id} value={opt.id} className="text-neutral-900">{opt.label}</option>
                        ))}
                    </select>
            </div>
          )}

          {/* Admin Tools: View Config & Export & SETTINGS */}
          {canManageUsers && (
              <div className="flex gap-2">
                
                {/* Global Admin Configuration (Gear Icon) */}
                {isAdmin && (
                    <button 
                        onClick={() => setShowAdminSettings(true)}
                        className="p-2 rounded border border-neutral-600 bg-neutral-800 text-neutral-400 hover:text-white hover:border-wood transition-colors"
                        title="Configuración del Sistema (Categorías, Campos...)"
                    >
                        <Settings size={18} />
                    </button>
                )}

                <button 
                    onClick={() => setShowViewConfig(!showViewConfig)}
                    className={`p-2 rounded border border-neutral-600 ${showViewConfig ? 'bg-wood text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
                    title="Configurar vista"
                >
                    <Eye size={18} />
                </button>
                <button 
                    onClick={() => setShowImportModal(true)}
                    className="p-2 rounded border border-neutral-600 bg-neutral-800 text-neutral-400 hover:text-white hover:border-blue-500 transition-colors"
                    title="Importar CSV"
                >
                    <FileUp size={18} />
                </button>
                <button 
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded font-bold text-sm shadow-sm transition-colors"
                    title="Exportar listado"
                >
                    <FileDown size={18} /> <span className="hidden md:inline">Exportar</span>
                </button>
              </div>
          )}
        </div>
      </div>

      {/* View Configuration Panel (Admin Only) */}
      {showViewConfig && canManageUsers && (
          <div className="mb-4 bg-neutral-800 p-4 rounded border border-wood/50 animate-in slide-in-from-top-2">
              <h3 className="text-wood font-bold text-sm mb-3 flex items-center gap-2"><Eye size={16}/> Campos Visibles en el Listado</h3>
              <div className="flex flex-wrap gap-4">
                  {Object.keys(viewConfig).map(key => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300 select-none">
                          <input 
                            type="checkbox" 
                            checked={viewConfig[key as keyof IncidentViewConfig]}
                            onChange={() => setViewConfig(prev => ({...prev, [key]: !prev[key as keyof IncidentViewConfig]}))}
                            className="accent-wood w-4 h-4"
                          />
                          {key.replace('show', '').replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                  ))}
              </div>
          </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIncidents.length > 0 && canManageUsers && (
          <div className="sticky top-20 z-30 bg-wood text-white p-3 rounded-lg shadow-lg mb-4 flex justify-between items-center animate-in slide-in-from-top-5">
              <span className="font-bold text-sm ml-2">{selectedIncidents.length} incidencias seleccionadas</span>
              <button 
                onClick={() => setShowEmailModal(true)}
                className="bg-white text-wood px-4 py-1.5 rounded font-bold text-sm flex items-center gap-2 hover:bg-neutral-100"
              >
                  <Mail size={16} /> Enviar Informe por Email
              </button>
          </div>
      )}

      {/* Incident List Container */}
      <div className="bg-[#E8DCCA] dark:bg-[#202124] border-2 border-[#8B5A2B]/30 dark:border-[#3c4043] rounded-xl p-6 min-h-[500px] shadow-inner">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-wood-hover font-bold text-lg">
            <RefreshCcw className="animate-spin mr-2" /> Cargando datos...
          </div>
        ) : (
          <IncidentList 
            incidents={filteredIncidents} 
            userRole={user.role} 
            userName={user.full_name || user.email}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onRefresh={fetchData}
            selectable={canManageUsers}
            selectedIds={selectedIncidents}
            onToggleSelection={handleSelectIncident}
            viewConfig={viewConfig}
          />
        )}
      </div>

      {/* MODALS */}
      {showAdminSettings && (
          <AdminSettings onClose={() => setShowAdminSettings(false)} onUpdate={fetchData} />
      )}

      {showEmailModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-neutral-800 border-2 border-neutral-700 w-full max-w-lg rounded-lg shadow-2xl p-6 relative card">
                  <button onClick={() => setShowEmailModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20}/></button>
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Mail className="text-wood"/> Enviar Informe a Vecinos</h2>
                   <textarea 
                    value={emailMessage}
                    onChange={e => setEmailMessage(e.target.value)}
                    rows={5}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-white mb-4 focus:border-wood focus:outline-none"
                    placeholder="Escriba aquí el mensaje..."
                  />
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 text-neutral-400 font-medium hover:text-white">Cancelar</button>
                      <button onClick={handleSendEmail} disabled={sendingEmail} className="bg-wood hover:bg-wood-light text-white px-6 py-2 rounded font-bold flex items-center gap-2 disabled:opacity-50">
                          <Send size={18} /> {sendingEmail ? 'Enviando...' : 'Enviar Informe'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showImportModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-[#FAF7F2] dark:bg-[#303134] border-2 border-wood dark:border-neutral-600 w-full max-w-lg rounded-lg shadow-2xl p-6 relative card">
                 <button onClick={() => setShowImportModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-black dark:hover:text-white"><X size={20}/></button>
                 <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-6 flex items-center gap-2">
                    <FileUp className="text-wood"/> Importar Incidencias (CSV)
                 </h2>
                 
                 <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6 text-sm text-blue-900 dark:text-blue-200">
                    <p className="font-bold flex items-center gap-2 mb-2"><HelpCircle size={16}/> Formato Requerido:</p>
                    <code className="block bg-black/10 dark:bg-black/30 p-2 rounded text-xs font-mono mb-2">
                        Título, Descripción, Categoría, Prioridad, Ubicación, URL_Imagen
                    </code>
                    <p className="text-xs mt-2 italic">
                        Nota: Para la imagen, proporciona una URL pública (https://...) o déjalo vacío. 
                        No se pueden leer rutas locales (C:\...) por seguridad del navegador.
                    </p>
                 </div>

                 <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/30 transition-colors cursor-pointer group">
                     {importing ? (
                         <div className="flex flex-col items-center text-wood animate-pulse">
                             <RefreshCcw className="animate-spin mb-2" size={32}/>
                             <span className="font-bold">Procesando archivo...</span>
                         </div>
                     ) : (
                         <label className="flex flex-col items-center w-full h-full cursor-pointer">
                             <Upload size={32} className="text-neutral-400 group-hover:text-wood mb-2 transition-colors"/>
                             <span className="font-bold text-neutral-600 dark:text-neutral-300 text-sm">Haz clic para seleccionar tu CSV</span>
                             <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                         </label>
                     )}
                 </div>
             </div>
          </div>
      )}

      {showExportModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-neutral-800 border-2 border-neutral-700 w-full max-w-sm rounded-lg shadow-2xl p-6 relative card">
                 <button onClick={() => setShowExportModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white"><X size={20}/></button>
                 <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><FileDown className="text-wood"/> Exportar Listado</h2>
                 
                 <div className="grid grid-cols-2 gap-4">
                     <button 
                        onClick={() => handleExport('pdf')}
                        className="flex flex-col items-center justify-center p-4 bg-red-900/30 hover:bg-red-900/50 border border-red-800 rounded text-red-100 transition-colors group"
                     >
                         <FileText size={32} className="mb-2 group-hover:scale-110 transition-transform"/>
                         <span className="font-bold">PDF</span>
                     </button>
                     <button 
                        onClick={() => handleExport('excel')}
                        className="flex flex-col items-center justify-center p-4 bg-green-900/30 hover:bg-green-900/50 border border-green-800 rounded text-green-100 transition-colors group"
                     >
                         <FileSpreadsheet size={32} className="mb-2 group-hover:scale-110 transition-transform"/>
                         <span className="font-bold">Excel</span>
                     </button>
                 </div>
                 <div className="mt-4 text-center">
                    <p className="text-xs text-neutral-500">Se exportarán {filteredIncidents.length} incidencias.</p>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;