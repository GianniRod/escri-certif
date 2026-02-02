import React, { useState, useEffect } from 'react';
import {
    FileText, Plus, Edit3, Trash2, ArrowLeft, Save,
    Download, RefreshCw, PenTool, LayoutTemplate, Printer, Share2
} from 'lucide-react';

// --- Utiles para Variables ---
// Detecta patrones {{VARIABLE}} en el texto
const extractVariables = (text) => {
    const regex = /{{(.*?)}}/g;
    const matches = [...text.matchAll(regex)];
    // Retorna array de variables únicas limpias (sin llaves)
    return [...new Set(matches.map(m => m[1].trim()))];
};

// --- Componentes ---

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

export default function App() {
    // --- ESTADOS ---
    const [view, setView] = useState('DASHBOARD'); // DASHBOARD, EDITOR, GENERATOR
    const [templates, setTemplates] = useState(() => {
        const saved = localStorage.getItem('scrib_templates');
        return saved ? JSON.parse(saved) : [{
            id: 'demo-1',
            title: 'Certificación de Firma (Modelo Base)',
            description: 'Modelo estándar para certificar firmas con el 08.',
            content: `CERTIFICO que la firma que antecede ha sido puesta en mi presencia por {{NOMBRE COMPLETO}}, DNI N° {{DNI}}, quien justifica identidad con {{TIPO DOCUMENTO}}.
            
En la ciudad de {{CIUDAD}}, a los {{DIA}} días del mes de {{MES}} del año {{AÑO}}.`
        }];
    });

    // Estado para edición/creación
    const [currentTemplate, setCurrentTemplate] = useState(null);

    // Estado para generación
    const [formData, setFormData] = useState({});

    // Persistencia
    useEffect(() => {
        localStorage.setItem('scrib_templates', JSON.stringify(templates));
    }, [templates]);

    // --- ACCIONES ---

    const handleCreateNew = () => {
        setCurrentTemplate({
            id: crypto.randomUUID(),
            title: 'Nueva Plantilla',
            description: '',
            content: 'Escribe aquí tu texto... usa el botón "+ Campo" para agregar variables dinámicas.'
        });
        setView('EDITOR');
    };

    const handleEdit = (template) => {
        setCurrentTemplate({ ...template });
        setView('EDITOR');
    };

    const handleDelete = (id) => {
        if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
            setTemplates(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleSaveTemplate = () => {
        setTemplates(prev => {
            const exists = prev.find(t => t.id === currentTemplate.id);
            if (exists) {
                return prev.map(t => t.id === currentTemplate.id ? currentTemplate : t);
            }
            return [...prev, currentTemplate];
        });
        setView('DASHBOARD');
    };

    const handleUseTemplate = (template) => {
        setCurrentTemplate(template);
        // Inicializar campos vacíos basados en las variables encontradas
        const vars = extractVariables(template.content);
        const initialData = {};
        vars.forEach(v => initialData[v] = '');
        setFormData(initialData);
        setView('GENERATOR');
    };

    const insertVariable = (varName) => {
        const cleanName = varName.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
        const tag = `{{${cleanName}}}`;

        // Inserción simple al final (idealmente sería en la posición del cursor)
        setCurrentTemplate(prev => ({
            ...prev,
            content: prev.content + " " + tag
        }));
    };

    // --- Exportación a Word ---
    const exportToWord = () => {
        const content = document.getElementById('document-preview').innerHTML;
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Documento</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + content + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `${currentTemplate.title}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    // --- RENDER ---

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* Header Global */}
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
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 md:p-8">

                {/* VISTA: DASHBOARD */}
                {view === 'DASHBOARD' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800">Mis Plantillas</h2>
                                <p className="text-gray-500 mt-1">Selecciona una plantilla para redactar o crea una nueva.</p>
                            </div>
                            <button
                                onClick={handleCreateNew}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 font-semibold transition-all hover:scale-105"
                            >
                                <Plus size={20} /> Nueva Plantilla
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map(t => (
                                <TemplateCard
                                    key={t.id}
                                    template={t}
                                    onUse={handleUseTemplate}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            ))}

                            {/* Card para crear nueva (Empty State visual) */}
                            {templates.length === 0 && (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                                    <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                                    <p className="text-gray-500 text-lg">No tienes plantillas creadas.</p>
                                    <button onClick={handleCreateNew} className="text-indigo-600 font-bold hover:underline mt-2">Crear la primera</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* VISTA: EDITOR */}
                {view === 'EDITOR' && (
                    <div className="animate-fade-in h-[calc(100vh-140px)] flex flex-col">
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
                            {/* Panel Izquierdo: Configuración */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6 overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Título de la Plantilla</label>
                                    <input
                                        type="text"
                                        value={currentTemplate.title}
                                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, title: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                                        placeholder="Ej: Certificación de Firmas"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                                    <textarea
                                        value={currentTemplate.description}
                                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none h-24"
                                        placeholder="Breve descripción..."
                                    />
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                    <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><Plus size={16} /> Variables Dinámicas</h4>
                                    <p className="text-xs text-indigo-700 mb-3">Agrega campos que rellenarás al momento de usar la plantilla.</p>
                                    <div className="flex gap-2">
                                        <input id="newVarInput" type="text" className="flex-1 p-2 border rounded text-sm" placeholder="Ej: CLIENTE" />
                                        <button
                                            onClick={() => {
                                                const input = document.getElementById('newVarInput');
                                                if (input.value) {
                                                    insertVariable(input.value);
                                                    input.value = '';
                                                }
                                            }}
                                            className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-indigo-700"
                                        >
                                            Agregar
                                        </button>
                                    </div>
                                    <ul className="mt-4 space-y-1">
                                        <li className="text-xs text-gray-500 font-mono bg-white p-1 rounded border">{"{{FECHA}}"} (Auto sugerido)</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Panel Derecho: Editor de Contenido */}
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center text-xs text-gray-500 font-medium">
                                    <span>EDITOR DE TEXTO</span>
                                    <span>Usa las llaves {"{{...}}"} para crear variables</span>
                                </div>
                                <textarea
                                    value={currentTemplate.content}
                                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, content: e.target.value })}
                                    className="flex-1 w-full p-8 outline-none font-serif text-lg leading-relaxed resize-none"
                                    placeholder="Comience a redactar su documento aquí..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* VISTA: GENERADOR (USAR PLANTILLA) */}
                {view === 'GENERATOR' && (
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => setView('DASHBOARD')} className="p-2 hover:bg-gray-200 rounded-full transition"><ArrowLeft /></button>
                            <h2 className="text-2xl font-bold text-gray-800 flex-1">
                                Nueva: {currentTemplate.title}
                            </h2>
                            <button onClick={exportToWord} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md">
                                <Download size={18} /> Descargar Word
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* Panel de Datos (Formulario) */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 sticky top-24">
                                    <h3 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                                        <PenTool className="text-indigo-600" /> Completar Datos
                                    </h3>

                                    <div className="space-y-4">
                                        {extractVariables(currentTemplate.content).length === 0 ? (
                                            <p className="text-gray-500 italic text-center py-4">Esta plantilla no tiene variables dinámicas.</p>
                                        ) : (
                                            extractVariables(currentTemplate.content).map(variable => (
                                                <div key={variable}>
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
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Panel de Vista Previa A4 */}
                            <div className="lg:col-span-8 bg-gray-200 rounded-xl p-8 flex justify-center min-h-[800px] overflow-auto border-inner shadow-inner">
                                <div
                                    id="document-preview"
                                    className="bg-white shadow-2xl p-[2.5cm] w-[21cm] min-h-[29.7cm] text-black font-serif text-justify leading-relaxed whitespace-pre-wrap"
                                >
                                    {/* Renderizado de Reemplazo */}
                                    {(() => {
                                        let text = currentTemplate.content;
                                        Object.keys(formData).forEach(key => {
                                            const val = formData[key] || `[${key}]`; // Muestra placeholder si está vacío
                                            // Reemplazo global seguro
                                            text = text.replaceAll(`{{${key}}}`, val);
                                        });
                                        return text;
                                    })()}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
