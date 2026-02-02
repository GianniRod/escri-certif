import React, { useState, useEffect, useRef } from 'react';
import {
    FileText, Plus, Edit3, Trash2, ArrowLeft, Save,
    Download, PenTool, LayoutTemplate, Bold, Underline, CheckSquare,
    Users, Search, Clock, ChevronRight
} from 'lucide-react';

// FIREBASE IMPORTS
import { db } from './firebase';
import {
    collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
    query, orderBy, where, serverTimestamp, getDocs
} from 'firebase/firestore';

// --- Utiles para Variables ---
const extractVariables = (text) => {
    if (!text) return [];
    const regex = /{{(.*?)}}/g;
    const matches = [...text.matchAll(regex)];
    return [...new Set(matches.map(m => m[1].trim()))];
};

// --- Componente Rich Text Editor ---
const RichTextEditor = ({ content, onChange, placeholder }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && content !== editorRef.current.innerHTML) {
            if (content === '' || content === '<br>') {
                editorRef.current.innerHTML = '';
            } else if (!editorRef.current.innerText.trim() && !content) {
                editorRef.current.innerHTML = '';
            }
        }
    }, [content]);

    const handleInput = () => {
        const html = editorRef.current.innerHTML;
        onChange(html);
    };

    const execCmd = (command) => {
        document.execCommand(command, false, null);
        editorRef.current.focus();
    };

    return (
        <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-white">
            <div className="flex items-center gap-2 p-2 bg-gray-50 border-b">
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-2 hover:bg-gray-200 rounded text-gray-700" title="Negrita">
                    <Bold size={18} />
                </button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }} className="p-2 hover:bg-gray-200 rounded text-gray-700" title="Subrayado">
                    <Underline size={18} />
                </button>
                <div className="h-6 w-px bg-gray-300 mx-2"></div>
                <span className="text-xs text-gray-500 font-medium">Arial 11pt (Automático)</span>
            </div>

            <div
                ref={editorRef}
                contentEditable
                className="flex-1 p-8 outline-none overflow-auto text-editor"
                style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '11pt',
                    lineHeight: '2.2',
                    textAlign: 'justify',
                    minHeight: '200px'
                }}
                onInput={handleInput}
                dangerouslySetInnerHTML={{ __html: content }}
                placeholder={placeholder}
            />
            <div className="px-4 py-2 bg-yellow-50 text-xs text-yellow-700 border-t flex justify-between">
                <span>Tip: Puedes pegar contenido directamente desde Word manteniendo el formato.</span>
            </div>
        </div>
    );
};

// --- Componentes UI ---

function TemplateCard({ template, onUse, onEdit, onDelete }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-200 transition-all group relative">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <LayoutTemplate size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(template)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-indigo-600 tooltip" title="Editar Plantilla">
                        <Edit3 size={16} />
                    </button>
                    <button onClick={() => onDelete(template.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 tooltip" title="Eliminar">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{template.title}</h3>
            <p className="text-gray-500 text-sm line-clamp-2 mb-6">{template.description || "Sin descripción"}</p>
            <button
                onClick={() => onUse(template)}
                className="w-full py-3 bg-white border-2 border-indigo-600 text-indigo-700 font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
                <PenTool size={18} /> USAR PLANTILLA
            </button>
        </div>
    );
}

// --- Autocomplete Input Component ---
const AutocompleteInput = ({ label, value, onChange, onSelectResult }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Búsqueda simple en local (idealmente sería query a Firestore si son muchos)
    // Para simplificar, asumimos que 'onSelectResult' recibe (name, dni) etc.
    const handleSearch = async (text) => {
        onChange(text);
        if (text.length > 2) {
            // Buscar clientes
            const q = query(
                collection(db, "clients"),
                where("name", ">=", text.toUpperCase()),
                where("name", "<=", text.toUpperCase() + '\uf8ff')
            );
            const querySnapshot = await getDocs(q);
            const results = [];
            querySnapshot.forEach((doc) => {
                results.push({ id: doc.id, ...doc.data() });
            });
            setSuggestions(results);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    return (
        <div className="relative">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => handleSearch(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 transition-colors focus:bg-white"
                placeholder={`Ingresar ${label.toLowerCase()}...`}
            />
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                    {suggestions.map(client => (
                        <div
                            key={client.id}
                            className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0"
                            onClick={() => onSelectResult(client)}
                        >
                            <p className="font-bold text-sm text-gray-800">{client.name}</p>
                            <p className="text-xs text-gray-500">DNI: {client.dni}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


export default function App() {
    // --- ESTADOS ---
    const [view, setView] = useState('DASHBOARD'); // DASHBOARD, EDITOR, GENERATOR, CLIENTS
    const [templates, setTemplates] = useState([]);
    const [clients, setClients] = useState([]);

    // Estado para edición/creación
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [activeSection, setActiveSection] = useState('acta');

    // Estado para generación
    const [formData, setFormData] = useState({});

    // Estado para Clientes (Detalle)
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientHistory, setClientHistory] = useState([]);

    // --- FIRESTORE SUBSCRIPTIONS ---
    useEffect(() => {
        // Templates Subscription
        const qTemplates = query(collection(db, "templates")); // Podríamos ordenar por fecha
        const unsubscribeTemplates = onSnapshot(qTemplates, (querySnapshot) => {
            const temps = [];
            querySnapshot.forEach((doc) => {
                temps.push({ id: doc.id, ...doc.data() });
            });
            setTemplates(temps);
        });

        // Clients Subscription (Caution: if many clients, use pagination. For now ok)
        const qClients = query(collection(db, "clients"), orderBy("name"));
        const unsubscribeClients = onSnapshot(qClients, (querySnapshot) => {
            const cls = [];
            querySnapshot.forEach((doc) => {
                cls.push({ id: doc.id, ...doc.data() });
            });
            setClients(cls);
        });

        return () => {
            unsubscribeTemplates();
            unsubscribeClients();
        };
    }, []);

    // --- ACCIONES PLANTILLAS ---
    const handleCreateNew = () => {
        setCurrentTemplate({
            title: 'Nueva Plantilla',
            description: '',
            contentActa: '',
            contentBanderita: '',
            hasActa: true,
            hasBanderita: true
        });
        setActiveSection('acta');
        setView('EDITOR');
    };

    const handleEdit = (template) => {
        setCurrentTemplate({ ...template });
        setActiveSection(template.hasActa ? 'acta' : 'banderita');
        setView('EDITOR');
    };

    const handleDelete = async (id) => {
        if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
            await deleteDoc(doc(db, "templates", id));
        }
    };

    const handleSaveTemplate = async () => {
        if (currentTemplate.id) {
            // Update
            const ref = doc(db, "templates", currentTemplate.id);
            await updateDoc(ref, { ...currentTemplate });
        } else {
            // Create
            await addDoc(collection(db, "templates"), { ...currentTemplate });
        }
        setView('DASHBOARD');
    };

    // --- ACCIONES GENERADOR / CLIENTES ---
    const handleUseTemplate = (template) => {
        setCurrentTemplate(template);
        let vars = [];
        if (template.hasActa) vars = [...vars, ...extractVariables(template.contentActa)];
        if (template.hasBanderita) vars = [...vars, ...extractVariables(template.contentBanderita)];
        vars = [...new Set(vars)];

        const initialData = {};
        vars.forEach(v => initialData[v] = '');

        // Auto-fill DATE
        if (vars.includes('FECHA')) initialData['FECHA'] = new Date().toLocaleDateString();

        setFormData(initialData);
        setActiveSection(template.hasActa ? 'acta' : 'banderita');
        setView('GENERATOR');
    };

    const handleAutocompleteSelect = (client, fieldName) => {
        if (fieldName.includes('NOMBRE') || fieldName.includes('CLIENTE')) {
            // Auto completar otros campos si existen
            setFormData(prev => ({
                ...prev,
                [fieldName]: client.name,
                ['DNI']: client.dni || prev['DNI'], // Asume que el campo se llama DNI
                ['DOMICILIO']: client.address || prev['DOMICILIO']
            }));
        }
    };

    const saveAndDownload = async () => {
        // 1. Identificar Cliente (Por Nombre o DNI)
        // Buscamos inputs comunes
        const nameVal = formData['NOMBRE'] || formData['CLIENTE'] || formData['COMPARECIENTE'];
        const dniVal = formData['DNI'] || formData['DOCUMENTO'];

        let clientId = null;
        let clientName = nameVal || 'Desconocido';

        if (nameVal) {
            // Buscar si existe
            const q = query(collection(db, "clients"), where("name", "==", nameVal));
            const snap = await getDocs(q);

            if (!snap.empty) {
                clientId = snap.docs[0].id;
            } else {
                // Crear nuevo cliente
                const docRef = await addDoc(collection(db, "clients"), {
                    name: nameVal,
                    dni: dniVal || '',
                    createdAt: serverTimestamp()
                });
                clientId = docRef.id;
            }

            // 2. Guardar Certificación
            await addDoc(collection(db, "certifications"), {
                clientId,
                clientName,
                templateId: currentTemplate.id || 'temp',
                templateTitle: currentTemplate.title,
                templateData: formData,
                timestamp: serverTimestamp()
            });
        }

        exportToWord();
    };

    const exportToWord = () => {
        const content = document.getElementById('document-preview').innerHTML;
        const header = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Documento</title>
            <style>body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 2.2; text-align: justify; }</style>
            </head><body>`;
        const footer = "</body></html>";
        const sourceHTML = header + content + footer;
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `${currentTemplate.title}_${activeSection}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    // --- MODULO CLIENTES ---
    const loadClientHistory = async (client) => {
        setSelectedClient(client);
        const q = query(collection(db, "certifications"), where("clientId", "==", client.id), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        const hist = [];
        snap.forEach(doc => hist.push({ id: doc.id, ...doc.data() }));
        setClientHistory(hist);
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* Header */}
            <header className="bg-indigo-900 text-white p-4 shadow-lg sticky top-0 z-20">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('DASHBOARD')}>
                        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                            <FileText size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-wide">SCRIB-DIGITAL</h1>
                            <p className="text-xs text-indigo-300">Gestor de Documentos Notariales</p>
                        </div>
                    </div>

                    <nav className="flex gap-4">
                        <button
                            onClick={() => setView('DASHBOARD')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${view === 'DASHBOARD' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:text-white'}`}
                        >
                            Plantillas
                        </button>
                        <button
                            onClick={() => setView('CLIENTS')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${view === 'CLIENTS' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:text-white'}`}
                        >
                            Clientes
                        </button>
                    </nav>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 md:p-8">

                {/* VISTA: DASHBOARD */}
                {view === 'DASHBOARD' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800">Mis Plantillas</h2>
                                <p className="text-gray-500 mt-1">Biblioteca de modelos notariales.</p>
                            </div>
                            <button onClick={handleCreateNew} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 font-semibold">
                                <Plus size={20} /> Nueva Plantilla
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map(t => (
                                <TemplateCard key={t.id} template={t} onUse={handleUseTemplate} onEdit={handleEdit} onDelete={handleDelete} />
                            ))}
                        </div>
                    </div>
                )}

                {/* VISTA: CLIENTES */}
                {view === 'CLIENTS' && (
                    <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)]">
                        {/* Lista Clientes */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-y-auto">
                            <h2 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-800"><Users /> Clientes Clientes Registrados</h2>
                            <div className="relative mb-4">
                                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                                <input type="text" placeholder="Buscar por nombre o DNI..." className="w-full pl-10 p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 ring-indigo-500" />
                            </div>
                            <div className="space-y-2">
                                {clients.map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => loadClientHistory(client)}
                                        className={`p-3 rounded-lg cursor-pointer border hover:border-indigo-300 transition ${selectedClient?.id === client.id ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-100'}`}
                                    >
                                        <h4 className="font-bold text-gray-800">{client.name}</h4>
                                        <p className="text-xs text-gray-500">DNI: {client.dni || 'Sin datos'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Detalle Historial */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-y-auto">
                            {selectedClient ? (
                                <div>
                                    <div className="flex justify-between items-center mb-6 pb-4 border-b">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">{selectedClient.name}</h2>
                                            <p className="text-gray-500">Historial de Certificaciones</p>
                                        </div>
                                        <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold">
                                            {clientHistory.length} Documentos
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {clientHistory.map(doc => (
                                            <div key={doc.id} className="p-4 rounded-xl border border-gray-100 hover:shadow-md transition bg-gray-50">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-indigo-700 text-lg mb-1">{doc.templateTitle}</h4>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {doc.timestamp ? new Date(doc.timestamp.seconds * 1000).toLocaleString() : 'Reciente'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {clientHistory.length === 0 && (
                                            <p className="text-gray-400 italic text-center py-10">Este cliente aún no tiene documentos generados.</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Users size={64} className="mb-4 opacity-20" />
                                    <p>Selecciona un cliente para ver su historial.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* VISTA: EDITOR */}
                {view === 'EDITOR' && (
                    <div className="animate-fade-in h-[calc(100vh-140px)] flex flex-col">
                        {/* ... keep existing UI for editor ... */}
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => setView('DASHBOARD')} className="p-2 hover:bg-gray-200 rounded-full transition"><ArrowLeft /></button>
                            <h2 className="text-2xl font-bold text-gray-800 flex-1">
                                {currentTemplate.id ? 'Editar Plantilla' : 'Nueva Plantilla'}
                            </h2>
                            <button onClick={handleSaveTemplate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md">
                                <Save size={18} /> Guardar
                            </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6 overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Título</label>
                                    <input type="text" value={currentTemplate.title} onChange={(e) => setCurrentTemplate({ ...currentTemplate, title: e.target.value })} className="w-full p-3 border rounded-lg font-bold" />
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <h4 className="font-bold text-sm uppercase mb-2">Secciones</h4>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={currentTemplate.hasActa} onChange={(e) => setCurrentTemplate({ ...currentTemplate, hasActa: e.target.checked })} /> Acta</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={currentTemplate.hasBanderita} onChange={(e) => setCurrentTemplate({ ...currentTemplate, hasBanderita: e.target.checked })} /> Banderita</label>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                    <h4 className="font-bold text-indigo-900 mb-2">+ Variable</h4>
                                    <div className="flex gap-2">
                                        <input id="newVarInput" className="flex-1 p-2 border rounded text-sm" />
                                        <button onClick={() => {
                                            const v = document.getElementById('newVarInput').value;
                                            if (v) {
                                                const key = activeSection === 'acta' ? 'contentActa' : 'contentBanderita';
                                                setCurrentTemplate({ ...currentTemplate, [key]: currentTemplate[key] + ` {{${v.toUpperCase()}}} ` });
                                                document.getElementById('newVarInput').value = '';
                                            }
                                        }} className="bg-indigo-600 text-white px-3 text-sm font-bold rounded">Add</button>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border flex flex-col">
                                <div className="flex border-b">
                                    {currentTemplate.hasActa && <button onClick={() => setActiveSection('acta')} className={`px-6 py-3 font-bold text-sm ${activeSection === 'acta' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}>PASO 1: ACTA</button>}
                                    {currentTemplate.hasBanderita && <button onClick={() => setActiveSection('banderita')} className={`px-6 py-3 font-bold text-sm ${activeSection === 'banderita' ? 'text-indigo-600 border-b-2 border-indigo-600' : ''}`}>PASO 2: BANDERITA</button>}
                                </div>
                                <div className="flex-1 bg-gray-50 p-4">
                                    <RichTextEditor
                                        key={activeSection}
                                        content={activeSection === 'acta' ? currentTemplate.contentActa : currentTemplate.contentBanderita}
                                        onChange={(html) => setCurrentTemplate({ ...currentTemplate, [activeSection === 'acta' ? 'contentActa' : 'contentBanderita']: html })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* VISTA: GENERADOR */}
                {view === 'GENERATOR' && (
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => setView('DASHBOARD')} className="p-2 hover:bg-gray-200 rounded-full transition"><ArrowLeft /></button>
                            <h2 className="text-2xl font-bold text-gray-800 flex-1">
                                Nueva: {currentTemplate.title}
                            </h2>
                            <button onClick={saveAndDownload} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md">
                                <Download size={18} /> Guardar y Descargar Word ({activeSection === 'acta' ? 'Paso 1' : 'Paso 2'})
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* Panel de Datos (Formulario) */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 sticky top-24">
                                    <h3 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                                        <PenTool className="text-indigo-600" /> Completar Datos
                                    </h3>

                                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                        {Object.keys(formData).map(variable => (
                                            <div key={variable}>
                                                {(variable.includes('NOMBRE') || variable.includes('CLIENTE')) ? (
                                                    <AutocompleteInput
                                                        label={variable}
                                                        value={formData[variable] || ''}
                                                        onChange={(val) => setFormData({ ...formData, [variable]: val })}
                                                        onSelectResult={(client) => handleAutocompleteSelect(client, variable)}
                                                    />
                                                ) : (
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                            {variable}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData[variable] || ''}
                                                            onChange={(e) => setFormData({ ...formData, [variable]: e.target.value })}
                                                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 transition-colors focus:bg-white"
                                                            placeholder={`Ingresar ${variable.toLowerCase()}...`}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Panel de Vista Previa A4 */}
                            <div className="lg:col-span-8">
                                {/* Preview Tabs */}
                                <div className="flex gap-2 mb-4">
                                    {currentTemplate.hasActa && (
                                        <button
                                            onClick={() => setActiveSection('acta')}
                                            className={`px-4 py-2 rounded-lg font-bold shadow-sm transition ${activeSection === 'acta' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                                        >
                                            Ver Paso 1: Acta
                                        </button>
                                    )}
                                    {currentTemplate.hasBanderita && (
                                        <button
                                            onClick={() => setActiveSection('banderita')}
                                            className={`px-4 py-2 rounded-lg font-bold shadow-sm transition ${activeSection === 'banderita' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                                        >
                                            Ver Paso 2: Banderita
                                        </button>
                                    )}
                                </div>

                                <div className="bg-gray-200 rounded-xl p-8 flex justify-center min-h-[800px] overflow-auto border-inner shadow-inner">
                                    <div
                                        id="document-preview"
                                        className="bg-white shadow-2xl p-[2.5cm] w-[21cm] min-h-[29.7cm] text-black leading-relaxed whitespace-pre-wrap outline-none"
                                        style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '2.2', textAlign: 'justify' }}
                                    >
                                        {/* Renderizado de Reemplazo */}
                                        {(() => {
                                            const rawContent = activeSection === 'acta' ? currentTemplate.contentActa : currentTemplate.contentBanderita;
                                            let text = rawContent || '';

                                            // Reemplazo de variables
                                            Object.keys(formData).forEach(key => {
                                                const val = formData[key] || `<span style="color:red; background:#fee">[${key}]</span>`;
                                                // Reemplazo global
                                                text = text.replaceAll(`{{${key}}}`, val);
                                            });

                                            return <div dangerouslySetInnerHTML={{ __html: text }} />;
                                        })()}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
