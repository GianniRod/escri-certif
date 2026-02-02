import React, { useState, useEffect, useRef } from 'react';
import {
    FileText, Plus, Edit3, Trash2, ArrowLeft, Save,
    Download, PenTool, LayoutTemplate, Bold, Underline, CheckSquare
} from 'lucide-react';

// --- Utiles para Variables ---
const extractVariables = (text) => {
    if (!text) return [];
    // Detecta patrones {{VARIABLE}} incluso dentro de tags HTML
    const regex = /{{(.*?)}}/g;
    const matches = [...text.matchAll(regex)];
    return [...new Set(matches.map(m => m[1].trim()))];
};

// --- Componente Rich Text Editor ---
const RichTextEditor = ({ content, onChange, placeholder }) => {
    const editorRef = useRef(null);

    // Initial content setup
    useEffect(() => {
        if (editorRef.current && content !== editorRef.current.innerHTML) {
            // Solo actualizar si es diferente para no perder cursor (basic implementation)
            // En una app real usaríamos Draft.js o Slate, pero para "native feel" y copy/paste de Word:
            if (content === '' || content === '<br>') {
                editorRef.current.innerHTML = '';
            } else if (!editorRef.current.innerText.trim() && !content) {
                editorRef.current.innerHTML = '';
            }
        }
    }, []);

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
            {/* Toolbar */}
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

            {/* Editable Area */}
            <div
                ref={editorRef}
                contentEditable
                className="flex-1 p-8 outline-none overflow-auto text-editor"
                style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '11pt',
                    lineHeight: '1.5',
                    minHeight: '200px'
                }}
                onInput={handleInput}
                dangerouslySetInnerHTML={{ __html: content }}
                placeholder={placeholder}
            />
            {/* Instrucción de pegado */}
            <div className="px-4 py-2 bg-yellow-50 text-xs text-yellow-700 border-t flex justify-between">
                <span>Tip: Puedes pegar contenido directamente desde Word manteniendo el formato.</span>
            </div>
        </div>
    );
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
        const saved = localStorage.getItem('scrib_templates_v2'); // Nueva key v2
        return saved ? JSON.parse(saved) : [{
            id: 'demo-1',
            title: 'Certificación de Firma (Modelo Base)',
            description: 'Modelo estándar con Acta y Banderita.',
            contentActa: `<b>ACTA DE CERTIFICACIÓN.</b> En la ciudad de <b>{{CIUDAD}}</b>, a los {{DIA}} días del mes de {{MES}} del año {{AÑO}}...`,
            contentBanderita: `<b>CERTIFICO</b> que la firma que antecede ha sido puesta en mi presencia por <b>{{NOMBRE}}</b>, DNI {{DNI}}...`,
            hasActa: true,
            hasBanderita: true
        }];
    });

    // Estado para edición/creación
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [activeSection, setActiveSection] = useState('acta'); // 'acta' | 'banderita'

    // Estado para generación
    const [formData, setFormData] = useState({});

    // Persistencia
    useEffect(() => {
        localStorage.setItem('scrib_templates_v2', JSON.stringify(templates));
    }, [templates]);

    // --- ACCIONES ---

    const handleCreateNew = () => {
        setCurrentTemplate({
            id: crypto.randomUUID(),
            title: 'Nueva Plantilla',
            description: '',
            contentActa: 'Contenido del Acta (Paso 1)...',
            contentBanderita: 'Contenido de la Certificación (Paso 2)...',
            hasActa: true,
            hasBanderita: true
        });
        setActiveSection('acta');
        setView('EDITOR');
    };

    const handleEdit = (template) => {
        setCurrentTemplate({ ...template }); // Shallow copy es suficiente por ahora
        setActiveSection('acta');
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
        // Extraer variables de ambas secciones si están habilitadas
        let vars = [];
        if (template.hasActa) vars = [...vars, ...extractVariables(template.contentActa)];
        if (template.hasBanderita) vars = [...vars, ...extractVariables(template.contentBanderita)];

        // Quitar duplicados
        vars = [...new Set(vars)];

        const initialData = {};
        vars.forEach(v => initialData[v] = '');
        setFormData(initialData);

        // Default tab
        setActiveSection(template.hasActa ? 'acta' : 'banderita');
        setView('GENERATOR');
    };

    const insertVariable = (varName) => {
        const cleanName = varName.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
        const tag = `{{${cleanName}}}`;

        // Insertar en la sección activa
        const key = activeSection === 'acta' ? 'contentActa' : 'contentBanderita';

        // Para simplificar en RichText, añadimos al final.
        // En una implementación perfecta usaríamos Range/Selection API.
        setCurrentTemplate(prev => ({
            ...prev,
            [key]: prev[key] + ` <span style="background-color: #e0e7ff; padding: 2px 4px; border-radius: 4px; font-weight: bold;">${tag}</span> `
        }));
    };

    // --- Exportación a Word ---
    const exportToWord = () => {
        const content = document.getElementById('document-preview').innerHTML;
        // Agregamos estilos específicos para que Word respete Arial 11
        const header = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Documento</title>
                <style>
                    body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 2.2; text-align: justify; }
                </style>
            </head>
            <body>`;
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

                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase">Secciones Habilitadas</h4>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={currentTemplate.hasActa}
                                                onChange={(e) => setCurrentTemplate({ ...currentTemplate, hasActa: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 rounded"
                                            />
                                            <span className="text-sm font-medium">Paso 1: Acta Notarial</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={currentTemplate.hasBanderita}
                                                onChange={(e) => setCurrentTemplate({ ...currentTemplate, hasBanderita: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 rounded"
                                            />
                                            <span className="text-sm font-medium">Paso 2: Certificación (Banderita)</span>
                                        </label>
                                    </div>
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
                                    <p className="text-xs text-indigo-700 mt-2">La variable se insertará en la sección activa.</p>
                                </div>
                            </div>

                            {/* Panel Derecho: Editor de Contenido con Tabs */}
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                                {/* Tabs */}
                                <div className="flex border-b">
                                    {currentTemplate.hasActa && (
                                        <button
                                            onClick={() => setActiveSection('acta')}
                                            className={`px-6 py-3 font-bold text-sm transition-colors ${activeSection === 'acta' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            PASO 1: ACTA
                                        </button>
                                    )}
                                    {currentTemplate.hasBanderita && (
                                        <button
                                            onClick={() => setActiveSection('banderita')}
                                            className={`px-6 py-3 font-bold text-sm transition-colors ${activeSection === 'banderita' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            PASO 2: BANDERITA
                                        </button>
                                    )}
                                </div>

                                {/* Rich Text Editor */}
                                <div className="flex-1 bg-gray-50 p-4">
                                    <RichTextEditor
                                        key={activeSection} // Force remount on tab switch for simplicity
                                        content={activeSection === 'acta' ? currentTemplate.contentActa : currentTemplate.contentBanderita}
                                        onChange={(newHtml) => {
                                            if (activeSection === 'acta') {
                                                setCurrentTemplate({ ...currentTemplate, contentActa: newHtml });
                                            } else {
                                                setCurrentTemplate({ ...currentTemplate, contentBanderita: newHtml });
                                            }
                                        }}
                                        placeholder={`Escribe el contenido para ${activeSection === 'acta' ? 'el Acta' : 'la Certificación'}...`}
                                    />
                                </div>
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
                                <Download size={18} /> Descargar Word ({activeSection === 'acta' ? 'Paso 1' : 'Paso 2'})
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
                                        style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt' }}
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
