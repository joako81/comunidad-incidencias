import React, { useState, useEffect } from "react";
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
  Maximize2, // <--- REPARADO: Importación añadida para evitar el ReferenceError
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Film,
} from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { dbAddNote } from "../services/db";

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
  viewConfig = {
    showLocation: true,
    showDate: true,
    showUser: true,
    showPriority: true,
    showCategory: true,
  },
}) => {
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");

  // ESTADOS DEL CARRUSEL
  const [galleryItems, setGalleryItems] = useState<Attachment[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // Cerrar modal con ESC y navegación por flechas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!galleryItems) return;
      if (e.key === "Escape") setGalleryItems(null);
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [galleryItems, currentIndex]);

  const openGallery = (attachments: Attachment[], index: number) => {
    setGalleryItems(attachments);
    setCurrentIndex(index);
    setIsVideoLoading(true);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!galleryItems) return;
    setIsVideoLoading(true);
    setCurrentIndex((prev) => (prev + 1) % galleryItems.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!galleryItems) return;
    setIsVideoLoading(true);
    setCurrentIndex(
      (prev) => (prev - 1 + galleryItems.length) % galleryItems.length,
    );
  };

  const handleAddNote = async (incidentId: string) => {
    if (!newNote.trim()) return;
    await dbAddNote(incidentId, newNote, userName);
    setNewNote("");
    onRefresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {incidents.map((incident) => {
        const catStyle = getCategoryStyle(incident.category);
        const isClosed =
          incident.status === "resuelto" || incident.status === "rechazado";
        const canEdit =
          incident.user_id === userId ||
          userRole === "admin" ||
          userRole === "supervisor";

        return (
          <div
            key={incident.id}
            className={clsx(
              "bg-white dark:bg-card border-2 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row relative transition-all border-neutral-100 dark:border-neutral-800 hover:border-wood/40",
            )}
          >
            <div
              className={clsx(
                "flex-grow p-6 flex flex-col justify-between",
                selectable && "md:pl-14",
              )}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className={clsx(
                      "px-3 py-0.5 text-[10px] rounded-full border capitalize font-black tracking-widest",
                      statusColors[incident.status],
                    )}
                  >
                    {incident.status.replace("_", " ")}
                  </span>
                  {viewConfig.showCategory && (
                    <span
                      className={clsx(
                        "px-3 py-0.5 text-[10px] rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-black flex items-center gap-1 uppercase tracking-widest",
                        catStyle.color,
                      )}
                    >
                      {catStyle.icon} {incident.category || "General"}
                    </span>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => onEdit(incident)}
                      className="p-2 text-wood hover:bg-wood/10 rounded-full transition-all ml-auto"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                </div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 mb-2 leading-tight uppercase tracking-tight">
                  {incident.title}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm font-medium mb-4 line-clamp-3">
                  {incident.description}
                </p>

                {incident.attachments && incident.attachments.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {incident.attachments.map((att, idx) => (
                      <div
                        key={att.id}
                        onClick={() =>
                          openGallery(incident.attachments || [], idx)
                        }
                        className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border-2 border-neutral-100 dark:border-neutral-800 shadow-sm cursor-pointer group"
                      >
                        {att.type === "image" ? (
                          <img
                            src={att.url}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            alt="Vista previa"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-900">
                            <PlayCircle
                              size={32}
                              className="text-wood group-hover:scale-110 transition-transform"
                            />
                            <Film
                              size={12}
                              className="absolute bottom-1 right-1 text-white/50"
                            />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <Maximize2
                            size={16}
                            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-[10px] text-neutral-400 dark:text-neutral-500 font-black uppercase tracking-widest mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                {viewConfig.showLocation && (
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    {incident.location}
                  </div>
                )}
                {viewConfig.showDate && (
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatDistanceToNow(new Date(incident.created_at), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </div>
                )}
                {viewConfig.showUser &&
                  (userRole === "admin" || userRole === "supervisor") &&
                  incident.user_name && (
                    <div className="flex items-center gap-1 text-wood">
                      <User size={14} />
                      {incident.user_name} ({incident.user_house})
                    </div>
                  )}
              </div>
            </div>

            <div className="bg-neutral-50/50 dark:bg-neutral-900/40 p-5 md:w-72 border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-800 flex flex-col justify-between gap-4">
              <div>
                <button
                  onClick={() =>
                    setExpandedNotes(
                      expandedNotes === incident.id ? null : incident.id,
                    )
                  }
                  className="text-[10px] flex items-center justify-between w-full bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-wood font-black uppercase shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare size={14} /> Notas
                  </span>
                  <span className="bg-wood text-white px-2 py-0.5 rounded-full text-[9px]">
                    {incident.notes?.length || 0}
                  </span>
                </button>
                {expandedNotes === incident.id && (
                  <div className="mt-3 bg-white dark:bg-neutral-900 rounded-xl p-3 border-2 border-neutral-100 animate-in slide-in-from-top-2">
                    <div className="max-h-40 overflow-y-auto mb-3 space-y-2 custom-scrollbar pr-1">
                      {incident.notes?.map((note) => (
                        <div
                          key={note.id}
                          className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded-lg text-[10px] border border-neutral-100 dark:border-neutral-700"
                        >
                          <div className="font-black text-wood uppercase mb-1">
                            {note.author_name}
                          </div>
                          <p className="text-neutral-700 dark:text-neutral-300 font-medium">
                            {note.content}
                          </p>
                        </div>
                      )) || (
                        <p className="text-[10px] text-neutral-400 italic text-center">
                          Sin notas.
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-grow rounded-lg text-[11px] p-2 bg-neutral-100 dark:bg-neutral-800 border-none outline-none text-neutral-900 dark:text-neutral-100"
                        placeholder="Añadir nota..."
                      />
                      <button
                        onClick={() => handleAddNote(incident.id)}
                        className="bg-wood text-white p-2 rounded-lg active:scale-95 transition-transform"
                      >
                        <Send size={14} />
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
                            className="text-[9px] bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-black uppercase shadow-md transition-all"
                          >
                            Procesar
                          </button>
                        )}
                        <button
                          onClick={() =>
                            onStatusChange(incident.id, "resuelto")
                          }
                          className={clsx(
                            "text-[9px] bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-black uppercase shadow-md transition-all",
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
                        className="flex items-center justify-center gap-2 text-[9px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 py-2.5 rounded-xl font-black uppercase transition-all"
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
                        className="text-[9px] text-red-500 font-black uppercase mt-1 transition-colors hover:text-red-700"
                      >
                        <Trash2 size={12} className="inline mr-1" /> Eliminar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* --- CARRUSEL MULTIMEDIA PREMIUM --- */}
      {galleryItems && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
          {/* Fondo desenfocado */}
          <div
            className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
            onClick={() => setGalleryItems(null)}
          />

          {/* Controles superiores */}
          <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-center z-[110]">
            <div className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-xl">
              <span className="text-white font-black text-xs tracking-widest">
                {currentIndex + 1} / {galleryItems.length}
              </span>
            </div>
            <div className="flex gap-3">
              <a
                href={galleryItems[currentIndex].url}
                download
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/10"
              >
                <Download size={20} />
              </a>
              <button
                onClick={() => setGalleryItems(null)}
                className="p-3 bg-white/10 hover:bg-red-500 text-white rounded-full transition-all backdrop-blur-md border border-white/10"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="relative w-full max-w-6xl h-full flex items-center justify-center z-[105]">
            {galleryItems.length > 1 && (
              <button
                onClick={handlePrev}
                className="absolute left-0 md:-left-16 p-4 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm"
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
                    key={galleryItems[currentIndex].url} // Forzar recarga al cambiar vídeo para iPhone/Android
                    src={galleryItems[currentIndex].url}
                    controls
                    autoPlay
                    playsInline // Crítico para móviles
                    preload="auto"
                    onCanPlay={() => setIsVideoLoading(false)}
                    className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl border border-white/10"
                  >
                    <source
                      src={galleryItems[currentIndex].url}
                      type="video/mp4"
                    />
                    <source
                      src={galleryItems[currentIndex].url}
                      type="video/quicktime"
                    />{" "}
                    {/* Soporte .MOV iPhone */}
                    Tu navegador no soporta el formato de vídeo.
                  </video>
                </div>
              )}
            </div>

            {galleryItems.length > 1 && (
              <button
                onClick={handleNext}
                className="absolute right-0 md:-right-16 p-4 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm"
              >
                <ChevronRight size={48} />
              </button>
            )}
          </div>

          {/* Miniaturas inferiores para navegación rápida */}
          {galleryItems.length > 1 && (
            <div className="absolute bottom-10 flex gap-2 overflow-x-auto p-2 max-w-md scrollbar-hide z-[110]">
              {galleryItems.map((item, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(i);
                    setIsVideoLoading(true);
                  }}
                  className={clsx(
                    "w-12 h-12 rounded-lg border-2 overflow-hidden transition-all shrink-0",
                    currentIndex === i
                      ? "border-wood scale-110 shadow-lg"
                      : "border-transparent opacity-40 hover:opacity-100",
                  )}
                >
                  {item.type === "image" ? (
                    <img
                      src={item.url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="bg-neutral-700 w-full h-full flex items-center justify-center">
                      <PlayCircle size={16} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IncidentList;
