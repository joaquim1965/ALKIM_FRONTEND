import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, UploadCloud, RefreshCw, AlertCircle, Settings2 } from 'lucide-react';
import Button from '../../../components/UI/Button';
import bancosService from '../../../services/bancosService';
import ImportBankModal from './ImportBankModal';
import ReconciliationView from './ReconciliationView';

const BancosBoard = () => {
    const [cuentas, setCuentas] = useState([]);
    const [reconciliationData, setReconciliationData] = useState({ movements: [], ingresos: [], gastos: [] });
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch accounts inside first request or parallel
            const dashRes = await bancosService.getDashboard();
            if (dashRes.success) setCuentas(dashRes.accounts);

            const recRes = await bancosService.getReconciliationData();
            if (recRes.success) {
                setReconciliationData({
                    movements: recRes.movements || [],
                    ingresos: recRes.ingresos || [],
                    gastos: recRes.gastos || []
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleImport = async (cuentaId, movements) => {
        await bancosService.uploadMovements(cuentaId, movements);
        await loadData();
    };

    if (loading && cuentas.length === 0) {
        return <div className="p-8 flex justify-center"><span className="animate-spin text-primary"><RefreshCw size={32}/></span></div>;
    }

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in">
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={loadData} leftIcon={<RefreshCw size={16} />}>
                        Actualizar
                    </Button>
                    <Button variant="primary" onClick={() => setIsImportOpen(true)} leftIcon={<UploadCloud size={16} />}>
                        Importar CSV
                    </Button>
                </div>

            {/* Resumen Cuentas */}
            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                {cuentas.length === 0 && (
                    <div className="bg-warning/10 text-warning px-4 py-3 rounded-xl border border-warning/20 flex items-center gap-2">
                        <AlertCircle size={18} /> No tienes cuentas bancarias configuradas.
                    </div>
                )}
                {cuentas.map(c => (
                    <div key={c.id} className="min-w-[280px] bg-surface1 border border-border p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="bg-primary/10 text-primary p-2 rounded-lg">
                                <Landmark size={20} />
                            </div>
                            <span className="text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-md">Activa</span>
                        </div>
                        <div className="mt-4">
                            <h3 className="font-bold text-lg text-on-surface1">{c.alias}</h3>
                            <p className="text-sm font-mono text-on-surface2">{c.iban}</p>
                            <p className="mt-2 text-sm text-on-surface2">{c.banco_nombre || c.entidad}</p>
                            <div className="mt-3 flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-[11px] uppercase tracking-wide text-on-surface2">BIC / SWIFT</p>
                                    <p className="font-mono text-sm text-on-surface1">{c.banco_bic_swift || 'No informado'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] uppercase tracking-wide text-on-surface2">Saldo extracto</p>
                                    <p className="font-mono font-bold text-lg text-on-surface1">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: c.moneda || 'EUR' }).format(Number(c.saldo_actual || 0))}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Workspace de Conciliación */}
            <div className="flex-1 mt-4">
                {cuentas.length > 0 ? (
                    <ReconciliationView 
                        movements={reconciliationData.movements} 
                        ingresos={reconciliationData.ingresos} 
                        gastos={reconciliationData.gastos} 
                        onRefresh={loadData}
                    />
                ) : (
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-border rounded-2xl bg-surface1/50">
                        <p className="text-on-surface2 font-medium">Debes dar de alta una cuenta primero en la base de datos.</p>
                    </div>
                )}
            </div>

            {/* Modal de Importación */}
            <ImportBankModal 
                isOpen={isImportOpen} 
                onClose={() => setIsImportOpen(false)} 
                onImport={handleImport}
                cuentas={cuentas}
            />
        </div>
    );
};

export default BancosBoard;
