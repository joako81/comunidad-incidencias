import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, PlusCircle, Paperclip, FileVideo, Trash2 } from 'lucide-react';
import { IncidentPriority, UserRole, Attachment } from '../types';
import { dbCreateIncident, dbGetCategories, dbAddCategory } from '../services/db';

interface IncidentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  userRole: UserRole;
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB (We will compress it anyway)

const IncidentForm: React.FC<IncidentFormProps> = ({ onClose, onSuccess, userId, userRole }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<IncidentPriority>('media');
  const [category, setCategory] = useState('General');
  
  const [categories, setCategories] = useState<string[]>([]);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Attachments State
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{name: string, url: string, type: 'image' | 'video'}[]>([]);

  useEffect(() => {
    const loadCats = async () => {
        const cats = await dbGetCategories();
        setCategories(cats);
        // If 'General' isn't in the new list, pick the first one
        if (cats.length > 0 && !cats.includes('General') && category === 'General') {
            setCategory(cats[0]);
        }
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
        setNewCategoryName('');
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setErrorMsg(null);
      if (e.target.files) {
          const newFiles = Array.from(e.target.files) as File[];
          const validFiles: File[] = [];
          
          newFiles.forEach(file => {
              if (file.type.startsWith('video/')) {
                  if (file.size > MAX_VIDEO_SIZE) {
                      alert(`El vídeo ${file.name} excede el límite de 50MB.`);
                      return;
                  }
              } else if (file.type.startsWith('image/')) {
                  if (file.size > MAX_IMAGE_SIZE) {
                       alert(`La imagen ${file.name} es demasiado grande.`);
                       return;
                  }
              }
              validFiles.push(file);
          });

          setFiles(prev => [...prev, ...validFiles]);

          // Create previews
          const newPreviews = validFiles.map(file => ({
              name: file.name,
              url: URL.createObjectURL(file),
              type: (file.type.startsWith('video/') ? 'video' : 'image') as 'image' | 'video'
          }));
          setPreviews(prev => [...prev, ...newPreviews]);
      }
  };

  const removeFile = (index: number) => {
      setFiles(prev => prev.filter((_, i) => i !== index));
      setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to resize image to avoid LocalStorage Quota Limits
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Resize to max 800px width
        const scaleSize = MAX_WIDTH / img.width;
        
        // If image is smaller than max, keep original
        if (scaleSize >= 1) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            return;
        }

        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Compress to JPEG 0.7 quality
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.onerror = (err) => reject(err);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
        const processedAttachments: Attachment[] = [];

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                // Compress image
                const base64 = await resizeImage(file);
                processedAttachments.push({
                    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'image',
                    url: base64,
                    name: file.name
                });
            } else {
                // For videos in mock, use placeholder to avoid storage crash
                processedAttachments.push({
                    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'video',
                    url: '#', // Placeholder
                    name: file.name
                });
            }
        }

        const { error } = await dbCreateIncident({
            title,
            description,
            location,
            priority,
            category,
            status: 'pendiente',
            user_id: userId,
            attachments: processedAttachments
        });

        if (error) throw new Error(error);

        onSuccess();
    } catch (err: any) {
        console.error(err);
        if (err.name === 'QuotaExceededError' || err.message?.includes('QuotaExceeded')) {
            setErrorMsg("Almacenamiento lleno. Intenta subir menos fotos o limpiar datos de navegación.");
        } else {
            setErrorMsg('Error al guardar: ' + (err.message || 'Desconocido'));
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card border-2 border-border-strong w-full max-w-lg rounded-lg shadow-2xl flex flex-col max-h-[90vh] card">
        <div className="flex justify-between items-center p-6 border-b border-border-subtle bg-background">
          <h2 className="text-xl font-bold text-txt-primary flex items-center gap-2">
            <AlertCircle size={24} className="text-wood" /> Nueva Incidencia
          </h2>
          <button onClick={onClose} className="text-txt-muted hover:text-txt-primary transition-colors">
            <X size={24} />
          </button>
        </div>

        {errorMsg && (
            <div className="mx-6 mt-4 p-3 bg-red-100 border-2 border-red-500 text-red-900 rounded font-bold flex items-center gap-2">
                <AlertCircle size={20}/> {errorMsg}
            </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar bg-background">
          <div>
            <label className="block text-sm font-bold text-txt-secondary mb-1">Título</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded p-3 font-medium focus:ring-2 focus:ring-wood"
              placeholder="Ej: Bombilla fundida"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-bold text-txt-secondary mb-1">Categoría</label>
                {!showNewCatInput ? (
                    <div className="flex gap-2">
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            // FIXED: Text adapts to mode (black in light, white in dark)
                            className="w-full rounded p-3 font-medium cursor-pointer text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                        >
                            {categories.map(c => <option key={c} value={c} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">{c}</option>)}
                        </select>
                        {/* Inline add category kept as quick shortcut, though admin has settings now */}
                        {(userRole === 'admin' || userRole === 'supervisor') && (
                            <button 
                                type="button" 
                                onClick={() => setShowNewCatInput(true)}
                                className="p-2 bg-gray-200 border border-border-strong rounded text-wood hover:bg-gray-300 dark:bg-gray-700"
                                title="Añadir nueva categoría"
                            >
                                <PlusCircle size={20} />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            className="w-full rounded p-3"
                            placeholder="Nueva categoría..."
                            autoFocus
                        />
                         <button 
                            type="button" 
                            onClick={handleAddCategory}
                            className="px-3 bg-wood text-white rounded font-bold"
                        >
                            OK
                        </button>
                         <button 
                            type="button" 
                            onClick={() => setShowNewCatInput(false)}
                            className="px-3 bg-gray-500 text-white rounded font-bold"
                        >
                            X
                        </button>
                    </div>
                )}
             </div>
             <div>
                <label className="block text-sm font-bold text-txt-secondary mb-1">Prioridad</label>
                <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as IncidentPriority)}
                    // FIXED: Text adapts to mode
                    className="w-full rounded p-3 font-medium cursor-pointer text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
                >
                    <option value="baja" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">Baja</option>
                    <option value="media" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">Media</option>
                    <option value="alta" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">Alta</option>
                    <option value="urgente" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">Urgente</option>
                </select>
             </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-txt-secondary mb-1">Ubicación</label>
            <input
              type="text"
              required
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full rounded p-3 font-medium"
              placeholder="Ej: Pasillo 2ª planta"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-txt-secondary mb-1">Descripción</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded p-3 font-medium resize-none"
              placeholder="Describa el problema con detalle..."
            />
          </div>

          {/* Attachments Section */}
          <div className="border-2 border-dashed border-border-subtle rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              <label className="flex flex-col items-center justify-center cursor-pointer mb-3">
                  <div className="flex items-center gap-2 text-wood hover:text-wood-hover transition-colors">
                      <Paperclip size={20} />
                      <span className="font-bold text-lg">Adjuntar Fotos o Vídeos</span>
                  </div>
                  <span className="text-xs text-txt-muted mt-1 font-semibold">Fotos y Vídeos (max 50MB)</span>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*,video/*" 
                    onChange={handleFileChange}
                    className="hidden" 
                  />
              </label>

              {previews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                      {previews.map((file, idx) => (
                          <div key={idx} className="relative group bg-gray-200 rounded border border-border-subtle overflow-hidden aspect-square">
                              {file.type === 'image' ? (
                                  <img src={file.url} alt="preview" className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-txt-muted">
                                      <FileVideo size={24} />
                                      <span className="text-[10px] mt-1 text-center truncate w-full px-1 font-bold">{file.name}</span>
                                  </div>
                              )}
                              <button 
                                type="button"
                                onClick={() => removeFile(idx)}
                                className="absolute top-1 right-1 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                              >
                                  <Trash2 size={14} />
                              </button>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-txt-muted hover:text-txt-primary transition-colors font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-wood hover:bg-wood-hover text-white px-6 py-2 rounded font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md"
            >
              <Save size={18} />
              {loading ? 'Procesando...' : 'Guardar Incidencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncidentForm;