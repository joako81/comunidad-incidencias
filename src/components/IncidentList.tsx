import React, { useState } from "react";
import { Incident, UserRole, IncidentViewConfig, Attachment } from "../types";
import {
  Clock,
  MapPin,
  MessageSquare,
  Trash2,
  Send,
  Tag,
  User,
  Droplets,
  Zap,
  Brush,
  Sprout,
  Hammer,
  Box,
  PlayCircle,
  RefreshCw,
  Pencil,
  X,
  Maximize2,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Film,
  AlertTriangle,
  Home,
  Shield,
} from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { dbAddNote, dbDeleteNote, dbUpdateNote } from "../services/db";

interface IncidentListProps {
  incidents: Incident[];
  userRole: UserRole;
  userId: string;
  userName: string;
  onStatusChange: (id: string, status: Incident["status"]) => void;
  onDelete: (id: string) => void;
  onEdit: (incident: Incident) => void;
  onRefresh: () => void;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelection?: (id: string, selected: boolean) => void;
  viewConfig?: IncidentViewConfig;
}

const statusColors = {
  pendiente:
    "text-yellow-900 bg-yellow-200 border-yellow-400 dark:text-yellow-200 dark:bg-yellow-900/50 dark:border-yellow-700",
  en_proceso:
    "text-blue-900 bg-blue-200 border-blue-400 dark:text-blue-200 dark:bg-blue-900/50 dark:border-blue-700",
  resuelto:
    "text-green-900 bg-green-200 border-green-400 dark:text-green-200 dark:bg-green-900/50 dark:border-green-700",
  rechazado:
    "text-red-900 bg-red-200 border-red-400 dark:text-red-200 dark:bg-red-900/50 dark:border-red-700",
};

const priorityColors = {
  baja: "text-gray-500 bg-gray-100 border-gray-200",
  media: "text-blue-600 bg-blue-50 border-blue-100",
  alta: "text-orange-600 bg-orange-50 border-orange-100",
  urgente: "text-red-600 bg-red-50 border-red-200 font-bold animate-pulse",
};

const getCategoryStyle = (cat: string) => {
  const c = cat?.toLowerCase() || "";
  if (c.includes("elec"))
    return {
      color: "text-yellow-800 dark:text-yellow-400",
      icon: <Zap size={14} />,
    };
  if (c.includes("font"))
    return {
      color: "text-blue-800 dark:text-blue-400",
      icon: <Droplets size={14} />,
    };
  if (c.includes("jard"))
    return {
      color: "text-green-800 dark:text-green-400",
      icon: <Sprout size={14} />,
    };
  if (c.includes("pint"))
    return {
      color: "text-purple-800 dark:text-purple-400",
      icon: <Brush size={14} />,
    };
  if (c.includes("limp"))
    return {
      color: "text-cyan-800 dark:text-cyan-400",
      icon: <Box size={14} />,
    };
  if (c.includes("suelo") || c.includes("pavi"))
    return {
      color: "text-orange-800 dark:text-orange-400",
      icon: <Hammer size={14} />,
    };
  return { color: "text-gray-700 dark:text-gray-400", icon: <Tag size={14} /> };
};

const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  userRole,
  userId,
  userName,
  onStatusChange,
  onDelete,
  onEdit,
  onRefresh,
  selectable = false,
  selectedIds = [],
  onToggleSelection,
  viewConfig,
}) => {
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<Attachment[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const isAdmin = userRole === "admin";
  const isSupervisor = userRole === "supervisor";
  const isStaff = isAdmin || isSupervisor;

  const handleAddNote = async (incidentId: string) => {
    if (!newNote.trim()) return;
    if (editingNoteId) {
      await dbUpdateNote(incidentId, editingNoteId, newNote);
      setEditingNoteId(null);
    } else {
      await dbAddNote(incidentId, newNote, userName);
    }
    setNewNote("");
    onRefresh();
  };

  const handleEditNoteClick = (
    incidentId: string,
    noteId: string,
    content: string,
  ) => {
    setExpandedNotes(incidentId);
    setEditingNoteId(noteId);
    setNewNote(content);
  };

  const handleDeleteNote = async (incidentId: string, noteId: string) => {
    if (
      confirm("¿Estás seguro de que deseas eliminar esta nota permanentemente?")
    ) {
      await dbDeleteNote(incidentId, noteId);
      onRefresh();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {incidents.map((incident) => {
        const catStyle = getCategoryStyle(incident.category);
        const isClosed =
          incident.status === "resuelto" || incident.status === "rechazado";
        const isOwner = incident.user_id === userId;
        const canEditIncident = isOwner || isStaff;

        // --- LÓGICA DE PRIVACIDAD GRANULAR ---
        let showSensitiveInfo = false;
        if (viewConfig?.showUser) {
          if (isOwner || isStaff) {
            showSensitiveInfo = true;
          } else {
            showSensitiveInfo = viewConfig.userVisibilityMode === "public";
          }
        }

        return (
          <div
            key={incident.id}
            className="bg-white dark:bg-card border-2 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row relative transition-all border-neutral-100 dark:border-neutral-800 hover:border-wood/40"
          >
            <div
              className={clsx(
                "flex-grow p-6 flex flex-col",
                selectable && "md:pl-14",
              )}
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={clsx(
                    "px-3 py-0.5 text-[10px] rounded-full border capitalize font-black tracking-widest",
                    statusColors[incident.status],
                  )}
                >
                  {incident.status.replace("_", " ")}
                </span>
                {viewConfig?.showPriority && incident.priority && (
                  <span
                    className={clsx(
                      "px-2 py-0.5 text-[9px] rounded border flex items-center gap-1 uppercase font-bold",
                      priorityColors[
                        incident.priority as keyof typeof priorityColors
                      ],
                    )}
                  >
                    <AlertTriangle size={10} /> {incident.priority}
                  </span>
                )}
                {viewConfig?.showCategory && (
                  <span
                    className={clsx(
                      "px-3 py-0.5 text-[10px] rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-black flex items-center gap-1 uppercase tracking-widest",
                      catStyle.color,
                    )}
                  >
                    {catStyle.icon} {incident.category || "General"}
                  </span>
                )}
                {canEditIncident && (
                  <button
                    onClick={() => onEdit(incident)}
                    className="p-2 text-wood hover:bg-wood/10 rounded-full transition-all ml-auto"
                  >
                    <Pencil size={18} />
                  </button>
                )}
              </div>

              <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 mb-2 uppercase tracking-tight">
                {incident.title}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm font-medium mb-4 line-clamp-3">
                {incident.description}
              </p>

              {incident.attachments && incident.attachments.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                  {incident.attachments.map((att, idx) => (
                    <div
                      key={att.id}
                      onClick={() => {
                        setGalleryItems(incident.attachments || []);
                        setCurrentIndex(idx);
                        setIsVideoLoading(true);
                      }}
                      className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border-2 border-neutral-100 dark:border-neutral-800 shadow-sm cursor-pointer group"
                    >
                      {att.type === "image" ? (
                        <img
                          src={att.url}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          alt=""
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-900 group-hover:bg-neutral-200 transition-colors">
                          <PlayCircle size={32} className="text-wood" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <Maximize2
                          size={16}
                          className="text-white opacity-0 group-hover:opacity-100"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {incident.notes && incident.notes.length > 0 && (
                <div className="mt-2 mb-4 bg-neutral-50/50 dark:bg-neutral-900/20 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-black uppercase text-neutral-400 mb-2 block tracking-widest">
                    Historial de Notas
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {incident.notes.map((note) => {
                      const canManageNote =
                        userRole === "admin" ||
                        userRole === "supervisor" ||
                        note.author_name === userName;
                      return (
                        <div
                          key={note.id}
                          className="text-[11px] group relative"
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-wood uppercase">
                                {note.author_name}
                              </span>
                              <span className="text-[9px] text-neutral-400">
                                {format(
                                  new Date(note.created_at),
                                  "dd/MM HH:mm",
                                  { locale: es },
                                )}
                              </span>
                            </div>
                            {canManageNote && (
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() =>
                                    handleEditNoteClick(
                                      incident.id,
                                      note.id,
                                      note.content,
                                    )
                                  }
                                  className="text-blue-500 hover:text-blue-700"
                                  title="Editar nota"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteNote(incident.id, note.id)
                                  }
                                  className="text-red-500 hover:text-red-700"
                                  title="Borrar nota"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-[10px] text-neutral-400 font-black uppercase tracking-widest mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-800">
                {viewConfig?.showLocation && (
                  <div className="flex items-center gap-1">
                    <MapPin size={14} /> {incident.location}
                  </div>
                )}
                {viewConfig?.showDate && (
                  <div className="flex items-center gap-1">
                    <Clock size={14} />{" "}
                    {formatDistanceToNow(new Date(incident.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </div>
                )}

                {/* RENDERIZADO DEL USUARIO CON DOBLE CHECK Y GRANULARIDAD */}
                {showSensitiveInfo ? (
                  <div className="flex items-center gap-2 text-wood">
                    {viewConfig?.showUserName && (
                      <div className="flex items-center gap-1">
                        <User size={14} /> {incident.user_name || "Anónimo"}
                      </div>
                    )}
                    {viewConfig?.showUserHouse && (
                      <div className="flex items-center gap-1">
                        <Home size={14} /> {incident.user_house || "S/N"}
                      </div>
                    )}
                  </div>
                ) : (
                  viewConfig?.showUser && (
                    <div
                      className="flex items-center gap-1 text-neutral-300"
                      title="Información privada"
                    >
                      <Shield size={14} /> Vecino Privado
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="bg-neutral-50/50 dark:bg-neutral-900/40 p-5 md:w-72 border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-800 flex flex-col justify-between gap-4">
              <div>
                <button
                  onClick={() => {
                    setExpandedNotes(
                      expandedNotes === incident.id ? null : incident.id,
                    );
                    setEditingNoteId(null);
                    setNewNote("");
                  }}
                  className="text-[10px] flex items-center justify-between w-full bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-wood font-black uppercase shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare size={14} />{" "}
                    {editingNoteId ? "Editando..." : "Nueva Nota"}
                  </span>
                  <span className="bg-wood text-white px-2 py-0.5 rounded-full text-[9px]">
                    {incident.notes?.length || 0}
                  </span>
                </button>
                {expandedNotes === incident.id && (
                  <div className="mt-3 bg-white dark:bg-neutral-900 rounded-xl p-3 border-2 border-neutral-100 dark:border-neutral-700 animate-in slide-in-from-top-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="w-full rounded-lg text-[11px] p-2 bg-neutral-100 dark:bg-neutral-800 border-none outline-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 min-h-[80px] mb-2"
                      placeholder="Escribir..."
                    />
                    <div className="flex gap-1">
                      {editingNoteId && (
                        <button
                          onClick={() => {
                            setEditingNoteId(null);
                            setNewNote("");
                          }}
                          className="bg-neutral-200 text-neutral-600 px-2 py-2 rounded-lg text-[9px] font-black uppercase flex-1"
                        >
                          X
                        </button>
                      )}
                      <button
                        onClick={() => handleAddNote(incident.id)}
                        className="bg-wood text-white p-2 rounded-lg flex-grow font-black uppercase text-[10px] flex items-center justify-center gap-2"
                      >
                        <Send size={14} />{" "}
                        {editingNoteId ? "Guardar" : "Enviar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 mt-auto">
                {(userRole === "admin" || userRole === "supervisor") && (
                  <>
                    {!isClosed && (
                      <div className="grid grid-cols-2 gap-2">
                        {incident.status === "pendiente" && (
                          <button
                            onClick={() =>
                              onStatusChange(incident.id, "en_proceso")
                            }
                            className="text-[9px] bg-blue-600 text-white py-2.5 rounded-xl font-black uppercase shadow-md transition-all"
                          >
                            Procesar
                          </button>
                        )}
                        <button
                          onClick={() =>
                            onStatusChange(incident.id, "resuelto")
                          }
                          className={clsx(
                            "text-[9px] bg-green-600 text-white py-2.5 rounded-xl font-black uppercase shadow-md transition-all",
                            incident.status !== "pendiente" && "col-span-2",
                          )}
                        >
                          Resolver
                        </button>
                      </div>
                    )}
                    {isClosed && (
                      <button
                        onClick={() =>
                          onStatusChange(incident.id, "en_proceso")
                        }
                        className="flex items-center justify-center gap-2 text-[9px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 py-2.5 rounded-xl font-black uppercase transition-all"
                      >
                        <RefreshCw size={14} /> Reabrir
                      </button>
                    )}
                    {userRole === "admin" && (
                      <button
                        onClick={() => {
                          if (confirm("¿Borrar incidencia?"))
                            onDelete(incident.id);
                        }}
                        className="text-[9px] text-red-500 font-black uppercase mt-1 transition-colors hover:text-red-700 flex items-center justify-center gap-1"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* CARRUSEL MULTIMEDIA */}
      {galleryItems && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-2xl animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-black/95"
            onClick={() => setGalleryItems(null)}
          />
          <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-center z-[110]">
            <div className="bg-white/10 px-4 py-2 rounded-full border border-white/10 shadow-xl text-white font-black text-[10px] tracking-widest">
              {currentIndex + 1} / {galleryItems.length}
            </div>
            <div className="flex gap-3">
              <a
                href={galleryItems[currentIndex].url}
                download
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
              >
                <Download size={20} />
              </a>
              <button
                onClick={() => setGalleryItems(null)}
                className="p-3 bg-white/10 hover:bg-red-500 text-white rounded-full transition-all border border-white/10"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="relative w-full max-w-6xl h-full flex items-center justify-center z-[105]">
            {galleryItems.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(
                    (currentIndex - 1 + galleryItems.length) %
                      galleryItems.length,
                  );
                  setIsVideoLoading(true);
                }}
                className="absolute left-0 md:-left-16 p-4 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full"
              >
                <ChevronLeft size={48} />
              </button>
            )}
            <div
              className="relative w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-500"
              onClick={(e) => e.stopPropagation()}
            >
              {galleryItems[currentIndex].type === "image" ? (
                <img
                  src={galleryItems[currentIndex].url}
                  className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/5"
                  alt=""
                />
              ) : (
                <div className="relative w-full max-w-4xl max-h-[75vh] flex justify-center items-center">
                  {isVideoLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <Loader2 className="animate-spin text-wood" size={64} />
                    </div>
                  )}
                  <video
                    key={galleryItems[currentIndex].url}
                    src={galleryItems[currentIndex].url}
                    controls
                    autoPlay
                    playsInline
                    onCanPlay={() => setIsVideoLoading(false)}
                    className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl border border-white/10 bg-black"
                  />
                </div>
              )}
            </div>
            {galleryItems.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((currentIndex + 1) % galleryItems.length);
                  setIsVideoLoading(true);
                }}
                className="absolute right-0 md:-right-16 p-4 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full"
              >
                <ChevronRight size={48} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentList;
