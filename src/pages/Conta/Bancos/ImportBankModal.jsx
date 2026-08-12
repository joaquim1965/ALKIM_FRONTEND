import React, { useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, X, AlertCircle } from 'lucide-react';
import Button from '../../../components/UI/Button';

const ImportBankModal = ({ isOpen, onClose, onImport, cuentas }) => {
    const [file, setFile] = useState(null);
    const [cuentaId, setCuentaId] = useState('');
    const [preview, setPreview] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        setFile(selected);
        setError('');
        
        if (selected) {
            // Parse for preview
            Papa.parse(selected, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        setError('Error analizando el archivo CSV. Revisa el formato.');
                    } else {
                        // Validate basic shape
                        const rows = results.data;
                        const primeraFila = rows[0] || {};
                        if (!primeraFila.fecha || !primeraFila.importe) {
                            setError('El CSV debe contener al menos las columnas: "fecha", "concepto", "importe"');
                        } else {
                            setPreview(rows.slice(0, 5)); // show first 5
                        }
                    }
                }
            });
        }
    };

    const handleImport = async () => {
        if (!cuentaId) return setError('Selecciona una cuenta bancaria destino.');
        if (!file) return setError('Selecciona un archivo CSV.');
        if (preview.length === 0) return setError('El archivo está vacío o mal formateado.');

        setLoading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data;
                // Transform to expected shape
                const movements = data.map(r => ({
                    fecha: r.fecha,
                    concepto: r.concepto || r.descripcion || '',
                    importe: parseFloat(r.importe),
                    saldo: parseFloat(r.saldo) || null,
                    referencia: r.referencia || null
                })).filter(m => !isNaN(m.importe)); // Filter invalid amounts

                try {
                    await onImport(cuentaId, movements);
                    onClose();
                } catch (err) {
                    setError('Error al importar en el servidor.');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface1 rounded-2xl border border-border w-full max-w-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <UploadCloud className="text-primary" /> Importar Movimientos
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-surface2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Select Account */}
                    <div>
                        <label className="block text-sm font-bold mb-2 text-left">Cuenta Destino</label>
                        <select 
                            value={cuentaId} 
                            onChange={(e) => setCuentaId(e.target.value)}
                            className="w-full p-3 bg-surface2 border border-border rounded-xl font-mono text-sm text-left"
                        >
                            <option value="">-- Selecciona cuenta --</option>
                            {cuentas.map(c => (
                                <option key={c.id} value={c.id}>{c.alias} ({c.iban})</option>
                            ))}
                        </select>
                    </div>

                    {/* File Upload */}
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-surface2/50 hover:bg-surface2 transition-colors cursor-pointer relative">
                        <input 
                            type="file" 
                            accept=".csv"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        />
                        <UploadCloud size={40} className="mx-auto text-on-surface1 opacity-50 mb-3" />
                        <p className="font-medium text-lg">Haz click o arrastra un archivo CSV</p>
                        <p className="text-sm text-on-surface2 mt-1">
                            Debe contener encabezados: <span className="font-mono bg-surface3 px-1 rounded">fecha</span>, <span className="font-mono bg-surface3 px-1 rounded">concepto</span>, <span className="font-mono bg-surface3 px-1 rounded">importe</span>
                        </p>
                        {file && (
                            <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20">
                                <span className="font-bold">{file.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Errors */}
                    {error && (
                        <div className="flex items-start gap-2 text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-sm font-medium">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Auto Preview */}
                    {preview.length > 0 && !error && (
                        <div className="border border-border rounded-lg overflow-hidden">
                            <div className="bg-surface2 px-4 py-2 border-b border-border text-xs font-bold uppercase tracking-wider text-on-surface2">
                                Vista Previa (Primeros 5 registros)
                            </div>
                            <table className="w-full text-xs font-mono">
                                <tbody>
                                    {preview.map((r, i) => (
                                        <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-surface2/50">
                                            <td className="p-2 truncate max-w-[100px]">{r.fecha}</td>
                                            <td className="p-2 truncate max-w-[200px]">{r.concepto || r.descripcion}</td>
                                            <td className={`p-2 text-right ${parseFloat(r.importe) < 0 ? 'text-destructive-text' : 'text-on-surface1'}`}>
                                                {parseFloat(r.importe).toFixed(2)}€
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-border bg-surface1/50">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button 
                        variant="primary" 
                        onClick={handleImport} 
                        loading={loading}
                        disabled={!file || !cuentaId || preview.length === 0}
                    >
                        Procesar Importación
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ImportBankModal;
