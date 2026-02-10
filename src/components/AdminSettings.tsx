import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Plus, Trash2, Edit2, Check, ArrowUp, ArrowDown, AlertCircle, Eye, EyeOff, Lock, Type, TextCursor, MessageCircle } from 'lucide-react';
import { dbGetAppConfig, dbSaveAppConfig } from '../services/db';
import { AppConfig, SortOptionConfig, SortDirection, Incident, UserFieldConfig } from '../types';

interface AdminSettingsProps {
    onClose: () => void;
    onUpdate: () => void;
}

type Tab = 'categories' | 'sorting' | 'users';

const FIELD_LABELS: {key: keyof Incident, label: string}[] = [
    { key: 'created_at', label: 'Fecha Creación' },
    { key: 'updated_at', label: 'Última Actualización' },
    { key: 'priority', label: 'Prioridad' },
    { key: 'status', label: 'Estado' },
    { key: 'title', label: 'Título' },
    { key: 'category', label: 'Categoría' },
    { key: 'user_name', label: 'Nombre Vecino' },
    { key: 'user_house', label: 'Casa/Piso' },
    { key: 'location', label: 'Ubicación' },
];

const AdminSettings: React.FC<AdminSettingsProps> = ({ onClose, onUpdate }) => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('categories');
    const [error, setError] = useState<string | null>(null);
    
    // Edit States Categories
    const [newCategory, setNewCategory] = useState('');
    const [editingCategory, setEditingCategory] = useState<{idx: number, val: string} | null>(null);
    
    // Edit States Sort
    const [newSortLabel, setNewSortLabel] = useState('');
    const [newSortField, setNewSortField] = useState<keyof Incident>('created_at');
    const [newSortDir, setNewSortDir] = useState<SortDirection>('desc');
    const [editingSortId, setEditingSortId] = useState<string | null>(null);

    // Edit States User Fields
    const [newUserFieldLabel, setNewUserFieldLabel] = useState('');
    const [newUserFieldPlaceholder, setNewUserFieldPlaceholder] = useState('');
    const [editingUserFieldId, setEditingUserFieldId] = useState<string | null>(null);
    const [editUserFieldValues, setEditUserFieldValues] = useState<{label: string, placeholder: string}>({label:'', placeholder:''});
    const [pendingMsg, setPendingMsg] = useState('');

    useEffect(() => {
        dbGetAppConfig().then(c => {
            setConfig(c);
            if(c.pendingAccountMessage) setPendingMsg(c.pendingAccountMessage);
        });
    }, []);

    const handleSave = async () => {
        if (config) {
            const finalConfig = { ...config, pendingAccountMessage: pendingMsg };
            await dbSaveAppConfig(finalConfig);
            onUpdate();
            onClose();
        }
    }

    if (!config) return null;

    // --- CATEGORY ACTIONS ---
    const addCategory = () => {
        setError(null);
        if (newCategory.trim()) {
             if (config.categories.includes(newCategory.trim())) {
                 setError('Esa categoría ya existe.');
                 return;
             }
            setConfig({ ...config, categories: [...config.categories, newCategory.trim()] });
            setNewCategory('');
        }
    }
    const deleteCategory = (idx: number) => {
        const newCats = config.categories.filter((_, i) => i !== idx);
        setConfig({ ...config, categories: newCats });
    }
    const updateCategory = (idx: number) => {
        if (editingCategory && editingCategory.val.trim()) {
             const newCats = [...config.categories];
             newCats[idx] = editingCategory.val.trim();
             setConfig({ ...config, categories: newCats });
             setEditingCategory(null);
        }
    }
    const moveCategory = (idx: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === config.categories.length - 1)) return;
        const newCats = [...config.categories];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [newCats[idx], newCats[swapIdx]] = [newCats[swapIdx], newCats[idx]];
        setConfig({ ...config, categories: newCats });
    }

    // --- SORT ACTIONS ---
    const addOrUpdateSortOption = () => {
        setError(null);
        if (newSortLabel.trim()) {
            
            if (editingSortId) {
                // UPDATE
                const newOptions = config.sortOptions.map(opt => 
                    opt.id === editingSortId 
                    ? { ...opt, label: newSortLabel.trim(), field: newSortField, direction: newSortDir }
                    : opt
                );
                setConfig({ ...config, sortOptions: newOptions });
                setEditingSortId(null);
            } else {
                // ADD
                const newOption: SortOptionConfig = {
                    id: `sort-${Date.now()}`,
                    label: newSortLabel.trim(),
                    field: newSortField,
                    direction: newSortDir,
                    active: true
                };
                setConfig({ ...config, sortOptions: [...config.sortOptions, newOption] });
            }
            
            // Reset form
            setNewSortLabel('');
            setNewSortField('created_at');
            setNewSortDir('desc');
        } else {
            setError('Debes poner un nombre a la regla de ordenación.');
        }
    }

    const startEditSort = (opt: SortOptionConfig) => {
        setEditingSortId(opt.id);
        setNewSortLabel(opt.label);
        setNewSortField(opt.field);
        setNewSortDir(opt.direction);
    }
    
    const cancelEditSort = () => {
        setEditingSortId(null);
        setNewSortLabel('');
        setNewSortField('created_at');
        setNewSortDir('desc');
    }

    const deleteSortOption = (id: string) => {
        setConfig({ ...config, sortOptions: config.sortOptions.filter(opt => opt.id !== id) });
        if (editingSortId === id) cancelEditSort();
    }

    const toggleSortActive = (id: string) => {
        setConfig({ 
            ...config, 
            sortOptions: config.sortOptions.map(o => o.id === id ? { ...o, active: !o.active } : o)
        });
    }

    // --- USER FIELD ACTIONS ---
    const addUserField = () => {
        setError(null);
        if (newUserFieldLabel.trim()) {
             // Create unique ID
            const newField: UserFieldConfig = {
                id: `uf_cust_${Date.now()}`,
                key: `custom_${Date.now()}`, // Unique key for internal use
                label: newUserFieldLabel.trim(),
                placeholder: newUserFieldPlaceholder.trim() || `Ingresa ${newUserFieldLabel.trim()}`,
                active: true,
                isSystem: false
            };
            setConfig({ ...config, userFields: [...config.userFields, newField] });
            setNewUserFieldLabel('');
            setNewUserFieldPlaceholder('');
        } else {
            setError('Debes poner un nombre al campo.');
        }
    }

    const deleteUserField = (id: string) => {
        setConfig({ ...config, userFields: config.userFields.filter(f => f.id !== id) });
        if (editingUserFieldId === id) setEditingUserFieldId(null);
    }

    const toggleUserFieldActive = (id: string) => {
        // Prevent disabling mandatory fields
        const field = config.userFields.find(f => f.id === id);
        if (field && (field.key === 'username' || field.key === 'password')) {
            setError('El usuario y la contraseña son obligatorios y no se pueden ocultar.');
            return;
        }

        setConfig({ 
            ...config, 
            userFields: config.userFields.map(f => f.id === id ? { ...f, active: !f.active } : f)
        });
    }

    const startEditUserField = (field: UserFieldConfig) => {
        setEditingUserFieldId(field.id);
        setEditUserFieldValues({ label: field.label, placeholder: field.placeholder });
    }

    const saveEditUserField = (id: string) => {
        if (editUserFieldValues.label.trim()) {
            setConfig({
                ...config,
                userFields: config.userFields.map(f => f.id === id ? { ...f, label: editUserFieldValues.label, placeholder: editUserFieldValues.placeholder } : f)
            });
            setEditingUserFieldId(null);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-neutral-800 border-2 border-wood w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-neutral-700 flex justify-between items-center bg-neutral-900 rounded-t-lg">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings className="text-wood animate-spin-slow" /> Configuración del Sistema
                    </h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-neutral-700 bg-neutral-800">
                    <button 
                        onClick={() => setActiveTab('categories')}
                        className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'categories' ? 'text-wood border-b-2 border-wood bg-neutral-900' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                        Categorías
                    </button>
                    <button 
                        onClick={() => setActiveTab('sorting')}
                        className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'sorting' ? 'text-wood border-b-2 border-wood bg-neutral-900' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                        Ordenación
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'users' ? 'text-wood border-b-2 border-wood bg-neutral-900' : 'text-neutral-400 hover:text-neutral-200'}`}
                    >
                        Campos Vecino
                    </button>
                </div>
                
                {/* Error Message */}
                {error && (
                    <div className="bg-red-900/50 border-l-4 border-red-500 text-white p-3 mx-6 mt-4 flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-1">
                        <AlertCircle size={16}/> {error}
                        <button onClick={() => setError(null)} className="ml-auto"><X size={14}/></button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6 bg-neutral-800 custom-scrollbar">
                    
                    {/* CATEGORIES TAB */}
                    {activeTab === 'categories' && (
                        <div className="space-y-4">
                            <p className="text-sm text-neutral-400 mb-2">Gestiona las categorías de incidencias. Reordénalas para cambiar el listado.</p>
                            
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    value={newCategory}
                                    onChange={e => setNewCategory(e.target.value)}
                                    className="flex-grow bg-neutral-900 border border-neutral-600 rounded p-2 text-white placeholder-neutral-500 focus:border-wood outline-none"
                                    placeholder="Nueva categoría..."
                                />
                                <button onClick={addCategory} className="bg-wood text-white px-4 rounded font-bold hover:bg-wood-hover"><Plus/></button>
                            </div>

                            <div className="space-y-2">
                                {config.categories.map((cat, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-neutral-900 p-2 rounded border border-neutral-700 group">
                                        <div className="flex flex-col gap-1 text-neutral-500">
                                            <button onClick={() => moveCategory(idx, 'up')} disabled={idx === 0} className="hover:text-wood disabled:opacity-30"><ArrowUp size={14}/></button>
                                            <button onClick={() => moveCategory(idx, 'down')} disabled={idx === config.categories.length-1} className="hover:text-wood disabled:opacity-30"><ArrowDown size={14}/></button>
                                        </div>
                                        
                                        {editingCategory?.idx === idx ? (
                                            <div className="flex-grow flex gap-2">
                                                <input 
                                                    value={editingCategory.val}
                                                    onChange={e => setEditingCategory({ ...editingCategory, val: e.target.value })}
                                                    className="flex-grow bg-neutral-800 text-white px-2 rounded border border-wood outline-none"
                                                    autoFocus
                                                />
                                                <button onClick={() => updateCategory(idx)} className="text-green-500"><Check size={18}/></button>
                                                <button onClick={() => setEditingCategory(null)} className="text-red-500"><X size={18}/></button>
                                            </div>
                                        ) : (
                                            <span className="flex-grow font-bold text-neutral-200 ml-2">{cat}</span>
                                        )}

                                        <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingCategory({ idx, val: cat })} className="text-blue-400 hover:text-blue-300"><Edit2 size={16}/></button>
                                            <button onClick={() => deleteCategory(idx)} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SORTING TAB (DYNAMIC) */}
                    {activeTab === 'sorting' && (
                        <div className="space-y-4">
                            <p className="text-sm text-neutral-400 mb-2">Crea, edita o activa reglas de ordenación.</p>
                            
                            {/* Create/Edit Sort Box */}
                            <div className={`p-3 rounded border mb-4 ${editingSortId ? 'bg-wood/20 border-wood' : 'bg-neutral-900 border-neutral-700'}`}>
                                <h4 className="text-xs font-bold text-wood uppercase mb-2">
                                    {editingSortId ? 'Editar Regla Existente' : 'Añadir Nueva Regla'}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                    <input 
                                        type="text" 
                                        value={newSortLabel}
                                        onChange={e => setNewSortLabel(e.target.value)}
                                        className="bg-neutral-800 border border-neutral-600 rounded p-2 text-white placeholder-neutral-500 text-sm focus:border-wood outline-none"
                                        placeholder="Etiqueta (Ej: Por Vecino Asc)"
                                    />
                                    <div className="flex gap-2">
                                        <select 
                                            value={newSortField}
                                            onChange={e => setNewSortField(e.target.value as keyof Incident)}
                                            className="flex-1 bg-neutral-800 border border-neutral-600 rounded p-2 text-white text-sm focus:border-wood outline-none"
                                        >
                                            {FIELD_LABELS.map(f => (
                                                <option key={f.key} value={f.key} className="bg-neutral-800 text-white">{f.label}</option>
                                            ))}
                                        </select>
                                        <select 
                                            value={newSortDir}
                                            onChange={e => setNewSortDir(e.target.value as SortDirection)}
                                            className="w-24 bg-neutral-800 border border-neutral-600 rounded p-2 text-white text-sm focus:border-wood outline-none"
                                        >
                                            <option value="asc" className="bg-neutral-800 text-white">Asc (A-Z)</option>
                                            <option value="desc" className="bg-neutral-800 text-white">Desc (Z-A)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={addOrUpdateSortOption}
                                        className="flex-1 bg-wood text-white py-1.5 rounded font-bold text-sm hover:bg-wood-hover flex items-center justify-center gap-2"
                                    >
                                        {editingSortId ? <Check size={16}/> : <Plus size={16}/>}
                                        {editingSortId ? 'Actualizar' : 'Añadir'}
                                    </button>
                                    {editingSortId && (
                                        <button onClick={cancelEditSort} className="px-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded font-bold text-sm">
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="bg-neutral-900 rounded-lg border border-neutral-700 overflow-hidden">
                                {config.sortOptions.length === 0 && <p className="p-4 text-center text-neutral-500 italic">No hay opciones de ordenación.</p>}
                                {config.sortOptions.map(opt => (
                                    <div key={opt.id} className="flex items-center justify-between p-3 border-b border-neutral-700 last:border-0 hover:bg-neutral-800 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => toggleSortActive(opt.id)}
                                                className={`p-1.5 rounded-full transition-colors ${opt.active ? 'bg-green-900/50 text-green-400' : 'bg-neutral-800 text-neutral-600'}`}
                                                title={opt.active ? 'Visible en el menú' : 'Oculto en el menú'}
                                            >
                                                {opt.active ? <Eye size={16}/> : <EyeOff size={16}/>}
                                            </button>
                                            <div>
                                                <span className={`font-bold block ${opt.active ? 'text-neutral-200' : 'text-neutral-500'}`}>{opt.label}</span>
                                                <span className="text-xs text-neutral-500 font-mono">
                                                    {FIELD_LABELS.find(f => f.key === opt.field)?.label || opt.field} ({opt.direction === 'asc' ? 'A-Z' : 'Z-A'})
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => startEditSort(opt)} className="text-blue-400 hover:text-blue-300 p-2">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => deleteSortOption(opt.id)} className="text-red-500 hover:text-red-400 p-2">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* USERS FIELDS TAB (FULLY DYNAMIC) */}
                    {activeTab === 'users' && (
                        <div className="space-y-6">
                             
                             {/* MESSAGE CONFIG */}
                             <div className="bg-neutral-900 p-4 rounded border border-neutral-700">
                                 <h4 className="text-xs font-bold text-wood uppercase mb-2 flex items-center gap-2">
                                     <MessageCircle size={14}/> Mensaje para Cuentas Pendientes
                                 </h4>
                                 <textarea
                                    value={pendingMsg}
                                    onChange={e => setPendingMsg(e.target.value)}
                                    rows={3}
                                    className="w-full bg-neutral-800 border border-neutral-600 rounded p-2 text-white text-sm focus:border-wood outline-none resize-none"
                                    placeholder="Mensaje que verán los usuarios que se acaban de registrar..."
                                 />
                             </div>

                             <hr className="border-neutral-700"/>

                             <p className="text-sm text-neutral-400 mb-2">Personaliza el formulario de registro de vecinos. Oculta, edita etiqueta y placeholder, o añade campos nuevos.</p>
                             
                             {/* Create Custom Field */}
                             <div className="bg-neutral-900 p-3 rounded border border-neutral-700 mb-4">
                                <h4 className="text-xs font-bold text-wood uppercase mb-2">Añadir Campo Personalizado</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                    <div className="relative">
                                        <Type size={14} className="absolute left-2.5 top-2.5 text-neutral-500"/>
                                        <input 
                                            type="text" 
                                            value={newUserFieldLabel}
                                            onChange={e => setNewUserFieldLabel(e.target.value)}
                                            className="w-full bg-neutral-800 border border-neutral-600 rounded p-2 pl-8 text-white placeholder-neutral-500 focus:border-wood outline-none text-sm"
                                            placeholder="Nombre (Etiqueta)"
                                        />
                                    </div>
                                    <div className="relative">
                                        <TextCursor size={14} className="absolute left-2.5 top-2.5 text-neutral-500"/>
                                        <input 
                                            type="text" 
                                            value={newUserFieldPlaceholder}
                                            onChange={e => setNewUserFieldPlaceholder(e.target.value)}
                                            className="w-full bg-neutral-800 border border-neutral-600 rounded p-2 pl-8 text-white placeholder-neutral-500 focus:border-wood outline-none text-sm"
                                            placeholder="Texto de Ayuda (Placeholder)"
                                        />
                                    </div>
                                </div>
                                <button onClick={addUserField} className="w-full bg-wood text-white py-1.5 rounded font-bold text-sm hover:bg-wood-hover flex items-center justify-center gap-2">
                                    <Plus size={16}/> Añadir Campo
                                </button>
                            </div>

                            <div className="space-y-2">
                                {config.userFields.map((field) => (
                                    <div key={field.id} className="flex items-center justify-between bg-neutral-900 p-3 rounded border border-neutral-700 group transition-all hover:border-neutral-600">
                                        
                                        {/* Left Side: Toggle & Info */}
                                        <div className="flex items-center gap-3 flex-grow w-full">
                                            <button 
                                                onClick={() => toggleUserFieldActive(field.id)}
                                                className={`p-1.5 shrink-0 rounded-full transition-colors ${field.active ? 'bg-green-900/50 text-green-400' : 'bg-neutral-800 text-neutral-600'}`}
                                                title={field.active ? 'Visible en formulario' : 'Oculto'}
                                            >
                                                {(field.key === 'username' || field.key === 'password') ? <Lock size={16}/> : (field.active ? <Eye size={16}/> : <EyeOff size={16}/>)}
                                            </button>

                                            {editingUserFieldId === field.id ? (
                                                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-2 mr-2">
                                                     <div className="relative">
                                                        <Type size={14} className="absolute left-2 top-2 text-wood"/>
                                                        <input 
                                                            value={editUserFieldValues.label}
                                                            onChange={e => setEditUserFieldValues({...editUserFieldValues, label: e.target.value})}
                                                            className="w-full bg-neutral-800 text-white px-2 py-1 pl-7 rounded border border-wood outline-none text-sm"
                                                            placeholder="Etiqueta"
                                                            autoFocus
                                                        />
                                                     </div>
                                                     <div className="relative">
                                                        <TextCursor size={14} className="absolute left-2 top-2 text-wood"/>
                                                        <input 
                                                            value={editUserFieldValues.placeholder}
                                                            onChange={e => setEditUserFieldValues({...editUserFieldValues, placeholder: e.target.value})}
                                                            className="w-full bg-neutral-800 text-neutral-300 px-2 py-1 pl-7 rounded border border-wood/50 outline-none text-sm focus:border-wood"
                                                            placeholder="Placeholder"
                                                        />
                                                     </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className={`font-bold text-sm flex items-center gap-2 ${field.active ? 'text-neutral-200' : 'text-neutral-500 line-through'}`}>
                                                        {field.label}
                                                        {field.isSystem && <span className="text-[9px] bg-neutral-800 border border-neutral-600 px-1 rounded text-neutral-400 uppercase">Sistema</span>}
                                                    </span>
                                                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                                                        <TextCursor size={10}/> {field.placeholder}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 shrink-0">
                                            {editingUserFieldId === field.id ? (
                                                <>
                                                    <button onClick={() => saveEditUserField(field.id)} className="text-green-500 p-1 bg-neutral-800 rounded hover:bg-neutral-700 border border-transparent hover:border-green-900"><Check size={18}/></button>
                                                    <button onClick={() => setEditingUserFieldId(null)} className="text-red-500 p-1 bg-neutral-800 rounded hover:bg-neutral-700 border border-transparent hover:border-red-900"><X size={18}/></button>
                                                </>
                                            ) : (
                                                <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEditUserField(field)} className="text-blue-400 hover:text-blue-300 p-1" title="Editar Etiqueta y Placeholder"><Edit2 size={16}/></button>
                                                    {!field.isSystem && (
                                                        <button onClick={() => deleteUserField(field.id)} className="text-red-500 hover:text-red-400 p-1" title="Eliminar Campo"><Trash2 size={16}/></button>
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
                    <button onClick={onClose} className="px-4 py-2 text-neutral-400 hover:text-white font-bold transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="bg-wood hover:bg-wood-light text-white px-6 py-2 rounded font-bold flex items-center gap-2 shadow-lg">
                        <Save size={18} /> Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;