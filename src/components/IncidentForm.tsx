import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  AlertCircle,
  PlusCircle,
  Paperclip,
  FileVideo,
  Trash2,
} from "lucide-react";
import { IncidentPriority, UserRole, Attachment, Incident } from "../types";
import {
  dbCreateIncident,
  dbGetCategories,
  dbAddCategory,
  dbUpdateIncident,
} from "../services/db";

interface IncidentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  userRole: UserRole;
  userName?: string; // NUEVO: Para guardar el nombre del creador
  userHouse?: string; // NUEVO: Para guardar la casa del creador
  editingIncident?: Incident | null;
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const IncidentForm: React.FC<IncidentFormProps> = ({
  onClose,
  onSuccess,
  userId,
  userRole,
  userName,
  userHouse,
  editingIncident,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState(editingIncident?.title || "");
  const [description, setDescription] = useState(
    editingIncident?.description || "",
  );
  const [location, setLocation] = useState(editingIncident?.location || "");
  const [priority, setPriority] = useState<IncidentPriority>(
    editingIncident?.priority || "media",
  );
  const [category, setCategory] = useState(
    editingIncident?.category || "General",
  );

  const [categories, setCategories] = useState<string[]>([]);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<
    { name: string; url: string; type: "image" | "video" }[]
  >([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(
    editingIncident?.attachments || [],
  );

  useEffect(() => {
    const loadCats = async () => {
      const cats = await dbGetCategories();
      setCategories(cats);
      if (cats.length > 0 && !cats.includes(category)) setCategory(cats[0]);
    };
    loadCats();
  }, []);

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      await dbAddCategory(newCategoryName);
      const updatedCats = await dbGetCategories();
      setCategories(updatedCats);
      setCategory(newCategoryName);
      setShowNewCatInput(false);
      setNewCategoryName("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      newFiles.forEach((file) => {
        const limit = file.type.startsWith("video/")
          ? MAX_VIDEO_SIZE
          : MAX_IMAGE_SIZE;
        if (file.size > limit) {
          alert(`El archivo ${file.name} excede el límite permitido.`);
          return;
        }
        validFiles.push(file);
      });
      setFiles((prev) => [...prev, ...validFiles]);
      const newPreviews = validFiles.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        type: (file.type.startsWith("video/") ? "video" : "image") as
          | "image"
          | "video",
      }));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        if (scaleSize >= 1) {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          return;
        }
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const newAttachments: Attachment[] = [...existingAttachments];
      for (const file of files) {
        const isImg = file.type.startsWith("image/");
        const url = isImg ? await resizeImage(file) : "#";
        newAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: isImg ? "image" : "video",
          url: url,
          name: file.name,
        });
      }

      const data = {
        title,
        description,
        location,
        priority,
        category,
        attachments: newAttachments,
      };

      const { error } = editingIncident
        ? await dbUpdateIncident(editingIncident.id, data)
        : await dbCreateIncident({
            ...data,
            user_id: userId,
            user_name: userName, // GUARDAMOS EL NOMBRE
            user_house: userHouse, // GUARDAMOS LA CASA
            status: "pendiente",
          });

      if (error) throw new Error(error);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(
        err.message?.includes("QuotaExceeded")
          ? "Almacenamiento lleno."
          : "Error al guardar: " + err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const inputBaseClass =
    "w-full rounded-lg p-3 font-medium bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-wood outline-none transition-all";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card border-2 border-border-strong w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh] card">
        <div className="flex justify-between items-center p-6 border-b border-border-subtle bg-background rounded-t-xl">
          <h2 className="text-xl font-bold text-txt-primary flex items-center gap-2">
            <AlertCircle size={24} className="text-wood" />
            {editingIncident ? "Editar Incidencia" : "Nueva Incidencia"}
          </h2>
          <button
            onClick={onClose}
            className="text-txt-muted hover:text-txt-primary transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto custom-scrollbar bg-background"
        >
          {errorMsg && (
            <div className="p-3 bg-red-100 border border-red-500 text-red-900 rounded-lg flex items-center gap-2 font-bold italic">
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-txt-secondary uppercase mb-1 ml-1">
              Título
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputBaseClass}
              placeholder="Ej: Bombilla fundida"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-txt-secondary uppercase mb-1 ml-1">
                Categoría
              </label>
              <div className="flex gap-1">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputBaseClass + " text-sm"}
                >
                  {categories.map((c) => (
                    <option
                      key={c}
                      value={c}
                      className="bg-white dark:bg-neutral-900"
                    >
                      {c}
                    </option>
                  ))}
                </select>
                {(userRole === "admin" || userRole === "supervisor") &&
                  !showNewCatInput && (
                    <button
                      type="button"
                      onClick={() => setShowNewCatInput(true)}
                      className="p-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg text-wood"
                    >
                      <PlusCircle size={20} />
                    </button>
                  )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-txt-secondary uppercase mb-1 ml-1">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as IncidentPriority)
                }
                className={inputBaseClass + " text-sm"}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          {showNewCatInput && (
            <div className="flex gap-2 animate-in fade-in zoom-in duration-200">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className={inputBaseClass}
                placeholder="Nueva categoría..."
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 bg-wood text-white rounded-lg font-bold"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setShowNewCatInput(false)}
                className="px-4 bg-neutral-500 text-white rounded-lg font-bold"
              >
                X
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-txt-secondary uppercase mb-1 ml-1">
              Ubicación
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputBaseClass}
              placeholder="Ej: Pasillo 2ª planta"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-txt-secondary uppercase mb-1 ml-1">
              Descripción
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputBaseClass + " resize-none"}
              placeholder="Describa el problema..."
            />
          </div>

          <div className="border-2 border-dashed border-border-subtle rounded-xl p-4 bg-neutral-50 dark:bg-neutral-900/30">
            <label className="flex flex-col items-center justify-center cursor-pointer mb-2">
              <div className="flex items-center gap-2 text-wood font-black">
                <Paperclip size={20} />
                <span>Adjuntar Multimedia</span>
              </div>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <div className="grid grid-cols-4 gap-2 mt-2">
              {existingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-wood/30"
                >
                  <img
                    src={att.url}
                    className="w-full h-full object-cover opacity-60"
                    alt=""
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setExistingAttachments((prev) =>
                        prev.filter((a) => a.id !== att.id),
                      )
                    }
                    className="absolute top-0.5 right-0.5 bg-red-600 text-white p-1 rounded-full"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
              {previews.map((file, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border-subtle group"
                >
                  {file.type === "image" ? (
                    <img
                      src={file.url}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-neutral-200 dark:bg-neutral-800">
                      <FileVideo />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFiles((f) => f.filter((_, i) => i !== idx));
                      setPreviews((p) => p.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-0.5 right-0.5 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-txt-muted hover:text-txt-primary font-bold transition-colors uppercase text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-wood hover:bg-wood-hover text-white px-8 py-2 rounded-lg font-black shadow-lg disabled:opacity-50 transition-all active:scale-95 uppercase text-xs"
            >
              <Save size={16} className="inline mr-2" />{" "}
              {loading
                ? "Guardando..."
                : editingIncident
                  ? "Guardar Cambios"
                  : "Crear Incidencia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncidentForm;
