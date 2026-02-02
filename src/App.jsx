import React, { useState, useEffect } from 'react';
import { FileText, Users, User, Download, RefreshCw, ChevronRight, ArrowLeft, Copy, Check } from 'lucide-react';

const NUMEROS_A_LETRAS = {
    0: "CERO", 1: "UNO", 2: "DOS", 3: "TRES", 4: "CUATRO", 5: "CINCO", 6: "SEIS", 7: "SIETE", 8: "OCHO", 9: "NUEVE",
    10: "DIEZ", 11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE", 16: "DIECISÉIS", 17: "DIECISIETE",
    18: "DIECIOCHO", 19: "DIECINUEVE", 20: "VEINTE", 21: "VEINTIUNO", 22: "VEINTIDÓS", 23: "VEINTITRÉS",
    24: "VEINTICUATRO", 25: "VEINTICINCO", 26: "VEINTISÉIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE",
    30: "TREINTA", 31: "TREINTA Y UNO"
};

const MESES = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

// --- Utiles para Fechas ---
const formatDateText = (dateString) => {
    if (!dateString) return { dia: "...", mes: "...", ano: "..." };
    const [year, month, day] = dateString.split('-').map(Number);
    return {
        dia: NUMEROS_A_LETRAS[day] || day.toString(),
        mes: MESES[month - 1] || "...",
        ano: year === 2024 ? "DOS MIL VEINTICUATRO" : year === 2025 ? "DOS MIL VEINTICINCO" : year === 2026 ? "DOS MIL VEINTISÉIS" : year.toString().toUpperCase()
    };
};

const formatDateShort = (dateString) => {
    if (!dateString) return "...";
    const [year, month, day] = dateString.split('-');
    const mesesMin = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${day} de ${mesesMin[parseInt(month) - 1]} de ${year}`;
};

export default function ActasGenerator() {
    // --- Estados de la Aplicación ---
    const [step, setStep] = useState(1); // 1: Selección, 2: Formulario, 3: Vista Previa
    const [config, setConfig] = useState({
        tipo: '08', // Por defecto 08, escalable a otros
        paso: null, // 'paso1' | 'paso2'
        cantidad: null // '1' | 'plural'
    });

    const [globalData, setGlobalData] = useState({
        actaNumero: '',
        actaNumeroLetras: '',
        tomo: '',
        folio: '',
        fecha: new Date().toISOString().split('T')[0],
        formulario08: '',
        dominio: '',
    });

    // Array de personas dinámico
    const [people, setPeople] = useState([
        { id: 1, nombre: '', dni: '', fechaNac: '', estadoCivil: '', domicilio: '', localidad: '', depto: '', provincia: 'Entre Ríos', nacionalidad: 'Argentina', genero: 'M', rol: 'VENDEDOR' }
    ]);

    // --- Lógica de Manejo de Estado ---
    const handleConfigSelect = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleGlobalChange = (e) => {
        const { name, value } = e.target;
        setGlobalData(prev => ({ ...prev, [name]: value }));
    };

    const handlePersonChange = (id, field, value) => {
        setPeople(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const addPerson = () => {
        const newId = people.length + 1;
        setPeople([...people, { id: newId, nombre: '', dni: '', fechaNac: '', estadoCivil: '', domicilio: '', localidad: '', depto: '', provincia: 'Entre Ríos', nacionalidad: 'Argentina', genero: 'M', rol: 'CÓNYUGE' }]);
    };

    const removePerson = (id) => {
        if (people.length > 1) {
            setPeople(people.filter(p => p.id !== id));
        }
    };

    const resetApp = () => {
        setStep(1);
        setConfig({ tipo: '08', paso: null, cantidad: null });
        setPeople([{ id: 1, nombre: '', dni: '', fechaNac: '', estadoCivil: '', domicilio: '', localidad: '', depto: '', provincia: 'Entre Ríos', nacionalidad: 'Argentina', genero: 'M', rol: 'VENDEDOR' }]);
    };

    // --- Generación de Texto Inteligente ---

    const getGenderedWord = (word, gender) => {
        const map = {
            'nacido': { M: 'nacido', F: 'nacida' },
            'domiciliado': { M: 'domiciliado', F: 'domiciliada' },
            'identificado': { M: 'identificado', F: 'identificada' },
            'el': { M: 'el', F: 'la' },
            'del': { M: 'del', F: 'de la' },
            'compareciente': { M: 'compareciente', F: 'compareciente' }, // Neutro
            'ciudadano': { M: 'ciudadano', F: 'ciudadana' },
        };
        return map[word] ? map[word][gender] : word;
    };

    // --- Renderizado del Documento (HTML para Vista Previa y Exportación) ---
    const renderDocumentContent = () => {
        const { dia, mes, ano } = formatDateText(globalData.fecha);
        const isPlural = config.cantidad === 'plural' || people.length > 1;

        // Construcción dinámica de la lista de personas
        const personasTexto = people.map((p, index) => {
            const conector = index === 0 ? "" : (index === people.length - 1 ? " y " : ", ");
            const nacimiento = formatDateShort(p.fechaNac);

            return (
                <span key={p.id}>
                    {conector}
                    <strong>{p.nombre.toUpperCase()}</strong>, Documento Nacional de Identidad <strong>{p.dni}</strong>,
                    {` ${getGenderedWord('nacido', p.genero)}`} el <strong>{nacimiento}</strong>, <strong>{p.estadoCivil}</strong>,
                    {` ${getGenderedWord('domiciliado', p.genero)}`} en <strong>{p.domicilio} {p.localidad}</strong>,
                    Departamento <strong>{p.depto}</strong>, Provincia de <strong>{p.provincia}</strong>,
                    <strong>{p.nacionalidad}</strong>
                </span>
            );
        });

        const rolesTexto = people.map((p, i) => {
            const conector = i === 0 ? "" : (i === people.length - 1 ? " y " : ", ");
            return <span key={i}>{conector}<strong>{p.rol}</strong></span>;
        });

        // --- TEMPLATE: PASO 1 (ACTA) ---
        if (config.paso === 'paso1') {
            return (
                <div className="font-serif text-justify leading-relaxed text-lg p-8 bg-white text-black">
                    <p>
                        ACTA NÚMERO <strong>{globalData.actaNumeroLetras}</strong> (<strong>{globalData.actaNumero}</strong>) – TOMO <strong>{globalData.tomo}</strong>.
                        En Libertador San Martín, Departamento Diamante, Provincia de Entre Ríos, al <strong>{dia}</strong> de <strong>{mes}</strong> de <strong>{ano}</strong>,
                        ante mí, SILVANA ANDREA BOLLATI, Escribana Titular del Registro Diecisiete del Departamento Diamante, con asiento en esta ciudad,
                        {isPlural ? " COMPARECEN: " : " COMPARECE: "}
                        {personasTexto}
                        {isPlural ? ", mayores de edad; a quienes identifico" : ", mayor de edad; a quien identifico"} en los términos del inciso “a”, artículo 306 del Código Civil y Comercial,
                        en razón de la exhibición {isPlural ? "de los documentos idóneos que en este acto tengo a la vista" : "del documento idóneo que en este acto tengo a la vista"}.
                        Y me {isPlural ? "requieren certifique sus firmas" : "requiere certifique su firma"} en Formulario 08 N° <strong>{globalData.formulario08}</strong>,
                        en carácter de {rolesTexto} del Automotor DOMINIO <strong>{globalData.dominio.toUpperCase()}</strong>.
                        Leo {isPlural ? "a los comparecientes, quienes se ratifican y firman" : "al compareciente quien se ratifica y firma"} ante mí, doy fe.
                    </p>
                </div>
            );
        }

        // --- TEMPLATE: PASO 2 (CERTIFICACIÓN) ---
        if (config.paso === 'paso2') {
            const fechaCierre = formatDateText(globalData.fecha); // Usamos la misma fecha para el cierre o podría ser otra
            return (
                <div className="font-serif text-justify leading-relaxed text-lg p-8 bg-white text-black">
                    <p className="mb-4">
                        Libro de Registro de Actos e Intervenciones Extraprotocolares Tomo <strong>{globalData.tomo}</strong>.-
                        Acta Número <strong>{globalData.actaNumero}</strong>.- Folio <strong>{globalData.folio}</strong>.-
                    </p>
                    <p className="mb-4">
                        Silvana Andrea BOLLATI, en mi carácter de Notario, titular del Registro número 17 del Departamento Diamante,
                        con asiento en Libertador San Martín, Provincia de Entre Ríos; CERTIFICO que {isPlural ? "las firmas que obran" : "la firma que obra"} en el documento que antecede,
                        {isPlural ? "han sido puestas" : "ha sido puesta"} en mi presencia, por {isPlural ? "las siguientes personas:" : "la siguiente persona:"}
                    </p>
                    <p className="mb-4">
                        {personasTexto}
                        {isPlural ? "; mayores de edad, a quienes identifico" : "; a quien identifico"} en los términos del inciso “a”, artículo 306 del Código Civil y Comercial de la Nación Argentina,
                        en razón de la exhibición {isPlural ? "del documento idóneo que en este acto tengo a la vista" : "del documento idóneo que en este acto tengo a la vista"},
                        en carácter de {rolesTexto} del Automotor DOMINIO <strong>{globalData.dominio.toUpperCase()}</strong>.
                    </p>
                    <p className="mb-8">
                        -----------------------------------------------------------------------------------------------------
                        <br />
                        DOCUMENTO QUE ANTECEDE: Formulario 08 del Registro Nacional de la Propiedad del Automotor Nº <strong>{globalData.formulario08}</strong>.-
                        Se certifica con los siguientes rubros en blanco: “A” (parcialmente), “D”, “E”, “F”, “H”, “J”, “K”, “L”, “N” y “O”.
                        --------------------------------------------------------------------------------------------------------------
                    </p>
                    <p className="text-right">
                        Libertador San Martín, Departamento Diamante, Provincia de Entre Ríos.- <strong>{fechaCierre.dia}</strong> de <strong>{fechaCierre.mes}</strong> de <strong>{fechaCierre.ano}</strong>.- CONSTE.-
                    </p>
                </div>
            )
        }
    };

    // --- Función de Exportación a Word ---
    const exportToWord = () => {
        const content = document.getElementById('document-preview').innerHTML;
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Documento</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + content + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `Acta_${config.paso}_${globalData.actaNumero || 'borrador'}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* Header */}
            <header className="bg-indigo-900 text-white p-4 shadow-lg flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <FileText size={24} />
                    <h1 className="text-xl font-bold tracking-wide">SCRIB-DIGITAL | Certificación de Firmas</h1>
                </div>
                <button onClick={resetApp} className="flex items-center gap-1 text-sm bg-indigo-800 hover:bg-indigo-700 px-3 py-1 rounded transition">
                    <RefreshCw size={14} /> Nueva Acta
                </button>
            </header>

            <main className="max-w-5xl mx-auto p-6">

                {/* Step 1: Selección de Tipo */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold mb-6 text-indigo-900 border-b pb-2">1. Seleccione el Tipo de Documento</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Paso 1 */}
                            <div
                                onClick={() => { handleConfigSelect('paso', 'paso1'); }}
                                className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:shadow-xl ${config.paso === 'paso1' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                            >
                                <h3 className="text-xl font-bold text-indigo-800 mb-2">PASO 1: Acta Notarial</h3>
                                <p className="text-gray-600 text-sm">El acta inicial donde comparecen las personas.</p>
                            </div>

                            {/* Paso 2 */}
                            <div
                                onClick={() => { handleConfigSelect('paso', 'paso2'); }}
                                className={`cursor-pointer p-6 rounded-xl border-2 transition-all hover:shadow-xl ${config.paso === 'paso2' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                            >
                                <h3 className="text-xl font-bold text-indigo-800 mb-2">PASO 2: Certificación</h3>
                                <p className="text-gray-600 text-sm">El texto final de certificación de firmas.</p>
                            </div>
                        </div>

                        {config.paso && (
                            <div className="mt-8 animate-fade-in-up">
                                <h3 className="text-lg font-semibold mb-4 text-gray-700">Cantidad de Comparecientes:</h3>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => { handleConfigSelect('cantidad', '1'); setStep(2); }}
                                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:text-indigo-600 font-bold text-lg transition shadow-sm"
                                    >
                                        <User /> 1 Persona
                                    </button>
                                    <button
                                        onClick={() => { handleConfigSelect('cantidad', 'plural'); setStep(2); }}
                                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:text-indigo-600 font-bold text-lg transition shadow-sm"
                                    >
                                        <Users /> 2 o más
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Formulario de Datos */}
                {step === 2 && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <button onClick={() => setStep(1)} className="text-gray-500 hover:text-indigo-600 flex items-center gap-1"><ArrowLeft size={16} /> Volver</button>
                            <h2 className="text-2xl font-bold text-indigo-900">2. Completar Datos</h2>
                            <button onClick={() => setStep(3)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-md">
                                Generar Documento <ChevronRight size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Columna Izquierda: Datos Generales */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                                    <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">Datos del Acta</h3>

                                    <label className="block text-sm font-medium text-gray-600 mb-1">Fecha</label>
                                    <input type="date" name="fecha" value={globalData.fecha} onChange={handleGlobalChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 mb-3" />

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Número (001)</label>
                                            <input type="text" name="actaNumero" value={globalData.actaNumero} onChange={handleGlobalChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 mb-3" placeholder="Ej: 154" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Num. Letras</label>
                                            <input type="text" name="actaNumeroLetras" value={globalData.actaNumeroLetras} onChange={handleGlobalChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 mb-3" placeholder="Ej: CIENTO..." />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Tomo</label>
                                            <input type="text" name="tomo" value={globalData.tomo} onChange={handleGlobalChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 mb-3" />
                                        </div>
                                        {config.paso === 'paso2' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-1">Folio</label>
                                                <input type="text" name="folio" value={globalData.folio} onChange={handleGlobalChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 mb-3" />
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-gray-700 mb-3 border-b pb-2 mt-4">Datos del Vehículo</h3>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Formulario 08 Nº</label>
                                    <input type="text" name="formulario08" value={globalData.formulario08} onChange={handleGlobalChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 mb-3" placeholder="08D..." />

                                    <label className="block text-sm font-medium text-gray-600 mb-1">Dominio (Patente)</label>
                                    <input type="text" name="dominio" value={globalData.dominio} onChange={handleGlobalChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 mb-3 bg-yellow-50 font-bold text-center uppercase" placeholder="AA 123 BB" />

                                </div>
                            </div>

                            {/* Columna Derecha: Personas */}
                            <div className="lg:col-span-2 space-y-4">
                                {people.map((p, index) => (
                                    <div key={p.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 relative">
                                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                                            <h3 className="font-bold text-indigo-800 flex items-center gap-2">
                                                <User size={18} /> Compareciente {people.length > 1 ? `#${index + 1}` : ''}
                                            </h3>
                                            {people.length > 1 && (
                                                <button onClick={() => removePerson(p.id)} className="text-red-500 text-xs hover:underline">Eliminar</button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2 flex gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Nombre Completo</label>
                                                    <input type="text" value={p.nombre} onChange={(e) => handlePersonChange(p.id, 'nombre', e.target.value)} className="w-full p-2 border-b-2 border-gray-200 focus:border-indigo-500 outline-none bg-gray-50" placeholder="Apellido y Nombres" />
                                                </div>
                                                <div className="w-32">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Género</label>
                                                    <select value={p.genero} onChange={(e) => handlePersonChange(p.id, 'genero', e.target.value)} className="w-full p-2 border rounded bg-white">
                                                        <option value="M">Masculino</option>
                                                        <option value="F">Femenino</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase">DNI</label>
                                                <input type="text" value={p.dni} onChange={(e) => handlePersonChange(p.id, 'dni', e.target.value)} className="w-full p-2 border rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase">Fecha Nacimiento</label>
                                                <input type="date" value={p.fechaNac} onChange={(e) => handlePersonChange(p.id, 'fechaNac', e.target.value)} className="w-full p-2 border rounded" />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase">Estado Civil (Completo)</label>
                                                <input type="text" value={p.estadoCivil} onChange={(e) => handlePersonChange(p.id, 'estadoCivil', e.target.value)} className="w-full p-2 border rounded" placeholder="Ej: casada en primeras nupcias con..." />
                                            </div>

                                            <div className="md:col-span-2 grid grid-cols-3 gap-2">
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Calle y Altura</label>
                                                    <input type="text" value={p.domicilio} onChange={(e) => handlePersonChange(p.id, 'domicilio', e.target.value)} className="w-full p-2 border rounded" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase">Localidad</label>
                                                    <input type="text" value={p.localidad} onChange={(e) => handlePersonChange(p.id, 'localidad', e.target.value)} className="w-full p-2 border rounded" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase">Departamento</label>
                                                <input type="text" value={p.depto} onChange={(e) => handlePersonChange(p.id, 'depto', e.target.value)} className="w-full p-2 border rounded" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase">Rol</label>
                                                <input type="text" value={p.rol} onChange={(e) => handlePersonChange(p.id, 'rol', e.target.value)} className="w-full p-2 border rounded" placeholder="VENDEDOR / COMPRADOR" />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {(config.cantidad === 'plural' || people.length > 0) && (
                                    <button onClick={addPerson} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 flex justify-center items-center gap-2 transition">
                                        <Users size={20} /> Agregar otra persona
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Vista Previa */}
                {step === 3 && (
                    <div className="animate-fade-in pb-20">
                        <div className="flex justify-between items-center mb-6 bg-white p-4 sticky top-0 shadow-md z-10 rounded-lg">
                            <button onClick={() => setStep(2)} className="text-gray-500 hover:text-indigo-600 flex items-center gap-1"><ArrowLeft size={16} /> Editar Datos</button>
                            <h2 className="text-xl font-bold text-indigo-900">Vista Previa</h2>
                            <div className="flex gap-2">
                                <button onClick={exportToWord} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2 shadow font-bold">
                                    <Download size={18} /> Descargar Word
                                </button>
                            </div>
                        </div>

                        {/* Hoja A4 Simulada */}
                        <div className="bg-gray-200 p-8 flex justify-center overflow-auto">
                            <div id="document-preview" className="bg-white shadow-2xl p-12 w-[21cm] min-h-[29.7cm] text-black">
                                {renderDocumentContent()}
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
