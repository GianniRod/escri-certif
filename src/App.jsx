import React, { useState, useEffect, useRef } from 'react';
import {
    FileText, Plus, Edit3, Trash2, ArrowLeft, Save,
    Download, PenTool, LayoutTemplate, Bold, Italic, Underline, CheckSquare,
    Users, Search, Clock, ChevronRight, FileCheck, AlertCircle
} from 'lucide-react';

// FIREBASE IMPORTS
import { db } from './firebase';
import {
    collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
    query, orderBy, where, serverTimestamp, getDocs
} from 'firebase/firestore';
import { auth } from './firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

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

    // Sync content ONLY when it changes externally and is different
    useEffect(() => {
        if (editorRef.current && content !== editorRef.current.innerHTML) {
            // Need to preserve cursor if focused? No, if content changed externally we likely want to update.
            // But if it's a loopback (type -> state -> prop), we must NOT update if innerHTML matches.
            // But here innerHTML might differ slightly (browser normalization).
            // A simple check is: if we are focused, assume we are the source of truth for now?
            // No, that breaks collaboration or format buttons.
            // Best bet: perform the update, but the check must be robust.
            // HOWEVER, the main issue was dangerouslySetInnerHTML forcing re-render.
            // With that removed, this useEffect is the only updater.
            editorRef.current.innerHTML = content || '';
        }
    }, [content]);

    const handleInput = () => {
        const html = editorRef.current.innerHTML;
        if (onChange) onChange(html);
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
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-2 hover:bg-gray-200 rounded text-gray-700" title="Cursiva">
                    <Italic size={18} />
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-400 transition-all group relative flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-100 rounded-lg text-gray-800 group-hover:bg-gray-800 group-hover:text-white transition-colors">
                    <LayoutTemplate size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(template)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 tooltip" title="Editar Plantilla">
                        <Edit3 size={16} />
                    </button>
                    <button onClick={() => onDelete(template.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 tooltip" title="Eliminar">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{template.title}</h3>
            <p className="text-gray-500 text-sm line-clamp-2 mb-6 flex-1">{template.description || "Sin descripción"}</p>
            <button
                onClick={() => onUse(template)}
                className="w-full py-3 bg-white border-2 border-green-600 text-green-700 font-bold rounded-lg hover:bg-green-600 hover:text-white transition-colors flex items-center justify-center gap-2 uppercase text-sm tracking-wide"
            >
                <Plus size={18} /> CREAR NUEVA CERTIFICACIÓN
            </button>
        </div>
    );
}

// --- Autocomplete Input Component ---
const AutocompleteInput = ({ label, value, onChange, onSelectResult, placeholder }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleSearch = async (text) => {
        onChange(text);
        if (text && text.length > 2) {
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
        <div className="relative w-full">
            {label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>}
            <input
                type="text"
                value={value}
                onChange={(e) => handleSearch(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none bg-gray-50 transition-colors focus:bg-white"
                placeholder={placeholder || `Buscar ${label ? label.toLowerCase() : ''}...`}
            />
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                    {suggestions.map(client => (
                        <div
                            key={client.id}
                            className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-0"
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
    const [view, setView] = useState('DASHBOARD'); // DASHBOARD, EDITOR, GENERATOR, CLIENTS, CERTIFICATIONS
    const [templates, setTemplates] = useState([]);
    const [clients, setClients] = useState([]);
    const [certifications, setCertifications] = useState([]);

    // Estado para edición/creación de Plantillas
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [activeSection, setActiveSection] = useState('acta');

    // Estado para Generación (Certificación)
    const [formData, setFormData] = useState({});
    const [certificationClient, setCertificationClient] = useState(null); // Objeto cliente seleccionado

    const [clientSearchText, setClientSearchText] = useState(''); // Estado para el buscador de clientes
    const [certificationId, setCertificationId] = useState(null); // ID del borrador activo
    const [certificationTitle, setCertificationTitle] = useState(''); // Nuevo: Título de la certificación
    const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved

    // Estado para Modal de Descarga
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);
    const [downloadFilename, setDownloadFilename] = useState('');

    // Estado para Edición de Clientes
    const [clientEditModalOpen, setClientEditModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

    // Estado para Historial Clientes
    const [selectedClientHistory, setSelectedClientHistory] = useState(null); // Cliente seleccionado para ver historial

    // --- AUTENTICACIÓN ---
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos
    const idleTimerRef = useRef(null);

    // --- AUTH EFFECTS ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
            if (currentUser) {
                resetIdleTimer();
            }
        });
        return () => unsubscribe();
    }, []);

    // Idle Timer Logic
    const resetIdleTimer = () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            handleLogout();
            alert("Su sesión ha expirado por inactividad (15 minutos). Por favor inicie sesión nuevamente.");
        }, IDLE_TIMEOUT_MS);
    };

    useEffect(() => {
        if (!user) return;

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        const handleActivity = () => resetIdleTimer();

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [user]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        try {
            // Append pseudo-domain
            const email = `${loginUsername}@scrib-admin.local`;
            await signInWithEmailAndPassword(auth, email, loginPassword);
            // resetIdleTimer handled by effect
        } catch (error) {
            console.error("Login Error:", error);
            setLoginError('Usuario o contraseña incorrectos.');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setLoginUsername('');
            setLoginPassword('');
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    // --- FIRESTORE SUBSCRIPTIONS (Wrapped in user check) ---
    useEffect(() => {
        if (!user) return; // Only subscribe if logged in

        const unsubscribeTemplates = onSnapshot(query(collection(db, "templates")), (snap) => {
            const temps = [];
            snap.forEach(doc => temps.push({ id: doc.id, ...doc.data() }));
            setTemplates(temps);
        });

        const unsubscribeClients = onSnapshot(query(collection(db, "clients"), orderBy("name")), (snap) => {
            const cls = [];
            snap.forEach(doc => cls.push({ id: doc.id, ...doc.data() }));
            setClients(cls);
        });

        const unsubscribeCertifications = onSnapshot(query(collection(db, "certifications"), orderBy("timestamp", "desc")), (snap) => {
            const certs = [];
            snap.forEach(doc => certs.push({ id: doc.id, ...doc.data() }));
            setCertifications(certs);
        });

        return () => {
            unsubscribeTemplates();
            unsubscribeClients();
            unsubscribeCertifications();
        };
    }, [user]);

    // --- AUTO-SAVE EFFECT ---
    useEffect(() => {
        if (view !== 'GENERATOR' || !certificationClient || !currentTemplate) return;

        const timer = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                const dataToSave = {
                    clientId: certificationClient.id,
                    clientName: certificationClient.name,
                    templateId: currentTemplate.id,
                    templateTitle: currentTemplate.title,
                    certificationTitle: certificationTitle || currentTemplate.title, // Guardar título personalizado o fallback
                    templateData: formData,
                    status: 'draft',
                    lastModifiedBy: user?.email?.replace('@scrib-admin.local', '') || 'Desconocido',
                    lastModifiedAt: serverTimestamp()
                };

                if (certificationId) {
                    await updateDoc(doc(db, "certifications", certificationId), {
                        ...dataToSave
                    });
                    // Don't overwrite original timestamp
                } else {
                    const docRef = await addDoc(collection(db, "certifications"), { ...dataToSave, timestamp: serverTimestamp() });
                    setCertificationId(docRef.id);
                }
                setSaveStatus('saved');
            } catch (error) {
                console.error("Error saving draft:", error);
                setSaveStatus('error');
            }
        }, 2000); // 2 seconds debounce

        return () => clearTimeout(timer);
    }, [formData, certificationClient, certificationId, certificationTitle]); // Auto-save triggered by data change and ID updates

    // --- ACCIONES PLANTILLAS ---
    const handleCreateNewTemplate = () => {
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

    const handleEditTemplate = (template) => {
        setCurrentTemplate({ ...template });
        setActiveSection(template.hasActa ? 'acta' : 'banderita');
        setView('EDITOR');
    };

    const handleDeleteTemplate = async (id) => {
        if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
            await deleteDoc(doc(db, "templates", id));
        }
    };

    const handleSaveTemplateDoc = async () => {
        if (currentTemplate.id) {
            await updateDoc(doc(db, "templates", currentTemplate.id), { ...currentTemplate });
        } else {
            await addDoc(collection(db, "templates"), { ...currentTemplate });
        }
        setView('DASHBOARD');
    };

    // --- ACCIONES GENERADOR ---
    const handleCreateCertification = (template) => {
        setCurrentTemplate(template);
        // Reset state
        setCertificationClient(null);
        setClientSearchText(''); // Reset search text
        setCertificationId(null);
        setSaveStatus('idle');

        // Extract vars
        let vars = [];
        if (template.hasActa) vars = [...vars, ...extractVariables(template.contentActa)];
        if (template.hasBanderita) vars = [...vars, ...extractVariables(template.contentBanderita)];
        vars = [...new Set(vars)];

        const initialData = {};
        vars.forEach(v => initialData[v] = '');
        if (vars.includes('FECHA')) initialData['FECHA'] = new Date().toLocaleDateString();

        setFormData(initialData);
        setCertificationTitle(template.title); // Default title is template title

        setActiveSection(template.hasActa ? 'acta' : 'banderita');
        setView('GENERATOR');
    };

    const handleClientSelect = (client) => {
        setCertificationClient(client);
        // Auto-fill form data if matches
        setFormData(prev => ({
            ...prev,
            ['NOMBRE']: (client.name || '').toUpperCase(),
            ['CLIENTE']: (client.name || '').toUpperCase(),
            ['COMPARECIENTE']: (client.name || '').toUpperCase(),
            ['DNI']: client.dni || prev['DNI'] || '',
            ['DOMICILIO']: client.address || prev['DOMICILIO'] || ''
        }));
    };

    const handleDownload = async () => {
        if (!certificationClient) {
            alert("Por favor selecciona un cliente antes de descargar.");
            return;
        }

        // Preparar nombre de archivo sugerido y abrir modal
        const suggestedName = `${certificationClient.name}_${certificationTitle || currentTemplate.title}`;
        setDownloadFilename(suggestedName);
        setDownloadModalOpen(true);
    };

    const confirmDownload = async () => {
        // Final save with status 'completed'
        if (certificationId) {
            await updateDoc(doc(db, "certifications", certificationId), {
                status: 'completed',
                certificationTitle: certificationTitle,
                templateData: formData,
                lastModifiedBy: user?.email?.replace('@scrib-admin.local', '') || 'Desconocido',
                lastModifiedAt: serverTimestamp()
            });
        } else {
            // Should not happen due to auto-save, but strictly:
            await addDoc(collection(db, "certifications"), {
                clientId: certificationClient.id,
                clientName: certificationClient.name,
                templateId: currentTemplate.id,
                templateTitle: currentTemplate.title,
                certificationTitle: certificationTitle || currentTemplate.title,
                templateData: formData,
                status: 'completed',
                timestamp: serverTimestamp(),
                lastModifiedBy: user?.email?.replace('@scrib-admin.local', '') || 'Desconocido',
                lastModifiedAt: serverTimestamp()
            });
        }

        exportToWordWithName(downloadFilename || 'Documento');
        setDownloadModalOpen(false);
    };

    const handleResumeCertification = (cert) => {
        const template = templates.find(t => t.id === cert.templateId);
        if (!template) {
            alert("La plantilla original ha sido eliminada. No se puede editar.");
            return;
        }

        // Recuperar cliente completo si es posible, sino usar datos mínimos guardados
        const client = clients.find(c => c.id === cert.clientId) || {
            id: cert.clientId,
            name: cert.clientName,
            dni: ''
        };

        setCurrentTemplate(template);
        setCertificationClient(client);
        setFormData(cert.templateData || {});
        setCertificationId(cert.id);
        setCertificationTitle(cert.certificationTitle || cert.templateTitle || template.title);
        setSaveStatus('saved');
        setClientSearchText('');

        // Determinar vista inicial
        setActiveSection(template.hasActa ? 'acta' : 'banderita');

        setView('GENERATOR');
    };

    const handleDeleteCertification = async (id) => {
        if (confirm("¿Estás seguro de eliminar esta certificación? Esta acción no se puede deshacer.")) {
            try {
                await deleteDoc(doc(db, "certifications", id));
            } catch (error) {
                console.error("Error deleting certification:", error);
                alert("Hubo un error al eliminar la certificación.");
            }
        }
    };

    const exportToWordWithName = (filename) => {
        let content = document.getElementById('document-preview').innerHTML;

        // Si estamos en Paso 2 (Banderita), ajustar la cantidad de guiones automáticamente
        // Cada renglón = 75 caracteres, "Silvana Andrea BOLLATI" debe empezar en carácter 151 (tercer renglón)
        if (activeSection === 'banderita') {
            // Obtener los valores de los campos
            const nroTomo = formData['NRO TOMO'] || formData['NRO_TOMO'] || formData['TOMO'] || '';
            const nroActa = formData['NRO_ACTA'] || formData['NRO ACTA'] || formData['ACTA'] || '';
            const nroFolio = formData['NRO FOLIO'] || formData['NRO_FOLIO'] || formData['FOLIO'] || '';

            // Texto completo antes del Folio (primera línea completa + inicio segunda línea)
            const primeraLinea = "Libro de Registro de Actos e Intervenciones Extraprotocolares Tomo " + String(nroTomo) + ".------- Acta ";
            const segundaLineaInicio = "Número " + String(nroActa) + ".- Folio " + String(nroFolio);

            // Posición actual después del folio
            const posicionActual = primeraLinea.length + segundaLineaInicio.length;

            // Silvana debe empezar en carácter 151, así que guiones hasta carácter 150
            const caracterObjetivo = 150;
            const guionesNecesarios = Math.max(1, caracterObjetivo - posicionActual);

            // Buscar el patrón y reemplazar
            content = content.replace(
                /(Folio\s*)(\d+)(\s*-*\s*)(Silvana)/gi,
                (match, folioText, folioNum, guionesExistentes, silvana) => {
                    return folioText + folioNum + '-'.repeat(guionesNecesarios) + silvana;
                }
            );
        }

        const header = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Documento</title>
                <!--[if gte mso 9]>
                <xml>
                    <w:WordDocument>
                        <w:View>Print</w:View>
                        <w:Zoom>100</w:Zoom>
                        <w:DoNotOptimizeForBrowser/>
                    </w:WordDocument>
                </xml>
                <![endif]-->
                <style>
                    @page { size: A4; margin: 2.5cm; }
                    body, p, div, span, td, th, li, a { 
                        font-family: Arial, Helvetica, sans-serif !important; 
                        font-size: 11pt !important; 
                        line-height: 2.2; 
                        text-align: justify;
                        mso-font-charset: 0;
                    }
                    body { margin: 0; padding: 0; }
                    * { font-family: Arial, Helvetica, sans-serif !important; font-size: 11pt !important; }
                </style>
            </head>
            <body style="font-family: Arial, Helvetica, sans-serif !important; font-size: 11pt !important; line-height: 2.2; text-align: justify;">`;
        const footer = "</body></html>";
        const sourceHTML = header + content + footer;
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        // Usar nombre personalizado con extensión .docx
        fileDownload.download = `${filename.replace(/\.docx?$/i, '')}.docx`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    // --- ACCIONES CLIENTES ---
    const handleNewClient = async (name) => {
        // Placeholder removed
    };

    const handleCreateClient = async (name) => {
        if (!name) return;
        try {
            const docRef = await addDoc(collection(db, "clients"), {
                name: name.toUpperCase(),
                dni: '',
                address: '',
                email: '',
                phone: '',
                createdAt: serverTimestamp()
            });
            const newClient = { id: docRef.id, name: name.toUpperCase(), dni: '' };
            setCertificationClient(newClient);
            setClientSearchText('');

            // También auto-rellenamos el formulario
            setFormData(prev => ({
                ...prev,
                ['NOMBRE']: newClient.name,
                ['CLIENTE']: newClient.name,
                ['COMPARECIENTE']: newClient.name
            }));

        } catch (error) {
            console.error("Error creating client:", error);
            alert("Error al crear cliente.");
        }
    };

    const handleEditClient = (client) => {
        setEditingClient({ ...client });
        setClientEditModalOpen(true);
    };

    const handleSaveClient = async () => {
        if (!editingClient || !editingClient.id) return;
        try {
            await updateDoc(doc(db, "clients", editingClient.id), {
                name: editingClient.name?.toUpperCase() || '',
                dni: editingClient.dni || '',
                estadoCivil: editingClient.estadoCivil || '',
                address: editingClient.address || '',
                notes: editingClient.notes || '',
                updatedAt: serverTimestamp()
            });
            // Actualizar el cliente seleccionado si es el mismo
            if (selectedClientHistory?.id === editingClient.id) {
                setSelectedClientHistory({ ...editingClient, name: editingClient.name?.toUpperCase() });
            }
            setClientEditModalOpen(false);
            setEditingClient(null);
        } catch (error) {
            console.error("Error updating client:", error);
            alert("Error al guardar los cambios del cliente.");
        }
    };

    // --- RENDER ---
    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">Cargando...</p></div>;

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fff6dc] p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
                    <div className="flex justify-center mb-6">
                        <img src="https://i.postimg.cc/mZyWsFf3/Logo-SBV-Retina.png" alt="Logo" className="h-20 w-auto" />
                    </div>
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Iniciar Sesión</h2>
                    <p className="text-center text-gray-500 mb-8 text-sm">Acceso restringido al personal autorizado.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Usuario</label>
                            <input
                                type="text"
                                value={loginUsername}
                                onChange={(e) => setLoginUsername(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none"
                                placeholder="Ingrese su usuario"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                            <input
                                type="password"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        {loginError && <p className="text-red-500 text-sm font-bold text-center">{loginError}</p>}

                        <button type="submit" className="w-full py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition shadow-lg">
                            INGRESAR
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* Header */}
            <header className="bg-[#fff6dc] text-gray-800 p-4 shadow-lg sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('DASHBOARD')}>
                        {/* Logo replaced with provided image */}
                        <div className="p-0 rounded-lg">
                            <img src="https://i.postimg.cc/mZyWsFf3/Logo-SBV-Retina.png" alt="Logo" className="h-24 w-auto" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-wide text-gray-900">Gestor certificaciones</h1>
                            <p className="text-xs text-gray-500">Gestor de Documentos Notariales</p>
                        </div>
                    </div>

                    <nav className="flex gap-2 bg-white/50 p-1 rounded-xl border border-amber-100">
                        <button
                            onClick={() => setView('DASHBOARD')}
                            className={`px-4 py-2 rounded-lg font-medium transition text-sm flex items-center gap-2 ${view === 'DASHBOARD' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-600 hover:text-gray-800 hover:bg-white'}`}
                        >
                            <LayoutTemplate size={16} /> Plantillas
                        </button>
                        <button
                            onClick={() => setView('CERTIFICATIONS')}
                            className={`px-4 py-2 rounded-lg font-medium transition text-sm flex items-center gap-2 ${view === 'CERTIFICATIONS' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-600 hover:text-gray-800 hover:bg-white'}`}
                        >
                            <FileCheck size={16} /> Certificaciones
                        </button>
                        <button
                            onClick={() => setView('CLIENTS')}
                            className={`px-4 py-2 rounded-lg font-medium transition text-sm flex items-center gap-2 ${view === 'CLIENTS' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-600 hover:text-gray-800 hover:bg-white'}`}
                        >
                            <Users size={16} /> Clientes
                        </button>
                    </nav>

                    <button onClick={handleLogout} className="ml-4 p-2 text-gray-500 hover:text-red-600 tooltip" title="Cerrar Sesión">
                        <div className="bg-white/50 p-2 rounded-full hover:bg-red-50 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </div>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 md:p-8">

                {/* VISTA: DASHBOARD */}
                {view === 'DASHBOARD' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800">Mis Plantillas</h2>
                                <p className="text-gray-500 mt-1">Selecciona una plantilla para crear una nueva certificación.</p>
                            </div>
                            <button onClick={handleCreateNewTemplate} className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 font-semibold transition-all">
                                <Plus size={20} /> Crear Nueva Plantilla
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map(t => (
                                <TemplateCard key={t.id} template={t} onUse={handleCreateCertification} onEdit={handleEditTemplate} onDelete={handleDeleteTemplate} />
                            ))}
                            {templates.length === 0 && (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                                    <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                                    <p className="text-gray-500 text-lg">No hay plantillas disponibles.</p>
                                    <button onClick={handleCreateNewTemplate} className="text-gray-800 font-bold hover:underline mt-2">Crear la primera</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* VISTA: CERTIFICACIONES GLOBAL */}
                {view === 'CERTIFICATIONS' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800">Certificaciones</h2>
                                <p className="text-gray-500 mt-1">Historial completo de documentos generados.</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                                        <th className="p-4 font-bold">Fecha</th>
                                        <th className="p-4 font-bold">Cliente</th>
                                        <th className="p-4 font-bold">Documento</th>
                                        <th className="p-4 font-bold">Última Modificación</th>
                                        <th className="p-4 font-bold">Estado</th>
                                        <th className="p-4 font-bold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {certifications.map(cert => (
                                        <tr key={cert.id} className="hover:bg-gray-50/50 transition">
                                            <td className="p-4 text-sm text-gray-600">
                                                {cert.timestamp ? new Date(cert.timestamp.seconds * 1000).toLocaleDateString() : '-'} <br />
                                                <span className="text-xs text-gray-400">{cert.timestamp ? new Date(cert.timestamp.seconds * 1000).toLocaleTimeString() : ''}</span>
                                            </td>
                                            <td className="p-4 font-bold text-gray-800">{cert.clientName}</td>
                                            <td className="p-4 text-gray-800 font-medium">{cert.certificationTitle || cert.templateTitle}</td>
                                            <td className="p-4 text-sm">
                                                {cert.lastModifiedBy ? (
                                                    <div>
                                                        <span className="font-semibold text-gray-700">{cert.lastModifiedBy}</span><br />
                                                        <span className="text-xs text-gray-400">
                                                            {cert.lastModifiedAt ? new Date(cert.lastModifiedAt.seconds * 1000).toLocaleDateString() : ''}
                                                            {' '}
                                                            {cert.lastModifiedAt ? new Date(cert.lastModifiedAt.seconds * 1000).toLocaleTimeString() : ''}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${cert.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    cert.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {cert.status === 'completed' ? 'Finalizado' : 'Borrador'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleResumeCertification(cert)}
                                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-800 tooltip transition-colors"
                                                    title="Editar / Continuar"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCertification(cert.id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 tooltip transition-colors"
                                                    title="Eliminar Certificación"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {certifications.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-400">No se encontraron certificaciones.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* VISTA: CLIENTES */}
                {view === 'CLIENTS' && (
                    <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)]">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-y-auto flex flex-col">
                            <h2 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-800"><Users /> Registro de Clientes</h2>
                            <div className="relative mb-4">
                                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                                <input type="text" placeholder="Buscar..." className="w-full pl-10 p-2 border rounded-lg bg-gray-50 outline-none focus:ring-2 ring-gray-800" />
                            </div>
                            {/* Create Client Simple Form within list could go here */}
                            <div className="space-y-2 flex-1 overflow-y-auto">
                                {clients.map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => setSelectedClientHistory(client)}
                                        className={`p-3 rounded-lg cursor-pointer border hover:border-gray-400 transition ${selectedClientHistory?.id === client.id ? 'bg-gray-100 border-gray-800' : 'bg-white border-gray-100'}`}
                                    >
                                        <h4 className="font-bold text-gray-800">{client.name}</h4>
                                        <p className="text-xs text-gray-500">DNI: {client.dni || 'Sin datos'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-y-auto">
                            {selectedClientHistory ? (
                                <div>
                                    <div className="flex justify-between items-center mb-6 pb-4 border-b">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">{selectedClientHistory.name}</h2>
                                            <p className="text-gray-500">Información del Cliente</p>
                                        </div>
                                        <button
                                            onClick={() => handleEditClient(selectedClientHistory)}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2 transition"
                                        >
                                            <Edit3 size={16} /> Editar Cliente
                                        </button>
                                    </div>

                                    {/* Información Personal del Cliente */}
                                    {(selectedClientHistory.dni || selectedClientHistory.estadoCivil || selectedClientHistory.address || selectedClientHistory.notes) && (
                                        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <Users size={16} /> Datos Personales
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {selectedClientHistory.dni && (
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-500 uppercase">DNI</span>
                                                        <p className="text-gray-800">{selectedClientHistory.dni}</p>
                                                    </div>
                                                )}
                                                {selectedClientHistory.estadoCivil && (
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-500 uppercase">Estado Civil</span>
                                                        <p className="text-gray-800">{selectedClientHistory.estadoCivil}</p>
                                                    </div>
                                                )}
                                                {selectedClientHistory.address && (
                                                    <div className="md:col-span-2">
                                                        <span className="text-xs font-bold text-gray-500 uppercase">Domicilio</span>
                                                        <p className="text-gray-800">{selectedClientHistory.address}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {selectedClientHistory.notes && (
                                                <div className="mt-3 pt-3 border-t border-gray-200">
                                                    <span className="text-xs font-bold text-gray-500 uppercase">Observaciones</span>
                                                    <p className="text-gray-700 whitespace-pre-wrap">{selectedClientHistory.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Documentos Asociados */}
                                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <FileText size={16} /> Documentos Asociados
                                    </h3>
                                    <div className="space-y-3">
                                        {certifications.filter(c => c.clientId === selectedClientHistory.id).map(doc => (
                                            <div key={doc.id} className="p-4 rounded-xl border border-gray-100 hover:shadow-md transition bg-gray-50 flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 mb-1">{doc.certificationTitle || doc.templateTitle}</h4>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock size={12} /> {doc.timestamp ? new Date(doc.timestamp.seconds * 1000).toLocaleDateString() : ''}
                                                    </p>
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${doc.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                    {doc.status === 'draft' ? 'Borrador' : 'Finalizado'}
                                                </span>
                                            </div>
                                        ))}
                                        {certifications.filter(c => c.clientId === selectedClientHistory.id).length === 0 && (
                                            <p className="text-gray-400 text-sm text-center py-4">No hay documentos asociados a este cliente.</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Users size={64} className="mb-4 opacity-20" />
                                    <p>Selecciona un cliente para ver su detalle.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* VISTA: EDITOR DE PLANTILLAS */}
                {view === 'EDITOR' && (
                    <div className="animate-fade-in h-[calc(100vh-140px)] flex flex-col">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => setView('DASHBOARD')} className="p-2 hover:bg-gray-200 rounded-full transition"><ArrowLeft /></button>
                            <h2 className="text-2xl font-bold text-gray-800 flex-1">
                                {currentTemplate.id ? 'Editar Plantilla' : 'Nueva Plantilla'}
                            </h2>
                            <button onClick={handleSaveTemplateDoc} className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md">
                                <Save size={18} /> Guardar Cambios
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
                                <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                                    <h4 className="font-bold text-gray-900 mb-2">+ Variable</h4>
                                    <div className="flex gap-2">
                                        <input id="newVarInput" className="flex-1 p-2 border rounded text-sm" />
                                        <button onClick={() => {
                                            const v = document.getElementById('newVarInput').value;
                                            if (v) {
                                                const key = activeSection === 'acta' ? 'contentActa' : 'contentBanderita';
                                                setCurrentTemplate({ ...currentTemplate, [key]: currentTemplate[key] + ` {{${v.toUpperCase()}}} ` });
                                                document.getElementById('newVarInput').value = '';
                                            }
                                        }} className="bg-gray-800 text-white px-3 text-sm font-bold rounded">Add</button>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border flex flex-col">
                                <div className="flex border-b">
                                    {currentTemplate.hasActa && <button onClick={() => setActiveSection('acta')} className={`px-6 py-3 font-bold text-sm ${activeSection === 'acta' ? 'text-gray-800 border-b-2 border-gray-800' : ''}`}>PASO 1: ACTA</button>}
                                    {currentTemplate.hasBanderita && <button onClick={() => setActiveSection('banderita')} className={`px-6 py-3 font-bold text-sm ${activeSection === 'banderita' ? 'text-gray-800 border-b-2 border-gray-800' : ''}`}>PASO 2: BANDERITA</button>}
                                </div>
                                <div className="flex-1 bg-gray-50 p-4">
                                    {/* Encabezado fijo para banderita - no editable, fondo beige, subrayado */}
                                    {activeSection === 'banderita' && (
                                        <div
                                            contentEditable={false}
                                            className="bg-amber-50 border-b border-amber-200 p-4 mb-0 select-none pointer-events-none"
                                            style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '2.2', textAlign: 'justify' }}
                                        >
                                            <span style={{ fontWeight: 'bold', textDecoration: 'underline', backgroundColor: '#fef3c7' }}>
                                                Libro de Registro de Actos e Intervenciones Extraprotocolares Tomo <span style={{ color: 'red', background: '#fee2e2' }}>[NRO TOMO]</span>.------- Acta Número <span style={{ color: 'red', background: '#fee2e2' }}>[NRO_ACTA]</span>.- Folio <span style={{ color: 'red', background: '#fee2e2' }}>[NRO FOLIO]</span>
                                            </span>
                                        </div>
                                    )}
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

                {/* VISTA: GENERADOR (CERTIFICACIÓN) */}
                {view === 'GENERATOR' && (
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => setView('DASHBOARD')} className="p-2 hover:bg-gray-200 rounded-full transition"><ArrowLeft /></button>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 font-bold uppercase">Título de la Certificación</label>
                                <input
                                    type="text"
                                    value={certificationTitle}
                                    onChange={(e) => setCertificationTitle(e.target.value)}
                                    className="w-full text-2xl font-bold text-gray-800 bg-transparent border-b border-dashed border-gray-300 focus:border-gray-800 outline-none placeholder-gray-300"
                                    placeholder="Nombre del documento..."
                                />
                                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                    {saveStatus === 'saving' && <span className="text-yellow-600 flex items-center gap-1"><Clock size={12} className="animate-spin" /> Guardando...</span>}
                                    {saveStatus === 'saved' && <span className="text-green-600 flex items-center gap-1"><CheckSquare size={12} /> Guardado como borrador</span>}
                                    {saveStatus === 'error' && <span className="text-red-600 flex items-center gap-1"><AlertCircle size={12} /> Error al guardar</span>}
                                </p>
                            </div>

                            <div className="w-4"></div>

                            <button
                                onClick={handleDownload}
                                disabled={!certificationClient}
                                className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-md transition-all ${certificationClient ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                <Download size={20} /> GUARDAR Y DESCARGAR
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* Panel de Datos (Formulario) */}
                            <div className="lg:col-span-4 space-y-6">

                                {/* 1. SELECCIÓN DE CLIENTE (OBLIGATORIO) */}
                                <div className={`bg-white p-6 rounded-xl shadow-lg border-2 ${!certificationClient ? 'border-gray-800 ring-4 ring-gray-800/10' : 'border-green-100'}`}>
                                    <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${!certificationClient ? 'text-gray-800' : 'text-green-700'}`}>
                                        <Users size={20} />
                                        {certificationClient ? 'Cliente Asignado' : '1. Seleccionar Cliente'}
                                    </h3>

                                    {!certificationClient ? (
                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-500">Busca el cliente o crea uno nuevo.</p>
                                            <AutocompleteInput
                                                label=""
                                                value={clientSearchText}
                                                onChange={setClientSearchText}
                                                onSelectResult={handleClientSelect}
                                                placeholder="Escribe nombre del cliente..."
                                            />
                                            {clientSearchText.length > 2 && (
                                                <button
                                                    onClick={() => handleCreateClient(clientSearchText)}
                                                    className="w-full py-2 bg-gray-200 hover:bg-gray-400 text-gray-900 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition"
                                                >
                                                    <Plus size={16} /> Crear nuevo cliente: "{clientSearchText.toUpperCase()}"
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-green-50 p-4 rounded-lg border border-green-200 relative">
                                            <button onClick={() => setCertificationClient(null)} className="absolute top-2 right-2 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded"><Trash2 size={16} /></button>
                                            <p className="font-bold text-gray-800">{certificationClient.name}</p>
                                            <p className="text-sm text-gray-600">DNI: {certificationClient.dni}</p>
                                        </div>
                                    )}
                                </div>

                                {/* 2. COMPLETAR VARIABLES */}
                                <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-200 transition-opacity ${!certificationClient ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                    <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                                        <PenTool className="text-gray-800" /> 2. Completar Datos ({activeSection === 'acta' ? 'Acta' : 'Banderita'})
                                    </h3>

                                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                                        {(() => {
                                            // Extract vars for current section ONLY
                                            const sectionContent = activeSection === 'acta' ? currentTemplate.contentActa : currentTemplate.contentBanderita;
                                            const sectionVars = extractVariables(sectionContent);

                                            // Always include FECHA if present in logic, but here relying on text content
                                            // If no vars found for this section, show message

                                            if (sectionVars.length === 0) {
                                                return <p className="text-gray-400 italic text-sm">Este paso no tiene variables para completar.</p>;
                                            }

                                            return sectionVars.map(variable => (
                                                <div key={variable}>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                                        {variable}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData[variable] || ''}
                                                        onChange={(e) => setFormData({ ...formData, [variable]: e.target.value })}
                                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none bg-gray-50 transition-colors focus:bg-white"
                                                        placeholder={`...`}
                                                    />
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Panel de Vista Previa A4 */}
                            <div className="lg:col-span-8">
                                <div className="flex gap-2 mb-4">
                                    {currentTemplate.hasActa && (
                                        <button
                                            onClick={() => setActiveSection('acta')}
                                            className={`px-4 py-2 rounded-lg font-bold shadow-sm transition ${activeSection === 'acta' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                                        >
                                            Paso 1: Acta
                                        </button>
                                    )}
                                    {currentTemplate.hasBanderita && (
                                        <button
                                            onClick={() => setActiveSection('banderita')}
                                            className={`px-4 py-2 rounded-lg font-bold shadow-sm transition ${activeSection === 'banderita' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                                        >
                                            Paso 2: Banderita
                                        </button>
                                    )}
                                </div>

                                <div className="bg-gray-200 rounded-xl p-8 flex justify-center min-h-[800px] overflow-auto border-inner shadow-inner">
                                    <div
                                        id="document-preview"
                                        className="bg-white shadow-2xl p-[2.5cm] w-[21cm] min-h-[29.7cm] text-black leading-relaxed whitespace-pre-wrap outline-none"
                                        style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '2.2', textAlign: 'justify' }}
                                    >
                                        {(() => {
                                            const rawContent = activeSection === 'acta' ? currentTemplate.contentActa : currentTemplate.contentBanderita;
                                            let text = rawContent || '';

                                            // Si es banderita, agregar encabezado fijo al inicio
                                            if (activeSection === 'banderita') {
                                                const encabezadoFijo = `<b><u>Libro de Registro de Actos e Intervenciones Extraprotocolares Tomo {{NRO TOMO}}.------- Acta Número {{NRO_ACTA}}.- Folio {{NRO FOLIO}}</u></b>`;
                                                // Remover cualquier encabezado existente similar para evitar duplicados
                                                text = text.replace(/<b><u>Libro de Registro de Actos e Intervenciones Extraprotocolares.*?<\/u><\/b>/gi, '');
                                                text = text.replace(/Libro de Registro de Actos e Intervenciones Extraprotocolares Tomo.*?Folio\s*\{\{NRO FOLIO\}\}/gi, '');
                                                text = encabezadoFijo + text;
                                            }

                                            Object.keys(formData).forEach(key => {
                                                const val = formData[key] || `<span style="color:red; background:#fee">[${key}]</span>`;
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

            {/* Modal de Descarga */}
            {downloadModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-gray-100 rounded-lg text-gray-800">
                                <Download size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Descargar Documento</h3>
                                <p className="text-sm text-gray-500">Ingresa el nombre del archivo</p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del archivo</label>
                            <div className="flex items-center">
                                <input
                                    type="text"
                                    value={downloadFilename}
                                    onChange={(e) => setDownloadFilename(e.target.value)}
                                    className="flex-1 p-3 border rounded-l-lg focus:ring-2 focus:ring-gray-800 outline-none bg-gray-50"
                                    placeholder="Nombre del documento..."
                                    autoFocus
                                />
                                <span className="bg-gray-200 text-gray-600 px-3 py-3 rounded-r-lg border border-l-0 font-mono text-sm">.docx</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDownloadModalOpen(false)}
                                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDownload}
                                className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"
                            >
                                <Download size={18} /> Descargar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición de Cliente */}
            {clientEditModalOpen && editingClient && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-gray-100 rounded-lg text-gray-800">
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Editar Cliente</h3>
                                <p className="text-sm text-gray-500">Actualiza la información del cliente</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre y Apellido</label>
                                <input
                                    type="text"
                                    value={editingClient.name || ''}
                                    onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none bg-gray-50"
                                    placeholder="Nombre completo del cliente..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">DNI</label>
                                    <input
                                        type="text"
                                        value={editingClient.dni || ''}
                                        onChange={(e) => setEditingClient({ ...editingClient, dni: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none bg-gray-50"
                                        placeholder="12.345.678"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Estado Civil</label>
                                    <select
                                        value={editingClient.estadoCivil || ''}
                                        onChange={(e) => setEditingClient({ ...editingClient, estadoCivil: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none bg-gray-50"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Soltero/a">Soltero/a</option>
                                        <option value="Casado/a">Casado/a</option>
                                        <option value="Divorciado/a">Divorciado/a</option>
                                        <option value="Viudo/a">Viudo/a</option>
                                        <option value="Unión Convivencial">Unión Convivencial</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Domicilio</label>
                                <input
                                    type="text"
                                    value={editingClient.address || ''}
                                    onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none bg-gray-50"
                                    placeholder="Calle, Número, Ciudad..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones del Cliente</label>
                                <textarea
                                    value={editingClient.notes || ''}
                                    onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none bg-gray-50 min-h-[100px] resize-none"
                                    placeholder="Información adicional, notas importantes..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setClientEditModalOpen(false); setEditingClient(null); }}
                                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveClient}
                                className="flex-1 py-3 px-4 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
