import React, { useState, useMemo } from 'react';
import { ArrowRightLeft, CheckCircle, Search, AlertCircle } from 'lucide-react';
import Button from '../../../components/UI/Button';
import bancosService from '../../../services/bancosService';

export const ReconciliationView = ({ movements, ingresos, gastos, onRefresh }) => {
    const [selectedMovement, setSelectedMovement] = useState(null);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [recordType, setRecordType] = useState('ingreso'); // 'ingreso' or 'gasto'
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Sugerencias automáticas por importe exacto
    const suggestedRecord = useMemo(() => {
        if (!selectedMovement) return null;
        
        const importeStr = Math.abs(selectedMovement.importe).toFixed(2);
        
        if (selectedMovement.importe > 0) {
            return ingresos.find(i => parseFloat(i.importe).toFixed(2) === importeStr) || null;
        } else {
            return gastos.find(g => parseFloat(g.importe).toFixed(2) === importeStr) || null;
        }
    }, [selectedMovement, ingresos, gastos]);

    // Filtrado de contabilidad según tipo de movimiento seleccionado
    const visibleRecords = useMemo(() => {
        let records = [];
        if (selectedMovement) {
            records = selectedMovement.importe > 0 ? ingresos : gastos;
        } else {
            records = recordType === 'ingreso' ? ingresos : gastos;
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            records = records.filter(r => 
                (r.concepto || '').toLowerCase().includes(term) || 
                r.importe.toString().includes(term)
            );
        }
        return records;
    }, [selectedMovement, ingresos, gastos, recordType, searchTerm]);

    const handleMatch = async () => {
        if (!selectedMovement || !selectedRecord) return;
        setLoading(true);
        try {
            const type = selectedMovement.importe > 0 ? 'ingreso' : 'gasto';
            await bancosService.matchMovements(selectedMovement.id, type, selectedRecord.id);
            // Refresh parent state
            await onRefresh();
            setSelectedMovement(null);
            setSelectedRecord(null);
            setSearchTerm('');
        } catch (error) {
            console.error('Match failed', error);
            alert('Error al conciliar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[700px]">
            {/* PANEL IZQUIERDO: Banco */}
            <div className="flex-1 bg-surface1 border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-surface2">
                    <h3 className="font-bold text-lg text-on-surface1 flex items-center gap-2">
                        <ArrowRightLeft className="text-primary" /> Extracto Bancario ({movements.length})
                    </h3>
                    <p className="text-sm text-on-surface1 mt-1">Selecciona un movimiento pendiente.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {movements.length === 0 ? (
                        <div className="text-center text-on-surface1 p-8">No hay movimientos pendientes.</div>
                    ) : (
                        movements.map(m => (
                            <div 
                                key={m.id}
                                onClick={() => {
                                    setSelectedMovement(m);
                                    setSelectedRecord(null);
                                    setSearchTerm('');
                                }}
                                className={`
                                    p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all
                                    ${selectedMovement?.id === m.id 
                                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                                        : 'border-border bg-surface1 hover:border-primary/50 hover:bg-surface2'}
                                `}
                            >
                                <div>
                                    <div className="text-xs font-mono text-on-surface1">{new Date(m.fecha).toLocaleDateString()}</div>
                                    <div className="font-semibold text-on-surface1 mt-1 truncate max-w-[250px]" title={m.concepto_bancario}>
                                        {m.concepto_bancario}
                                    </div>
                                </div>
                                <div className={`font-mono font-bold text-lg ${m.importe > 0 ? 'text-on-surface1' : 'text-destructive-text'}`}>
                                    {parseFloat(m.importe).toFixed(2)}€
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* PANEL CENTRAL: Conector visual y acción */}
            <div className="hidden lg:flex flex-col items-center justify-center -mx-3 z-10 shrink-0">
                <div className="bg-background p-2 rounded-full border border-border shadow-md">
                    <ArrowRightLeft size={24} className="text-on-surface2" />
                </div>
            </div>

            {/* PANEL DERECHO: Contabilidad */}
            <div className="flex-1 bg-surface1 border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-surface2">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-lg text-on-surface1 flex items-center gap-2">
                            <CheckCircle className="text-success" /> Contabilidad Externa
                        </h3>
                        {!selectedMovement && (
                            <div className="flex bg-surface3 rounded-lg p-1">
                                <button 
                                    className={`px-3 py-1 text-sm font-medium rounded-md ${recordType === 'ingreso' ? 'bg-background shadow text-success' : 'text-on-surface1'}`}
                                    onClick={() => setRecordType('ingreso')}
                                >Ingresos</button>
                                <button 
                                    className={`px-3 py-1 text-sm font-medium rounded-md ${recordType === 'gasto' ? 'bg-background shadow text-destructive-text' : 'text-on-surface1'}`}
                                    onClick={() => setRecordType('gasto')}
                                >Gastos</button>
                            </div>
                        )}
                    </div>
                    
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface2" size={16} />
                        <input 
                            type="text" 
                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm font-mono"
                            placeholder="Buscar concepto o importe..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    {!selectedMovement ? (
                        <div className="text-center rounded-xl border border-dashed border-border p-8 bg-surface2/50 flex flex-col items-center">
                            <AlertCircle size={32} className="text-on-surface2 mb-3" />
                            <p className="font-medium text-on-surface1">Selecciona un movimiento a la izquierda</p>
                            <p className="text-sm text-on-surface2">El sistema mostrará los {recordType}s correspondientes.</p>
                        </div>
                    ) : (
                        <>
                            {/* Auto Suggestion Alert */}
                            {suggestedRecord && !searchTerm && (
                                <div className="mb-4 bg-success/10 border border-success/30 rounded-xl p-3 flex items-start gap-3">
                                    <div className="text-success mt-0.5"><CheckCircle size={18} /></div>
                                    <div>
                                        <p className="text-sm font-bold text-success-hover">¡Coincidencia exacta encontrada!</p>
                                        <p className="text-xs text-on-surface2">Sugerimos conciliar con este registro por importe.</p>
                                    </div>
                                </div>
                            )}

                            {visibleRecords.length === 0 ? (
                        <div className="text-center text-on-surface1 p-4">No se encontraron registros.</div>
                            ) : (
                                visibleRecords.map(r => (
                                    <div 
                                        key={r.id}
                                        onClick={() => setSelectedRecord(r)}
                                        className={`
                                            p-4 rounded-xl border flex flex-col cursor-pointer transition-all
                                            ${selectedRecord?.id === r.id 
                                                ? 'border-success ring-2 ring-success/20 bg-success/5' 
                                                : (suggestedRecord?.id === r.id && !selectedRecord) 
                                                    ? 'border-success/50 bg-surface1 hover:bg-surface2' 
                                                    : 'border-border bg-surface1 hover:border-primary/50 hover:bg-surface2'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start w-full">
                                            <div>
                                                <div className="text-xs font-mono text-on-surface1">Vence: {new Date(r.fecha_esperada).toLocaleDateString()}</div>
                                                <div className="font-semibold text-on-surface1 mt-1">{r.concepto}</div>
                                            </div>
                                            <div className="font-mono font-bold text-lg text-on-surface1">
                                                {parseFloat(r.importe).toFixed(2)}€
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>

                {/* Acción de Match */}
                <div className="p-4 border-t border-border bg-surface2 mt-auto">
                    <Button 
                        variant="success" 
                        fullWidth 
                        size="lg"
                        disabled={!selectedMovement || !selectedRecord}
                        loading={loading}
                        onClick={handleMatch}
                        className="font-bold shadow-lg"
                    >
                        Ejecutar Conciliación
                    </Button>
                </div>
            </div>

        </div>
    );
};

export default ReconciliationView;
