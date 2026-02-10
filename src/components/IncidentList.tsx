import React, { useState } from 'react';
import { Incident, UserRole, IncidentViewConfig } from '../types';
import { Clock, MapPin, CheckCircle2, MessageSquare, Trash2, Send, Tag, User, Droplets, Zap, Brush, Sprout, Hammer, Box, PlayCircle, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { dbAddNote } from '../services/db';

interface IncidentListProps {
  incidents: Incident[];
  userRole: UserRole;
  userName: string;
  onStatusChange: (id: string, status: Incident['status']) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelection?: (id: string, selected: boolean) => void;
  viewConfig?: IncidentViewConfig;
}

const statusColors = {
  pendiente: 'text-yellow-900 bg-yellow-200 border-yellow-400 dark:text-yellow-200 dark:bg-yellow-900/50 dark:border-yellow-700',
  en_proceso: 'text-blue-900 bg-blue-200 border-blue-400 dark:text-blue-200 dark:bg-blue-900/50 dark:border-blue-700',
  resuelto: 'text-green-900 bg-green-200 border-green-400 dark:text-green-200 dark:bg-green-900/50 dark:border-green-700',
  rechazado: 'text-red-900 bg-red-200 border-red-400 dark:text-red-200 dark:bg-red-900/50 dark:border-red-700',
};

const priorityColors = {
  baja: 'text-gray-600 dark:text-gray-400',
  media: 'text-blue-700 dark:text-blue-400',
  alta: 'text-orange-700 dark:text-orange-400',
  urgente: 'text-red-700 font-black dark:text-red-500',
};

// Helper function for Category Colors & Icons
const getCategoryStyle = (cat: string) => {
    switch (cat.toLowerCase()) {
        case 'electricidad': return { color: 'text-yellow-800 dark:text-yellow-400', icon: <Zap size={14}/> };
        case 'fontanería': return { color: 'text-blue-800 dark:text-blue-400', icon: <Droplets size={14}/> };
        case 'jardinería': return { color: 'text-green-800 dark:text-green-400', icon: <Sprout size={14}/> };
        case 'pintura': return { color: 'text-purple-800 dark:text-purple-400', icon: <Brush size={14}/> };
        case 'limpieza': return { color: 'text-cyan-800 dark:text-cyan-400', icon: <Box size={14}/> };
        case 'suelos/pavimento': return { color: 'text-orange-800 dark:text-orange-400', icon: <Hammer size={14}/> };
        default: return { color: 'text-gray-700 dark:text-gray-400', icon: <Tag size={14}/> };
    }
};

const IncidentList: React.FC<IncidentListProps> = ({ 
    incidents, userRole, userName, onStatusChange, onDelete, onRefresh, 
    selectable = false, selectedIds = [], onToggleSelection, 
    viewConfig = { showLocation: true, showDate: true, showUser: true, showPriority: true, showCategory: true }
}) => {
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const handleAddNote = async (incidentId: string) => {
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    await dbAddNote(incidentId, newNote, userName);
    setNewNote('');
    setSubmittingNote(false);
    onRefresh();
  };

  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 text-txt-secondary">
        <div className="inline-block p-4 rounded-full bg-white/50 mb-4 border border-wood/30">
            <CheckCircle2 size={40} className="text-wood" />
        </div>
        <p className="font-bold text-lg text-neutral-800 dark:text-neutral-200">No hay incidencias registradas con este filtro</p>
      </div>
    );
  }

  return (
    // Changed Grid to Flex Column for List View
    <div className="flex flex-col gap-4">
      {incidents.map((incident) => {
        const catStyle = getCategoryStyle(incident.category);
        const isClosed = incident.status === 'resuelto' || incident.status === 'rechazado';
        
        return (
        <div 
          key={incident.id} 
          className={clsx(
              "bg-[#FAF7F2] dark:bg-card border rounded-xl overflow-hidden transition-all shadow-sm hover:shadow-md flex flex-col md:flex-row relative card",
              selectable && selectedIds.includes(incident.id) ? "border-wood ring-2 ring-wood" : "border-wood/20 dark:border-transparent hover:border-wood"
          )}
        >
          {/* Checkbox for Admin/Supervisor */}
          {selectable && onToggleSelection && (
              <div className="absolute top-4 right-4 z-10 md:left-4 md:right-auto md:top-1/2 md:-translate-y-1/2">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-wood cursor-pointer"
                    checked={selectedIds.includes(incident.id)}
                    onChange={(e) => onToggleSelection(incident.id, e.target.checked)}
                  />
              </div>
          )}

          {/* Main Content Area */}
          <div className={clsx("flex-grow p-5 flex flex-col justify-between", selectable && "md:pl-12")}>
            <div>
                {/* Header Row: Status | Category | Priority */}
                <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className={clsx("px-2.5 py-0.5 text-xs rounded-full border capitalize font-bold tracking-wide", statusColors[incident.status])}>
                        {incident.status.replace('_', ' ')}
                    </span>
                    
                    {viewConfig.showCategory && (
                        <span className={clsx("px-2 py-0.5 text-xs rounded-full border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 font-bold flex items-center gap-1 uppercase tracking-wide", catStyle.color)}>
                            {catStyle.icon} {incident.category || 'General'}
                        </span>
                    )}
                    
                    {viewConfig.showPriority && (
                        <span className={clsx("text-xs uppercase tracking-wider font-extrabold ml-auto md:ml-0", priorityColors[incident.priority])}>
                            Prioridad: {incident.priority}
                        </span>
                    )}
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 mb-2 leading-tight">{incident.title}</h3>
                
                {/* Description */}
                <p className="text-neutral-700 dark:text-neutral-300 text-base font-medium leading-relaxed mb-4">{incident.description}</p>
                
                {/* Attachments Preview (Smaller in List View) */}
                {incident.attachments && incident.attachments.length > 0 && (
                   <div className="flex gap-2 overflow-x-auto pb-2">
                       {incident.attachments.map((att) => (
                           <div key={att.id} className="relative w-16 h-16 shrink-0 rounded overflow-hidden border border-neutral-300 dark:border-neutral-700 bg-gray-100 dark:bg-neutral-800 group cursor-pointer shadow-sm">
                               {att.type === 'image' ? (
                                   <a href={att.url} target="_blank" rel="noreferrer">
                                       <img src={att.url} alt="adjunto" className="w-full h-full object-cover" />
                                   </a>
                               ) : (
                                   <div className="w-full h-full flex items-center justify-center text-gray-500">
                                       <PlayCircle size={20} className="text-wood" />
                                   </div>
                               )}
                           </div>
                       ))}
                   </div>
                )}
            </div>
            
            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400 font-bold mt-2 pt-3 border-t border-neutral-200 dark:border-neutral-700/50">
                {viewConfig.showLocation && (
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      <span>{incident.location}</span>
                    </div>
                )}
                
                {viewConfig.showDate && (
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true, locale: es })}</span>
                    </div>
                )}

                {viewConfig.showUser && (userRole === 'admin' || userRole === 'supervisor') && incident.user_name && (
                    <div className="flex items-center gap-1 text-wood">
                        <User size={14} /> <span>{incident.user_name} ({incident.user_house})</span>
                    </div>
                )}
            </div>
          </div>
          
          {/* Action Sidebar / Bottom Bar */}
          <div className="bg-gray-50 dark:bg-neutral-900/50 p-4 md:w-64 border-t md:border-t-0 md:border-l border-wood/20 dark:border-neutral-700 flex flex-col justify-between gap-3">
              
              {/* Notes Toggle */}
              <div>
                 <button 
                    onClick={() => setExpandedNotes(expandedNotes === incident.id ? null : incident.id)}
                    className="text-xs flex items-center justify-between w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 text-wood hover:text-wood-hover font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                    <span className="flex items-center gap-2"><MessageSquare size={14} /> Notas</span>
                    <span className="bg-wood text-white text-[10px] px-1.5 rounded-full">{incident.notes?.length || 0}</span>
                </button>
                
                {/* Inline Notes for List View */}
                {expandedNotes === incident.id && (
                    <div className="mt-2 bg-white dark:bg-neutral-900 rounded p-2 border border-neutral-200 dark:border-neutral-700 animate-in fade-in slide-in-from-top-1">
                        <div className="max-h-32 overflow-y-auto mb-2 space-y-2 custom-scrollbar">
                            {incident.notes && incident.notes.length > 0 ? (
                                incident.notes.map(note => (
                                    <div key={note.id} className="bg-gray-50 dark:bg-neutral-800 p-1.5 rounded text-[10px] border border-neutral-200 dark:border-neutral-700">
                                        <div className="font-bold text-wood mb-0.5">{note.author_name}</div>
                                        <p className="text-neutral-700 dark:text-neutral-300">{note.content}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[10px] text-neutral-400 text-center italic">Sin notas.</p>
                            )}
                        </div>
                        {(userRole === 'admin' || userRole === 'supervisor') && (
                            <div className="flex gap-1">
                                <input 
                                    type="text" 
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    // FIXED: Text color set to black/dark for visibility
                                    className="flex-grow rounded text-[10px] p-1 border border-neutral-300 dark:border-neutral-600 focus:border-wood outline-none text-neutral-900 dark:text-neutral-100"
                                    placeholder="Nota..."
                                />
                                <button onClick={() => handleAddNote(incident.id)} disabled={submittingNote} className="bg-wood text-white p-1 rounded">
                                    <Send size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-auto">
                  {(userRole === 'admin' || userRole === 'supervisor') && (
                    <>
                        {/* Status Actions */}
                        {!isClosed && (
                            <div className="grid grid-cols-2 gap-2">
                                {incident.status === 'pendiente' && (
                                    <button 
                                        onClick={() => onStatusChange(incident.id, 'en_proceso')}
                                        className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-900 py-1.5 rounded border border-blue-300 font-bold shadow-sm text-center"
                                    >
                                        Procesar
                                    </button>
                                )}
                                <button 
                                    onClick={() => onStatusChange(incident.id, 'resuelto')}
                                    className={clsx("text-[10px] bg-green-100 hover:bg-green-200 text-green-900 py-1.5 rounded border border-green-300 font-bold shadow-sm text-center", incident.status !== 'pendiente' ? 'col-span-2' : '')}
                                >
                                    Resolver
                                </button>
                            </div>
                        )}

                        {/* REOPEN ACTION */}
                        {isClosed && (
                             <button 
                                onClick={() => onStatusChange(incident.id, 'en_proceso')}
                                className="flex items-center justify-center gap-2 text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-800 py-1.5 rounded border border-gray-400 font-bold shadow-sm transition-colors"
                                title="Reabrir Incidencia"
                            >
                                <RefreshCw size={12} /> Reabrir
                            </button>
                        )}

                        {/* Delete Action (Admin Only) */}
                        {userRole === 'admin' && (
                            <button 
                                onClick={() => { if(confirm('¿Borrar incidencia permanentemente?')) onDelete(incident.id) }}
                                className="flex items-center justify-center gap-2 text-[10px] text-red-600 hover:bg-red-50 py-1 rounded transition-colors"
                            >
                                <Trash2 size={12} /> Eliminar
                            </button>
                        )}
                    </>
                  )}
              </div>
          </div>
        </div>
      )})}
    </div>
  );
};

export default IncidentList;