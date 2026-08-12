import React from 'react';
import { Landmark, ShieldCheck } from 'lucide-react';
import BancosBoard from '../Conta/Bancos/BancosBoard';

/**
 * ConciliacionPage - Dedicated page for Bank Reconciliation (Procesos)
 */
const ConciliacionPage = () => {
    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in">
            {/* Cabecera y Navegación */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-primary" size={32} />
                        Conciliación Bancaria
                    </h1>
                    <p className="text-on-surface2 mt-1">
                        Sincronización de extractos reales con la contabilidad interna.
                    </p>
                </div>
            </div>

            {/* Contenedor Principal */}
            <div className="flex-1 bg-surface1/50 border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col p-6">
                <BancosBoard />
            </div>
        </div>
    );
};

export default ConciliacionPage;
